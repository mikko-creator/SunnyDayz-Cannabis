// brands.js — the /brands index ("Our Curated Brands").
// Layout: breadcrumb -> section.brands-page { h1, form.brands-page__filter (search input + submit),
// div.brands-page__list > a.brands-page__item { figure > img (logo), span (name) } , button "Load more
// brands" }. The rendered list is the first page only (24 brands in this crawl); the rest sit behind
// the load-more button. There is no alphabet filter.
// JSON-LD: the page DOES emit a BreadcrumbList (last crumb "Our Curated Brands"), but the server
// streams it inside <div hidden id="S:0"> immediately BEFORE <main>, so it is not in the rendered
// <main> this extractor receives and `_jsonld` is [] (spec src/content/model-spec/brand.md §5.9).
function extract(root, ctx) {
  const section = Q(root, '.brands-page') || Q(root, C('brands-page')) || root;
  const h1 = Q(root, 'h1');

  // ---- search form -----------------------------------------------------------------------
  const form = Q(section, C('brands-page__filter')) || Q(section, 'form');
  const input = Q(form, 'input');
  const submit = Q(form, 'button, [type=submit]');
  const search = form ? {
    input: input ? {
      name: input.getAttribute('name') || null,
      type: input.getAttribute('type') || 'text',
      placeholder: input.getAttribute('placeholder') || '',
      ariaLabel: input.getAttribute('aria-label') || '',
      value: input.getAttribute('value') || '',
    } : null,
    // DOM text is "Search"; the live CSS uppercases it (rendered innerText "SEARCH")
    submit: submit ? { label: T(submit), ariaLabel: submit.getAttribute('aria-label') || null } : null,
  } : null;

  // ---- alphabet / letter filters (none in this crawl; kept so a re-crawl is not lost) ------
  const letters = QA(section, '[class*="alphabet"] a, [class*="alphabet"] button, [class*="letters"] a, [class*="letters"] button')
    .map((b) => ({ label: T(b), href: b.tagName === 'A' ? rel(b.getAttribute('href')) : null })).filter((x) => x.label);

  // ---- brand tiles -----------------------------------------------------------------------
  const listEl = Q(section, C('brands-page__list'));
  const items = QA(listEl || section, 'a' + C('brands-page__item'));
  const brands = items.map((a) => {
    const href = rel(a.getAttribute('href'));
    const img = Q(a, 'img');
    const rawSrc = img ? (img.getAttribute('src') || '').trim() : '';
    const rawSrcset = img ? (img.getAttribute('srcset') || '').trim() : '';
    // IMG() on <img src=""> resolves '' against ORIGIN and returns "https://www.sunnydayzcannabis.com/"
    // as if it were an image, so an empty src/srcset is handled here before IMG() sees it.
    const logo = img && !rawSrc && !rawSrcset
      ? { src: '', alt: img.getAttribute('alt') || '', placeholder: true }
      : IMG(a);
    if (logo && logo.placeholder) {
      // why there is no URL: the site's own placeholder svg (no logo configured) vs an <img src="">
      // (the server HTML had a Prismic logo but the hydrated DOM blanked it)
      logo.missing = /product-placeholder\.svg/.test(rawSrc) ? 'placeholder-svg' : 'empty-src';
    }
    if (logo && img) {
      const w = parseInt(img.getAttribute('width') || '', 10); const h = parseInt(img.getAttribute('height') || '', 10);
      if (w) logo.width = w; if (h) logo.height = h;
    }
    const nameEl = Q(a, 'span') || a;
    return {
      name: T(nameEl),
      href,
      slug: href.replace(/^\/brand\//, '').replace(/[?#].*$/, ''),
      logo,
    };
  });

  // ---- load more -------------------------------------------------------------------------
  const more = Q(section, C('collection__load-more')) || QA(section, 'button').find((b) => /load more/i.test(T(b)));
  const loadMore = more ? { label: T(more), ariaLabel: more.getAttribute('aria-label') || null } : null;

  // any other visible text in the section not covered above (none in this crawl)
  const rest = section.cloneNode(true);
  QA(rest, 'h1, form, ' + C('brands-page__list') + ', ' + C('collection__load-more') + ', script, style').forEach((n) => n.remove());
  const extraBlocks = RICH(rest);

  return {
    kind: 'brands',
    path: decodeURIComponent(new URL(ctx.url).pathname).replace(/\/+$/, '') || '/',
    breadcrumb: BREADCRUMB(root),
    h1: T(h1),
    search,
    letters,
    brands,
    brandCount: brands.length,
    loadMore,
    hasMore: !!loadMore,
    extraBlocks,
    extraButtons: QA(rest, 'button').map((b) => T(b)).filter(Boolean),
    _jsonld: JSONLD(root),
  };
}
