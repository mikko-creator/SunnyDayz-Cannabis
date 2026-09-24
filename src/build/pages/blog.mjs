// blog.mjs — /blog and /blog/*. Model: src/content/model-spec/blog.md. Source copy is verbatim,
// including the issues the spec lists for the client (placeholders, other-business mentions).
import { ORIGIN, t, attr, href, icon, image, imgTag, decode } from '../lib.mjs';
import { page } from '../layout.mjs';
// art direction for card crops: images (by content hash) whose subject is not centred — the
// 2.82:1 vape-pen banner keeps its leaf cluster and jar on the right third
const FOCAL = { '4180460bc5aa': '85% 50%' };
const focal = (im) => { const k = Object.keys(FOCAL).find((h) => String(im.src).includes(h)); return k ? ` style="object-position:${FOCAL[k]}"` : ''; };
import { crumbs, rich, productCard, safeInline } from '../components.mjs';

// sizes for a cover-cropped card: the media box is 16/11, so a wider source renders at box height x its
// aspect — scale the box widths (~92vw phone, ~46vw two-up tablet, 380px desktop) by that overhang
const cardSizes = (im) => {
  const k = Math.max(1, ((im.width || 1) / (im.height || 1)) / (16 / 11));
  return `(max-width: 720px) ${Math.ceil(92 * k)}vw, (max-width: 1024px) ${Math.ceil(46 * k)}vw, ${Math.ceil(380 * k)}px`;
};
function postCard(p, i = 0, { big = false } = {}) {
  const im = p.image && p.image.src ? image(p.image.src, { max: big ? 1400 : 1600, widths: big ? [700, 1400] : [400, 800, 1200, 1600], page: 'blog' }) : null;
  return `<a class="post-card reveal" href="${attr(href(p.href))}" data-post data-text="${attr(((p.title || '') + ' ' + (p.excerpt || '')).toLowerCase())}" style="--i:${i % 6}">
    <span class="well post-card__media">${im ? imgTag(im, { alt: p.image.alt || '', sizes: big ? '(max-width: 1024px) 92vw, 760px' : cardSizes(im), extra: focal(im) }) : ''}</span>
    ${p.date ? `<time class="eyebrow" datetime="${attr(p.datetime || '')}"${p.dateLabel ? ` aria-label="${attr(p.dateLabel)}"` : ''}>${t(p.date)}</time>` : ''}
    <h3>${t(p.title)}</h3>
    ${p.excerpt ? `<p>${t(p.excerpt)}</p>` : ''}
  </a>`;
}

export function blogIndex(rec) {
  const m = rec.model;
  const slides = (m.featured && m.featured.slides) || [];
  const lead = slides[0];
  const leadIm = lead && lead.image && lead.image.desktop ? image(lead.image.desktop.src, { max: 1600, widths: [800, 1600], page: rec.url }) : null;
  const s = m.search;
  const body = `<section class="banner">
  <span class="tex-contour" aria-hidden="true"></span>
  <div class="shell stack" style="--stack:14px">
    <div class="reveal">${crumbs(m.breadcrumb)}</div>
    <span class="eyebrow reveal">Sunny Dayz</span>
    <h1 class="reveal">${t(m.h1)}</h1>
    ${s ? `<div class="toolbar reveal" style="max-width:520px"><div class="toolbar__group" style="flex:1"><label for="post-search">${t(s.buttonLabel || 'Search')}</label><input class="field" id="post-search" type="${attr(s.inputType || 'search')}" name="${attr(s.inputName || 'searchBox')}" placeholder="${attr(s.placeholder || 'Search')}" aria-label="${attr(s.inputLabel || 'Search')}" data-post-search></div></div>` : ''}
  </div>
</section>
${lead ? `<section class="section section--tight" aria-labelledby="feat-h"><div class="shell">
  <div class="section-head reveal"><h2 id="feat-h">${t(m.featured.heading)}</h2></div>
  <div class="feature">
    <a class="feature__lead reveal" href="${attr(href(lead.href))}" data-tilt>
      <span class="framed"><span class="framed__ring scroll-drift" aria-hidden="true"></span><span class="framed__img">${leadIm ? imgTag(leadIm, { alt: (lead.image.desktop && lead.image.desktop.alt) || '', sizes: '(max-width: 1024px) 92vw, 760px', lazy: false }) : ''}</span></span>
      <span class="feature__copy">${lead.date ? `<time class="eyebrow" datetime="${attr(lead.datetime || '')}"${lead.dateLabel ? ` aria-label="${attr(lead.dateLabel)}"` : ''}>${t(lead.date)}</time>` : ''}<h3>${t(lead.title)}</h3></span>
    </a>
    <div class="feature__list">${slides.slice(1).map((sl, i) => `<a class="feature__item reveal" href="${attr(href(sl.href))}" style="--i:${i}">${sl.date ? `<time class="eyebrow" datetime="${attr(sl.datetime || '')}">${t(sl.date)}</time>` : ''}<b>${t(sl.title)}</b>${icon.arrow}</a>`).join('')}</div>
  </div>
</div></section>` : ''}
<section class="section section--tight" aria-labelledby="all-h"><div class="shell" data-posts>
  <div class="section-head reveal"><h2 id="all-h">${t(m.allPosts.heading)}</h2></div>
  <div class="grid" style="--grid-min:300px">${(m.allPosts.posts || []).map((p, i) => postCard(p, i)).join('')}</div>
  <div class="empty" data-post-empty hidden>${icon.search}<h2>No search results found</h2></div>
</div></section>`;
  return page({ url: rec.url, title: rec.title, body });
}
blogIndex.types = ['blog-index'];

