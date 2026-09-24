// content.mjs — rich-text pages (about, contact, privacy, terms, dispensary, weed-delivery) and
// the source's soft-404 URLs. Blocks are grouped into sections at each h1/h2; a section with
// images becomes a split layout with a layered image stack (alternating sides).
// Deliberate removals (recorded in src/content/removed.json by the build):
//   - the Google Maps runtime error ("Oops! Something went wrong. This page didn't load Google
//     Maps correctly...") — an API failure message, not authored copy;
//   - "CLOSED" / "until 10:00 AM ET" — a live open/closed indicator frozen at crawl time;
//   - the "Socials" label, whose links all pointed to "/" (see src/content/chrome.json removed[]).
//
// THE SOURCE'S SLIDERS. On the location pages the extractor emits every slider — testimonials,
// category tiles, city cards, the product carousel — BEFORE the heading that titles it, and
// flattens each product card into loose paragraphs ($45 / 3.5g / name / brand / strain / THC…).
// Sectionizing that verbatim put testimonials under "Get in touch", category words under
// "Testimonials" and 9,700px of product lines under "We delivery here". regroup() collapses each
// run into one typed block, moves it under the heading that follows it, and renders it as the
// component it was: quote cards, category tiles, city cards, a product rail joined to the real
// product pages by exact name. Every string is still the source's.
import path from 'node:path';
import { ROOT, readJSON, t, attr, href, icon, image, imgTag, decode } from '../lib.mjs';
import { page, addr } from '../layout.mjs';
import { crumbs, rich, popFigure, storeHours, hoursWidget, rail, allModels } from '../components.mjs';
import { framedImage, canopyArt } from './_grid.mjs';

export const REMOVED = [];
const RUNTIME = [/^Oops! Something went wrong\.?$/i, /didn.?t load Google Maps correctly/i];
const FROZEN = [/^(OPEN|CLOSED)$/, /^until \d{1,2}:\d{2}\s*(AM|PM)\s*ET$/i];
const isBannerImg = (b, bannerSrc) => b.t === 'img' && (/^Banner( location page)?$/i.test(b.alt || '') || (bannerSrc && b.src === bannerSrc));
const txt = (b) => decode((b && b.text) || '').trim();
const isP = (b, re) => !!b && b.t === 'p' && (!re || re.test(txt(b)));
const PRICE = /^\$\d[\d.,]*$/;
const SEE_ALL = /^(See All|SHOP ALL)$/i;
const CONTACT_LABEL = /^(Address|Email|Phone number)$/i;
const pathOf = (u) => { try { return new URL(u, 'https://x').pathname; } catch { return ''; } };
const CHROME = readJSON(path.join(ROOT, 'src/content/chrome.json'), {});

// product pages by exact name (the carousel card's title is the product page's H1)
let byName = null;
const productByName = (name) => {
  if (!byName) { byName = new Map(); for (const r of allModels()) if (r.type === 'product') { const n = decode(r.model.name || r.model.h1 || '').trim().toLowerCase(); if (n && !byName.has(n)) byName.set(n, pathOf(r.url)); } }
  return byName.get(String(name || '').trim().toLowerCase()) || null;
};

