// components.mjs — shared template pieces.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, esc, attr, t, decode, href, icon, image, imgTag, readJSON, cx } from './lib.mjs';
const CHOOSE_STORE = (readJSON(path.join(ROOT, 'src/content/chrome.json'), { chooser: { chooseStore: { text: 'Choose your Store' } } }).chooser.chooseStore.text);

// ---- product index: card data is joined with the product page's own model ---------------
const models = new Map();
for (const f of fs.readdirSync(path.join(ROOT, 'src/content/model'))) {
  const r = readJSON(path.join(ROOT, 'src/content/model', f));
  if (!r || !r.url) continue;
  // a pathname and its ?sort= variant share one key; the variant must never displace the base
  // page (it would be skipped as a query variant and the base page would not be written)
  const key = new URL(r.url).pathname.replace(/\/+$/, '') || '/';
  const prev = models.get(key);
  if (prev && !new URL(prev.url).search && new URL(r.url).search) continue;
  models.set(key, r);
}
export const modelAt = (p) => models.get(String(p || '').split('?')[0].replace(/\/+$/, '') || '/');

// ---- meta description for pages the SOURCE left without one ---------------------------------
// Never typed copy. In order: (1) the page's first paragraph of 60+ characters, verbatim, cut at
// a word boundary to <=155 (template placeholders like "[Name]" skipped); (2) for pages with no
// prose (collections, listings), a line built ONLY from captured strings: the page H1 (or the
// source <title> when the model has none), the parent collection's H1, the store name and
// address from the chrome capture, and the banner's own tagline where it has one. Every
// derivation is recorded in src/content/derived-descriptions.json.
export const derivedDescriptions = [];
// case only: words with no vowel stay capitals (CBD, THC); no capital after a hyphen ("Pre-rolls", as the nav writes it)
const titleCase = (s) => String(s).split(/(\s+)/).map((w) => (/^[^aeiouy]+$/i.test(w) ? w : w.toLowerCase().replace(/^([("']?)([a-z])/, (m, a, b) => a + b.toUpperCase()))).join('');
const STORE = (() => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'src/content/chrome.json'), 'utf8')).store; } catch { return null; } })();
export function describe(url, fallbackH1 = '') {
  const p = String(url || '').replace(/^https?:\/\/[^/]+/, '').split('?')[0].replace(/\/+$/, '') || '/';
  const r = modelAt(p); if (!r) return '';
  const m = r.model || {};
  const paras = [];
  const walk = (x) => { if (!x || typeof x !== 'object') return; if (Array.isArray(x)) { x.forEach(walk); return; } if (x.t === 'p' && x.text) paras.push(x.text); for (const k of Object.keys(x)) if (x[k] && typeof x[k] === 'object') walk(x[k]); };
  walk(m);
  const first = paras.map((s) => s.replace(/\s+/g, ' ').trim()).find((s) => s.length >= 60 && !/\[[^\]]+\]/.test(s));
  let text = '', method = '';
  if (first) {
    text = first.length <= 155 ? first : first.slice(0, 154).replace(/\s+\S*$/, '').replace(/[\s,;:–—-]+$/, '') + '…';
    method = 'first-paragraph';
  } else if ((m.h1 || fallbackH1) && STORE && STORE.name && STORE.address) {
    const parentPath = p.split('/').slice(0, -1).join('/');
    const parent = /^\/collection\/[^/]+\/[^/]+$/.test(p) ? modelAt(parentPath) : null;
    const sub = parent && parent.model && parent.model.h1 ? ' (' + titleCase(parent.model.h1) + ')' : '';
    // a tagline that only repeats the H1 ("Best 510 THREAD") adds nothing and is left out
    const bd = m.banner && m.banner.description ? m.banner.description.trim() : '';
    const tag = bd && !(m.h1 && bd.toLowerCase().includes(String(m.h1).toLowerCase())) ? ' ' + bd : '';
    text = titleCase(m.h1 || fallbackH1) + sub + ' at ' + STORE.name + ', ' + STORE.address + '.' + tag;
    method = 'facts-line:' + (m.h1 ? 'h1' : 'source-title') + (sub ? '+parent-h1' : '') + '+chrome.store' + (tag ? '+banner-tagline' : '');
  }
  if (text) derivedDescriptions.push({ page: p, method, description: text, from: method === 'first-paragraph' ? first : null });
  return text;
}
export const allModels = () => [...models.values()];