export function blogPost(rec) {
  const m = rec.model;
  const hero = m.hero && m.hero.desktop ? image(m.hero.desktop.src, { max: 1600, widths: [800, 1600], page: rec.url }) : null;
  const firstP = (m.body || []).find((b) => b.t === 'p' && b.text && b.text.length > 40);
  const pageUrl = ORIGIN + new URL(rec.url).pathname;
  const article = { '@context': 'https://schema.org', '@type': 'Article', headline: decode(m.h1), mainEntityOfPage: { '@type': 'WebPage', '@id': pageUrl }, publisher: { '@type': 'Organization', name: 'Sunny Dayz' } };
  if (m.datetime) article.datePublished = m.datetime;
  if (hero) article.image = [ORIGIN + hero.src];
  if (firstP) article.description = decode(firstP.text).slice(0, 300);
  // bold-only paragraphs are the source's de-facto subheads: styled, not re-levelled
  const body = (m.body || []).map((b) => (b.t === 'p' && b.html && /^<strong>[^<]{2,120}<\/strong>$/.test(b.html.trim()) ? { ...b, head: true } : b));
  const bodyHtml = body.map((b) => (b.head ? `<p class="p-head">${safeInline(b.html)}</p>` : rich([b], { page: rec.url }))).join('\n');
  const featured = m.featured && (m.featured.posts || []).length ? `<aside class="post-aside panel" aria-labelledby="fp-h"><h2 id="fp-h">${t(m.featured.heading)}</h2>
    ${m.featured.posts.map((p) => `<a class="feature__item" href="${attr(href(p.href))}"${new URL(rec.url).pathname === p.href ? ' aria-current="page"' : ''}>${p.date ? `<time class="eyebrow" datetime="${attr(p.datetime || '')}">${t(p.date)}</time>` : ''}<b>${t(p.title)}</b>${p.excerpt ? `<small class="note" style="grid-column:1/-1">${t(p.excerpt)}</small>` : ''}</a>`).join('')}</aside>` : '';
  const carousels = (m.productCarousels || []).map((c, ci) => `<section class="section section--tight" aria-label="${attr(c.ariaLabel || c.heading)}"><div class="shell rail" data-rail>
    <div class="section-head"><div><span class="eyebrow">Sunny Dayz</span><h2>${t(c.heading)}</h2></div><div class="cluster">${c.seeAll ? `<a class="see-all" href="${attr(href(c.seeAll.href))}"${c.seeAll.ariaLabel ? ` aria-label="${attr(c.seeAll.ariaLabel)}"` : ''}>${t(c.seeAll.label)}${icon.arrow}</a>` : ''}<div class="rail__ctrls"><button class="icon-btn" type="button" data-prev aria-label="${attr((c.nav && c.nav.prev && c.nav.prev.ariaLabel) || 'Previous')}">${icon.arrowL}</button><button class="icon-btn" type="button" data-next aria-label="${attr((c.nav && c.nav.next && c.nav.next.ariaLabel) || 'Next')}">${icon.arrow}</button></div></div></div>
    <div class="rail__track" tabindex="0" aria-label="${attr(c.heading)}">${(c.cards || []).map((card, i) => productCard(card, { page: rec.url, i })).join('')}</div>
    <div class="rail__progress" aria-hidden="true"><span></span></div></div></section>`).join('');
  const related = m.related && (m.related.posts || []).length ? `<section class="section section--tight" aria-labelledby="rel-h"><div class="shell">
    <div class="section-head reveal"><h2 id="rel-h">${t(m.related.heading)}</h2></div>
    <div class="grid" style="--grid-min:260px">${m.related.posts.map((p, i) => postCard(p, i)).join('')}</div></div></section>` : '';
  const html = `<section class="banner">
  <span class="tex-contour" aria-hidden="true"></span>
  <div class="shell banner__grid">
    <div class="stack reveal" style="--stack:14px">
      ${crumbs(m.breadcrumb)}
      ${m.date ? `<time class="eyebrow" datetime="${attr(m.datetime || '')}"${m.dateLabel ? ` aria-label="${attr(m.dateLabel)}"` : ''}>${t(m.date)}</time>` : '<span class="eyebrow">Sunny Dayz</span>'}
      <h1 class="post-title">${t(m.h1)}</h1>
      ${m.shareLabel ? `<span data-share-slot data-label="${attr(m.shareLabel)}"></span>` : ''}
    </div>
    <div class="banner__art reveal">${hero ? `<figure class="framed"><span class="framed__ring scroll-drift" aria-hidden="true"></span><span class="sun-orb framed__sun" aria-hidden="true"></span><span class="framed__img">${imgTag(hero, { alt: (m.hero.desktop && m.hero.desktop.alt) || '', sizes: '(max-width: 1024px) 92vw, 560px', lazy: false })}</span></figure>` : ''}</div>
  </div>
</section>
<section class="section section--tight"><div class="shell post-layout">
  <article class="prose post-body">${bodyHtml}</article>
  ${featured}
</div></section>
${carousels}
${related}`;
  return page({ url: rec.url, title: rec.title, body: html, ldExclude: ['Article'], extraLd: [article] });
}
blogPost.types = ['blog-post'];
