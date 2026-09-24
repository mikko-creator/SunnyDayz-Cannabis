// _common.js — helpers inlined ahead of every page-type extractor (see src/tools/extract-model.mjs).
// Runs inside headless Chrome against an inert <template>'s DocumentFragment: no layout, so
// innerText is unavailable — T() walks text nodes and puts a space between them instead.
const ORIGIN = 'https://www.sunnydayzcannabis.com';
const T = (el) => {
  if (!el) return '';
  const out = [];
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.parentElement && /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test(n.parentElement.tagName) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
  let n; while ((n = w.nextNode())) out.push(n.nodeValue);
  return out.join(' ').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
};
const Q = (el, sel) => (el ? el.querySelector(sel) : null);
const QA = (el, sel) => (el ? [...el.querySelectorAll(sel)] : []);
// CSS-module class names carry a hashed suffix (breadcrumb_breadcrumb__item__EkT6_); match the stable prefix.
const C = (prefix) => '[class*="' + prefix + '"]';
const rel = (u) => {
  if (!u) return '';
  try { const x = new URL(u, ORIGIN); return x.origin === ORIGIN ? x.pathname + x.search + x.hash : x.href; } catch { return u; }
};
const unwrapNext = (u) => {
  try { const x = new URL(u, ORIGIN); if (x.pathname === '/_next/image' && x.searchParams.get('url')) return new URL(x.searchParams.get('url'), ORIGIN).href; return x.href; } catch { return u; }
};
const largestFromSrcset = (s) => {
  if (!s) return '';
  // Prismic URLs contain commas ("auto=format,compress"); split candidates on ", " + descriptor, not on every comma.
  const cands = s.split(/,\s+(?=https?:|\/)/).map((c) => c.trim().split(/\s+/)).map(([u, d]) => ({ u, w: parseInt(d || '0', 10) || 0 }));
  cands.sort((a, b) => b.w - a.w);
  return cands[0] ? cands[0].u : '';
};
const IMG = (el) => {
  const img = el && (el.tagName === 'IMG' ? el : Q(el, 'img'));
  if (!img) return null;
  const src = unwrapNext(largestFromSrcset(img.getAttribute('srcset')) || img.getAttribute('src') || '');
  if (!src || /product-placeholder\.svg/.test(src)) return { src: '', alt: img.getAttribute('alt') || '', placeholder: true };
  return { src, alt: img.getAttribute('alt') || '' };
};
const LINK = (a) => (a ? { label: T(a), href: rel(a.getAttribute('href')) } : null);
const JSONLD = (root) => QA(root, 'script[type="application/ld+json"]').map((s) => { try { return JSON.parse(s.textContent); } catch { return null; } }).filter(Boolean);
const BREADCRUMB = (root) => {
  const ol = Q(root, 'nav ' + C('breadcrumb_breadcrumb')) || Q(root, C('breadcrumb_breadcrumb'));
  if (!ol) return [];
  return QA(ol, 'li').map((li) => { const a = Q(li, 'a'); return { label: T(li), href: a ? rel(a.getAttribute('href')) : null }; });
};
// Rich text -> blocks. Keeps every text-bearing node; unknown containers recurse.
const RICH = (el) => {
  const blocks = [];
  const inline = (node) => {
    // inline HTML with only safe tags, links made site-relative
    const clone = node.cloneNode(true);
    QA(clone, '*').forEach((x) => {
      if (!/^(A|STRONG|B|EM|I|BR|SPAN|SUP|SUB|U|SMALL|CODE)$/.test(x.tagName)) { x.replaceWith(...x.childNodes); return; }
      [...x.attributes].forEach((at) => { if (!(x.tagName === 'A' && at.name === 'href')) x.removeAttribute(at.name); });
      if (x.tagName === 'A') { x.setAttribute('href', rel(x.getAttribute('href'))); if (!/^\//.test(x.getAttribute('href'))) x.setAttribute('rel', 'noopener'); }
      if (x.tagName === 'SPAN') x.replaceWith(...x.childNodes);
    });
    return clone.innerHTML.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
  };
  const walk = (node) => {
    for (const ch of node.children) {
      const tag = ch.tagName;
      if (/^(SCRIPT|STYLE|NOSCRIPT|SVG|BUTTON|FORM|INPUT|SELECT|TEXTAREA|IFRAME)$/.test(tag)) continue;
      if (/^H[1-6]$/.test(tag)) { const t = T(ch); if (t) blocks.push({ t: tag.toLowerCase(), text: t }); continue; }
      if (tag === 'P' || tag === 'PRE') { const t = T(ch); if (t) blocks.push({ t: 'p', text: t, html: inline(ch) }); const im = Q(ch, 'img'); if (im && !t) { const i = IMG(im); if (i && i.src) blocks.push({ t: 'img', ...i }); } continue; }
      if (tag === 'UL' || tag === 'OL') { const items = QA(ch, ':scope > li').map((li) => ({ text: T(li), html: inline(li) })).filter((x) => x.text); if (items.length) blocks.push({ t: tag.toLowerCase(), items }); continue; }
      if (tag === 'BLOCKQUOTE') { const t = T(ch); if (t) blocks.push({ t: 'quote', text: t }); continue; }
      if (tag === 'TABLE') { const rows = QA(ch, 'tr').map((tr) => QA(tr, 'th,td').map((c) => T(c))); if (rows.length) blocks.push({ t: 'table', rows }); continue; }
      if (tag === 'IMG' || (tag === 'FIGURE' && Q(ch, 'img') && !T(ch))) { const i = IMG(ch); if (i && i.src) blocks.push({ t: 'img', ...i }); continue; }
      if (tag === 'HR') { blocks.push({ t: 'hr' }); continue; }
      if (ch.children.length) walk(ch);
      else { const t = T(ch); if (t) blocks.push({ t: 'p', text: t, html: inline(ch) }); }
    }
  };
  if (el) walk(el);
  return blocks;
};
// Product card (home carousels, brand / strain / listing grids). Image is joined at build time
// from the product page's own model when the card only carries the lazy-load placeholder.
const CARD = (el) => {
  const a = Q(el, 'a' + C('product__stretched_link')) || Q(el, 'a[href*="/product/"]');
  const strain = Q(el, C('StrainInfo_flower__type'));
  const strainCls = strain ? ([...strain.classList].find((c) => /StrainInfo_type__(?!default)/.test(c)) || '') : '';
  const badges = QA(el, C('product_info__') + ':not(' + C('product_info__item_conteiner') + '):not(' + C('product_info__dot') + ')').map((b) => T(b)).filter(Boolean);
  const metric = (k) => { const b = badges.find((x) => x.toUpperCase().startsWith(k + ':')); return b ? b.slice(k.length + 1).trim() : null; };
  return {
    url: a ? rel(a.getAttribute('href')) : null,
    name: T(Q(el, C('product__name'))),
    brand: badges.find((x) => !/:/.test(x) && x === x.toUpperCase()) || null,
    price: T(Q(el, C('product_price') + ' ins')) || null,
    weight: T(Q(el, C('product_variation__message'))) || null,
    strain: strain ? T(strain) : null,
    strainKey: strainCls ? strainCls.replace(/^.*StrainInfo_type__/, '').replace(/__.*$/, '') : null,
    thc: metric('THC'), tac: metric('TAC'), cbd: metric('CBD'),
    badges,
    image: IMG(el),
    stockPhoto: /Stock photo/i.test(T(el)),
  };
};
// JSON-LD ItemList -> cards (collection pages render an empty grid; the list is declared here).
const ITEMLIST = (root) => {
  const list = JSONLD(root).find((j) => j['@type'] === 'ItemList');
  if (!list) return [];
  return (list.itemListElement || []).map((li) => li.item || li).map((p) => ({
    url: rel(p.url || (p.offers && p.offers.url) || ''), name: p.name || '', brand: typeof p.brand === 'string' ? p.brand : (p.brand && p.brand.name) || null,
    description: p.description || '', image: p.image ? { src: Array.isArray(p.image) ? p.image[0] : p.image, alt: p.name || '' } : null,
    price: p.offers && (p.offers.price || (p.offers.lowPrice)) ? '$' + (p.offers.price || p.offers.lowPrice) : null,
    availability: p.offers && p.offers.availability ? String(p.offers.availability).replace(/^.*\//, '') : null,
  }));
};
