// _grid.mjs — shared pieces for grid pages (collection, listing, strain, brand): banner, toolbar,
// product grid with client-side filter/sort, empty state. Sort labels are the source's own
// ("Brand A to Z", "Price High to Low" — the only two the capture shows); nothing is invented.
import { t, attr, href, icon, image, imgTag, decode, cx } from '../lib.mjs';
import { crumbs, productCard, cardData, popFigure, CAT_ART, gen, genAlt } from '../components.mjs';
import { ribbon } from '../layout.mjs';

export const SORT = [{ value: 'brandAsc', label: 'Brand A to Z' }, { value: 'priceDesc', label: 'Price High to Low' }];

// banner: art = pop figure for a category, a logo disc, or the source banner in a layered frame
export function banner({ breadcrumb, h1Lines, description, eyebrow = 'Sunny Dayz', art = '', page, ribbon: withRibbon = true }) {
  // a hyphenated word stays whole ('Well-being' broke as 'Well-' / 'being'); the text is unchanged
  const keepHyphenated = (html) => html.replace(/([A-Za-z0-9]+(?:-[A-Za-z0-9]+)+)/g, '<span class="nowrap">$1</span>');
  const h1 = (h1Lines || []).filter(Boolean).map((l) => keepHyphenated(t(l))).join('<br>');
  return `<section class="banner">
  <span class="tex-contour" aria-hidden="true"></span>
  <div class="shell banner__grid">
    <div class="stack reveal" style="--stack:14px">
      <span class="eyebrow">${t(eyebrow)}</span>
      <h1>${h1}</h1>
      ${description ? `<p class="lede">${t(description)}</p>` : ''}
      ${crumbs(breadcrumb)}
    </div>
    <div class="banner__art reveal">${art}</div>
  </div>
</section>
${withRibbon ? ribbon() : ''}`;
}
export function categoryArt(path) {
  const p = String(path || '').split('?')[0];
  const a = CAT_ART[p] || CAT_ART['/' + p.split('/').slice(1, 3).join('/')];
  return a ? popFigure(a.slug, { ...a, ratio: '4 / 3.2', sizes: '(max-width: 1024px) 90vw, 520px', load: 'high' }) : '';
}
export function framedImage(src, { alt = '', page = '' } = {}) {
  const im = image(src, { max: 1400, widths: [700, 1400], page });
  if (!im) return '';
  return `<figure class="framed"><span class="framed__ring scroll-drift" aria-hidden="true"></span><span class="framed__img">${imgTag(im, { alt, sizes: '(max-width: 1024px) 90vw, 560px' })}</span></figure>`;
}
export function canopyArt() { return popFigure('sunlit-canopy', { top: '0%', ratio: '4 / 3', sizes: '(max-width: 1024px) 124vw, 560px', load: 'high' }); }

export function toolbar(f, cards, id) {
  if (!f) return '';
  const strains = [...new Map(cards.map((c) => cardData(c)).filter((d) => d.strainKey && d.strain).map((d) => [d.strainKey, d.strain])).entries()];
  const selected = f.sortParam || (f.sortSelected ? (SORT.find((s) => s.label === f.sortSelected) || {}).value : '');
  return `<div class="toolbar reveal" role="group" aria-label="${attr(f.filterLabel || 'FILTER')}">
    <div class="toolbar__group"><span class="eyebrow">${t(f.filterLabel || 'FILTER')}</span>${strains.map(([k, label]) => `<button class="filter-chip" type="button" data-filter="strain" data-value="${attr(k)}" aria-pressed="false">${t(label)}</button>`).join('')}</div>
    <div class="toolbar__group"><label for="${id}-sort">${t(f.sortLabel || 'Sort By')}</label>
      <select class="field" id="${id}-sort" data-sort aria-label="${attr(f.sortAriaLabel || f.sortLabel || 'Sort by')}"><option value="">${t(f.sortLabel || 'Sort By')}</option>${SORT.map((s) => `<option value="${s.value}"${s.value === selected ? ' selected' : ''}>${t(s.label)}</option>`).join('')}</select>
    </div>
  </div>`;
}
export function grid({ cards, empty, page, id }) {
  return `<div class="grid products-grid" data-grid style="--grid-min:240px">${cards.map((c, i) => productCard(c, { page, i })).join('')}</div>
  <div class="empty" data-empty ${cards.length ? 'hidden' : ''}>${icon.search}<h2>${t((empty && (empty.heading || empty.title)) || '')}</h2><p>${t((empty && (empty.text || empty.message)) || '')}</p></div>`;
}
// ItemList product -> card input (cardData joins strain/THC/image from the product page model)
export const toCard = (p) => ({ url: p.url, name: decode(p.name), brand: decode(p.brand || ''), price: p.price, image: p.image && p.image.src ? { src: p.image.src, alt: decode(p.image.alt || p.name) } : null });
