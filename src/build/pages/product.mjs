// product.mjs — product detail page. Model: src/content/model-spec/product.md. Product JSON-LD is
// joined from the SEO inventory (it sits outside <main> in the source).
import { ORIGIN, t, attr, href, icon, image, imgTag, decode, cx } from '../lib.mjs';
import { crumbs, productCard, allModels, ldProduct, rich } from '../components.mjs';
import { page } from '../layout.mjs';
import path from 'node:path';
import { ROOT, readJSON } from '../lib.mjs';
const CHROME = readJSON(path.join(ROOT, 'src/content/chrome.json'));

const num = (v) => parseFloat(String(v || '').replace(/[^\d.]/g, '')) || 0;
const lowerStrain = (h) => (h && /^\/strain\//i.test(h) ? h.toLowerCase().replace(/%20/g, '%20') : h);

export function product(rec) {
  const m = rec.model;
  const ld = ldProduct(new URL(rec.url).pathname);
  const offer = ld && ld.offers ? ld.offers : null;
  const price = (m.price && m.price.current) || (m.variants && m.variants[0] && m.variants[0].price) || (offer && offer.price ? '$' + offer.price : '');
  const aboutWeight = ((m.about || []).find((a) => a.label === 'Available Weights') || {}).value || '';
  const imgSrc = (m.image && m.image.src) || (ld && typeof ld.image === 'string' ? ld.image : '');
  const im = image(imgSrc, { max: 1100, widths: [560, 1100], page: rec.url });
  const alt = decode((m.image && m.image.alt) || m.h1);
  const extra = (m.images || []).slice(1).map((x) => image(x.src, { max: 560, widths: [280, 560], page: rec.url })).filter(Boolean);
  const st = m.strainType;
  const titles = m.sectionTitles || {};
  const hidden = m.purchaseState === 'hidden';
  const addAct = (m.actions || []).find((a) => a.kind === 'add-to-cart');
  const contAct = (m.actions || []).find((a) => a.kind === 'continue-shopping');
  const variants = (m.variants && m.variants.length) ? m.variants : (price ? [{ weight: aboutWeight, price, active: true, href: null }] : []);
  const add = { url: new URL(rec.url).pathname, name: decode(m.h1), price, weight: (variants[0] && variants[0].weight) || aboutWeight, image: im ? im.src : '' };
  const addLabel = (addAct && addAct.label) || 'Add To Cart';
  const addAria = (addAct && addAct.ariaLabel) || `Add ${decode(m.h1)} to cart`;

  const gallery = `<div class="pdp__gallery">
    <div class="sun-orb pdp__sun float" aria-hidden="true"></div>
    <span class="pdp__halo scroll-drift" aria-hidden="true"></span>
    <div class="pdp__stage${im && im.width < 400 ? ' pdp__stage--small" style="--nat:' + im.width + 'px' : ''}">${im ? imgTag(im, { alt, sizes: '(max-width: 1024px) 92vw, 560px', lazy: false, cls: 'pdp__img' }) : `<span class="sr-only">${t(alt)}</span>`}
      ${m.stockPhoto ? `<span class="pcard__stock">${t(m.stockPhotoLabel || 'Stock photo')}</span>` : ''}
    </div>
    ${extra.length ? `<div class="pdp__thumbs">${[im, ...extra].map((x) => `<span class="well">${imgTag(x, { alt: '', sizes: '96px' })}</span>`).join('')}</div>` : ''}
    ${(m.galleryNav || []).length ? `<p class="sr-only">${m.galleryNav.map((n) => t(n.label)).join(' · ')}</p>` : ''}
  </div>`;

  const details = (m.details || []).length ? `<section class="panel reveal" aria-labelledby="d-h">
    ${titles.details ? `<h2 id="d-h">${t(titles.details)}</h2>` : ''}
    <div class="cluster">${m.details.map((d) => `<span class="metric"><b>${t(d.label)}</b> ${t(d.value)}</span>`).join('')}</div>
    ${m.disclaimer ? `<p class="note" style="margin-top:12px">${t(m.disclaimer)}</p>` : ''}
  </section>` : '';

  const buy = `<section class="panel buybox" data-buybox aria-label="${attr(addLabel)}">
    ${variants.length ? `<div><p class="eyebrow">${t(m.variantsTitle || 'Available variants')}</p>
      <div class="variants" role="group">${variants.map((v) => v.href
        ? `<a class="variant" href="${attr(href(v.href))}"><b>${t(v.price)}</b><span>${t(v.weight)}</span></a>`
        : `<button class="variant" type="button" aria-pressed="${v.active ? 'true' : 'false'}" data-price="${attr(v.price)}" data-weight="${attr(v.weight)}"><b>${t(v.price)}</b><span>${t(v.weight || '')}</span></button>`).join('')}</div></div>` : ''}
    ${hidden && m.availabilityMessage ? `<p class="avail" role="status">${icon.warn}<span id="avail-msg">${t(m.availabilityMessage)}</span></p>` : ''}
    <div class="cluster">
      <button class="btn btn--sun magnet" type="button" data-add="${attr(JSON.stringify(add))}" aria-label="${attr(addAria)}"${hidden ? ' aria-disabled="true" disabled aria-describedby="avail-msg"' : ''}>${icon.bag}<span>${t(addLabel)}</span></button>
      <a class="btn btn--ghost" href="${attr(href((contAct && contAct.href) || '/shop'))}">${t((contAct && contAct.label) || 'Continue Shopping')}</a>
      <button class="btn btn--ghost" type="button" data-chooser-proxy>${icon.pin} ${t(CHROME.chooser.chooseStore.text)}</button>
    </div>
  </section>`;

  const about = (m.about || []).length ? `<section class="panel reveal" aria-labelledby="a-h">
    ${titles.about ? `<h2 id="a-h">${t(titles.about)}</h2>` : ''}
    <dl class="kv">${m.about.map((a) => `<dt>${t(a.label)}${/^(THC|TAC|CBD)$/.test(a.label) ? ' :' : ':'}</dt><dd>${a.href ? `<a href="${attr(href(lowerStrain(a.href)))}">${t(a.value)}</a>` : t(a.value)}</dd>`).join('')}</dl>
  </section>` : '';

  const terps = (m.terpenes || []);
  const tMax = Math.max(0.0001, ...terps.filter((x) => !/^(total terpenes|moisture)$/i.test(x.name)).map((x) => num(x.value)));
  const terpenes = terps.length ? `<section class="panel reveal" aria-labelledby="t-h">
    ${titles.terpenes ? `<h2 id="t-h">${t(titles.terpenes)}</h2>` : ''}
    <div class="bars">${terps.map((x) => {
      const summary = /^(total terpenes|moisture)$/i.test(x.name);
      const w = summary ? 100 : Math.min(100, (num(x.value) / tMax) * 100);
      return `<div class="bar${summary ? ' bar--sun' : ''}"><span>${t(x.name)}${x.aroma || x.effects ? `<small class="note" style="display:block">${t([x.aroma, x.effects].filter(Boolean).join(' · '))}</small>` : ''}</span><span class="bar__track"><span class="bar__fill" style="--v:${w.toFixed(1)}%"></span></span><b>${t(x.value)}</b></div>`;
    }).join('')}</div>
  </section>` : '';

  const cannab = (m.cannabinoids || []).length ? `<section class="panel reveal" aria-labelledby="c-h">
    ${titles.cannabinoids ? `<h2 id="c-h">${t(titles.cannabinoids)}</h2>` : ''}
    ${m.cannabinoids.map((g) => `<div class="stack" style="--stack:10px; margin-bottom:16px"><p class="eyebrow">${t(g.group)}</p><div class="bars">${g.items.map((x) => `<div class="bar${/total/i.test(x.name) ? ' bar--sun' : ''}"><span>${t(x.name)}</span><span class="bar__track"><span class="bar__fill" style="--v:${Math.min(100, num(x.value)).toFixed(2)}%"></span></span><b>${t(x.value)}</b></div>`).join('')}</div></div>`).join('')}
  </section>` : '';

  const warnings = (m.warnings || []).map((w) => `<details class="panel warning reveal">
    <summary>${icon.warn} ${t(w.title)}</summary>
    <div class="stack" style="--stack:8px; margin-top:12px">${w.label ? `<b>${t(w.label)}</b>` : ''}${(w.lines || []).map((l) => `<p>${t(l)}</p>`).join('')}
    ${w.moreInfo ? `<p>${t(w.moreInfo.text)} <a href="${attr(w.moreInfo.href)}" target="_blank" rel="noopener noreferrer">${t(w.moreInfo.label)}</a></p>` : ''}
    ${(w.links || []).map((l) => `<a href="${attr(href(l.href))}">${t(l.label)}</a>`).join(' ')}</div>
  </details>`).join('');

  const pageUrl = ORIGIN + new URL(rec.url).pathname;
  const shareHref = { facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`, twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(pageUrl)}`, pinterest: `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(pageUrl)}`, whatsapp: `https://wa.me/?text=${encodeURIComponent(pageUrl)}` };
  const share = m.share && (m.share.buttons || []).length ? `<div class="share cluster">${m.share.label ? `<span class="eyebrow">${t(m.share.label)}</span>` : ''}${m.share.buttons.filter((s) => shareHref[s.network]).map((s) => `<a class="chip" href="${attr(shareHref[s.network])}" target="_blank" rel="noopener noreferrer" aria-label="${attr(s.ariaLabel || s.network)}">${t(s.network.charAt(0).toUpperCase() + s.network.slice(1))}</a>`).join('')}</div>` : '';

  const catHref = m.category && m.category.href;
  const related = allModels().filter((r) => r.type === 'product' && r.url !== rec.url && r.model.category && r.model.category.href === catHref).slice(0, 10);
  const relatedRail = related.length ? `<section class="section section--tight" aria-labelledby="rel-h"><div class="shell rail" data-rail>
    <div class="section-head"><div><span class="eyebrow">Sunny Dayz</span><h2 id="rel-h">${t(m.category.label)}</h2></div>
    <div class="cluster"><a class="see-all" href="${attr(href(catHref))}">See All${icon.arrow}</a><div class="rail__ctrls"><button class="icon-btn" type="button" data-prev aria-label="Previous">${icon.arrowL}</button><button class="icon-btn" type="button" data-next aria-label="Next">${icon.arrow}</button></div></div></div>
    <div class="rail__track" tabindex="0" aria-label="${attr(m.category.label)}">${related.map((r, i) => productCard({ url: new URL(r.url).pathname }, { page: rec.url, i })).join('')}</div>
    <div class="rail__progress" aria-hidden="true"><span></span></div></div></section>` : '';

  const body = `<section class="section">
  <span class="tex-contour" aria-hidden="true"></span>
  <div class="shell">
    <div class="reveal" style="margin-bottom:28px">${crumbs(m.breadcrumb)}</div>
    <div class="pdp">
      ${gallery}
      <div class="stack" style="--stack:18px">
        <div class="stack reveal" style="--stack:10px">
          ${(m.badges || []).map((b) => `<span class="chip chip--${attr(b.tone || 'info')}" title="${attr(b.title || '')}">${t(b.label)}</span>`).join('')}
          ${m.brand ? (m.brand.href ? `<a class="pcard__brand" href="${attr(href(m.brand.href))}" style="text-transform:uppercase">${t(m.brand.label)}</a>` : `<span class="pcard__brand" style="text-transform:uppercase">${t(m.brand.label)}</span>`) : ''}
          <h1>${t(m.h1)}</h1>
          <div class="pdp__meta">
            ${st ? `<span class="strain strain--${attr(st.key || '')}"${st.ariaLabel ? ` aria-label="${attr(st.ariaLabel)}"` : ''}>${t(st.label)}</span>` : ''}
            ${m.category ? `<a class="chip" href="${attr(href(m.category.href))}">${t(m.category.label)}</a>` : ''}
            ${(m.subcategories || []).map((s) => `<a class="chip" href="${attr(href(s.href))}">${t(s.label)}</a>`).join('')}
          </div>
          <p class="pdp__price">${t(price)}${variants[0] && variants[0].weight ? ` <small>/ ${t(variants[0].weight)}</small>` : ''}</p>
        </div>
        ${buy}
        ${details}
        ${m.description ? `<section class="panel reveal" aria-labelledby="desc-h">${titles.description ? `<h2 id="desc-h">${t(titles.description)}</h2>` : ''}<p class="prewrap">${t(m.description)}</p></section>` : ''}
        ${about}
        ${terpenes}
        ${cannab}
        ${warnings}
        ${share}
      </div>
    </div>
  </div>
</section>
${relatedRail}`;
  return page({ url: rec.url, title: rec.title, body });
}
product.types = ['product'];
