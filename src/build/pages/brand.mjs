// brand.mjs — /brand/* and /brands. Model: src/content/model-spec/brand.md.
// The brand DOM carries no logos (spec §5.3). Logos are joined from the site header's captured
// mega menu (src/content/chrome.json — rendered DOM), matched by href; brands without one get a
// wordmark disc. /brands shows every brand: the source's 24 tiles + the 6 brand pages its first
// page left out, with the source's own "Load more brands" revealing the rest.
import path from 'node:path';
import { ROOT, t, attr, href, icon, image, imgTag, readJSON, decode, dropped } from '../lib.mjs';
import { page } from '../layout.mjs';
import { crumbs, allModels } from '../components.mjs';
import { banner, toolbar, grid, toCard } from './_grid.mjs';

const chrome = readJSON(path.join(ROOT, 'src/content/chrome.json'));
const LOGO = new Map((chrome.mega.brand.links || []).filter((b) => b.logo && !dropped(b.href)).map((b) => [href(b.href), b.logo]));

function logoArt(name, p, { big = true } = {}) {
  const src = LOGO.get(p);
  const im = src ? image(src, { max: 512, widths: [256, 512], page: p }) : null;
  return `<figure class="logo-disc${big ? ' logo-disc--big' : ''}" data-tilt>
    <span class="logo-disc__ring scroll-drift" aria-hidden="true"></span>
    <span class="sun-orb logo-disc__sun" aria-hidden="true"></span>
    <span class="logo-disc__face">${im ? imgTag(im, { alt: '', sizes: big ? '320px' : '96px', lazy: !big }) : `<span class="logo-disc__word">${t(name)}</span>`}</span>
  </figure>`;
}

export function brand(rec) {
  const m = rec.model;
  const id = (m.slug || 'b').replace(/[^a-z0-9]+/gi, '-');
  const cards = (m.products || []).map(toCard);
  const body = `${banner({ breadcrumb: m.breadcrumb, h1Lines: [m.h1 || m.name], description: m.banner && m.banner.description, art: logoArt(m.name || m.h1, m.path), page: rec.url })}
<section class="section section--tight" data-collection><div class="shell">
  ${toolbar(m.filters, cards, id)}
  ${grid({ cards, empty: m.emptyState || { heading: 'No search results found', text: 'No results match the filter criteria. Remove a filter or clear all filters to search again' }, page: rec.url, id })}
</div></section>`;
  return page({ url: rec.url, title: rec.title, body });
}
brand.types = ['brand'];

export function brands(rec) {
  const m = rec.model;
  const shown = (m.brands || []).map((b) => ({ name: decode(b.name), href: b.href }));
  const have = new Set(shown.map((b) => b.href));
  const extra = allModels().filter((r) => r.type === 'brand' && !have.has(r.model.path)).map((r) => ({ name: decode(r.model.name || r.model.h1), href: r.model.path }));
  const all = [...shown, ...extra].sort((a, b) => a.name.localeCompare(b.name));
  const firstPage = new Set(shown.map((b) => b.href));
  const tile = (b, i) => `<a class="brand-tile reveal" href="${attr(href(b.href))}" data-brand-tile data-name="${attr(b.name.toLowerCase())}"${firstPage.has(b.href) ? '' : ' data-more'} style="--i:${i % 6}">
      <span class="brand-tile__logo">${LOGO.get(b.href) ? imgTag(image(LOGO.get(b.href), { max: 256, widths: [256], page: rec.url }), { alt: '', sizes: '96px' }) : `<span class="brand-tile__word">${t(b.name.split(/\s+/).map((w) => w[0]).join('').slice(0, 3))}</span>`}</span>
      <b>${t(b.name)}</b></a>`;
  const s = m.search || {};
  const body = `${banner({ breadcrumb: m.breadcrumb, h1Lines: [m.h1], art: logoArt('Sunny Dayz', '/'), page: rec.url })}
<section class="section section--tight" data-brands><div class="shell">
  <form class="toolbar toolbar--fit reveal" role="search" method="get" action="/brands" data-brand-form><div class="toolbar__group" style="flex:1">
    <label class="sr-only" for="brand-search">${t((s.submit && s.submit.label) || 'Search')}</label>
    <input class="field" id="brand-search" type="search" name="${attr((s.input && s.input.name) || 'brands-search')}" placeholder="${attr((s.input && s.input.placeholder) || 'Search brands')}" aria-label="${attr((s.input && s.input.ariaLabel) || 'Search brands')}" data-brand-search>
    <button class="btn btn--sm" type="submit">${t((s.submit && s.submit.label) || 'Search')}</button>
  </div></form>
  <div class="grid" style="--grid-min:170px" data-brand-grid>${all.map(tile).join('')}</div>
  <div class="empty" data-brand-empty hidden>${icon.search}<h2>${t('No search results found')}</h2></div>
  ${extra.length && m.loadMore ? `<p style="text-align:center; margin-top:32px"><button class="btn btn--pine" type="button" data-load-more hidden aria-label="${attr(m.loadMore.ariaLabel || m.loadMore.label)}">${t(m.loadMore.label)}</button></p>` : ''}
</div></section>`;
  return page({ url: rec.url, title: rec.title, body });
}
brands.types = ['brands'];
