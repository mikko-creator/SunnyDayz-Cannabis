// layout.mjs — document shell: <head>, header + mega menu, mobile drawer + dock, footer, overlays.
import path from 'node:path';
import { ROOT, ORIGIN, esc, attr, t, href, icon, image, imgTag, readJSON, pathOf, dropped, knownImage } from './lib.mjs';
import { describe } from './components.mjs';

const chrome = readJSON(path.join(ROOT, 'src/content/chrome.json'));
// dead links (src/content/link-fixes.json, to:null) are left out of every menu
const live = (links) => (links || []).filter((l) => !dropped(l.href));
const seo = new Map((readJSON(path.join(ROOT, 'audit/seo-inventory.json'), { pages: [] }).pages).map((p) => [p.url, p]));
const gate = readJSON(path.join(ROOT, 'audit/age-gate/age-gate.json'), {});
// motion.css (the source's 52 keyframes, kept verbatim as evidence for gate C11) is built but not linked:
// nothing references its keyframes or its --dur-* tokens, and its reduced-motion block is duplicated in
// redesign-motion.css — linking it cost every page a render-blocking request for dead code.
export const CSS = ['tokens', 'base', 'neumorph', 'components', 'redesign-motion'];
export const BUILD_ID = process.env.SDZ_BUILD_ID || 'v2';
// a store address in a pill wraps on phones: keep the ZIP with the state so it never stands alone
export const addr = (s) => t(s).replace(/ (\d{5}(?:-\d{4})?)$/, '&nbsp;$1');

export function logoImg(cls = '', lazy = true) {
  const im = image(chrome.logo && chrome.logo.src, { max: 600, widths: [300, 600], page: 'chrome' });
  return imgTag(im, { alt: 'Sunny Dayz', cls, sizes: '140px', lazy });
}

// JSON-LD: keep the source's structured data; images point at the local copy (absolute).
function ldImages(node) {
  if (Array.isArray(node)) return node.map(ldImages);
  if (!node || typeof node !== 'object') return node;
  const out = {};
  for (const [k, v] of Object.entries(node)) {
    if (k === 'image' && typeof v === 'string') { const im = image(v, { max: 1200, widths: [1200], page: 'jsonld' }); out[k] = im ? ORIGIN + im.src : v; }
    else if (k === 'image' && Array.isArray(v)) out[k] = v.map((x) => { const im = typeof x === 'string' ? image(x, { max: 1200, widths: [1200], page: 'jsonld' }) : null; return im ? ORIGIN + im.src : x; });
    else out[k] = ldImages(v);
  }
  return out;
}

export function head({ url, title, description, robots, extraLd = [], preload = [], titleOverride, descriptionOverride, ldExclude = [], ogImage = '' }) {
  const s = seo.get(url) || {};
  const ttl = titleOverride || s.title || title || 'Sunny Dayz';
  const desc = descriptionOverride || s.metaDescription || description || describe(url, s.title || title);
  const canon = s.canonical || (ORIGIN + (pathOf(url) === '/' ? '' : pathOf(url)));
  const rob = robots || s.metaRobots || 'index, follow';
  const og = s.openGraph || {};
  // og:image: the source's own, served from its local copy; else the page's first content image
  // as built (page() reads it off the body). Always a file this build serves, never a dead URL.
  const ogSrc = knownImage(og['og:image']) ? image(og['og:image'], { max: 1200, widths: [1200], page: 'og' }) : null;
  const ogi = ogSrc ? ORIGIN + ogSrc.src : ogImage;
  const ld = (s.jsonLd || []).filter((j) => !ldExclude.includes(j && j['@type'])).map(ldImages).concat(extraLd);
  return `<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<script>document.documentElement.className = document.documentElement.className.replace('no-js', 'js');</script>
<title>${t(ttl)}</title>
${desc ? `<meta name="description" content="${t(desc)}">\n` : ''}<meta name="robots" content="${attr(rob)}">
<link rel="canonical" href="${attr(canon)}">
<meta name="theme-color" content="#eee6d8">
<meta property="og:site_name" content="Sunny Dayz">
<meta property="og:title" content="${t(og['og:title'] || ttl)}">
${desc ? `<meta property="og:description" content="${t(og['og:description'] || desc)}">\n` : ''}<meta property="og:url" content="${attr(canon)}">
<meta property="og:type" content="${attr(og['og:type'] || 'website')}">
${ogi ? `<meta property="og:image" content="${attr(ogi)}">\n` : ''}<link rel="icon" href="/assets/img/brand/favicon.svg" type="image/svg+xml">
<link rel="preload" href="/assets/fonts/fraunces-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/poppins-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
${preload.join('\n')}
${CSS.map((c) => `<link rel="stylesheet" href="/styles/${c}.css?${BUILD_ID}">`).join('\n')}
<script src="/scripts/site.js?${BUILD_ID}" defer></script>
${ld.map((j) => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, '\\u003c')}</script>`).join('\n')}
</head>`;
}

function megaMenu(id) {
  const m = chrome.mega;
  const list = (links) => `<ul class="mega__list">${links.map((l) => `<li><a href="${attr(href(l.href))}">${t(l.label)}</a></li>`).join('')}</ul>`;
  return `<div class="mega" id="${id}" role="region" aria-label="${attr('Shop')}">
  <div><h3>${t(m.category.title)}</h3>${list(live(m.category.links))}</div>
  <div><h3>${t(m.classification.title)}</h3>${list(live(m.classification.links))}</div>
  <div><h3>${t(m.brand.title)}</h3><div class="mega__brands">${live(m.brand.links).map((b) => {
    const im = image(b.logo, { max: 128, widths: [128], page: 'chrome' });
    return `<a class="mega__brand" href="${attr(href(b.href))}">${im ? imgTag(im, { alt: '', sizes: '52px' }) : ''}<span>${t(b.label)}</span></a>`;
  }).join('')}</div></div>
