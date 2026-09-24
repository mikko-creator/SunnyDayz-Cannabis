// brand.js — /brand/<slug> pages (Treez brand collection).
// Layout: Prismic page banner (h1 = brand name + description line) -> breadcrumb ->
// Treez collection section (FILTER button + "Sort By" select) -> grid. In the rendered crawl the
// grid is never populated with product cards: it is either the empty state ("No search results
// found") or the loading skeleton (24 placeholder cards). The brand's products are declared in the
// page's own JSON-LD ItemList, so `products` comes from ITEMLIST(). The ItemList holds one entry per
// VARIANT GROUP, not per SKU: a size sibling collapsed into its group is absent (in this crawl only
// /brand/breathe-free's 1G single Mango Smoothie, a variant of the 3-pack). Copied as-is; the variant
// join rule is in src/content/model-spec/brand.md §5.2.
// The banner / filters / grid / product sub-shapes are the SAME shapes collection.js emits
// (src/content/model-spec/collection.md §2), so one set of template partials renders both page types.
// Helper names carry the `brand` prefix so they cannot collide with _common.js.

// JSON-LD strings on this site are HTML-entity encoded ("BETTY&apos;S EDDIES"); decode, never rewrite.
function brandDecode(s) {
  if (typeof s !== 'string' || !/&[#a-z0-9]+;/i.test(s)) return s;
  const ta = document.createElement('textarea');
  ta.innerHTML = s;
  return ta.value;
}

// IMG() on <img src=""> resolves '' against ORIGIN and returns the site root as an image URL;
// an empty src + srcset is reported as a placeholder instead.
function brandImg(el) {
  const img = el && (el.tagName === 'IMG' ? el : Q(el, 'img'));
  if (img && !(img.getAttribute('src') || '').trim() && !(img.getAttribute('srcset') || '').trim()) return { src: '', alt: img.getAttribute('alt') || '', placeholder: true };
  return IMG(el);
}

function brandProducts(root) {
  const list = JSONLD(root).find((j) => j['@type'] === 'ItemList');
  const raw = list ? list.itemListElement || [] : [];
  return ITEMLIST(root).map((p, i) => {
    const li = raw[i] || {};
    const off = (li.item || li).offers || {};
    return {
      position: li.position != null && !isNaN(Number(li.position)) ? Number(li.position) : i + 1,
      url: p.url,
      name: brandDecode(p.name),
      brand: brandDecode(p.brand),
      description: brandDecode(p.description),
      price: p.price,
      priceAmount: off.price != null && !isNaN(Number(off.price)) ? Number(off.price) : null,
      currency: off.priceCurrency || null,
      availability: p.availability,
      image: p.image ? { src: p.image.src, alt: brandDecode(p.image.alt) } : null,
    };
  });
}

function brandBanner(root) {
  const s = Q(root, C('banner_page_banner__section'));
  if (!s) return null;
  const pic = (prefix) => { const f = Q(s, C(prefix)); return f ? brandImg(f) : null; };
  return {
    title: T(Q(s, 'h1')),
    description: T(Q(s, C('banner_page__banner_description'))) || null,
    desktopImage: pic('banner_page_banner__desktop'),
    mobileImage: pic('banner_page_banner__mobile'),
  };
}

function brandFilters(root) {
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
    // the listbox is closed (aria-expanded=false) in every capture; options only if the DOM holds them
    sortOptions: QA(s, '[role="option"], option').map((o) => T(o)).filter(Boolean),
    quickFilters: quick ? QA(quick, 'a, button').map((b) => T(b)).filter(Boolean) : [],
  };
}

function brandGrid(root) {
  const g = Q(root, C('CollectionTreez_collection_section'));
  if (!g) return { state: null, emptyState: null, cards: [] };
  const cardEls = QA(g, '*').filter((el) => [...el.classList].some((c) => /^product_product__[A-Za-z0-9_-]{5}$/.test(c)) && ![...el.classList].some((c) => /placeholder/i.test(c)) && Q(el, 'a[href*="/product/"]'));
  const empty = Q(g, C('CollectionTreez_hits__empty'));
  const state = cardEls.length ? 'cards' : empty ? 'empty' : Q(g, C('CollectionTreez_placeholder')) ? 'loading' : 'unknown';
  const emptyState = empty ? { heading: T(Q(empty, 'h1,h2,h3,h4,h5,h6')) || null, text: QA(empty, 'p').map((p) => T(p)).filter(Boolean).join(' ') || null } : null;
  return { state, emptyState, cards: cardEls.map((e) => ({ ...CARD(e), image: brandImg(e) })) };
}

function extract(root, ctx) {
  const main = root.firstElementChild || root;
  const path = decodeURIComponent(new URL(ctx.url).pathname).replace(/\/+$/, '');
  const banner = brandBanner(root);
  const grid = brandGrid(root);
  const products = brandProducts(root);
  const h1 = T(Q(root, 'h1')) || null;

  // Safety net: text left after removing the known structures becomes rich blocks, so a brand
  // story / SEO block added in a future crawl is kept instead of silently dropped.
  const rest = main.cloneNode(true);
  [C('banner_page_banner__section'), 'nav', C('CollectionTreez_collection_section'), 'script', 'style'].forEach((sel) => QA(rest, sel).forEach((n) => n.remove()));
  const extraBlocks = RICH(rest);

  return {
    kind: 'brand',
    path,
    slug: path.replace(/^\/brand\//, ''),
    name: h1,
    h1,
    logo: null, // the brand page DOM carries no brand logo (see spec: join from the brands model by path)
    banner,
    breadcrumb: BREADCRUMB(root),
    filters: brandFilters(root),
    gridState: grid.state,
    emptyState: grid.emptyState,
    cards: grid.cards,
    productCount: products.length,
    products,
    extraBlocks,
    extraButtons: QA(rest, 'button').map((b) => T(b)).filter(Boolean),
    _jsonld: JSONLD(root),
  };
}