// ---- slider runs -> typed blocks --------------------------------------------------------------
function regroup(blocks, m, pageUrl) {
  const links = m.links || [];
  const linkFor = (label) => links.find((l) => decode(l.label || '').trim().toLowerCase() === label.toLowerCase());
  const out = [];
  for (let i = 0; i < blocks.length; i++) {
    // product carousel: runs of [$price] [/] [weight] [name] [brand] [strain] [THC..] [subtype]
    if (isP(blocks[i], PRICE) && isP(blocks[i + 1], /^\/$/)) {
      const items = [];
      let j = i;
      while (isP(blocks[j], PRICE) && isP(blocks[j + 1], /^\/$/)) {
        const name = txt(blocks[j + 3]);
        let k = j + 4;
        while (k < blocks.length && isP(blocks[k]) && !(isP(blocks[k], PRICE) && isP(blocks[k + 1], /^\/$/)) && !isP(blocks[k], SEE_ALL) && txt(blocks[k]).length <= 60) k++;
        const url = productByName(name);
        if (url) items.push({ url });
        else REMOVED.push({ page: pageUrl, text: name, why: 'product card in the source carousel whose product page is not in the crawl (nothing to link or price it from)' });
        j = k;
      }
      out.push({ t: 'products', items });
      i = j - 1;
      continue;
    }
    // testimonials: [img avatar] [p name] [quote], repeated
    if (blocks[i].t === 'img' && isP(blocks[i + 1]) && blocks[i + 2] && blocks[i + 2].t === 'quote') {
      const items = [];
      let j = i;
      while (blocks[j] && blocks[j].t === 'img' && isP(blocks[j + 1]) && blocks[j + 2] && blocks[j + 2].t === 'quote') {
        items.push({ avatar: blocks[j].src, name: txt(blocks[j + 1]), text: txt(blocks[j + 2]) });
        j += 3;
      }
      out.push({ t: 'testimonials', items });
      i = j - 1;
      continue;
    }
    // category tiles: [p LABEL] [img], repeated, each label a link on the page
    if (isP(blocks[i]) && blocks[i + 1] && blocks[i + 1].t === 'img' && linkFor(txt(blocks[i])) && isP(blocks[i + 2]) && blocks[i + 3] && blocks[i + 3].t === 'img' && linkFor(txt(blocks[i + 2]))) {
      const items = [];
      let j = i;
      while (isP(blocks[j]) && blocks[j + 1] && blocks[j + 1].t === 'img' && linkFor(txt(blocks[j]))) {
        const l = linkFor(txt(blocks[j]));
        items.push({ label: txt(blocks[j]), href: l.href, img: blocks[j + 1].src });
        j += 2;
      }
      out.push({ t: 'tiles', items });
      i = j - 1;
      continue;
    }
    // city cards: a run of images and city labels whose links all go to /weed-delivery/ — the
    // labels come from the links themselves (one card's label exists only there), the pictures
    // from the run, in order
    if ((blocks[i].t === 'img' || isP(blocks[i])) && /LocationCard|LocationItem/.test(blocks[i].src || (blocks[i + 1] && blocks[i + 1].src) || '')) {
      let j = i;
      const imgs = [];
      while (blocks[j] && (blocks[j].t === 'img' ? /LocationCard|LocationItem/.test(blocks[j].src || '') : isP(blocks[j]) && links.some((l) => /^\/weed-delivery\//.test(l.href || '') && decode(l.label || '').trim() === txt(blocks[j])))) { if (blocks[j].t === 'img') imgs.push(blocks[j].src); j++; }
      const cityLinks = links.filter((l) => /^\/weed-delivery\//.test(l.href || ''));
      if (imgs.length && cityLinks.length === imgs.length) {
        out.push({ t: 'cities', items: cityLinks.map((l, n) => ({ label: decode(l.label || '').trim(), href: l.href, img: imgs[n] })) });
        i = j - 1;
        continue;
      }
    }
    out.push(blocks[i]);
  }
  // a slider sits BEFORE its heading in the source's order: move it (and a "See All"/"SHOP ALL"
  // label on either side of the heading) under that heading
  const TYPED = new Set(['products', 'testimonials', 'tiles', 'cities']);
  const res = [];
  for (let i = 0; i < out.length; i++) {
    const b = out[i];
    if (TYPED.has(b.t)) {
      let k = i + 1; const see = [];
      if (isP(out[k], SEE_ALL)) see.push(txt(out[k++]));
      if (out[k] && out[k].t === 'h2') {
        const head = out[k]; k++;
        if (isP(out[k], SEE_ALL)) see.push(txt(out[k++]));
        const label = see[0];
        const l = label ? links.find((x) => decode(x.label || '').trim() === label) : null;
        res.push(head, { ...b, seeAll: l ? { label, href: l.href } : null });
        i = k - 1;
        continue;
      }
    }
    res.push(b);
  }
  return res;
}

function sectionize(blocks) {
  const out = [];
  let cur = { head: null, blocks: [] };
  for (const b of blocks) {
    if (b.t === 'h1' || b.t === 'h2') { if (cur.head || cur.blocks.length) out.push(cur); cur = { head: b, blocks: [] }; }
    else cur.blocks.push(b);
  }
  if (cur.head || cur.blocks.length) out.push(cur);
  return out;
}

// quotes whose reviewer name is fused onto the end of the quote ("…market presence. Alex Johnson"):
// split the trailing 2-3 capitalised words back out as the caption — both strings verbatim
// art direction: images (by content hash) that are graphics, not photos — contained in a frame
const CONTAIN = ['f0f0fcd98986'];
const isContain = (im) => CONTAIN.some((h) => String(im && im.src).includes(h));
const PERSON = /^[A-Z][a-z'’-]+(?: [A-Z][a-z'’-]+){1,2}$/;
function splitName(q) {
  const m = q.match(/^([\s\S]*?[.!?”"]?)\s+([A-Z][a-z'’-]+(?: [A-Z][a-z'’-]+){1,2})$/);
  return m && m[1].length > 40 ? { text: m[1].trim(), name: m[2] } : { text: q, name: null };
}
function testimonials(blocks) {
  const cards = []; const rest = [];
  for (const b of blocks) {
    if (b.t === 'quote') {
      const prev = rest[rest.length - 1];
      // a caption is only a PERSON's name — never a contact label or value (phone, email, address)
      const name = prev && prev.t === 'p' && PERSON.test(txt(prev)) && !CONTACT_LABEL.test(txt(prev)) ? txt(rest.pop()) : null;
      const s = name ? { text: txt(b), name } : splitName(txt(b));
      cards.push(s);
    } else rest.push(b);
  }
  return { cards, rest };
}
const quoteCards = (cards, page) => `<div class="grid quotes" style="--grid-min:260px">${cards.map((c, i) => {
  const av = c.avatar ? image(c.avatar, { max: 96, widths: [96], page }) : null;
  return `<figure class="quote-card reveal" style="--i:${i}"><blockquote>${t(c.text)}</blockquote>${c.name || av ? `<figcaption>${av ? imgTag(av, { alt: '', cls: 'quote-card__avatar', sizes: '44px' }) : ''}${c.name ? `<span>${t(c.name)}</span>` : ''}</figcaption>` : ''}</figure>`;
}).join('')}</div>`;

// short title + long description, repeated (the source's icon row "title / description"): a
// feature list, so the titles read as titles rather than as one more paragraph
function features(blocks) {
  const out = []; let i = 0;
  while (i < blocks.length) {
    const pairs = [];
    let j = i;
    while (isP(blocks[j]) && isP(blocks[j + 1]) && txt(blocks[j]).split(/\s+/).length <= 4 && !/[.:]$/.test(txt(blocks[j])) && txt(blocks[j + 1]).length >= 80) { pairs.push([txt(blocks[j]), blocks[j + 1]]); j += 2; }
    if (pairs.length >= 2) { out.push({ t: 'features', pairs }); i = j; } else { out.push(blocks[i]); i++; }
  }
  return out;
}
// contact label / value pairs -> a definition list; a value that is also one of the page's links
// (tel:, mailto:) stays a link
function contactList(blocks, m) {
  const out = []; let i = 0;
  const linkOf = (v) => (m.links || []).find((l) => decode(l.label || '').trim() === v && /^(tel|mailto):/.test(l.href || ''));
  while (i < blocks.length) {
    const rows = [];
    let j = i;
    while (isP(blocks[j], CONTACT_LABEL) && isP(blocks[j + 1]) && !isP(blocks[j + 1], CONTACT_LABEL) && txt(blocks[j + 1]).length <= 80) { rows.push([txt(blocks[j]), txt(blocks[j + 1])]); j += 2; }
    if (rows.length >= 2) { out.push({ t: 'contact', rows, linkOf }); i = j; } else { out.push(blocks[i]); i++; }
  }
  return out;
}

function typedHtml(b, head, pageUrl, id) {
  if (b.t === 'products') return b.items.length ? rail({ id, eyebrow: 'Sunny Dayz', title: head || 'Products', seeAll: b.seeAll, cards: b.items, page: pageUrl }) : '';
  const headHtml = head ? `<div class="section-head"><div><span class="eyebrow">Sunny Dayz</span><h2>${t(head)}</h2></div>${b.seeAll ? `<a class="see-all" href="${attr(href(b.seeAll.href))}">${t(b.seeAll.label)}${icon.arrow}</a>` : ''}</div>` : '';
  let inner = '';
  if (b.t === 'testimonials') inner = quoteCards(b.items, pageUrl);
  if (b.t === 'tiles') inner = `<nav class="cat-grid" aria-label="${attr(head || 'Categories')}">${b.items.map((x, i) => { const im = image(x.img, { max: 160, widths: [160], page: pageUrl }); return `<a class="cat-link reveal" style="--i:${i % 6}" href="${attr(href(x.href))}">${im ? imgTag(im, { alt: '', sizes: '40px' }) : ''}<span>${t(x.label)}</span></a>`; }).join('')}</nav>`;
  if (b.t === 'cities') inner = `<div class="grid city-grid" style="--grid-min:200px">${b.items.map((x, i) => { const im = image(x.img, { max: 640, widths: [320, 640], page: pageUrl }); return `<a class="city-card reveal" style="--i:${i % 6}" href="${attr(href(x.href))}"><span class="well city-card__img">${im ? imgTag(im, { alt: '', sizes: '(max-width: 720px) 90vw, (max-width: 1190px) 30vw, 300px' }) : ''}</span><span class="city-card__label">${t(x.label)}${icon.arrow}</span></a>`; }).join('')}</div>`;
  return `<section class="section section--tight"><div class="shell">${headHtml}${inner}</div></section>`;
}

export function contentPage(rec) {
  const m = rec.model;
  // the banner photo: the model's bannerImage, else the body's own "Banner location page" image
  // (the dispensary has no bannerImage; its store photo sits in the blocks with that alt)
  const bannerBlock = (m.blocks || []).find((b) => b.t === 'img' && /^Banner( location page)?$/i.test(b.alt || ''));
  const bannerSrc = (m.bannerImage && m.bannerImage.src) || (bannerBlock && bannerBlock.src) || null;
  let blocks = (m.blocks || []).filter((b) => !isBannerImg(b, bannerSrc));
  blocks = blocks.filter((b) => { if (b.t === 'img' && /maps\.gstatic\.com/.test(b.src || '')) { REMOVED.push({ page: rec.url, text: b.src, why: 'Google Maps runtime-error icon (part of the removed error block)' }); return false; } return true; });
  blocks = blocks.filter((b) => {
    const s = txt(b);
    if (RUNTIME.some((r) => r.test(s))) { REMOVED.push({ page: rec.url, text: s, why: 'Google Maps runtime error message, not authored copy' }); return false; }
    if (FROZEN.some((r) => r.test(s))) { REMOVED.push({ page: rec.url, text: s, why: 'live open/closed indicator frozen at crawl time' }); return false; }
    if (b.t === 'p' && /^Socials$/i.test(s)) { REMOVED.push({ page: rec.url, text: s, why: 'label of the social links, which all pointed to "/" (no profiles on the store record)' }); return false; }
    return true;
  });
  // the page's own h1 opens the body on the source; it is the banner heading here
  const h1i = blocks.findIndex((b) => b.t === 'h1' && decode(b.text).trim() === decode(m.h1).trim());
  if (h1i >= 0) blocks.splice(h1i, 1);
  // the store's licence type ("ADULT") directly under the h1 is a badge, not a paragraph
  let licence = null;
  if (isP(blocks[0], /^(ADULT|MEDICAL|ADULT\s*&\s*MEDICAL)$/)) licence = txt(blocks.shift());
  // an image that is the site's own logo stands alone as a brand mark, never in a photo frame
  const logoPath = pathOf((CHROME.logo && CHROME.logo.src) || '');
  blocks = regroup(blocks, m, rec.url);
  const sections = sectionize(blocks);
  const contactIdx = sections.findIndex((s) => s.blocks.some((b) => CONTACT_LABEL.test(txt(b))));
  const faqIdx = sections.findIndex((s) => s.head && /^(FAQS?|Frequently asked questions)$/i.test(txt(s.head)));
  const faqHtml = (m.faqs || []).length ? `<div class="stack" style="--stack:14px; margin-top:20px">${m.faqs.map((f, i) => `<details class="panel faq reveal" style="--i:${i}"><summary>${t(f.q)}</summary><div class="prose">${rich(f.a, { page: rec.url })}</div></details>`).join('')}</div>` : '';
  let side = 0;
  const secHtml = sections.map((s, si) => {
    const idAttr = si === contactIdx ? ' id="contact-details"' : '';
    const head = s.head ? txt(s.head) : '';
    // a section that is one typed slider renders as that component
    const typed = s.blocks.filter((b) => ['products', 'testimonials', 'tiles', 'cities'].includes(b.t));
    if (typed.length === 1 && s.blocks.length === 1) return typedHtml(typed[0], head, rec.url, 'sec-' + si);
    // the dispensary's Hours list is the live hours widget (day and time in two columns)
    if (/^Hours$/i.test(head) && s.blocks.length === 1 && /^(ol|ul)$/.test(s.blocks[0].t) && storeHours()) {
      return `<section class="section section--tight"${idAttr}><div class="shell--narrow"><div class="panel reveal" style="max-width:520px">${hoursWidget({ heading: head, status: false, tag: 'h2' })}</div></div></section>`;
    }
    const imgs = s.blocks.filter((b) => b.t === 'img');
    const { cards, rest } = testimonials(contactList(features(s.blocks.filter((b) => b.t !== 'img')), m));
    const typedInline = s.blocks.filter((b) => ['testimonials'].includes(b.t)).flatMap((b) => b.items);
    const headHtml = head ? `<h2>${t(head)}</h2>` : '';
    const text = rest.map((b) => {
      if (b.t === 'features') return `<dl class="features">${b.pairs.map(([ttl, d]) => `<div><dt>${t(ttl)}</dt><dd>${rich([d], { page: rec.url })}</dd></div>`).join('')}</dl>`;
      if (b.t === 'contact') return `<dl class="kv contact-kv">${b.rows.map(([k, v]) => { const l = b.linkOf(v); return `<dt>${t(k)}</dt><dd>${l ? `<a href="${attr(l.href)}">${t(v)}</a>` : addr(v)}</dd>`; }).join('')}</dl>`;
      if (['products', 'tiles', 'cities', 'testimonials'].includes(b.t)) return '';
      if ((b.t === 'ol' || b.t === 'ul') && (b.items || []).length >= 12 && b.items.every((x) => txt(x).length <= 10)) return `<${b.t} class="list-grid">${b.items.map((x) => `<li>${t(txt(x))}</li>`).join('')}</${b.t}>`;
      return rich([b], { page: rec.url });
    }).join('');
    const quotes = cards.length || typedInline.length ? quoteCards([...typedInline, ...cards], rec.url) : '';
    const faqs = si === faqIdx ? faqHtml : '';
    // only the logo: a brand mark, contained and centred
    if (imgs.length === 1 && !rest.length && !cards.length && logoPath && pathOf(imgs[0].src) === logoPath) {
      const im = image(imgs[0].src, { max: 800, widths: [400, 800], page: rec.url });
      return im ? `<section class="section section--tight"${idAttr}><div class="shell--narrow"><figure class="brand-mark reveal">${imgTag(im, { alt: 'Sunny Dayz', sizes: '(max-width: 720px) 92vw, 420px' })}</figure></div></section>` : '';
    }
    // photos worth a frame: small source files (avatars, 48px thumbnails) never go in the big frames
    // (a 2000w top variant: a landscape photo cover-cropped into the portrait frame renders ~1.6x the frame width)
    const framed = imgs.map((b) => ({ b, im: image(b.src, { max: 2000, widths: [600, 1200], page: rec.url }) })).filter((x) => {
      if (x.im && x.im.width >= 300) return true;
      if (x.im) REMOVED.push({ page: rec.url, text: x.b.src, why: 'image only ' + x.im.width + 'px wide at source — too small for a photo frame (would upscale ' + Math.round(520 / x.im.width) + 'x)' });
      return false;
    });
    if (framed.length) {
      const ims = framed.slice(0, 2);
      const extra = framed.slice(2).map((x) => image(x.b.src, { max: 800, widths: [400, 800], page: rec.url })).filter(Boolean);
      const flip = side++ % 2 === 1;
      const altOf = (b) => (b.alt && !/^Image$/i.test(b.alt) ? b.alt : '');
      // one image: the front frame fills the stack and the ring sits just behind it (no empty outline)
      const single = ims[0] && !ims[1];
      // sizes = the width the image really renders at. The stack is ~92vw up to 1024px and ~620px in the
      // desktop split (measured); the front frame is 82% of it (93% when single) with height/width 1.178
      // (1.15), and object-fit: cover makes a landscape photo as wide as frame height x its aspect.
      const frontSizes = (im) => {
        const frac = single ? 0.93 : 0.82;
        const k = isContain(im) ? frac : frac * Math.max(1, (single ? 1.15 : 1.178) * ((im.width || 1) / (im.height || 1)));
        return `(max-width: 1024px) ${Math.ceil(92 * k)}vw, ${Math.ceil(620 * k)}px`;
      };
      return `<section class="section section--tight"${idAttr}><div class="shell">
        <div class="split${flip ? ' split--flip' : ''}">
          <div class="stack reveal" style="--stack:1rem">${headHtml}<div class="prose">${text}</div>${faqs}</div>
          <div class="layered${single ? ' layered--single' : ''} reveal">${ims[0] ? `<span class="layered__ring scroll-drift" aria-hidden="true"></span><div class="layered__a${isContain(ims[0].im) ? ' layered__a--contain' : ''} parallax-slow">${imgTag(ims[0].im, { alt: altOf(ims[0].b), sizes: frontSizes(ims[0].im) })}</div>` : ''}${ims[1] ? `<div class="layered__b">${imgTag(ims[1].im, { alt: altOf(ims[1].b), sizes: '(max-width: 1024px) 60vw, 360px' })}</div>` : ''}</div>
        </div>
        ${extra.length ? `<div class="grid" style="--grid-min:200px; margin-top:28px">${extra.map((im, i) => `<span class="well reveal" style="--i:${i}; aspect-ratio:4/3">${imgTag(im, { alt: '', sizes: '300px' })}</span>`).join('')}</div>` : ''}
        ${quotes}
      </div></section>`;
    }
    if (!headHtml && !text && !quotes && !faqs) return '';
    return `<section class="section section--tight"${idAttr}><div class="shell--narrow"><div class="stack reveal" style="--stack:1rem">${headHtml}<div class="prose">${text}</div>${faqs}</div>${quotes}</div></section>`;
  }).join('\n');
  // FAQs with no FAQ heading on the page keep their place at the end
  const faqs = faqIdx < 0 && faqHtml ? `<section class="section section--tight" aria-label="FAQ"><div class="shell--narrow">${faqHtml}</div></section>` : '';
  // leftover source buttons: a product card's own "Add To Cart", carousel arrows and "See All"
  // belong to components rendered above; only a real call to action (e.g. GET IN TOUCH) is kept
  const leftovers = (m.buttons || []).filter((b) => !/^(Previous|Next|Add To Cart|See All|SHOP ALL)$/i.test(b) && !(m.forms || []).some((f) => f.submit === b));
  const selfPath = new URL(rec.url).pathname;
  const forms = (m.forms || []).map((f, fi) => `<form class="toolbar toolbar--fit reveal" role="search" method="get" action="${attr(selfPath)}" data-filter-form>
      <div class="toolbar__group">${(f.fields || []).map((fl) => `<label class="sr-only" for="ff-${fi}-${attr(fl.name)}">${t(fl.label || fl.name)}</label><input class="field" id="ff-${fi}-${attr(fl.name)}" type="${attr(fl.type || 'search')}" name="${attr(fl.name)}" placeholder="${attr(fl.label || '')}"${/zip|postal/i.test(fl.name + ' ' + (fl.label || '')) ? ' inputmode="numeric" autocomplete="postal-code" enterkeyhint="search"' : ''}>`).join('')}
      <button class="btn btn--sm btn--pine" type="submit">${t(f.submit || 'Search')}</button></div>
    </form><p class="muted" data-filter-empty role="status"></p>`).join('');
  const art = bannerSrc ? framedImage(bannerSrc, { alt: '', page: rec.url }) : canopyArt();
  const body = `<section class="banner">
  <span class="tex-contour" aria-hidden="true"></span>
  <div class="shell banner__grid">
    <div class="stack reveal" style="--stack:14px"><span class="eyebrow">Sunny Dayz</span><h1>${t(m.h1)}</h1>${crumbs(m.breadcrumb)}
      ${licence || (/\/dispensary\//.test(rec.url) && storeHours()) ? `<div class="cluster">${licence ? `<span class="chip chip--solid">${t(licence)}</span>` : ''}${/\/dispensary\//.test(rec.url) && storeHours() ? `<div data-store-hours='${attr(JSON.stringify(storeHours().map((r) => [r.day, r.open, r.close, r.openLabel, r.closeLabel])))}'><p class="hours__status" data-store-status hidden><b data-status-badge></b> <span data-status-msg></span></p></div>` : ''}</div>` : ''}
      ${leftovers.length ? `<div class="cluster">${leftovers.map((b) => (contactIdx >= 0 ? `<a class="btn btn--pine" href="#contact-details">${t(b)}</a>` : `<span class="chip chip--solid">${t(b)}</span>`)).join('')}</div>` : ''}</div>
    <div class="banner__art reveal">${art}</div>
  </div>
</section>
${forms ? `<section class="section section--tight"><div class="shell">${forms}</div></section>` : ''}
${secHtml}
${faqs}`;
  return page({ url: rec.url, title: rec.title, body });
}
contentPage.types = ['page'];

export function notFound(rec) {
  const m = rec.model;
  const blocks = (m.blocks || []).filter((b) => !(b.t === 'h1' && decode(b.text).trim() === decode(m.h1).trim()));
  // the source's two recovery buttons: GO BACK (history) and SHOP NOW (the shop)
  const action = (b) => (/^GO BACK$/i.test(b) ? `<button class="btn" type="button" data-go-back>${icon.arrowL}${t(b)}</button>`
    : /^SHOP NOW$/i.test(b) ? `<a class="btn btn--sun" href="/shop">${t(b)}${icon.arrow}</a>` : `<span class="chip">${t(b)}</span>`);
  const body = `<section class="section">
  <span class="tex-contour" aria-hidden="true"></span>
  <div class="shell split">
    <div class="stack reveal" style="--stack:1rem"><span class="eyebrow">404</span><h1>${t(m.h1)}</h1><div class="prose">${rich(blocks, { page: rec.url })}</div>
      <div class="cluster">${(m.links || []).filter((l) => l.href && l.href !== '#').slice(0, 3).map((l, i) => `<a class="btn${i === 0 ? ' btn--sun' : ''}" href="${attr(href(l.href))}">${t(l.label)}</a>`).join('')}${(m.buttons || []).map(action).join('')}</div>
    </div>
    <div class="reveal">${popFigure('edibles', { top: '46%', origin: '52% 66%', ratio: '4 / 3.4', sizes: '(max-width: 1024px) 100vw, 700px', load: 'high' })}</div>
  </div>
</section>`;
  return page({ url: rec.url, title: rec.title, robots: 'noindex, follow', body });
}
notFound.types = ['notfound'];