const strainKey = (s) => String(s || '').toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '');
const pct = (v) => (v == null || v === '' ? null : String(v).replace(/\s+/g, ''));
const priceNum = (p) => parseFloat(String(p || '').replace(/[^\d.]/g, '')) || 0;

// card: CARD()/ITEMLIST() shape from the extractors; returns merged display data
// Product JSON-LD lives outside <main>, so it is not in the product model: join it from the SEO
// inventory (read from the raw server HTML). Price for the 77 pages whose purchase area never loaded.
const SEO = new Map((readJSON(path.join(ROOT, 'audit/seo-inventory.json'), { pages: [] }).pages).map((p) => [new URL(p.url).pathname.replace(/\/+$/, '') || '/', p]));
export function ldProduct(p) {
  const s = SEO.get(String(p || '').split('?')[0].replace(/\/+$/, ''));
  return s ? (s.jsonLd || []).find((j) => j && j['@type'] === 'Product') || null : null;
}
const detail = (pm, k) => { const d = (pm.details || []).find((x) => String(x.label).toUpperCase() === k); return d ? d.value : null; };
export function cardData(card) {
  const m = modelAt(card.url);
  const pm = m && m.model ? m.model : {};
  const ld = ldProduct(card.url);
  const pimg = (pm.image && pm.image.src) || (ld && typeof ld.image === 'string' ? ld.image : '');
  const img = (card.image && card.image.src) || pimg;
  const st = pm.strainType && typeof pm.strainType === 'object' ? pm.strainType : null;
  const strain = card.strain || (st && st.label) || null;
  return {
    url: card.url, name: decode(card.name || pm.h1 || pm.name || ''), brand: decode(card.brand || (pm.brand && (pm.brand.label || pm.brand)) || ''),
    price: card.price || (pm.price && pm.price.current) || (pm.variants && pm.variants[0] && pm.variants[0].price) || (ld && ld.offers && ld.offers.price ? '$' + ld.offers.price : ''),
    weight: card.weight || (pm.variants && pm.variants[0] && pm.variants[0].weight) || ((pm.about || []).find((a) => a.label === 'Available Weights') || {}).value || '',
    strain, strainKey: card.strainKey || (st && st.key) || strainKey(strain),
    thc: pct(card.thc || detail(pm, 'THC')), tac: pct(card.tac || detail(pm, 'TAC')), cbd: pct(card.cbd || detail(pm, 'CBD')),
    badges: card.badges || [], stockPhoto: !!(card.stockPhoto || pm.stockPhoto), stockLabel: card.stockPhotoLabel || 'Stock photo',
    addLabel: card.addToCartLabel || 'Add To Cart', sep: card.weightSeparator || '/',
    desc: decode(card.description || ''), imageUrl: img, alt: decode((card.image && card.image.alt) || (pm.image && pm.image.alt) || card.name || ''),
  };
}

export function productCard(card, { page = '', i = 0, lazy = true } = {}) {
  const d = cardData(card);
  const im = image(d.imageUrl, { max: 640, widths: [320, 640], page });
  const extraBadges = d.badges.filter((b) => b && b !== d.brand && b.toUpperCase() !== String(d.brand).toUpperCase() && !/^(THC|TAC|CBD):/i.test(b) && String(b).toLowerCase() !== String(d.strain || '').toLowerCase());
  const add = { url: d.url, name: d.name, price: d.price, weight: d.weight, image: im ? im.src : '' };
  return `<article class="pcard reveal" data-tilt data-card data-brand="${attr(d.brand)}" data-strain="${attr(d.strainKey || '')}" data-price="${priceNum(d.price)}" data-name="${attr(d.name)}" style="--i:${i % 6}">
  <div class="pcard__media">${im ? imgTag(im, { alt: d.alt, sizes: '(max-width: 720px) 76vw, 300px', lazy }) : `<span class="sr-only">${t(d.alt)}</span>`}
    ${d.strain ? `<span class="strain strain--${attr(d.strainKey)} pcard__strain">${t(d.strain)}</span>` : ''}
    ${d.stockPhoto ? `<span class="pcard__stock">${t(d.stockLabel)}</span>` : ''}</div>
  <div class="pcard__body">
    ${d.brand ? `<span class="pcard__brand">${t(d.brand)}</span>` : ''}
    <h3 class="pcard__name"><a href="${attr(href(d.url))}">${t(d.name)}</a></h3>
    <div class="pcard__metrics">${d.thc ? `<span class="metric"><b>THC:</b> ${t(d.thc)}</span>` : ''}${d.tac ? `<span class="metric"><b>TAC:</b> ${t(d.tac)}</span>` : ''}${d.cbd ? `<span class="metric"><b>CBD:</b> ${t(d.cbd)}</span>` : ''}${extraBadges.map((b) => `<span class="chip">${t(b)}</span>`).join('')}</div>
    ${d.desc ? `<p class="pcard__desc">${t(d.desc)}</p>` : ''}
    <div class="pcard__foot">
      <span class="pcard__price">${t(d.price)}${d.weight ? ` <small>${t(d.sep)} ${t(d.weight)}</small>` : ''}</span>
      <button class="btn btn--sun btn--sm" type="button" data-add="${attr(JSON.stringify(add))}">${icon.bag}<span class="lbl-live">${t(d.addLabel)}</span><span class="lbl-ssr">${t(CHOOSE_STORE)}</span></button>
    </div>
  </div>
</article>`;
}

