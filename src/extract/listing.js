// listing.js — /shop, /deals, /promotions, /daily-deals, /product-group/our-products,
// /our-strains, /store-locator. One envelope for all seven: every structure is optional and is
// null / [] when the page does not carry it. The product-grid core matches collection.js.
// Helper names carry the `lst` prefix so they cannot collide with _common.js.

// JSON-LD strings on this site are HTML-entity encoded ("Bubba&apos;s"); decode, never rewrite.
function lstDecode(s) {
  if (typeof s !== 'string' || !/&[#a-z0-9]+;/i.test(s)) return s;
  const ta = document.createElement('textarea');
  ta.innerHTML = s;
  return ta.value;
}

// Single-line labels (names, brands, alts) keep the source's stray spaces in the JSON-LD and in
// attributes (" Sunnydayz Battery", "HG - Aluminum Grinder  - Black 2.5 Inch "). Collapse them the
// way T() does for DOM text; an empty result is "no value" (null), never "".
function lstLine(s) {
  if (typeof s !== 'string') return s == null ? null : s;
  const t = s.replace(/\s+/g, ' ').trim();
  return t || null;
}

function lstProducts(root) {
  const list = JSONLD(root).find((j) => j['@type'] === 'ItemList');
  const raw = list ? list.itemListElement || [] : [];
  return ITEMLIST(root).map((p, i) => {
    const li = raw[i] || {};
    const off = (li.item || li).offers || {};
    return {
      position: li.position != null && !isNaN(Number(li.position)) ? Number(li.position) : i + 1,
      url: p.url,
      name: lstLine(lstDecode(p.name)) || '',
      brand: lstLine(lstDecode(p.brand)), // null when the JSON-LD brand is ""
      description: lstDecode(p.description),
      price: p.price,
      priceAmount: off.price != null && !isNaN(Number(off.price)) ? Number(off.price) : null,
      currency: off.priceCurrency || null,
      availability: p.availability,
      image: p.image ? { src: p.image.src, alt: lstLine(lstDecode(p.image.alt)) || '' } : null,
    };
  });
}

function lstBanner(root) {
  const s = Q(root, C('banner_page_banner__section'));
  if (!s) return null;
  const pic = (prefix) => { const f = Q(s, C(prefix)); return f ? IMG(f) : null; };
  return {
    title: T(Q(s, 'h1')),
    description: T(Q(s, C('banner_page__banner_description'))) || null,
    desktopImage: pic('banner_page_banner__desktop'),
    mobileImage: pic('banner_page_banner__mobile'),
  };
}

function lstFilters(root) {
  const s = Q(root, C('FiltersTreez_section'));
  if (!s) return null;
  const trigger = Q(s, 'button[aria-haspopup="listbox"]');
  const label = Q(s, C('FiltersTreez_sort_by_select_label'));
  let selected = null;
  if (label) {
    const c = label.cloneNode(true);
    QA(c, C('FiltersTreez_sort_by_placeholder_label')).forEach((n) => n.remove());
    selected = T(c) || null;
  }
  const quick = Q(s, C('FiltersTreez_slider_container'));
  return {
    filterLabel: T(Q(s, C('FiltersTreez_title'))) || null,
    sortLabel: T(Q(s, C('FiltersTreez_sort_by_placeholder_label'))) || null,
    sortAriaLabel: trigger ? trigger.getAttribute('aria-label') : null,
    sortSelected: selected,
    sortOptions: QA(s, '[role="option"], option').map((o) => T(o)).filter(Boolean),
    quickFilters: quick ? QA(quick, 'a, button').map((b) => T(b)).filter(Boolean) : [],
  };
}

// Product card elements (not the skeleton's placeholder cards).
function lstCardEls(scope) {
  return QA(scope, '*').filter((el) => [...el.classList].some((c) => /^product_product__[A-Za-z0-9_-]{5}$/.test(c)) && ![...el.classList].some((c) => /placeholder/i.test(c)));
}

// CARD() plus the card's visible strings CARD() does not keep: the "Stock photo" label (CARD
// keeps only a boolean), button labels ("Add To Cart"; the favourite button is icon-only and has
// just an aria-label), and any other text left over, so a new badge is kept instead of dropped.
function lstCard(el) {
  const c = CARD(el);
  if (c.image && typeof c.image.alt === 'string') c.image.alt = lstLine(c.image.alt) || '';
  const stock = Q(el, C('product_product__in_stock'));
  c.stockPhotoLabel = stock ? T(stock) || null : null;
  c.buttons = QA(el, 'button').map((b) => ({ label: T(b) || null, ariaLabel: lstLine(b.getAttribute('aria-label')), testId: b.getAttribute('data-testid') || null }));
  const left = el.cloneNode(true);
  [C('product__name'), C('product_price') + ' ins', C('product_variation__message'), C('product_info__'), C('StrainInfo_flower__type'), C('product_product__in_stock'), 'button', 'script', 'style'].forEach((sel) => QA(left, sel).forEach((n) => n.remove()));
  // decorative leaves such as the "/" between price and weight carry no text of their own
  QA(left, '*').filter((n) => !n.children.length && !/[a-z0-9]/i.test(n.textContent)).forEach((n) => n.remove());
  const rest = T(left);
  c.otherText = /[a-z0-9]/i.test(rest) ? rest : null;
  return c;
}

function lstGrid(root) {
  const g = Q(root, C('CollectionTreez_collection_section'));
  if (!g) return { state: null, emptyState: null, cards: [] };
  const cardEls = lstCardEls(g);
  const empty = Q(g, C('CollectionTreez_hits__empty'));
  const state = cardEls.length ? 'cards' : empty ? 'empty' : Q(g, C('CollectionTreez_placeholder')) ? 'loading' : 'unknown';
  const emptyState = empty ? { heading: T(Q(empty, 'h1,h2,h3,h4,h5,h6')) || null, text: QA(empty, 'p').map((p) => T(p)).filter(Boolean).join(' ') || null } : null;
  return { state, emptyState, cards: cardEls.map(lstCard) };
}

// Does the saved render belong to this URL? Same rule as collection.js: in the server HTML the
// sort control shows a selected option exactly when the URL has ?sort=. When the DOM disagrees
// with the URL, the query-dependent values (selected sort, grid state, cards, ItemList) belong to
// another URL: they move to capture.observed and the page's own fields say "not captured".
function lstCapture(root, u, filters) {
  if (!filters) return { matchesUrl: null, signal: null };
  const trigger = Q(root, C('FiltersTreez_section') + ' button[aria-haspopup="listbox"]');
  const urlSorted = u.searchParams.has('sort');
  // the trigger carries a select_selected__ class exactly when an option is chosen
  const domSorted = !!filters.sortSelected || !!(trigger && [...trigger.classList].some((c) => /^select_selected__/.test(c)));
  if (urlSorted === domSorted) return { matchesUrl: true, signal: null };
  return { matchesUrl: false, signal: domSorted ? 'sort-selected-without-sort-param' : 'sort-param-without-sort-selected' };
}

// Slider prev/next buttons carry their label only as sr-only text.
function lstControls(el) {
  const nav = Q(el, C('Slider_slider_buttons'));
  if (!nav) return null;
  const btn = (cls) => { const b = Q(nav, 'button.' + cls); return b ? T(b) || b.getAttribute('aria-label') : null; };
  return { previous: btn('slick-prev'), next: btn('slick-next') };
}

// "Promo Carousel" (/shop) / "Today's deals" (/deals): Treez specials slider.
function lstPromoCarousel(root) {
  const s = Q(root, C('specialsslider_promo__carousel'));
  if (!s) return null;
  const h = Q(s, C('Slider_slider_header') + ' h1, ' + C('Slider_slider_header') + ' h2, ' + C('Slider_slider_header') + ' h3');
  let heading = null;
  let countText = null;
  if (h) {
    const c = h.cloneNode(true);
    const sr = QA(c, '.sr-only');
    countText = sr.map((n) => T(n)).join(' ').replace(/^[\s\-–]+/, '') || null;
    sr.forEach((n) => n.remove());
    heading = T(c) || null;
  }
  const countMatch = (s.getAttribute('aria-label') || countText || '').match(/(\d+)\s+promotions?\b/i);
  const a = Q(s, 'a' + C('specialsslider_specials__see_all'));
  let seeAll = null;
  if (a) {
    const c = a.cloneNode(true);
    const badge = QA(c, 'span[aria-hidden="true"]');
    const countBadge = badge.map((n) => T(n)).join('') || null;
    badge.forEach((n) => n.remove());
    seeAll = { label: T(c), countBadge, href: rel(a.getAttribute('href')), ariaLabel: a.getAttribute('aria-label') || null };
  }
  const slides = QA(s, '.swiper-slide');
  const real = slides.filter((sl) => !Q(sl, C('specialsslider_special__placeholder')));
  return {
    ariaLabel: s.getAttribute('aria-label') || null,
    heading,
    countText, // sr-only suffix of the heading, e.g. "0 promotions available"
    promotionCount: countMatch ? Number(countMatch[1]) : null,
    seeAll,
    state: real.length ? 'items' : slides.length ? 'loading' : 'empty',
    placeholderSlides: slides.length - real.length,
    // no crawl captured a filled slide; this generic shape is kept so a future crawl is not lost
    promotions: real.map((sl) => ({ text: T(sl), link: LINK(Q(sl, 'a[href]')), image: IMG(sl) })),
    controls: lstControls(s),
  };
}

// Search boxes (promotions filter, store locator). The inputs have no visible label text.
function lstSearch(root) {
  return QA(root, 'input[type="search"], input[name^="search"]').map((i) => {
    // nearest ancestor that also holds the submit button (the <label> itself has a search_box class)
    let box = i.parentElement;
    while (box && box.parentElement && !Q(box, 'button')) box = box.parentElement;
    const btn = box ? Q(box, 'button') : null;
    return { name: i.getAttribute('name') || null, placeholder: i.getAttribute('placeholder') || null, ariaLabel: i.getAttribute('aria-label') || null, buttonAriaLabel: btn ? btn.getAttribute('aria-label') : null };
  });
}

// /promotions "Promotion not found." block: heading + "Click " + link.
function lstNotice(root) {
  const e = Q(root, '.promotion_empty');
  if (!e) return null;
  const a = Q(e, 'a[href]');
  const body = e.cloneNode(true);
  QA(body, 'h1,h2,h3,h4,h5,h6,a').forEach((n) => n.remove());
  return { heading: T(Q(e, 'h1,h2,h3,h4,h5,h6')) || null, text: T(body) || null, link: LINK(a) };
}

// /our-strains image galleries: heading, intro, captioned images. Each gallery renders its items
// twice (swiper carousel + a hidden grid); items are de-duplicated by caption + image.
function lstGalleries(root) {
  return QA(root, 'section' + C('image_gallery_image_gallery__')).map((s) => {
    const h = QA(s, 'h1,h2,h3,h4,h5,h6').find((x) => !x.closest(C('image_gallery_gallery__images_item_body')));
    const intro = QA(s, 'p').filter((p) => !p.closest(C('image_gallery_gallery__images_item_body'))).map((p) => T(p)).filter(Boolean);
    const seen = new Set();
    const items = [];
    for (const it of QA(s, C('image_gallery_gallery__images_item_body'))) {
      const caption = T(Q(it, C('image_gallery_caption__container'))) || null;
      const image = IMG(Q(it, 'figure') || it);
      const key = caption + '|' + (image ? image.src : '');
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({ caption, image });
    }
    return { heading: h ? T(h) : null, headingLevel: h ? h.tagName.toLowerCase() : null, intro, items };
  });
}

// /store-locator store cards. Status is a live open/closed indicator frozen at crawl time.
function lstStores(root) {
  return QA(root, C('treezstore_store__item')).map((el) => {
    const stretched = Q(el, 'a' + C('treezstore_store__stretched_link'));
    const addr = Q(el, 'a' + C('treezstore_store__addres'));
    const mapsHref = addr ? addr.getAttribute('href') : null;
    const geo = mapsHref ? mapsHref.match(/[?&]q=(-?[\d.]+),(-?[\d.]+)/) : null;
    const phone = Q(el, 'a' + C('treezstore_store__phone'));
    const statusEl = Q(el, C('storeStatusIndicator_status__badge'));
    const badges = Q(el, C('storeCustomerTypeBadges_badges'));
    return {
      name: T(Q(el, 'h1,h2,h3,h4')) || null,
      href: stretched ? rel(stretched.getAttribute('href')) : null,
      detailsAriaLabel: stretched ? (stretched.getAttribute('aria-label') || '').trim() || null : null,
      address: addr ? { text: T(Q(addr, C('treezstore_store__addres_ellipsis'))) || null, mapsHref, ariaLabel: addr.getAttribute('aria-label') || null, lat: geo ? Number(geo[1]) : null, lng: geo ? Number(geo[2]) : null } : null,
      phone: phone ? { label: T(phone), href: phone.getAttribute('href'), ariaLabel: phone.getAttribute('aria-label') || null } : null,
      customerTypes: badges ? QA(badges, '.badge').map((b) => T(b)).filter(Boolean) : [],
      customerTypesAriaLabel: badges ? badges.getAttribute('aria-label') : null,
      status: statusEl ? { badge: T(statusEl), message: T(Q(el, C('storeStatusIndicator_status__message'))) || null, ariaLabel: statusEl.getAttribute('aria-label') || null } : null,
      image: IMG(Q(el, C('treezstore_store__image'))),
    };
  });
}

function extract(root, ctx) {
  const main = root.firstElementChild || root;
  const u = new URL(ctx.url);
  const path = decodeURIComponent(u.pathname).replace(/\/+$/, '') || '/';
  const banner = lstBanner(root);
  const filters = lstFilters(root);
  const grid = lstGrid(root);
  const products = lstProducts(root);
  const jsonld = JSONLD(root);
  const check = lstCapture(root, u, filters);
  const own = check.matchesUrl !== false;
  const isItemList = (j) => j && j['@type'] === 'ItemList';
  const stores = lstStores(root);
  const storeList = Q(root, '.stores_list');
  const h1 = Q(root, 'h1');
  const closeBtn = Q(root, '.open_modal_btn');

  // Safety net: text left after removing every structure modelled above becomes rich blocks.
  // Inside the product grid only the modelled parts are removed (filter bar, cards, empty state,
  // skeleton), so a grid-level control such as a "load more" button lands in extraButtons.
  const rest = main.cloneNode(true);
  // Remove exactly what lstGrid() / lstFilters() modelled (first grid: its cards, empty state and
  // skeleton; first filter bar). A card or filter bar anywhere else stays for the safety net.
  const restGrid = Q(rest, C('CollectionTreez_collection_section'));
  if (restGrid) {
    lstCardEls(restGrid).forEach((n) => n.remove());
    const e = Q(restGrid, C('CollectionTreez_hits__empty'));
    if (e) e.remove();
    QA(restGrid, C('CollectionTreez_placeholder')).forEach((n) => n.remove());
  }
  const restFilters = Q(rest, C('FiltersTreez_section'));
  if (restFilters) restFilters.remove();
  [C('banner_page_banner__section'), 'nav', C('specialsslider_promo__carousel'), '.promotion__filters', '.promotion_empty', 'section' + C('image_gallery_image_gallery__'), C('treezstore_store__item'), '.stores_list__title_container', C('search_box'), '.stores_map', 'script', 'style'].forEach((sel) => QA(rest, sel).forEach((n) => n.remove()));
  const extraBlocks = RICH(rest);

  const observed = {
    sortSelected: filters ? filters.sortSelected : null,
    gridState: grid.state,
    emptyState: grid.emptyState,
    cards: grid.cards,
    productCount: products.length,
    products,
    _jsonld: jsonld.filter(isItemList),
  };
  return {
    kind: path.replace(/^\//, '').replace(/[^a-z0-9]+/gi, '-') || 'index', // shop | deals | promotions | daily-deals | product-group-our-products | our-strains | store-locator
    path,
    theme: main.classList && main.classList.contains('dark-theme') ? 'dark' : null,
    capture: { matchesUrl: check.matchesUrl, signal: check.signal, observed: own ? null : observed },
    h1: T(h1) || null,
    banner,
    breadcrumb: BREADCRUMB(root),
    promoCarousel: lstPromoCarousel(root),
    filters: filters && !own ? { ...filters, sortSelected: null } : filters,
    gridState: own ? grid.state : 'not-captured',
    emptyState: own ? grid.emptyState : null,
    cards: own ? grid.cards : [],
    productCount: own ? products.length : null,
    products: own ? products : [],
    search: lstSearch(root),
    notice: lstNotice(root),
    galleries: lstGalleries(root),
    stores,
    storeListToggleAriaLabel: storeList && closeBtn ? closeBtn.getAttribute('aria-label') : null,
    map: Q(root, '.stores_map') ? { multiLocation: !!Q(root, C('Map_map-multilocation')), markers: stores.filter((s) => s.address && s.address.lat != null).map((s) => ({ name: s.name, lat: s.address.lat, lng: s.address.lng })) } : null,
    extraBlocks,
    extraButtons: QA(rest, 'button').map((b) => T(b)).filter(Boolean),
    _jsonld: own ? jsonld : jsonld.filter((j) => !isItemList(j)),
  };
}