</div>`;
}

// Treez fulfilment chooser: the source renders it twice (desktop + mobile); so does this build.
function chooser(id) {
  const c = chrome.chooser, s = chrome.store;
  return `<div class="chooser" id="${id}" role="dialog" aria-modal="false" aria-labelledby="${id}-h" hidden>
    <h2 id="${id}-h">${t(c.heading.text)}</h2>
    <div class="chooser__opt" data-opt="pickup">
      <span class="store-pill__badge">${t(s.mode)}</span>
      <span class="store-pill__text"><b>${t(s.name)}</b><span>${addr(s.address)}</span></span>
      <button class="btn btn--sm" type="button" data-mode="pickup" aria-pressed="true">${t(c.chooseStore.text)}</button>
    </div>
    <div class="chooser__opt" data-opt="express">
      ${icon.truck}
      <span class="store-pill__text"><b data-mode-text="pickup">${t(chrome.express.lead)}</b><b data-mode-text="express" hidden>${t(c.expressLead.text)}</b></span>
      <a class="btn btn--sm btn--pine" href="/shop" data-mode="express" data-integration="treez-express-delivery" aria-pressed="false">${t(chrome.express.action)}</a>
    </div>
  </div>`;
}

// the action text stays verbatim; its last word and the arrow share a nowrap span so the arrow never
// wraps onto a line of its own (a no-break space does not stop Chrome breaking before an inline svg)
function ribbonGo() {
  const act = String(chrome.express.action), k = act.lastIndexOf(' ');
  return k > 0 ? `${t(act.slice(0, k))} <span class="ribbon__tail">${t(act.slice(k + 1))}${icon.arrow}</span>` : `<span class="ribbon__tail">${t(act)}${icon.arrow}</span>`;
}
export function ribbon() {
  const c = chrome.chooser;
  return `<div class="shell"><a class="ribbon reveal" href="/shop" data-mode="express" data-integration="treez-express-delivery">${icon.truck}<b class="lbl-ssr">${t(c.expressLead.text)}</b><b class="lbl-live" data-mode-text="pickup">${t(chrome.express.lead)}</b><b class="lbl-live" data-mode-text="express" hidden>${t(c.expressLead.text)}</b><span class="ribbon__go">${ribbonGo()}</span></a></div>`;
}

export function header(url) {
  const here = pathOf(url);
  const cur = (h) => (h && pathOf(ORIGIN + h) === here ? ' aria-current="page"' : '');
  const nav = chrome.nav.map((n) => n.mega
    ? `<button class="nav__link" type="button" data-mega aria-expanded="false" aria-controls="mega-shop">${t(n.label)}${icon.chevron}</button>`
    : `<a class="nav__link" href="${attr(href(n.href))}"${cur(n.href)}>${t(n.label)}</a>`).join('');
  return `<a class="skip-link" href="#main">Skip to content</a>