// ---- store hours + live status --------------------------------------------------------------
// Source: the dispensary page's "Hours" list ("Monday 10:00 AM - 9:00 PM" x7). The source printed
// a live status frozen at crawl time ("CLOSED" / "until 10:00 AM ET"); here it is computed in the
// browser from these hours in America/New_York. Without JS only the hours show (always true).
const toMin = (s) => { const m = String(s).match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i); if (!m) return null; let h = Number(m[1]) % 12; if (/PM/i.test(m[3])) h += 12; return h * 60 + Number(m[2]); };
export function storeHours() {
  const r = modelAt('/dispensary/sunny-dayz'); if (!r) return null;
  const b = r.model.blocks || []; const i = b.findIndex((x) => /^h\d$/.test(x.t) && /^Hours$/i.test(x.text));
  const list = i >= 0 ? b.slice(i + 1).find((x) => x.t === 'ol' || x.t === 'ul') : null;
  if (!list) return null;
  const rows = list.items.map((it) => { const m = it.text.match(/^(\w+)\s+(.+?)\s*-\s*(.+)$/); return m ? { day: m[1], text: it.text, open: toMin(m[2]), close: toMin(m[3]), openLabel: m[2].trim(), closeLabel: m[3].trim() } : null; }).filter(Boolean);
  return rows.length ? rows : null;
}
// tag 'h2' where the widget stands in for a source H2 section (the dispensary page's "Hours")
export function hoursWidget({ heading = 'Hours', status = true, tag = 'p' } = {}) {
  const rows = storeHours(); if (!rows) return '';
  return `<div class="hours" data-store-hours='${attr(JSON.stringify(rows.map((r) => [r.day, r.open, r.close, r.openLabel, r.closeLabel])))}'>
    ${status ? '<p class="hours__status" data-store-status hidden><b data-status-badge></b> <span data-status-msg></span></p>' : ''}
    <${tag} class="eyebrow hours__title">${t(heading)}</${tag}>
    <ul class="hours__list">${rows.map((r) => `<li data-day="${attr(r.day)}"><span>${t(r.day)}</span> <span>${t(r.openLabel)} - ${t(r.closeLabel)}</span></li>`).join('')}</ul>
  </div>`;
}

// ---- breadcrumbs ------------------------------------------------------------------------
export function crumbs(list) {
  if (!list || !list.length) return '';
  return `<nav aria-label="Breadcrumb"><ol class="crumbs">${list.map((c, i) => {
    const last = i === list.length - 1;
    return `<li>${!last && c.href ? `<a href="${attr(href(c.href))}">${t(c.label)}</a>` : `<span${last ? ' aria-current="page"' : ''}>${t(c.label)}</span>`}</li>`;
  }).join('')}</ol></nav>`;
}

