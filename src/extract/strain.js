// strain.js — /strain/<key> pages (cbd, indica, hybrid, sativa, si and their capitalised twins).
// Layout of <main>: BreadcrumbList JSON-LD, page banner (desktop + mobile image, h1 with <br>
// line breaks, optional description), breadcrumb nav, ItemList JSON-LD, then the Treez collection
// section: toolbar (FILTER button, filter-chip slider, "Sort By" select) and the grid, which in the
// capture is either 24 skeleton cards (still loading) or the "No search results found" empty state.
// The product search API answers 403 to headless Chrome, so no capture holds a loaded grid; the
// products the page declares are read from its own JSON-LD ItemList (first 20, server-rendered).
// Helper names are prefixed "sx" so they never collide with _common.js.
function extract(root, ctx) {
  const main = root.firstElementChild || root;

  // --- url facts (derived from ctx.url only) -------------------------------------------------
  const sxPath = (() => { try { return decodeURIComponent(new URL(ctx.url).pathname).replace(/\/+$/, '') || '/'; } catch { return ''; } })();
  const sxKey = sxPath.replace(/^\/strain\//, '');

  // --- JSON-LD ------------------------------------------------------------------------------
  // Next.js HTML-escapes the JSON-LD text (BETTY&apos;S EDDIES); decode entities for display.
  const sxDecode = (s) => {
    if (typeof s !== 'string' || !/&[#a-z0-9]+;/i.test(s)) return s;
    const ta = document.createElement('textarea');
    ta.innerHTML = s;
    return ta.value;
  };
  const ld = JSONLD(root);
  const ldBreadcrumb = ld.find((j) => j['@type'] === 'BreadcrumbList') || null;
  const ldItemList = ld.find((j) => j['@type'] === 'ItemList') || null;

  // --- banner -------------------------------------------------------------------------------
  const bannerEl = Q(root, C('banner_page_banner__section'));
  const h1El = Q(root, 'h1');
  // h1 lines split at <br>, so a template can keep the two-line heading
  const h1Lines = [];
  if (h1El) {
    let cur = '';
    const flush = () => { const t = cur.replace(/\s+/g, ' ').trim(); if (t) h1Lines.push(t); cur = ''; };
    const walk = (n) => {
      for (const ch of n.childNodes) {
        if (ch.nodeType === 3) cur += ch.nodeValue;
        else if (ch.nodeType === 1 && ch.tagName === 'BR') flush();
        else if (ch.nodeType === 1) walk(ch);
      }
    };
    walk(h1El);
    flush();
  }
  const descEl = Q(bannerEl, C('banner_page__banner_description'));
  const banner = bannerEl ? {
    lines: h1Lines,
    description: descEl ? T(descEl) || null : null,
    image: {
      desktop: IMG(Q(bannerEl, C('banner_page_banner__desktop'))),
      mobile: IMG(Q(bannerEl, C('banner_page_banner__mobile'))),
    },
  } : null;

  // --- collection toolbar (filters / sort) --------------------------------------------------
  const filtersEl = Q(root, C('FiltersTreez_section'));
  const filterBtn = Q(filtersEl, C('FiltersTreez_filter_menu__button'));
  const sortTrigger = Q(filtersEl, C('FiltersTreez_sort_by_select') + ' button') || Q(filtersEl, C('select_select__trigger'));
  const sliderEl = Q(filtersEl, C('FiltersTreez_slider_container'));
  const toolbar = filtersEl ? {
    filterLabel: T(Q(filtersEl, C('FiltersTreez_title'))) || T(filterBtn) || null,
    // active-filter chips live in the slider; empty in every capture
    activeFilters: sliderEl ? [...sliderEl.children].map((c) => T(c)).filter(Boolean) : [],
    sortLabel: T(Q(filtersEl, C('FiltersTreez_sort_by_placeholder_label'))) || T(Q(filtersEl, C('FiltersTreez_sort_by_select_label'))) || null,
    sortAriaLabel: sortTrigger ? sortTrigger.getAttribute('aria-label') : null,
    // the listbox options are not in the DOM until the select opens (headlessui popover)
    sortOptions: QA(filtersEl, '[role="option"]').map((o) => T(o)).filter(Boolean),
  } : null;

  // --- grid ---------------------------------------------------------------------------------
  const collectionEl = Q(root, C('CollectionTreez_collection__'));
  const emptyEl = Q(root, C('CollectionTreez_hits__empty'));
  const skeletons = QA(root, C('CollectionPlaceholder_placeholder_product'));
  // real product cards: the card root carries product_product__<hash> and holds the stretched link
  const sxCardRoot = (a) => {
    let e = a.parentElement;
    while (e && e !== main) {
      if ([...e.classList].some((c) => /^product_product__[A-Za-z0-9_-]{5}$/.test(c))) return e;
      e = e.parentElement;
    }
    return a.parentElement;
  };
  const cardEls = [];
  QA(collectionEl, 'a' + C('product__stretched_link') + ', a[href*="/product/"]').forEach((a) => {
    const el = sxCardRoot(a);
    if (el && !cardEls.includes(el) && !/placeholder/.test(el.className)) cardEls.push(el);
  });
  // buttons is always present (possibly []), so every card has the same keys
  const cards = cardEls.map((el) => {
    const c = CARD(el);
    c.buttons = QA(el, 'button').map((b) => T(b)).filter(Boolean);
    return c;
  });
  const pagerEl = QA(collectionEl, '[class*="agination"]').find((e) => !/placeholder/i.test(e.className)) || null;
  const pagerSkel = Q(collectionEl, C('CollectionPlaceholder_placeholder__pagination'));
  const grid = {
    state: cards.length ? 'loaded' : emptyEl ? 'empty' : skeletons.length ? 'loading' : 'none',
    placeholderCount: skeletons.length,
    emptyState: emptyEl ? {
      title: T(Q(emptyEl, 'h1,h2,h3,h4,h5,h6')) || null,
      message: QA(emptyEl, 'p').map((p) => T(p)).filter(Boolean).join(' ') || null,
    } : null,
    cards,
    pagination: pagerEl ? {
      items: QA(pagerEl, 'a,button,li').map((x) => ({ label: T(x), href: x.tagName === 'A' ? rel(x.getAttribute('href')) : null, current: x.getAttribute('aria-current') === 'page' })).filter((x) => x.label),
      text: T(pagerEl) || null,
    } : pagerSkel ? { placeholder: true, pageSlots: QA(pagerSkel, C('CollectionPlaceholder_placeholder__page')).length } : null,
  };

  // --- products declared by the page's own JSON-LD ItemList --------------------------------
  const products = ((ldItemList && ldItemList.itemListElement) || []).map((li, i) => {
    const p = li.item || li;
    const o = Array.isArray(p.offers) ? p.offers[0] : (p.offers || {});
    const img = Array.isArray(p.image) ? p.image[0] : p.image;
    const name = sxDecode(p.name || '');
    const brand = typeof p.brand === 'string' ? sxDecode(p.brand) : (p.brand && sxDecode(p.brand.name)) || null;
    const priceRaw = o.price != null ? o.price : o.lowPrice;
    return {
      position: Number(li.position) || i + 1,
      url: rel(p.url || o.url || ''),
      name,
      brand,
      description: sxDecode(p.description || '') || null,
      price: priceRaw != null && priceRaw !== '' ? '$' + priceRaw : null,
      priceValue: priceRaw != null && priceRaw !== '' && !isNaN(Number(priceRaw)) ? Number(priceRaw) : null,
      priceCurrency: o.priceCurrency || null,
      availability: o.availability ? String(o.availability).replace(/^.*\//, '') : null,
      image: img ? { src: img, alt: name } : null,
    };
  });

  // --- any other text in <main> (SEO copy blocks): none in the capture, kept for safety -----
  const rest = main.cloneNode(true);
  QA(rest, 'script, nav, ' + C('banner_page_banner__section') + ', ' + C('CollectionTreez_collection_section')).forEach((n) => n.remove());
  const seoBlocks = RICH(rest);

  return {
    // url-derived facts (keys starting "url" are not page text and are not scored for coverage)
    urlPath: sxPath,
    urlKey: sxKey,
    // capitalised twins (/strain/Cbd) are served by the build as a 301 to the lowercase path
    urlCaseVariant: sxPath !== sxPath.toLowerCase(),
    urlLowercasePath: sxPath.toLowerCase(),
    h1: T(h1El),
    breadcrumb: BREADCRUMB(root),
    banner,
    seoBlocks,
    toolbar,
    grid,
    products,
    productCount: products.length,
    // DOM tokens that are not visible text (ids, icon names); "_" keys are not scored for coverage
    _ui: {
      filterDrawerId: filterBtn ? filterBtn.getAttribute('aria-controls') : null,
      emptyStateIcon: (() => { const i = Q(emptyEl, 'i[class*="icon_"]'); const k = i ? [...i.classList].find((c) => /^icon_/.test(c)) : null; return k ? k.replace(/^icon_/, '') : null; })(),
    },
    // raw JSON-LD for re-emission (not scored for coverage)
    _jsonld: { breadcrumbList: ldBreadcrumb, itemList: ldItemList },
  };
}