<a class="announce" href="${attr(href(chrome.announcementLink.href))}"><span class="announce__text">${t(chrome.announcement)}</span>${icon.arrow}</a>
<header class="site-header" data-header>
  <div class="nav">
    <a class="nav__logo" href="/" aria-label="Sunny Dayz — Home">${logoImg('', false)}</a>
    <nav class="nav__links" aria-label="Main">${nav}</nav>
    <div class="nav__tools">
      <button class="store-pill" type="button" data-chooser-open aria-expanded="false" aria-controls="chooser"><span class="store-pill__badge">${t(chrome.store.mode)}</span><span class="store-pill__text"><b>${t(chrome.store.name)}</b><span>${addr(chrome.store.address)}</span></span></button>
      <button class="icon-btn" type="button" data-cart-open aria-label="${attr(chrome.cart.title)}">${icon.bag}<span class="icon-btn__count" data-cart-count hidden>0</span></button>
      <button class="icon-btn nav__burger" type="button" data-mnav-open aria-expanded="false" aria-controls="mnav" aria-label="Menu">${icon.menu}</button>
    </div>
    ${megaMenu('mega-shop')}
    ${chooser('chooser')}
  </div>
</header>
<div class="mnav" id="mnav" role="dialog" aria-modal="true" aria-label="Menu">
  <div class="mnav__head"><a class="nav__logo" href="/" aria-label="Sunny Dayz — Home">${logoImg()}</a><button class="icon-btn" type="button" data-mnav-close aria-label="Close menu">${icon.close}</button></div>
  <div class="mnav__body">
    <a class="mnav__plain" href="/">${t(chrome.nav[0].label)}</a>
    <details><summary>${t(chrome.mega.category.title)}</summary><ul class="mega__list">${live(chrome.mega.category.links).map((l) => `<li><a href="${attr(href(l.href))}">${t(l.label)}</a></li>`).join('')}</ul></details>
    <details><summary>${t(chrome.mega.classification.title)}</summary><ul class="mega__list">${live(chrome.mega.classification.links).map((l) => `<li><a href="${attr(href(l.href))}">${t(l.label)}</a></li>`).join('')}</ul></details>
    <details><summary>${t(chrome.mega.brand.title)}</summary><ul class="mega__list">${live(chrome.mega.brand.links).map((l) => `<li><a href="${attr(href(l.href))}">${t(l.label)}</a></li>`).join('')}</ul></details>
    ${chrome.nav.slice(2).map((n) => `<a class="mnav__plain" href="${attr(href(n.href))}">${t(n.label)}</a>`).join('')}
    <button class="store-pill" type="button" data-chooser-open aria-expanded="false" aria-controls="chooser-m" style="display:inline-flex;margin-top:8px"><span class="store-pill__badge">${t(chrome.store.mode)}</span><span class="store-pill__text"><b>${t(chrome.store.name)}</b><span>${addr(chrome.store.address)}</span></span></button>
    ${chooser('chooser-m')}
  </div>
</div>`;
}

export function footer(url) {
  const here = pathOf(url);
  const col = (c) => `<div class="footer__col"><h2>${t(c.title)}</h2><ul>${live(c.links).map((l) => `<li><a href="${attr(href(l.href))}">${t(l.label)}</a></li>`).join('')}</ul></div>`;
  const d = chrome.dock;
  const dockCur = (p) => (here === p ? ' aria-current="page"' : '');
  // express band — on the source a fulfilment toggle BUTTON, not a link; the static build opens the
  // menu (/shop, "Menu" in the site's own breadcrumbs). The ordering integration hooks onto
  // data-integration (see docs/DEPLOY.md). Kept out of the markup: shipped HTML carries no build notes.
  return `<footer class="site-footer">
  <span class="tex-contour" aria-hidden="true"></span>
  <div class="shell">
    <a class="express magnet" href="/shop" data-mode="express" data-integration="treez-express-delivery">${icon.truck}<b data-mode-text="pickup">${t(chrome.express.lead)}</b><b data-mode-text="express" hidden>${t(chrome.chooser.expressLead.text)}</b><span class="btn btn--pine btn--sm">${t(chrome.express.action)} ${icon.arrow}</span></a>
    <div class="footer__top">
      <div class="footer__brand">${logoImg()}<p class="muted" style="margin-top:14px">${t(chrome.store.name)}<br>${t(chrome.store.address)}</p></div>
      ${chrome.footer.map(col).join('')}
    </div>
    <div class="compliance">${chrome.compliance.map((p) => `<p>${t(p)}</p>`).join('')}<span class="licence">${t(chrome.licence)}</span></div>
    <div class="footer__base"><span>${t(chrome.copyright)}</span><span>${addr(chrome.store.address)}</span></div>
  </div>