// ---- rails ------------------------------------------------------------------------------
export function rail({ id, eyebrow, title, count, seeAll, cards, controls, page }) {
  // a control label arrives as a string or as the source's { ariaLabel } object
  const lab = (v, d) => (typeof v === 'string' ? v : (v && v.ariaLabel) || d);
  const prev = lab(controls && controls.prev, 'Previous'), next = lab(controls && controls.next, 'Next');
  return `<section class="section section--tight" aria-labelledby="${id}-h">
  <div class="shell rail" data-rail>
    <div class="section-head">
      <div>${eyebrow ? `<span class="eyebrow">${t(eyebrow)}</span>` : ''}<h2 id="${id}-h">${t(title)}${count != null ? ` <span class="count-pill">${count}</span>` : ''}</h2></div>
      <div class="cluster">
        ${seeAll && seeAll.href ? `<a class="see-all" href="${attr(href(seeAll.href))}"${seeAll.ariaLabel ? ` aria-label="${attr(seeAll.ariaLabel)}"` : ''}>${t(seeAll.label || 'See All')}${icon.arrow}</a>` : ''}
        <div class="rail__ctrls"><button class="icon-btn" type="button" data-prev aria-label="${attr(prev)}">${icon.arrowL}</button><button class="icon-btn" type="button" data-next aria-label="${attr(next)}">${icon.arrow}</button></div>
      </div>
    </div>
    <div class="rail__track" tabindex="0" aria-label="${attr(title)}">${cards.map((c, i) => productCard(c, { page, i })).join('')}</div>
    <div class="rail__progress" aria-hidden="true"><span></span></div>
  </div>
</section>`;
}

// ---- fal category art + pop tiles ---------------------------------------------------------
const GEN = readJSON(path.join(ROOT, 'assets/generated/manifest.json'), { items: [] });
const genBySlug = new Map(GEN.items.map((g) => [g.slug, g]));
// category href -> generated slug + frame tuning (window top, focal point, scale origin)
export const CAT_ART = {
  // one shared window line (46%) keeps the grid's rhythm; every subject's top sits between 7% and 33%
  // of the tile height (measured per image), so each one stands out of its frame. origin = subject base.
  '/collection/flower': { slug: 'flower', top: '46%', origin: '50% 66%' },
  '/collection/preroll': { slug: 'pre-rolls', top: '46%', origin: '48% 72%' },
  '/collection/concentrates': { slug: 'concentrates', top: '46%', origin: '52% 74%' },
  '/collection/extract': { slug: 'concentrates', top: '46%', origin: '52% 74%' },
  '/collection/cartridge': { slug: 'vapes-cartridges', top: '46%', origin: '50% 88%' },
  '/collection/tincture': { slug: 'tinctures', top: '46%', origin: '52% 90%' },
  '/collection/edible': { slug: 'edibles', top: '46%', origin: '52% 66%' },
  '/collection/beverage': { slug: 'beverages', top: '46%', origin: '50% 88%' },
  '/collection/topical': { slug: 'topicals', top: '46%', origin: '50% 76%' },
  '/collection/merch': { slug: 'accessories', top: '46%', origin: '58% 70%' },
  '/collection/cbd': { slug: 'cbd', top: '46%', origin: '50% 74%' },
  '/collection/pill': { slug: 'capsules', top: '46%', origin: '50% 80%' },
};
export const genAlt = {
  flower: 'Illustrative photo: a cannabis flower bud', 'pre-rolls': 'Illustrative photo: pre-rolled joints', concentrates: 'Illustrative photo: amber rosin concentrate on a glass dish',
  'vapes-cartridges': 'Illustrative photo: a vape cartridge of golden oil', tinctures: 'Illustrative photo: an amber tincture dropper bottle', edibles: 'Illustrative photo: fruit gummies',
  beverages: 'Illustrative photo: a sparkling citrus drink', topicals: 'Illustrative photo: a jar of balm', accessories: 'Illustrative photo: a grinder and glass pipe on a tray',
  cbd: 'Illustrative photo: hemp leaves around an oil dropper bottle', capsules: 'Illustrative photo: gel capsules on a saucer', 'sunlit-canopy': 'Illustrative photo: sunlit cannabis leaves',
};
export function gen(slug, w = 800) {
  const g = genBySlug.get(slug); if (!g) return null;
  const ratio = g.width / g.height;
  // 1200w sits between 800 and 1600: a DPR-3 phone needs ~1,000px for a tile or a collection hero
  return { src: `/assets/img/gen/${slug}-${w}.webp`, srcset: `/assets/img/gen/${slug}-800.webp 800w, /assets/img/gen/${slug}-1200.webp 1200w, /assets/img/gen/${slug}-1600.webp 1600w`, width: w, height: Math.round(w / ratio), cut: g.cutout ? `/assets/img/gen/${slug}-cutout-${w}.webp` : null, cutSrcset: g.cutout ? `/assets/img/gen/${slug}-cutout-800.webp 800w, /assets/img/gen/${slug}-cutout-1200.webp 1200w, /assets/img/gen/${slug}-cutout-1600.webp 1600w` : null };
}
// load: 'lazy' (default) | 'eager' | 'high' — page-top art must not wait for layout; 'high' raises ONE
// image (the cut-out when there is one, it is the largest paint) so the two do not compete
export function popFigure(slug, { top, pos = '50% 50%', origin = '50% 70%', ratio = '1 / 1.05', sizes = '(max-width: 720px) 90vw, 320px', cls = '', scroll = true, alt, load = 'lazy' } = {}) {
  const g = gen(slug); if (!g) return '';
  const flat = !g.cut || top === '0%';
  const altText = alt ?? genAlt[slug] ?? '';
  const how = (hi) => (load === 'lazy' ? ' loading="lazy" decoding="async"' : ` loading="eager" decoding="async"${load === 'high' && hi ? ' fetchpriority="high"' : ''}`);
  return `<figure class="${cx('pop', flat && 'pop--flat', cls)}" style="--pop-top:${flat ? '0%' : top || '40%'}; --pop-pos:${pos}; --pop-origin:${origin}; --pop-ratio:${ratio}">
  <span class="pop__outline${scroll ? ' scroll-drift' : ''}" aria-hidden="true"></span><span class="pop__floor" aria-hidden="true"></span>
  <img class="pop__back" src="${g.src}" srcset="${g.srcset}" sizes="${attr(sizes)}" width="${g.width}" height="${g.height}" alt="${attr(altText)}"${how(flat)}>
  <span class="pop__frame" aria-hidden="true"></span>
  ${!flat ? `<img class="pop__cut${scroll ? ' scroll-rise' : ''}" src="${g.cut}" srcset="${g.cutSrcset}" sizes="${attr(sizes)}" width="${g.width}" height="${g.height}" alt=""${how(true)}>` : ''}
</figure>`;
}
export function catTile(tile, i = 0) {
  const a = CAT_ART[String(tile.href || '').split('?')[0]];
  const fig = a ? popFigure(a.slug, a) : '';
  return `<a class="cat reveal reveal--pop" href="${attr(href(tile.href))}" style="--i:${i % 5}">${fig}<span class="cat__label"><span>${t(tile.label)}</span>${icon.arrow}</span></a>`;
}

