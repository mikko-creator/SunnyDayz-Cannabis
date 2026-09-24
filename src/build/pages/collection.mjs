// collection.mjs — /collection/* and the 7 listing pages. Model: src/content/model-spec/collection.md.
import { t, attr, href, icon, image, imgTag, decode } from '../lib.mjs';
import { hoursWidget } from '../components.mjs';
import { page } from '../layout.mjs';
import { banner, categoryArt, framedImage, canopyArt, toolbar, grid, toCard } from './_grid.mjs';

function categoryLinks(links) {
  if (!links || !links.length) return '';
  return `<nav class="cat-links reveal" aria-label="Categories">${links.map((l) => {
    const im = l.image && l.image.src ? image(l.image.src, { max: 128, widths: [128], page: 'catlinks' }) : null;
    return `<a class="cat-link${l.current ? ' is-current' : ''}" href="${attr(href(l.href))}"${l.current ? ' aria-current="page"' : ''}${l.ariaLabel ? ` aria-label="${attr(l.ariaLabel)}"` : ''}>${im ? imgTag(im, { alt: '', sizes: '28px' }) : ''}<span>${t(l.label || (l.image && l.image.alt) || l.href)}</span></a>`;
  }).join('')}</nav>`;
}

export function collection(rec) {
  const m = rec.model;
  const id = (m.path || 'c').replace(/[^a-z0-9]+/gi, '-');
  const cards = (m.products || []).map(toCard);
  const art = categoryArt(m.parentPath || m.path) || framedImage(m.banner && m.banner.desktopImage && m.banner.desktopImage.src, { alt: '', page: rec.url }) || canopyArt();
  const body = `${banner({ breadcrumb: m.breadcrumb, h1Lines: [m.h1 || (m.banner && m.banner.title)], description: m.banner && m.banner.description, art, page: rec.url })}
<section class="section section--tight" data-collection>
  <div class="shell">
    ${categoryLinks(m.categoryLinks)}
    ${toolbar({ ...(m.filters || {}), sortParam: m.sortParam }, cards, id)}
    ${grid({ cards, empty: m.emptyState || { heading: 'No search results found', text: 'No results match the filter criteria. Remove a filter or clear all filters to search again' }, page: rec.url, id })}
  </div>
</section>`;
  return page({ url: rec.url, title: rec.title, body });
}
collection.types = ['collection'];

