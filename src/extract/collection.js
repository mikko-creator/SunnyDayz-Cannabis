// collection.js — /collection/<category>[/<subcategory>] pages (Treez product grid).
// The rendered grid never holds product cards in the crawl: it is either the empty state
// ("No search results found") or the loading skeleton. The products are declared in the page's
// JSON-LD ItemList, so `products` comes from ITEMLIST(); the grid's own state is kept verbatim.
// Helper names carry the `col` prefix so they cannot collide with _common.js.

// JSON-LD strings on this site are HTML-entity encoded ("Bubba&apos;s"); decode, never rewrite.
function colDecode(s) {
  if (typeof s !== 'string' || !/&[#a-z0-9]+;/i.test(s)) return s;
  const ta = document.createElement('textarea');
  ta.innerHTML = s;
  return ta.value;
}

// Single-line labels (names, brands, alts) keep the source's stray spaces in the JSON-LD and in
// attributes (" Sunnydayz Battery", "HG - Aluminum Grinder  - Black 2.5 Inch "). Collapse them the
// way T() does for DOM text; an empty result is "no value" (null), never "".
function colLine(s) {
  if (typeof s !== 'string') return s == null ? null : s;
  const t = s.replace(/\s+/g, ' ').trim();
  return t || null;
}

function colProducts(root) {
  const list = JSONLD(root).find((j) => j['@type'] === 'ItemList');
  const raw = list ? list.itemListElement || [] : [];
  return ITEMLIST(root).map((p, i) => {
    const li = raw[i] || {};
    const off = (li.item || li).offers || {};
    return {
      position: li.position != null && !isNaN(Number(li.position)) ? Number(li.position) : i + 1,
      url: p.url,
      name: colLine(colDecode(p.name)) || '',
      brand: colLine(colDecode(p.brand)), // null when the JSON-LD brand is "" (2 merch products)
      description: colDecode(p.description),
      price: p.price,
      priceAmount: off.price != null && !isNaN(Number(off.price)) ? Number(off.price) : null,
      currency: off.priceCurrency || null,
      availability: p.availability,
      image: p.image ? { src: p.image.src, alt: colLine(colDecode(p.image.alt)) || '' } : null,
    };
  });
}

function colBanner(root) {
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

// Icon link carousel under the breadcrumb (top-level categories only).
function colCategoryLinks(root) {
  const s = Q(root, 'section' + C('linkscarousel_links'));
  if (!s) return [];
  return QA(s, 'a[href]').map((a) => ({
    label: T(a) || null,
    href: rel(a.getAttribute('href')),
    ariaLabel: a.getAttribute('aria-label') || null,
    current: a.getAttribute('aria-current') === 'page',
    image: IMG(a),
  }));
}

function colFilters(root) {
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
    // the listbox is closed in every capture; options are listed only if the DOM holds them
    sortOptions: QA(s, '[role="option"], option').map((o) => T(o)).filter(Boolean),
    quickFilters: quick ? QA(quick, 'a, button').map((b) => T(b)).filter(Boolean) : [],
  };
}

// Product card elements (not the skeleton's placeholder cards).
function colCardEls(scope) {
  return QA(scope, '*').filter((el) => [...el.classList].some((c) => /^product_product__[A-Za-z0-9_-]{5}$/.test(c)) && ![...el.classList].some((c) => /placeholder/i.test(c)));
}

// CARD() plus the card's visible strings CARD() does not keep: the "Stock photo" label (CARD
// keeps only a boolean), button labels ("Add To Cart"; the favourite button is icon-only and has
// just an aria-label), and any other text left over, so a new badge is kept instead of dropped.
function colCard(el) {
  const c = CARD(el);
  if (c.image && typeof c.image.alt === 'string') c.image.alt = colLine(c.image.alt) || '';
  const stock = Q(el, C('product_product__in_stock'));
  c.stockPhotoLabel = stock ? T(stock) || null : null;
  c.buttons = QA(el, 'button').map((b) => ({ label: T(b) || null, ariaLabel: colLine(b.getAttribute('aria-label')), testId: b.getAttribute('data-testid') || null }));
  const left = el.cloneNode(true);
  [C('product__name'), C('product_price') + ' ins', C('product_variation__message'), C('product_info__'), C('StrainInfo_flower__type'), C('product_product__in_stock'), 'button', 'script', 'style'].forEach((sel) => QA(left, sel).forEach((n) => n.remove()));
  // decorative leaves such as the "/" between price and weight carry no text of their own
  QA(left, '*').filter((n) => !n.children.length && !/[a-z0-9]/i.test(n.textContent)).forEach((n) => n.remove());
  const rest = T(left);
  c.otherText = /[a-z0-9]/i.test(rest) ? rest : null;
  return c;
}

function colGrid(root) {
  const g = Q(root, C('CollectionTreez_collection_section'));
  if (!g) return { state: null, emptyState: null, cards: [] };
  const cardEls = colCardEls(g);
  const empty = Q(g, C('CollectionTreez_hits__empty'));
  const state = cardEls.length ? 'cards' : empty ? 'empty' : Q(g, C('CollectionTreez_placeholder')) ? 'loading' : 'unknown';
  const emptyState = empty ? { heading: T(Q(empty, 'h1,h2,h3,h4,h5,h6')) || null, text: QA(empty, 'p').map((p) => T(p)).filter(Boolean).join(' ') || null } : null;
  return { state, emptyState, cards: cardEls.map(colCard) };
}

// Does the saved render belong to this URL? The only URL-dependent difference in the server HTML
// of a base URL and its ?sort= twin is the sort control: with ?sort= it shows a selected option,
// without it only "Sort By" (verified on all 9 crawled pairs). The harness keys renders by
// pathname, so a base URL can be handed its ?sort= twin's render (or the reverse). When the sort
// control disagrees with the URL, the query-dependent values (selected sort, grid state, cards,
// ItemList) belong to the other URL: they move to capture.observed and the page's own fields say
// "not captured". Query-independent values (banner, h1, breadcrumb, links, BreadcrumbList) stay.
function colCapture(root, u, filters) {
  if (!filters) return { matchesUrl: null, signal: null };
  const trigger = Q(root, C('FiltersTreez_section') + ' button[aria-haspopup="listbox"]');
  const urlSorted = u.searchParams.has('sort');
  // the trigger carries a select_selected__ class exactly when an option is chosen
  const domSorted = !!filters.sortSelected || !!(trigger && [...trigger.classList].some((c) => /^select_selected__/.test(c)));
  if (urlSorted === domSorted) return { matchesUrl: true, signal: null };
  return { matchesUrl: false, signal: domSorted ? 'sort-selected-without-sort-param' : 'sort-param-without-sort-selected' };
}

function extract(root, ctx) {
  const main = root.firstElementChild || root;
  const u = new URL(ctx.url);
  const segs = decodeURIComponent(u.pathname).replace(/\/+$/, '').split('/').filter(Boolean); // ['collection', cat, sub?]
  const banner = colBanner(root);
  const filters = colFilters(root);
  const grid = colGrid(root);
  const products = colProducts(root);
  const jsonld = JSONLD(root);
  const check = colCapture(root, u, filters);
  const own = check.matchesUrl !== false;
  const isItemList = (j) => j && j['@type'] === 'ItemList';

  // Safety net: whatever text is left after removing the known structures becomes rich blocks,
  // so an SEO block or a new widget in a future crawl is kept instead of silently dropped.
  // Inside the grid only the modelled parts are removed (filter bar, cards, empty state, skeleton),
  // so a grid-level control such as a "load more" button lands in extraButtons.
  const rest = main.cloneNode(true);
  // Remove exactly what colGrid() / colFilters() modelled (first grid: its cards, empty state and
  // skeleton; first filter bar). A card or filter bar anywhere else stays for the safety net.
  const restGrid = Q(rest, C('CollectionTreez_collection_section'));
  if (restGrid) {
    colCardEls(restGrid).forEach((n) => n.remove());
    const e = Q(restGrid, C('CollectionTreez_hits__empty'));
    if (e) e.remove();
    QA(restGrid, C('CollectionTreez_placeholder')).forEach((n) => n.remove());
  }
  const restFilters = Q(rest, C('FiltersTreez_section'));
  if (restFilters) restFilters.remove();
  [C('banner_page_banner__section'), 'nav', 'section' + C('linkscarousel_links'), 'script', 'style'].forEach((sel) => QA(rest, sel).forEach((n) => n.remove()));
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
    kind: 'collection',
    level: segs.length > 2 ? 'subcategory' : 'category',
    path: '/' + segs.join('/'),
    category: segs[1] || null,
    subcategory: segs[2] || null,
    parentPath: segs.length > 2 ? '/' + segs.slice(0, 2).join('/') : null,
    sortParam: u.searchParams.get('sort'),
    capture: { matchesUrl: check.matchesUrl, signal: check.signal, observed: own ? null : observed },
    h1: T(Q(root, 'h1')) || null,
    banner,
    breadcrumb: BREADCRUMB(root),
    categoryLinks: colCategoryLinks(root),
    filters: filters && !own ? { ...filters, sortSelected: null } : filters,
    gridState: own ? grid.state : 'not-captured',
    emptyState: own ? grid.emptyState : null,
    cards: own ? grid.cards : [],
    productCount: own ? products.length : null,
    products: own ? products : [],
    extraBlocks,
    extraButtons: QA(rest, 'button').map((b) => T(b)).filter(Boolean),
    _jsonld: own ? jsonld : jsonld.filter((j) => !isItemList(j)),
  };
}