// ---- rich text ----------------------------------------------------------------------------
// blocks from RICH(); extra H1s demote to H2 (one H1 per page), every string kept.
export function rich(blocks, { page = '', demoteFrom = 1 } = {}) {
  return (blocks || []).map((b) => {
    if (/^h[1-6]$/.test(b.t)) { let n = Number(b.t[1]); if (n <= demoteFrom) n = demoteFrom + 1; n = Math.min(n, 6); return `<h${n}>${t(b.text)}</h${n}>`; }
    if (b.t === 'p') return `<p>${b.html ? safeInline(b.html) : t(b.text)}</p>`;
    if (b.t === 'ul' || b.t === 'ol') return `<${b.t}>${b.items.map((x) => `<li>${x.html ? safeInline(x.html) : t(x.text)}</li>`).join('')}</${b.t}>`;
    if (b.t === 'quote') return `<blockquote>${t(b.text)}</blockquote>`;
    if (b.t === 'table') return `<table>${b.rows.map((r, i) => `<tr>${r.map((c) => (i === 0 ? `<th>${t(c)}</th>` : `<td>${t(c)}</td>`)).join('')}</tr>`).join('')}</table>`;
    if (b.t === 'img') { const im = image(b.src, { max: 1400, widths: [700, 1400], page }); return im ? `<figure class="reveal">${imgTag(im, { alt: b.alt || '', sizes: '(max-width: 900px) 100vw, 860px' })}</figure>` : ''; }
    if (b.t === 'hr') return '<hr>';
    return '';
  }).join('\n');
}
// inline HTML from RICH(): only a/strong/b/em/i/br/sup/sub/u/small/code survive; hrefs normalised
export function safeInline(html) {
  return String(html)
    .replace(/<(?!\/?(a|strong|b|em|i|br|sup|sub|u|small|code)\b)[^>]*>/gi, '')
    .replace(/<a\b[^>]*href="([^"]*)"[^>]*>/gi, (m, h) => `<a href="${attr(href(decode(h)))}">`)
    .replace(/ /g, ' ');
}
export { strainKey, priceNum, esc };
