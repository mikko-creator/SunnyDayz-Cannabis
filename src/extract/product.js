// product.js — /product/<slug> detail pages (Treez PDP). Spec: src/content/model-spec/product.md.
// Every section is optional: merch pages have no Details/strain/lab results, 77 of 146 captures show
// only the purchase-area loading placeholders, and the Product JSON-LD lives outside <main>.
function extract(root, ctx) {
  // ---- local helpers (names must not collide with _common.js) ----
  const pBody = Q(root, '.details__body');
  const pTxt = (el) => (el ? el.textContent.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim() : '');
  // hrefs in the variant switcher are page-relative ("other-product-slug"): resolve against the page URL
  // external hrefs are kept verbatim (URL() would lowercase "www.P65Warnings.ca.gov" and add a slash)
  const pHref = (a) => { const h = a && a.getAttribute('href'); if (h == null) return null; try { const u = new URL(h, ctx.url); return u.origin === ORIGIN ? rel(u.href) : h; } catch (e) { return rel(h); } };
  const pLabel = (strong) => pTxt(strong).replace(/\s*:\s*$/, '');
  const pClassKey = (el, re) => { const c = el ? [...el.classList].find((x) => re.test(x)) : null; return c ? c.replace(re, '').replace(/__[A-Za-z0-9_-]{5}$/, '') : null; };
  const pHeading = (scope, text) => QA(scope, '.details__h3').find((p) => pTxt(p) === text) || null;

  // ---- header ----
  const h1 = pTxt(Q(root, 'h1'));
  // brand eyebrow: usually a link; "not specified" pages carry plain text with no link
  const brandSpan = QA(pBody, ':scope > span.details__span').find((s) => !/subcategory/.test(s.className)) || null;
  const brandA = Q(brandSpan, 'a');
  const strainEl = Q(pBody, C('StrainInfo_flower__type'));
  const strainType = strainEl ? {
    label: pTxt(Q(strainEl, 'strong')) || pTxt(strainEl),
    key: pClassKey(strainEl, /^StrainInfo_type__(?!default)/),
    ariaLabel: strainEl.getAttribute('aria-label') || null,
  } : null;
  const badges = QA(pBody, C('product__badges') + ' > span').map((b) => ({
    label: pTxt(b),
    title: b.getAttribute('title') || null,
    tone: pClassKey(b, /^ProductBadge_product_badge__(?=[a-z]+__)/) || null,
  })).filter((b) => b.label);
  const catA = Q(pBody, '.details__category_title a');
  const subcategories = QA(pBody, C('details__span_subcategory') + ' a').map((a) => ({ label: pTxt(a), href: pHref(a) }));

  // ---- gallery ----
  // alt is whitespace-normalised exactly like h1 (pTxt): the source alt and the source h1 are the same string, and on
  // 9 pages that string carries stray spaces (" Sunnydayz Battery", "HG - Aluminum Grinder  - Black 2.5 Inch ")
  const pAlt = (i) => (i ? Object.assign(i, { alt: String(i.alt || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim() }) : i);
  const slides = QA(root, '.details__images .slick-track ' + C('slide_main'));
  const images = slides.map((f) => pAlt(IMG(f))).filter(Boolean);
  const realImages = images.filter((i) => i.src && !i.placeholder);
  const image = realImages[0] ? { src: realImages[0].src, alt: realImages[0].alt } : (images[0] ? { src: '', alt: images[0].alt, placeholder: true } : null);
  const stockEl = Q(root, '.details__images .product__in_stock');
  const galleryNav = QA(root, '.details__images button.slick-arrow').map((b) => ({ label: pTxt(b), direction: b.classList.contains('slick-prev') ? 'prev' : b.classList.contains('slick-next') ? 'next' : null, disabled: b.classList.contains('slick-disabled') }));
  const thumbnails = QA(root, '.details__images .slick-thumb li').map((li) => { const i = pAlt(IMG(li)); return i ? Object.assign(i, { active: li.classList.contains('slick-active') }) : null; }).filter(Boolean);

  // ---- details (THC / TAC / CBD chips) + disclaimer ----
  const details = QA(pBody, '.content__flex').map((row) => {
    const d = Q(row, 'p.description');
    const hv = Q(d, '.highlighted');
    const label = d ? pTxt(d.cloneNode(true)) : '';
    const icon = Q(row, 'i.icon');
    const svg = icon ? null : Q(row, 'svg');
    const out = {
      label: hv ? label.slice(0, label.length - pTxt(hv).length).trim() : label,
      value: hv ? pTxt(hv) : null,
      // icon font key ('vector' THC, 'water_drop_black' CBD) or 'inline-svg' (TAC leaf glyph, markup in _iconSvg)
      icon: icon ? ([...icon.classList].find((c) => /^icon_/.test(c)) || '').replace(/^icon_/, '') || null : (svg ? 'inline-svg' : null),
    };
    if (svg) out._iconSvg = svg.outerHTML;
    return out;
  }).filter((r) => r.label || r.value);
  const disclaimer = pTxt(Q(pBody, 'small')) || null;

  // ---- description (<pre>, whitespace-significant) ----
  const pre = Q(pBody, 'pre.details__description') || Q(pBody, 'pre');
  const description = pre ? pre.textContent.replace(/\u00a0/g, ' ').replace(/\r\n?/g, '\n').trim() : null;

  // ---- warnings (collapsible accordions) ----
  const warnings = QA(pBody, 'button.bottom__warning').map((btn) => {
    const panelId = btn.getAttribute('aria-controls');
    const panel = (panelId && Q(root, '#' + CSS.escape(panelId))) || btn.nextElementSibling;
    const content = Q(panel, '.warning__content') || panel;
    // initial open/closed state as served: the panel's data-collapsed, else the button's aria-expanded, else an inline
    // height:0; null when the markup says nothing. All 63 captured panels: data-collapsed="true" style="height:0".
    const dc = panel ? panel.getAttribute('data-collapsed') : null;
    const ae = btn.getAttribute('aria-expanded');
    const collapsed = dc != null ? dc === 'true' : ae != null ? ae !== 'true' : (panel && /(^|;)\s*height\s*:\s*0(px)?\s*(;|$)/.test(panel.getAttribute('style') || '') ? true : null);
    const tIcon = Q(btn, 'i.icon');
    const w = {
      title: pTxt(btn), collapsed,
      toggleIcon: tIcon ? ([...tIcon.classList].find((c) => /^icon_/.test(c)) || '').replace(/^icon_/, '') || null : null,
      toggleAriaLabel: tIcon ? tIcon.getAttribute('aria-label') || null : null,
      label: null, lines: [], moreInfo: null, links: [],
    };
    let pending = '';
    const flush = () => { const t = pending.replace(/\s+/g, ' ').trim(); if (t) w.lines.push(t); pending = ''; };
    for (const n of content ? [...content.childNodes] : []) {
      if (n.nodeType === 3) { pending += n.nodeValue; continue; }
      if (n.nodeType !== 1) continue;
      if (n.tagName === 'BR') { flush(); continue; }
      if (n.tagName === 'A') {
        const link = { label: pTxt(n), href: pHref(n) };
        const lead = pending.replace(/\s+/g, ' ').trim();
        if (lead && !w.moreInfo) { w.moreInfo = { text: lead, label: link.label, href: link.href }; pending = ''; } else { flush(); w.links.push(link); }
        continue;
      }
      if (n.tagName === 'SPAN' && w.label == null && !w.lines.length) { w.label = pTxt(n); continue; }
      if (n.tagName === 'FIGURE' || n.tagName === 'svg' || n.tagName === 'SVG') continue;
      flush(); const t = pTxt(n); if (t) w.lines.push(t);
    }
    flush();
    return w;
  });

  // ---- purchase area: 'placeholder' (skeleton loaders only) | 'hidden' (rendered, display:none) | 'visible' ----
  const control = Q(pBody, '.details__item-control');
  const item = Q(control, '.details__item');
  const purchaseState = item ? (item.classList.contains('hidden') ? 'hidden' : 'visible') : (Q(control, '.availability_placeholders') ? 'placeholder' : null);
  const variantsTitle = pTxt(Q(control, C('weight_variant_title_weights'))) || null;
  const variants = QA(control, C('weigthvariants_weight_variant_btn__')).map((b) => ({
    weight: pTxt(Q(b, C('weight_variant_btn_label'))),
    price: pTxt(Q(b, C('weight_variant_btn_price__'))) || null,
    active: [...b.classList].some((c) => /weight_variant_btn_active/.test(c)),
    href: b.tagName === 'A' ? pHref(b) : null,
  }));
  const priceEl = Q(control, C('price_price'));
  const price = priceEl ? {
    current: pTxt(Q(priceEl, 'ins')) || null,
    original: pTxt(Q(priceEl, 'del')) || null,
    ariaLabel: priceEl.getAttribute('aria-label') || null,
  } : null;
  const actions = [];
  const cartBtn = Q(control, C('counter_counter__btn-update-cart')) || Q(control, C('counter_counter__btn'));
  if (cartBtn) actions.push({ kind: 'add-to-cart', label: pTxt(Q(cartBtn, C('counter_counter__text'))) || pTxt(cartBtn), ariaLabel: cartBtn.getAttribute('aria-label') || null });
  const favBtn = Q(control, 'button.favorite_icon');
  if (favBtn) actions.push({ kind: 'favorite', label: pTxt(favBtn), ariaLabel: favBtn.getAttribute('aria-label') || null });
  const contA = Q(control, 'a.details__item-link');
  if (contA) actions.push({ kind: 'continue-shopping', label: pTxt(contA), ariaLabel: contA.getAttribute('aria-label') || null, href: pHref(contA) });
  const availEl = Q(control, '.details__availability_message');
  const availabilityMessage = pTxt(availEl) || null;
  const alertEl = Q(control, '.details__availability [role="alert"]');
  // Every alert_<tone> class, in class-attribute order (the source sets two: "alert_success alert_warning").
  const availabilityTones = alertEl ? [...alertEl.classList].filter((c) => /^alert_(?!layout)/.test(c)).map((c) => c.replace(/^alert_/, '')) : [];
  // Which tone PAINTS is decided by stylesheet order, not class order: the site's /_next/static/css/6bc1fa4dfc6990ff.css
  // declares .alert_success, .alert_error, .alert_warning, .alert_info (one class each, equal specificity), so the
  // later rule wins. Proven by computed style with the page's own 18 stylesheets (tmp/product-alert-tone.mjs):
  // success+warning paints #ffe4a0/#664b07 (= warning) in either class order. Unknown tone in a mix -> null.
  const P_TONE_ORDER = ['success', 'error', 'warning', 'info'];
  const availabilityTone = availabilityTones.length === 1 ? availabilityTones[0]
    : availabilityTones.length && availabilityTones.every((t) => P_TONE_ORDER.includes(t))
      ? availabilityTones.slice().sort((a, b) => P_TONE_ORDER.indexOf(a) - P_TONE_ORDER.indexOf(b)).pop() : null;

  // ---- About this product ----
  const about = QA(pBody, '.details__item-column > *').map((row) => {
    const strong = Q(row, 'strong');
    const a = Q(row, 'a');
    const label = pLabel(strong);
    const rest = row.cloneNode(true);
    const s2 = Q(rest, 'strong'); if (s2) s2.remove();
    const value = pTxt(rest);
    const out = { label, value };
    if (a) out.href = pHref(a);
    return out;
  }).filter((r) => r.label || r.value);

  // ---- Share ----
  const shareBox = Q(pBody, C('sharing_sharing'));
  const share = (shareBox || Q(pBody, '.details__subtitle')) ? {
    label: pTxt(Q(pBody, '.details__subtitle')) || null,
    buttons: QA(shareBox, 'button').map((b) => {
      const i = Q(b, 'i.icon');
      const net = i ? ([...i.classList].find((c) => /^icon_/.test(c)) || '').replace(/^icon_/, '') : '';
      return { network: net || null, ariaLabel: b.getAttribute('aria-label') || null };
    }),
  } : null;

  // ---- lab results ----
  const lab = Q(root, '.lab_results');
  const terpenes = QA(lab, '.terpene_item').map((t) => {
    const aromaEl = Q(t, '.terpene_aroma');
    const descEl = Q(t, '.terpene_description');
    let effects = null;
    if (descEl) { const c = descEl.cloneNode(true); const a2 = Q(c, '.terpene_aroma'); if (a2) a2.remove(); effects = pTxt(c) || null; }
    return { name: pTxt(Q(t, '.terpene_name')), value: pTxt(Q(t, '.terpene_percentage')) || null, aroma: aromaEl ? pTxt(aromaEl).replace(/\s*:\s*$/, '') || null : null, effects };
  });
  const cannabinoids = QA(lab, '.cannabinoid_compound_section').map((s) => ({
    group: pTxt(Q(s, '.list_title')),
    items: QA(s, '.cannabinoid_item').map((it) => ({ name: pTxt(Q(it, '.cannabinoid_name')), value: pTxt(Q(it, '.cannabinoid_value')) || null })),
  }));

  // ---- section headings as rendered (so templates never hard-code them) ----
  const sectionTitles = {
    details: pTxt(pHeading(pBody, 'Details')) || null,
    description: pTxt(pre && pre.previousElementSibling && pre.previousElementSibling.classList.contains('details__h3') ? pre.previousElementSibling : null) || null,
    warning: pTxt(pHeading(pBody, 'Warning')) || null,
    about: pTxt(Q(pBody, '.details__about_product .details__h3')) || null,
    terpenes: pTxt(Q(lab, '.terpenes .details__h3')) || null,
    cannabinoids: pTxt(Q(lab, '.cannabinoids .details__h3')) || null,
  };

  // ---- JSON-LD (only if the capture carried it inside <main>; the build joins audit/raw otherwise) ----
  const ld = JSONLD(root).find((j) => j && j['@type'] === 'Product') || null;
  const offer = ld && (Array.isArray(ld.offers) ? ld.offers[0] : ld.offers);
  const jsonld = ld ? {
    name: ld.name || null,
    brand: typeof ld.brand === 'string' ? ld.brand : (ld.brand && ld.brand.name) || null,
    image: Array.isArray(ld.image) ? ld.image[0] : ld.image || null,
    price: offer ? offer.price || offer.lowPrice || null : null,
    currency: offer ? offer.priceCurrency || null : null,
    availability: offer && offer.availability ? String(offer.availability).replace(/^.*\//, '') : null,
    url: offer && offer.url ? rel(offer.url) : null,
  } : null;
  const finalImage = image && image.src ? image : (jsonld && jsonld.image ? { src: jsonld.image, alt: h1, fromJsonld: true } : image);

  return {
    breadcrumb: BREADCRUMB(root),
    h1,
    name: h1,
    brand: brandSpan && pTxt(brandSpan) ? { label: pTxt(brandA || brandSpan), href: brandA ? pHref(brandA) : null } : null,
    badges,
    strainType,
    category: catA ? { label: pTxt(catA), href: pHref(catA) } : null,
    subcategories,
    image: finalImage,
    images,
    thumbnails,
    galleryNav,
    stockPhoto: !!stockEl,
    stockPhotoLabel: stockEl ? pTxt(stockEl) : null,
    sectionTitles,
    details,
    disclaimer,
    description,
    warnings,
    purchaseState,
    variantsTitle,
    variants,
    price,
    actions,
    availabilityMessage,
    availabilityTone,
    availabilityTones,
    about,
    share,
    terpenes,
    cannabinoids,
    jsonld,
  };
}