export function listing(rec) {
  const m = rec.model;
  const id = (m.kind || 'l').replace(/[^a-z0-9]+/gi, '-');
  const cards = (m.products || []).map(toCard);
  const art = m.banner && m.banner.desktopImage ? framedImage(m.banner.desktopImage.src, { alt: '', page: rec.url }) : canopyArt();
  const promo = m.promoCarousel ? `<section class="section section--tight"><div class="shell"><div class="deals neu neu--lg reveal">
      <span class="tex-dots" aria-hidden="true"></span><div class="sun-orb float" aria-hidden="true" style="--orb:160px; right:5%; top:-50px"></div>
      <div><span class="eyebrow">Sunny Dayz</span><h2>${t(m.promoCarousel.heading)}${m.promoCarousel.promotionCount ? ` <span class="count-pill">${m.promoCarousel.promotionCount}</span>` : ''}</h2><p class="${m.promoCarousel.promotionCount ? 'lede' : 'sr-only'}">${t(m.promoCarousel.countText || '')}</p></div>
      ${m.promoCarousel.seeAll ? `<a class="see-all" href="${attr(href(m.promoCarousel.seeAll.href))}"${m.promoCarousel.seeAll.ariaLabel ? ` aria-label="${attr(m.promoCarousel.seeAll.ariaLabel)}"` : ''}>${t(m.promoCarousel.seeAll.label)} ${t(m.promoCarousel.seeAll.countBadge || '')}${icon.arrow}</a>` : ''}
    </div></div></section>` : '';
  const notice = m.notice ? `<section class="section section--tight"><div class="shell--narrow"><div class="empty reveal">${icon.search}<h2>${t(m.notice.heading)}</h2><p>${t(m.notice.text)} ${m.notice.link ? `<a href="${attr(href(m.notice.link.href))}">${t(m.notice.link.label)}</a>` : ''}</p></div></div></section>` : '';
  const galleries = (m.galleries || []).map((g, gi) => `<section class="section section--tight" aria-label="${attr(g.heading || m.h1 || '')}"><div class="shell">
      ${g.heading ? `<div class="section-head reveal"><div><span class="eyebrow">Sunny Dayz</span><h2>${t(g.heading)}</h2></div></div>` : ''}
      ${(g.intro || []).map((p) => `<p class="lede reveal">${t(p)}</p>`).join('')}
      ${(g.items || []).some((it) => it.caption) ? `<div class="cluster reveal" style="margin-bottom:24px">${g.items.filter((it) => it.caption).map((it) => `<span class="chip chip--brand">${t(it.caption)}</span>`).join('')}</div>` : ''}
      <div class="grid gallery-grid" style="--grid-min:220px">${(g.items || []).map((it, i) => {
        const im = it.image && it.image.src ? image(it.image.src, { max: 900, widths: [450, 900], page: rec.url }) : null;
        return `<figure class="gallery-card reveal" style="--i:${i}" data-tilt><span class="gallery-card__ring" aria-hidden="true"></span><span class="gallery-card__img">${im ? imgTag(im, { alt: it.caption || '', sizes: '(max-width: 720px) 90vw, 300px' }) : ''}</span>${it.caption ? `<figcaption>${t(it.caption)}</figcaption>` : ''}</figure>`;
      }).join('')}</div>
    </div></section>`).join('');
  const stores = (m.stores || []).length ? `<section class="section section--tight"><div class="shell"><div class="grid" style="--grid-min:300px">${m.stores.map((s) => `<article class="panel store-card reveal">
      <span class="eyebrow">${(s.customerTypes || []).map((c) => t(c)).join(' · ')}</span>
      <h2><a href="${attr(href(s.href))}"${s.detailsAriaLabel ? ` aria-label="${attr(s.detailsAriaLabel)}"` : ''}>${t(s.name)}</a></h2>
      ${s.address ? `<p><a href="${attr(s.address.mapsHref)}" target="_blank" rel="noopener noreferrer"${s.address.ariaLabel ? ` aria-label="${attr(s.address.ariaLabel)}"` : ''}>${icon.pin} ${t(s.address.text)}</a></p>` : ''}
      ${s.phone ? `<p><a href="${attr(String(s.phone.href || '').replace(/\s+/g, ''))}"${s.phone.ariaLabel ? ` aria-label="${attr(s.phone.ariaLabel)}"` : ''}>${t(s.phone.label)}</a></p>` : ''}
      ${hoursWidget()}
    </article>`).join('')}</div></div></section>` : '';
  const hasGrid = m.filters || (m.products || []).length;
  const gridHtml = hasGrid ? `<section class="section section--tight" data-collection><div class="shell">
      ${toolbar(m.filters, cards, id)}
      ${grid({ cards, empty: m.emptyState || { heading: 'No search results found', text: 'No results match the filter criteria. Remove a filter or clear all filters to search again' }, page: rec.url, id })}
    </div></section>` : '';
  const h1Lines = [m.h1 || (m.breadcrumb && m.breadcrumb.length ? m.breadcrumb[m.breadcrumb.length - 1].label : '')];
  const body = `${banner({ breadcrumb: m.breadcrumb, h1Lines, description: m.banner && m.banner.description, art, page: rec.url, ribbon: !!(promo || notice || galleries || stores || gridHtml) })}
${promo}${notice}${galleries}${stores}${gridHtml}`;
  return page({ url: rec.url, title: rec.title, body });
}
listing.types = ['listing'];
