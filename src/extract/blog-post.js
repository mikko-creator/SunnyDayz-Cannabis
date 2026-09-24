// blog-post.js — /blog/<slug>: hero banner (title, date, share), breadcrumb, "Featured post" rail,
// rich-text body, optional product carousels (e.g. "Best Flower"), "Related Post" slider.
// Spec: src/content/model-spec/blog.md.
function extract(root, ctx) {
  const main = root.firstElementChild || root;
  const bpCard = (art) => {
    const a = Q(art, 'a[href]');
    const time = Q(art, 'time');
    const share = Q(art, C('sharing_sharing') + ' button');
    return {
      title: T(Q(art, C('article_article__title'))),
      href: a ? rel(a.getAttribute('href')) : null,
      excerpt: T(Q(art, C('article_article__description'))) || null,
      date: time ? T(time) : null,
      datetime: time ? time.getAttribute('datetime') : null,
      dateLabel: time ? time.getAttribute('aria-label') : null,
      image: IMG(Q(art, 'figure')),
      shareLabel: share ? share.getAttribute('aria-label') : null,
    };
  };
  const bpNav = (el) => {
    const nav = Q(el, '[role="navigation"]');
    if (!nav) return null;
    const btn = (b) => (b ? { text: T(b), ariaLabel: b.getAttribute('aria-label') } : null);
    return { ariaLabel: nav.getAttribute('aria-label'), prev: btn(Q(nav, '.slick-prev, button[aria-label^="Previous"]')), next: btn(Q(nav, '.slick-next, button[aria-label^="Next"]')) };
  };

  // hero banner
  const banner = Q(root, C('bannerblog_page_banner__section'));
  const heroTime = Q(banner, 'time');
  const heroShare = Q(banner, C('sharing_sharing') + ' button');

  // "Featured post" rail (the same 5 newest posts on every post page, current post included)
  const featWrap = Q(root, 'div.blog-article__feature-posts');
  const featured = featWrap ? { heading: T(Q(featWrap, 'h2')), posts: QA(featWrap, 'article').map(bpCard) } : null;

  // Inline-aware plain text. T() puts a space between EVERY pair of text nodes, so the source's
  // `<strong>For Beginners</strong>: If ...` came out as "For Beginners : If ...". Here inline
  // siblings join with no separator, as the browser renders them; <br> and block elements are breaks.
  const bpText = (el) => {
    let s = '';
    const walk = (n) => {
      for (const c of n.childNodes) {
        if (c.nodeType === 3) { s += c.nodeValue; continue; }
        if (c.nodeType !== 1) continue;
        const tag = c.tagName.toUpperCase();
        if (/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test(tag)) continue;
        if (tag === 'BR') { s += ' '; continue; }
        const blk = /^(ADDRESS|ARTICLE|ASIDE|BLOCKQUOTE|DD|DIV|DL|DT|FIELDSET|FIGCAPTION|FIGURE|FOOTER|FORM|H[1-6]|HEADER|HR|LI|MAIN|NAV|OL|P|PRE|SECTION|TABLE|TBODY|THEAD|TFOOT|TR|TD|TH|UL)$/.test(tag);
        if (blk) s += ' ';
        walk(c);
        if (blk) s += ' ';
      }
    };
    if (el) walk(el);
    return s.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
  };
  // The source element of every text-bearing RICH() block, in emission order: the same traversal
  // as RICH() in _common.js (h*/p/pre/blockquote/leaf element -> one entry; ul/ol -> one per
  // non-empty li; tables collected separately), so each block's `text` can be re-read with bpText.
  const bpSources = (el) => {
    const text = [], tables = [];
    const walk = (node) => {
      for (const ch of node.children) {
        const tag = ch.tagName;
        if (/^(SCRIPT|STYLE|NOSCRIPT|SVG|BUTTON|FORM|INPUT|SELECT|TEXTAREA|IFRAME)$/.test(tag)) continue;
        if (/^H[1-6]$/.test(tag) || tag === 'P' || tag === 'PRE' || tag === 'BLOCKQUOTE') { if (T(ch)) text.push(ch); continue; }
        if (tag === 'UL' || tag === 'OL') { QA(ch, ':scope > li').forEach((li) => { if (T(li)) text.push(li); }); continue; }
        if (tag === 'TABLE') { if (QA(ch, 'tr').length) tables.push(ch); continue; }
        if (tag === 'IMG' || (tag === 'FIGURE' && Q(ch, 'img') && !T(ch))) continue;
        if (tag === 'HR') continue;
        if (ch.children.length) walk(ch);
        else if (T(ch)) text.push(ch);
      }
    };
    if (el) walk(el);
    return { text, tables };
  };

  // article body: RICH() blocks (structure + inline html), then every `text` re-read with bpText
  // from its own source element. Fails closed: a block whose source element does not give the
  // exact T() text RICH() stored means the two traversals disagree, and the page errors out.
  const bodyEl = Q(root, 'article.blog-article__content') || Q(root, 'article.content');
  const body = bodyEl ? RICH(bodyEl) : [];
  const srcs = bpSources(bodyEl);
  let si = 0, ti = 0;
  const retext = (holder, where) => {
    const src = srcs.text[si++];
    if (!src || T(src) !== holder.text) throw new Error('blog-post: body text source mismatch at ' + where);
    holder.text = bpText(src);
  };
  body.forEach((b, i) => {
    if (Array.isArray(b.items)) b.items.forEach((it, j) => retext(it, 'body[' + i + '].items[' + j + ']'));
    else if (b.t === 'table') {
      const tbl = srcs.tables[ti++];
      if (!tbl) throw new Error('blog-post: body table source missing at body[' + i + ']');
      b.rows = QA(tbl, 'tr').map((tr) => QA(tr, 'th,td').map((c) => bpText(c)));
    } else if (typeof b.text === 'string') retext(b, 'body[' + i + ']');
  });
  if (si !== srcs.text.length || ti !== srcs.tables.length) throw new Error('blog-post: body has ' + (srcs.text.length - si) + ' unmatched text sources, ' + (srcs.tables.length - ti) + ' unmatched tables');

  // product carousels embedded after the article (Prismic "products" slice)
  const productCarousels = QA(root, 'section' + C('products_product__section')).map((sec) => {
    const header = Q(sec, C('Slider_slider_header'));
    const cards = [];
    let seeAllSlide = null;
    for (const slide of QA(sec, C('Slider_slider_item'))) {
      if (Q(slide, 'a[href*="/product/"]')) {
        const card = CARD(slide);
        card.addToCartLabel = T(Q(slide, C('counter_counter__text'))) || null;
        card.stockPhotoLabel = T(Q(slide, C('product_product__in_stock'))) || null;
        cards.push(card);
      } else {
        const a = Q(slide, 'a[href]');
        if (a) seeAllSlide = { label: T(a), href: rel(a.getAttribute('href')), ariaLabel: a.getAttribute('aria-label') };
      }
    }
    const seeAll = Q(header, 'a[href]');
    return {
      ariaLabel: sec.getAttribute('aria-label'),
      heading: T(Q(header, 'h2, h3')),
      seeAll: seeAll ? { label: T(seeAll), href: rel(seeAll.getAttribute('href')), ariaLabel: seeAll.getAttribute('aria-label') } : null,
      cards,
      seeAllSlide,
      nav: bpNav(header),
    };
  });

  // "Related Post" slider (every other post; the current one is excluded)
  const relSec = Q(root, 'section' + C('relatedpost_blog_article__related_post'));
  const relHeader = Q(relSec, C('Slider_slider_header'));
  const related = relSec ? { heading: T(Q(relHeader, 'h2, h3')), posts: QA(relSec, 'article').map(bpCard), nav: bpNav(relHeader) } : null;

  // DOM order of the page's top-level blocks, for templates that keep the source sequence
  const order = [...main.children].map((ch) => {
    if (ch.matches(C('bannerblog_page_banner__section'))) return 'hero';
    if (Q(ch, 'nav ' + C('breadcrumb_breadcrumb')) && !Q(ch, 'article')) return 'breadcrumb';
    if (ch.matches('.blog-article') || Q(ch, 'article.blog-article__content')) return 'article';
    if (ch.matches('section' + C('products_product__section'))) return 'productCarousel';
    if (ch.matches('section' + C('relatedpost_blog_article__related_post'))) return 'related';
    return null;
  }).filter(Boolean);

  return {
    breadcrumb: BREADCRUMB(root),
    h1: T(Q(banner, 'h1') || Q(root, 'h1')),
    date: heroTime ? T(heroTime) : null,
    datetime: heroTime ? heroTime.getAttribute('datetime') : null,
    dateLabel: heroTime ? heroTime.getAttribute('aria-label') : null,
    shareLabel: heroShare ? heroShare.getAttribute('aria-label') : null,
    hero: banner ? {
      desktop: IMG(Q(banner, 'figure' + C('page_banner__desktop'))),
      mobile: IMG(Q(banner, 'figure' + C('page_banner__mobile'))),
    } : null,
    body,
    featured,
    productCarousels,
    related,
    order,
    jsonld: JSONLD(root),
  };
}
