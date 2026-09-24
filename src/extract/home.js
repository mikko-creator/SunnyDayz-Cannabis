// home.js — the homepage (/). No H1 on the source. Every <section> of <main> becomes one entry of
// sections[], in DOM order, typed by its CMS slice class (stable CSS-module prefix):
//   codeembed_code_embed        -> 'video-embed' (iframe) | 'image-link-banner' (a > img, e.g. Sun Club)
//   components_separator        -> 'separator'   (decorative bg-image strip, no text)
//   categories_categories__carousel_section -> 'category-tiles'
//   products_product__section   -> 'product-carousel'
//   specialsslider_promo__carousel -> 'deals-carousel'
//   ContentMarqueeCarousel_content_marquee -> 'marquee'
//   components_side_by_side__section -> 'side-by-side' (the About us block)
//   anything else               -> 'unknown' (RICH blocks + links + buttons, so nothing is dropped)
// Helpers live inside extract() so their names can never collide with _common.js.
function extract(root, ctx) {
  const main = root.firstElementChild || root;
  const has = (el, prefix) => !!el && [...el.classList].some((c) => c.startsWith(prefix));
  // text of an element's own text nodes only (h2 "Today's Deals" minus its sr-only span)
  const ownText = (el) => (el ? [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.nodeValue).join(' ').replace(/\s+/g, ' ').trim() : ''); // JS \s includes U+00A0
  // inline style attribute -> {prop: value}; splits on ';' outside parentheses (url(...) safe)
  const styleMap = (el) => {
    const s = el ? el.getAttribute('style') || '' : '';
    const out = {}; let depth = 0, cur = '';
    const push = () => { const i = cur.indexOf(':'); if (i > 0) out[cur.slice(0, i).trim()] = cur.slice(i + 1).trim(); cur = ''; };
    for (const ch of s) { if (ch === '(') depth++; if (ch === ')') depth--; if (ch === ';' && depth === 0) push(); else cur += ch; }
    push();
    return out;
  };
  const cssUrl = (v) => { const m = /url\(\s*['"]?([^'")]+)['"]?\s*\)/.exec(v || ''); return m ? m[1] : null; };
  const padding = (sec) => { const c = [...sec.classList].find((x) => /^padding-slice-/.test(x)); return c ? c.replace('padding-slice-', '') : null; };
  // a raw href the CMS left as plain text ("See All Link", "/Small Batch, ...") is kept verbatim too
  const link = (a) => {
    if (!a) return null;
    const raw = a.getAttribute('href') || '';
    const o = { label: T(a), href: rel(raw) };
    if (a.getAttribute('aria-label')) o.ariaLabel = a.getAttribute('aria-label');
    if (a.getAttribute('title')) o.title = a.getAttribute('title');
    if (/\s/.test(raw) || !/^(\/|https?:|#|mailto:|tel:)/i.test(raw)) { o.hrefRaw = raw; o.hrefSuspect = true; }
    if (/^https?:/i.test(raw) && !rel(raw).startsWith('/')) o.external = true;
    if (a.getAttribute('target')) o.target = a.getAttribute('target');
    if (a.getAttribute('rel')) o.rel = a.getAttribute('rel');
    return o;
  };
  // Slider header: h2 title, "See All"/"SHOP ALL" link, Previous/Next buttons (sr-only labels)
  const header = (sec) => {
    const h = Q(sec, C('Slider_slider_header'));
    const h2 = Q(h, 'h2');
    const sr = Q(h2, '.sr-only');
    const shopAll = Q(h, C('Slider_slider__shop_all'));
    const a = Q(shopAll, 'a');
    const nav = Q(h, C('Slider_slider_buttons'));
    const btn = (b) => (b ? { label: T(b), ariaLabel: b.getAttribute('aria-label') || '', disabled: b.classList.contains('slick-disabled') } : null);
    return {
      title: sr ? ownText(h2) : T(h2),
      titleSrText: sr ? T(sr) : null,
      titleColor: styleMap(h2).color || null,
      seeAll: a ? (() => { const cnt = Q(a, 'span'); const l = link(a); if (cnt) { l.label = ownText(a); l.count = T(cnt); l.text = a.textContent.replace(/\s+/g, ' ').trim(); } const col = styleMap(a).color; if (col) l.color = col; return l; })() : null,
      controls: nav ? { ariaLabel: nav.getAttribute('aria-label') || '', prev: btn(Q(nav, '.slick-prev')), next: btn(Q(nav, '.slick-next')) } : null,
    };
  };
  // CMS-injected <style> for the carousel arrows; "null"/"undefined" means the CMS left it unset
  const arrowStyle = (sec) => {
    const css = QA(sec, ':scope > style').map((s) => s.textContent).join('\n');
    if (!css) return null;
    const val = (v) => (v == null || /^(null|undefined)$/.test(v.trim()) ? null : v.trim());
    const pick = (re) => { const m = re.exec(css); return m ? val(m[1]) : null; };
    return {
      color: pick(/\.slick-arrow\s*\{\s*color:\s*([^;\n}]+)/),
      border: pick(/\.slick-arrow\s*\{[^}]*?border:\s*([^;\n}]+)/),
      hoverColor: pick(/&:hover\s*\{\s*color:\s*([^;\n}]+)/),
      disabledColor: pick(/&\.slick-disabled\s*\{\s*color:\s*([^;\n}]+)/),
    };
  };
  const slides = (sec) => QA(Q(sec, '.swiper-wrapper'), ':scope > *');

  const card = (el) => {
    const c = CARD(el);
    // visible labels CARD() does not carry as text
    c.stockPhotoLabel = T(Q(el, C('product_product__in_stock'))) || null;
    c.addToCartLabel = T(Q(el, C('counter_counter__text'))) || null;
    // "$25 / 3.5g": the separator span before the weight
    const sep = Q(el, C('product_variant_select_container') + ' > span:not(' + C('product_variation__message') + ')');
    c.weightSeparator = sep ? T(sep) : null;
    return c;
  };

  const sections = [];
  for (const sec of QA(main, ':scope > section')) {
    const base = { ariaLabel: sec.getAttribute('aria-label') || null, padding: padding(sec) };
    if ([...sec.classList].some((c) => /_section_with_padding__/.test(c))) base.withPadding = true;
    // extra bottom margin: 'categories_spacing_bottom__<hash>' (Categories) or plain 'spacing_bottom' (Flower, Accessories)
    if ([...sec.classList].some((c) => /(^|_)spacing_bottom(__|$)/.test(c))) base.spacingBottom = true;

    if (has(sec, 'codeembed_code_embed')) {
      const frame = Q(sec, 'iframe');
      const box = frame ? frame.parentElement : Q(sec, C('codeembed_code_embed__container_content') + ' > div');
      const aspectBox = styleMap(box)['padding-bottom'] || null;
      if (frame) {
        const src = frame.getAttribute('src') || '';
        let u = null; try { u = new URL(src); } catch (e) { u = null; }
        sections.push({
          kind: 'video-embed', ...base,
          provider: u && /cloudinary/.test(u.hostname) ? 'cloudinary' : (u ? u.hostname : null),
          src,
          cloudName: u ? u.searchParams.get('cloud_name') : null,
          publicId: u ? u.searchParams.get('public_id') : null,
          aspectRatio: u ? u.searchParams.get('player[aspect_ratio]') : null,
          aspectPaddingBottom: aspectBox,
          // player[autoplay]=true, player[loop]=true, player[muted]=true, player[controls]=false, ...
          player: u ? Object.fromEntries([...u.searchParams].filter(([k]) => /^player\[/.test(k)).map(([k, v]) => [k.replace(/^player\[|\]$/g, ''), v])) : {},
          allowFullscreen: frame.hasAttribute('allowfullscreen'),
          title: frame.getAttribute('title') || null,
        });
        continue;
      }
      const a = Q(sec, 'a');
      const img = IMG(sec);
      if (a || img) {
        sections.push({ kind: 'image-link-banner', ...base, link: link(a), image: img, aspectPaddingBottom: aspectBox, objectFit: styleMap(Q(sec, 'img'))['object-fit'] || null });
        continue;
      }
    }

    if (has(sec, 'components_separator')) {
      const st = styleMap(sec);
      const vars = Object.fromEntries(Object.entries(st).filter(([k]) => k.startsWith('--separator-')).map(([k, v]) => [k.replace('--separator-', ''), v]));
      sections.push({ kind: 'separator', ...base, overlapPrevious: has(sec, 'components_separator_overlap_previous'), image: cssUrl(vars['bg-image']), vars });
      continue;
    }

    if (has(sec, 'categories_categories__carousel_section')) {
      const hd = header(sec);
      const tiles = slides(sec).map((s) => {
        const a = Q(s, 'a');
        const im = IMG(s);
        const imgEl = Q(s, 'img');
        return { label: T(Q(s, C('categories_categories_carousel__category_name'))), href: a ? rel(a.getAttribute('href')) : null, image: im ? { ...im, title: imgEl.getAttribute('title') || '' } : null };
      });
      sections.push({ kind: 'category-tiles', ...base, title: hd.title, shopAll: hd.seeAll, controls: hd.controls, tiles });
      continue;
    }

    if (has(sec, 'products_product__section')) {
      const hd = header(sec);
      const all = slides(sec);
      // card root = the element whose class is exactly product_product__<hash> (not product_product__name__<hash>)
      const cards = all.map((s) => QA(s, '[class]').find((e) => [...e.classList].some((c) => /^product_product__[A-Za-z0-9-]{5}$/.test(c)))).filter(Boolean).map(card);
      const tail = Q(sec, C('products_product__shop_all_slider'));
      const seeHref = (hd.seeAll && hd.seeAll.href) || (tail && rel(tail.getAttribute('href'))) || '';
      const m = /^\/collection\/([^/?#]+)/.exec(seeHref);
      sections.push({
        kind: 'product-carousel', ...base,
        title: hd.title,
        collection: m ? m[1] : null,
        seeAll: hd.seeAll,
        shopAllSlide: tail ? { label: T(Q(tail, 'p')) || T(tail), href: rel(tail.getAttribute('href')), ariaLabel: tail.getAttribute('aria-label') || '' } : null,
        controls: hd.controls,
        slideCount: all.length,
        cards,
        arrowStyle: arrowStyle(sec),
      });
      continue;
    }

    if (has(sec, 'specialsslider_promo__carousel')) {
      const hd = header(sec);
      const all = slides(sec);
      const placeholders = all.filter((s) => Q(s, C('specialsslider_special__placeholder')));
      // real promotion slides (none on the audited render): keep their text, image and link
      const promotions = all.filter((s) => !Q(s, C('specialsslider_special__placeholder'))).map((s) => ({ text: T(s), link: link(Q(s, 'a')), image: IMG(s), blocks: RICH(s) }));
      const st = styleMap(sec);
      sections.push({
        kind: 'deals-carousel', ...base,
        title: hd.title,
        titleSrText: hd.titleSrText,
        titleColor: hd.titleColor,
        seeAll: hd.seeAll,
        controls: hd.controls,
        promotions,
        placeholderSlides: placeholders.length,
        backgroundColor: st['background-color'] || null,
        arrowStyle: arrowStyle(sec),
      });
      continue;
    }

    if (has(sec, 'ContentMarqueeCarousel_content_marquee')) {
      const chunkEls = QA(sec, C('content_marquee__marquee_chunk'));
      // loop copies after the first are aria-hidden="true" + inert on the source (hidden from AT and focus)
      const copiesA11y = chunkEls.map((ch) => ({ ariaHidden: ch.getAttribute('aria-hidden') === 'true', inert: ch.hasAttribute('inert') }));
      const chunks = chunkEls.map((ch) => QA(ch, 'a, ' + C('content_marquee__item')).filter((x, i, arr) => arr.indexOf(x) === i).map((a) => {
        const l = link(a);
        return { ...l, label: T(Q(a, C('content_marquee__label'))) || T(a), image: IMG(a), withCaption: has(a, 'ContentMarqueeCarousel_content_marquee__item_with_caption'), textOnly: has(a, 'ContentMarqueeCarousel_content_marquee__item_text_only') };
      }));
      const same = chunks.every((c) => JSON.stringify(c) === JSON.stringify(chunks[0]));
      const trackSt = styleMap(Q(sec, C('content_marquee__track')));
      const secSt = styleMap(sec);
      const out = { kind: 'marquee', ...base, items: chunks[0] || [], copies: chunks.length, copiesA11y, style: { ...secSt, ...trackSt } };
      if (!same) out.chunks = chunks;
      sections.push(out);
      continue;
    }

    if (has(sec, 'components_side_by_side__section')) {
      const cta = Q(sec, C('components_cta_section') + ' a') || Q(sec, 'a' + C('components_cta'));
      const desk = Q(sec, 'img' + C('components_body__figure_desktop'));
      const mob = Q(sec, 'img' + C('components_body__figure_mobile'));
      const content = Q(sec, C('components_content'));
      const cst = styleMap(content);
      const side = [...(Q(sec, C('components_body'))?.classList || [])].map((c) => /^components_body__(left|right)__/.exec(c)).find(Boolean);
      sections.push({
        kind: 'side-by-side', ...base,
        title: T(Q(sec, C('components_body__title'))) || T(Q(sec, 'h2')),
        blocks: RICH(Q(sec, C('components_body__description_text'))),
        cta: link(cta),
        image: desk ? IMG(desk) : IMG(Q(sec, 'figure')),
        imageMobile: mob ? IMG(mob) : null,
        contentSide: side ? side[1] : null,
        textAlign: cst['text-align'] || null,
      });
      continue;
    }

    // fallback: nothing in <main> is dropped
    const body = sec.cloneNode(true);
    QA(body, 'script, style').forEach((n) => n.remove());
    sections.push({ kind: 'unknown', ...base, className: sec.className, blocks: RICH(body), links: QA(sec, 'a[href]').map(link).filter((l) => l && l.label), buttons: QA(sec, 'button').map((b) => T(b)).filter(Boolean), images: QA(sec, 'img').map(IMG).filter(Boolean) });
  }

  return { h1: T(Q(root, 'h1')) || null, sections };
}
