// home.mjs — the homepage. Section order follows the source; every string comes from the model.
import { t, attr, href, icon, image, imgTag, cx } from '../lib.mjs';
import { rail, catTile, popFigure, gen, genAlt, rich } from '../components.mjs';
import { page } from '../layout.mjs';

export function home(rec, ctx) {
  const S = rec.model.sections || [];
  const find = (k) => S.find((s) => s.kind === k);
  const video = find('video-embed');
  const tiles = find('category-tiles');
  const deals = find('deals-carousel');
  const banner = find('image-link-banner');
  const marquee = find('marquee');
  const about = find('side-by-side');
  const tagline = (marquee && (marquee.items || []).find((x) => x.label)) || { label: '', href: '/shop' };
  const aboutBlocks = (about && about.blocks) || [];
  const lede = aboutBlocks.find((b) => /doing things differently/i.test(b.text));
  const store = ctx.chrome.store;
  const parts = String(tagline.label).split(/,\s*/);
  const h1 = parts.length === 3 ? `${t(parts[0])}, <span class="italic-accent">${t(parts[1])},</span> ${t(parts[2])}` : t(tagline.label);

  const hero = `<section class="hero" aria-label="${attr(store.name)}">
  <div class="hero__stage">
    <picture><source media="(max-width: 600px) and (orientation: portrait)" srcset="/assets/video/hero-poster-portrait.webp" width="720" height="1080"><img class="hero__poster" src="/assets/video/hero-poster.webp" width="1920" height="1080" alt="" loading="eager" decoding="async" fetchpriority="high"></picture>
    <video class="hero__video" data-hero-video muted loop playsinline preload="none" data-src-lg="/assets/video/hero-1080.mp4" data-src-sm="/assets/video/hero-portrait.mp4" data-sm-media="(max-width: 600px) and (orientation: portrait)" aria-label="${attr(store.name)} video" width="1920" height="1080"></video>
    <div class="hero__scrim" aria-hidden="true"></div>
    <div class="hero__content"><div class="shell">
      <span class="eyebrow">${t(store.mode)} · ${t(store.name)}</span>
      <h1>${h1}</h1>
      ${lede ? `<p class="lede">${t(lede.text)}</p>` : ''}
      <div class="cluster">
        ${tiles && tiles.shopAll ? `<a class="btn btn--sun magnet" href="${attr(href(tiles.shopAll.href))}">${t(tiles.shopAll.label)}${icon.arrow}</a>` : ''}
        ${about && about.cta ? `<a class="btn btn--on-dark" href="${attr(href(about.cta.href))}">${t(about.cta.label)}</a>` : ''}
      </div>
    </div></div>
    <div class="hero__controls"><button class="icon-btn hero__toggle" type="button" data-hero-toggle aria-pressed="false"><span class="i-pause">${icon.pause}</span><span class="i-play">${icon.play}</span><span class="sr-only">Pause or play the video</span></button></div>
  </div>
  <div class="hero__lip" aria-hidden="true"></div>
</section>`;

  const cats = tiles ? `<section class="section" aria-labelledby="cats-h">
  <span class="tex-contour" aria-hidden="true"></span>
  <div class="leak parallax-slow" aria-hidden="true" style="left:-20vw; top:10%"></div>
  <div class="shell">
    <div class="section-head reveal">
      <div><span class="eyebrow">${t(store.name)}</span><h2 id="cats-h">${t(tiles.title)}</h2></div>
      ${tiles.shopAll ? `<a class="see-all" href="${attr(href(tiles.shopAll.href))}">${t(tiles.shopAll.label)}${icon.arrow}</a>` : ''}
    </div>
    <div class="cats">${(tiles.tiles || []).map((x, i) => catTile(x, i)).join('')}</div>
  </div>
</section>` : '';

  const railIds = new Map();
  const railFor = (s, i) => {
    const id = 'rail-' + (s.collection || i);
    railIds.set(s, id);
    const seeAll = s.seeAll || s.shopAllSlide || null;
    return `<div class="${cx('band', i % 2 === 1 && 'band--inset')}">${rail({ id, eyebrow: store.name, title: s.title, seeAll, cards: s.cards || [], controls: s.controls, page: rec.url })}</div>`;
  };
  const dealsBlock = deals ? `<section class="section section--tight" aria-labelledby="deals-h">
  <div class="shell">
    <div class="deals neu--lg neu reveal">
      <span class="tex-dots" aria-hidden="true"></span>
      <div class="sun-orb float" aria-hidden="true" style="--orb:180px; right:6%; top:-50px"></div>
      <div><span class="eyebrow">${t(store.name)}</span><h2 id="deals-h">${t(deals.title)} <span class="count-pill">${(deals.promotions || []).length}</span></h2>
      <p class="lede">${t(String(deals.titleSrText || '').replace(/^\s*-\s*/, ''))}</p></div>
      <a class="see-all" href="/deals">See All${icon.arrow}</a>
    </div>
  </div>
</section>` : '';

  let railsHtml = '', k = 0;
  for (const s of S) {
    if (s.kind === 'product-carousel') railsHtml += railFor(s, k++);
    else if (s.kind === 'deals-carousel') railsHtml += dealsBlock;
  }

  const bim = banner && banner.image ? image(banner.image.src, { max: 1600, widths: [800, 1600], page: rec.url }) : null;
  const loyalty = banner && bim ? `<section class="section" aria-label="${attr(banner.image.alt || '')}">
  <div class="shell">
    <a class="loyalty reveal" href="${attr(banner.link.href)}" target="_blank" rel="noopener noreferrer" data-tilt>
      <span class="loyalty__ring" aria-hidden="true"></span>
      <span class="sun-orb loyalty__sun" aria-hidden="true"></span>
      <span class="loyalty__frame">${imgTag(bim, { alt: banner.image.alt || '', sizes: '(max-width: 1320px) 94vw, 1240px' })}</span>
    </a>
  </div>
</section>` : '';

  const band = marquee ? `<a class="tagline-band" href="${attr(href(tagline.href))}" aria-label="${attr(tagline.label)}">
  <span class="tagline-band__track" aria-hidden="true">${Array.from({ length: Math.max(12, (marquee.items || []).filter((x) => x.label).length * (marquee.copies || 2)) }, () => `<span>${t(tagline.label)}</span>`).join('')}</span>
</a>` : '';

  // up to the original (1770w): the frame crops it and scales it 1.6x, so a 1024 tablet renders ~1970px of it
  const life = about && about.image ? image(about.image.src, { max: 2000, widths: [700, 1400], page: rec.url }) : null;
  const canopy = gen('sunlit-canopy');
  const flower = gen('flower');
  const aboutHtml = about ? `<section class="section" aria-labelledby="about-h">
  <span class="tex-contour" aria-hidden="true"></span>
  <div class="shell split">
    <div class="stack reveal" style="--stack:1.1rem">
      <span class="eyebrow">${t(store.name)}</span>
      <h2 id="about-h">${t(about.title)}</h2>
      <div class="prose">${rich(aboutBlocks, { page: rec.url })}</div>
      ${about.cta ? `<a class="btn btn--pine magnet" href="${attr(href(about.cta.href))}">${t(about.cta.label)}${icon.arrow}</a>` : ''}
    </div>
    <div class="layered reveal">
      <span class="layered__ring scroll-drift" aria-hidden="true"></span>
      <div class="layered__a layered__a--banner parallax-slow">${life ? imgTag(life, { alt: about.image.alt && about.image.alt !== 'Image' ? about.image.alt : '', sizes: '(max-width: 1024px) 192vw, 1300px' }) : ''}</div>
      <div class="layered__b">${canopy ? `<img src="${canopy.src}" srcset="${canopy.srcset}" sizes="(max-width: 1024px) 100vw, 700px" width="${canopy.width}" height="${canopy.height}" alt="${attr(genAlt['sunlit-canopy'])}" loading="lazy" decoding="async">` : ''}</div>
      ${flower && flower.cut ? `<img class="layered__cut parallax-fast" src="${flower.cut}" srcset="${flower.cutSrcset}" sizes="300px" width="${flower.width}" height="${flower.height}" alt="" loading="lazy" decoding="async">` : ''}
    </div>
  </div>
</section>` : '';

  const body = `${hero}\n${cats}\n${railsHtml}\n${loyalty}\n${band}\n${aboutHtml}`;
  return page({ url: rec.url, title: rec.title, body, bodyClass: 'is-home', preload: ['<link rel="preload" as="image" href="/assets/video/hero-poster-portrait.webp" media="(max-width: 600px) and (orientation: portrait)" fetchpriority="high">', '<link rel="preload" as="image" href="/assets/video/hero-poster.webp" media="not all and (max-width: 600px) and (orientation: portrait)" fetchpriority="high">'] });
}