</footer>
<nav class="dock" aria-label="Quick">
  <a href="/"${dockCur('/')}>${icon.home}<span>${t(d[0])}</span></a>
  <a href="/shop"${dockCur('/shop')}>${icon.bag}<span>${t(d[1])}</span></a>
  <button type="button" data-mnav-open aria-expanded="false" aria-controls="mnav">${icon.grid}<span>${t(d[2])}</span></button>
  <a href="/deals"${dockCur('/deals')}>${icon.tag}<span>${t(d[3])}</span></a>
</nav>`;
}

export function overlays() {
  const c = chrome.cart;
  const g = String(gate.text || '').split('\n').map((s) => s.trim()).filter(Boolean);
  const heading = g[0] || 'Please confirm you are at least 21 years of age.';
  const body = g[1] || '';
  const tc = body.includes('Terms & Conditions') ? t(body).replace('Terms &amp; Conditions', '<a href="/terms-and-conditions">Terms &amp; Conditions</a>') : t(body);
  return `<div class="agegate" id="agegate" role="dialog" aria-modal="true" aria-labelledby="agegate-title" data-exit-url="${attr(chrome.ageGateExitUrl || '')}" hidden>
  <div class="agegate__card">
    <div class="sun-orb sun-orb--spin" aria-hidden="true"></div>
    <div class="agegate__logo">${logoImg('', false)}</div>
    <h2 id="agegate-title">${t(heading)}</h2>
    <p>${tc}</p>
    <div class="cluster"><button class="btn btn--sun" type="button" data-age-yes>${t(g[2] || "I'M AT LEAST 21 YEARS OLD")}</button><button class="btn btn--ghost" type="button" data-age-exit>${t(g[3] || 'EXIT THE SITE')}</button></div>
  </div>
</div>
<div class="scrim" id="scrim"></div>
<aside class="drawer" id="cart" role="dialog" aria-modal="true" aria-labelledby="cart-title">
  <div class="drawer__head"><h2 id="cart-title">${t(c.title)}</h2><button class="icon-btn" type="button" data-cart-close aria-label="Close">${icon.close}</button></div>
  <div class="drawer__store"><span class="store-pill"><span class="store-pill__badge">${t(chrome.store.mode)}</span><span class="store-pill__text"><b>${t(c.pickup)} ${t(chrome.store.name)}</b><span>${addr(chrome.store.address)}</span></span></span></div>
  <div class="drawer__body">
    <div class="drawer__empty" data-cart-empty>${icon.bag}<b>${t(c.empty)}</b><a class="btn btn--sm" href="/shop">${t(c.emptyCta)}</a></div>
    <div data-cart-lines></div>
  </div>
  <div class="drawer__foot">
    <div class="drawer__row"><span>${t(c.weight)}</span><b data-cart-weight></b></div>
    <div class="drawer__row"><span>${t(c.subtotal)}</span><b data-cart-subtotal></b></div>
    <a class="btn btn--pine btn--block" href="${ORIGIN}/checkout" data-integration="treez-checkout" rel="nofollow">${t(c.checkout)}</a>
  </div>
</aside>
<div class="toast" id="toast" role="status" aria-live="polite"></div>`;
}

// the first content image in the page body (largest candidate), skipping pop-out cut-outs
function firstContentImage(body) {
  for (const m of String(body).matchAll(/<img\b[^>]*>/g)) {
    const tag = m[0]; const src = (tag.match(/\ssrc="([^"]+)"/) || [])[1] || '';
    if (!/^\/assets\//.test(src) || /-cutout-|\.svg$/.test(src)) continue;
    const set = (tag.match(/\ssrcset="([^"]+)"/) || [])[1];
    const best = set ? set.split(',').map((c) => c.trim().split(/\s+/)).sort((a, b) => parseInt(b[1]) - parseInt(a[1]))[0][0] : src;
    return ORIGIN + best;
  }
  return '';
}
export function page({ url, title, description, robots, body, extraLd, preload, bodyClass = '', titleOverride, descriptionOverride, ldExclude }) {
  return `<!doctype html>
<html lang="en" class="no-js">
${head({ url, title, description, robots, extraLd, preload, titleOverride, descriptionOverride, ldExclude, ogImage: firstContentImage(body) })}
<body${bodyClass ? ` class="${bodyClass}"` : ''}>
${header(url)}
<main class="site-main" id="main" tabindex="-1">
${body}
</main>
${footer(url)}
${overlays()}
</body>
</html>
`;
}
