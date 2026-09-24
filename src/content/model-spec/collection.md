# Model spec — `collection` and `listing` pages

Templates for these two page types are built **only** from this spec. Every field below is
produced by `src/extract/collection.js` or `src/extract/listing.js`. Each value comes from the
saved render of the page's `<main>` (`audit/rendered/<pathname-slug>.json`) or from the JSON-LD
inside it. The extractors derive a few structural values (`level`, `path`, `sortParam`, the
`lat`/`lng` coordinates, the counts, `capture`) from the URL or from attributes. They never
invent display text.

**Read `capture` first.** The saved renders are keyed by pathname only, so a URL and its `?sort=`
twin share one render file, and only one of the two captures survives in it. For the 9 base category URLs that have a
`?sort=` twin (`/collection/beverage`, `cartridge`, `edible`, `extract`, `flower`, `merch`,
`preroll`, `tincture`, `topical`), the shared file holds the **`?sort=` URL's** render: its
`url` field is e.g. `…/collection/edible?sort=priceDesc`. Those 9 models have
`capture.matchesUrl: false`. Their query-dependent values (selected sort, grid state, product
list) are **not** this URL's own. They sit in `capture.observed` and the page's own fields say
"not captured" (see `Capture` in §2).

| Type | Pages | Files |
|---|---|---|
| `collection` | 47 URLs: 38 distinct pathnames plus 9 `?sort=` variants | `content/model/collection-*.json` |
| `listing` | 7: `/shop`, `/deals`, `/promotions`, `/daily-deals`, `/product-group/our-products`, `/our-strains`, `/store-locator` | `content/model/<slug>.json` |

Soft-404 collections (`/collection/extract/sugar`, `/flower/bulk-flower`, `/merch/hoodie`,
`/pill`, `/pill?sort=brandAsc`, `/preroll/infused`) are type `notfound`. They are not covered
here.

## 1. Record envelope (written by the harness)

```jsonc
{
  "url": "https://www.sunnydayzcannabis.com/collection/flower?sort=brandAsc",
  "slug": "collection-flower-sort-brandAsc",   // file name; the query string becomes -sort-brandAsc
  "type": "collection",                         // or "listing"
  "title": "The best flower | FLOWER",          // <title> of the page → use for <title>/SEO
  "seoTitle": "The best flower | FLOWER",
  "model": { ... }                              // sections 3 and 4
}
```

## 2. Shared sub-shapes

### `Image`
```jsonc
{ "src": "https://images.prismic.io/sunny-dayz/...png?auto=format%2Ccompress&fit=max&w=3840", "alt": "Banner" }
// lazy placeholder (only seen on the store card image):
{ "src": "", "alt": "Sunny Dayz location", "placeholder": true }
```
`src` is absolute: `/_next/image` wrappers are unwrapped and the largest `srcset` candidate is
kept. `placeholder: true` appears only when the DOM held the product-placeholder svg.

### `BreadcrumbItem`
`{ "label": string, "href": string | null }`. The last item is the current page and has
`href: null`. Hrefs are site-relative.

### `Banner` (field `banner`)
| field | type | example | notes |
|---|---|---|---|
| `title` | string | `"FLOWER"` | the banner `<h1>` text, same value as `model.h1` |
| `description` | string \| null | `"Best GUMMY"`, `"SunnyDayz Cultivated."` | set on all 28 subcategory URLs and on `/our-strains`, `null` elsewhere |
| `desktopImage` | Image \| null | `{src:"…CategoriesBanner-22.png…", alt:"Banner"}` | |
| `mobileImage` | Image \| null | `{src:"…CategoriesBanner-8.png…", alt:"Banner"}` | always a different `src` from desktop. On `/our-strains` it is the same file with a different `rect=` crop |

### `Filters` (field `filters`)
| field | type | example | notes |
|---|---|---|---|
| `filterLabel` | string \| null | `"FILTER"` | the filter-drawer button text. The drawer contents are never in the DOM |
| `sortLabel` | string \| null | `"Sort By"` | placeholder label of the sort select |
| `sortAriaLabel` | string \| null | `"Sort by"` | |
| `sortSelected` | string \| null | `"Brand A to Z"`, `"Price High to Low"` | the selected option shown after "Sort By". Set only on the 9 `?sort=` URLs (`"Price High to Low"` on `edible?sort=priceDesc`, `"Brand A to Z"` on the other 8). `null` on the other 41 pages that have filters. On the 9 base URLs it is `null` because their render belongs to the `?sort=` twin; the value seen there is in `capture.observed.sortSelected`. The server HTML of those base URLs shows only "Sort By" |
| `sortOptions` | string[] | `[]` | the listbox is closed in every capture, so this is **always `[]`**. Only these two option labels are known: `"Brand A to Z"` and `"Price High to Low"` |
| `quickFilters` | string[] | `[]` | text of chips in the filter slider container. **Always `[]`** in this crawl |

### `EmptyState` (field `emptyState`)
`{ "heading": string | null, "text": string | null }`, kept verbatim:
```json
{ "heading": "No search results found",
  "text": "No results match the filter criteria. Remove a filter or clear all filters to search again" }
```
The field is `null` when the grid was captured in another state or was not captured for this URL
(see `gridState`). The redesign uses this copy as its filter empty state. The strings are
identical on every page that has them.

### `Product` (items of `products`, from the JSON-LD `ItemList` in the saved render)
On the 9 models with `capture.matchesUrl: false`, `products` is `[]`. The list in that render
belongs to the `?sort=` twin and is in `capture.observed.products`. It is a different order, and
for 4 of the 9 a different set, from the base URL's own ItemList in its server HTML
(`audit/raw/collection-<cat>.html`): edible shares 8 of 20 URLs, flower 16/20, preroll 16/20,
merch 18/20. The other 5 hold the same set in a different order.

| field | type | example | notes |
|---|---|---|---|
| `position` | number | `1` | 1-based and sequential on every page |
| `url` | string | `"/product/bountiful-farms-bountiful-candy-fumez-3-5g-flower-3-5-g-flower-3-5-grams"` | always `/product/…`. All 145 distinct URLs (in `products` and `capture.observed.products`) have a crawled product page, so join richer data (strain, THC, gallery) from that page's model |
| `name` | string | `"Bountiful - Candy Fumez - 3.5G Flower"` | HTML entities are decoded (`&apos;`→`'`, `&amp;`→`&`, `&quot;`→`"`), e.g. `"Coast - Cookies & Cream White Chocolate Bar - 100mg"`. Whitespace is collapsed and trimmed, as `T()` does for DOM text. The JSON-LD had stray spaces on 9 products (`" Sunnydayz Battery"`, `"HG - Aluminum Grinder  - Black 2.5 Inch "`) |
| `brand` | string \| null | `"BOUNTIFUL FARMS"` | upper-case, entities decoded, whitespace collapsed. **`null` on 2 products** whose JSON-LD brand is `""`: `/product/hg-aluminum-grinder-black-2-5-inch-one-size-merch` (on `/collection/merch/grinder`) and `/product/e-z-wider-organic-hemp-cones-1-1-4-one-size-merch` (on `/collection/merch/rolling-papers`). Omit the brand line when it is `null`. Their product-page models show the brand as `"not specified"` |
| `description` | string | 636–1026 chars | plain text, entities decoded, kept as-is |
| `price` | string | `"$40"`, `"$2.50"` | display string, `"$" + offers.price` |
| `priceAmount` | number \| null | `40`, `2.5` | numeric form for sorting |
| `currency` | string \| null | `"USD"` | always USD |
| `availability` | string \| null | `"InStock"` | always `InStock` |
| `image` | Image \| null | `{src:"https://d1hhy58mqsa6c3.cloudfront.net/<uuid>/<uuid>", alt:"<name>"}` | Treez CDN URL, no file extension. `alt` is the same whitespace-collapsed name. Never null and never a placeholder in this crawl |

A page's `ItemList` holds **at most 20** products. 8 models hit exactly 20 in `products`, and 4
more (edible, flower, merch, preroll) hit 20 in `capture.observed.products`. This looks like the
first page of results only, but that is not verified. It is not the full collection, so do not
print it as a total count. It can be `0`: `/collection/merch/other` and `/deals` declare an empty
ItemList. `/promotions`, `/daily-deals`, `/our-strains` and `/store-locator` have no ItemList, so
their `productCount` is `0` too. `productCount` is `null` only when `capture.matchesUrl` is
`false`, meaning this URL's list was not captured.

### `Card` (items of `cards`)
`CARD()` from `_common.js` plus the card strings `CARD()` does not keep:
```jsonc
{ "url": "/product/…", "name": "Tower Three - Maple Butter - 3.5G Flower", "brand": "TOWER THREE",
  "price": "$45", "weight": "3.5g", "strain": "Hybrid", "strainKey": "hybrid",
  "thc": "24.50%", "tac": null, "cbd": "0.10%", "badges": ["TOWER THREE", "Hybrid", "THC: 24.50%", "CBD: 0.10%", "PRE PACK"],
  "image": { "src": "", "alt": "Tower Three - Maple Butter - 3.5G Flower", "placeholder": true },  // alt whitespace-collapsed
  "stockPhoto": false,
  "stockPhotoLabel": null,            // "Stock photo" when the card shows that label over the image
  "buttons": [ { "label": null, "ariaLabel": "Add Tower Three - Maple Butter - 3.5G Flower to favorites", "testId": null },
               { "label": "Add To Cart", "ariaLabel": "Add Tower Three - Maple Butter - 3.5G Flower to cart", "testId": "Counter__add-to-cart-btn" } ],
  "otherText": null }                 // any other visible card text (a new badge); null when there is none
```
No crawl rendered a card, so `cards` is `[]` on all 54 models. The shape above was checked by
injecting real rendered cards into a grid (see §6). A card with only the placeholder image keeps
`placeholder: true`; join the image from the product page's model.

### `Capture` (field `capture`, on every collection and listing model)
Says whether the saved render belongs to this URL. In the server HTML of a base URL and its
`?sort=` twin, the only difference outside scripts is the sort control: with `?sort=` the trigger
has the `select_selected__` class and the option label, and without it the control shows only
"Sort By" (checked on all 9 pairs; the ItemList JSON-LD also differs). The extractor compares the
sort control in the render with the URL. `true` means only that this one signal agrees with the
URL; the render carries no other URL marker.

| field | type | values |
|---|---|---|
| `matchesUrl` | boolean \| null | `true`: the sort control agrees with the URL (38 collection models, and `/shop`, `/deals`, `/product-group/our-products`). `false`: the render belongs to another URL of the same pathname (the 9 base category URLs). `null`: no sort control to check (`/promotions`, `/daily-deals`, `/our-strains`, `/store-locator`) |
| `signal` | string \| null | `"sort-selected-without-sort-param"` (the 9 base URLs), `"sort-param-without-sort-selected"` (reverse case, not in this crawl), `null` when `matchesUrl` is not `false` |
| `observed` | object \| null | only when `matchesUrl` is `false`: `{ sortSelected, gridState, emptyState, cards, productCount, products, _jsonld }`, the other URL's values, with `_jsonld` holding only its ItemList. Do **not** render these as this URL's own |

When `matchesUrl` is `false`, the page's own fields are: `filters.sortSelected: null`,
`gridState: "not-captured"`, `emptyState: null`, `cards: []`, `products: []`,
`productCount: null`, and `_jsonld` without the ItemList. The query-independent fields stay:
`h1`, `banner`, `breadcrumb`, `categoryLinks`, the other `filters` labels and the
BreadcrumbList. They are identical in the server HTML of both URLs. To fill the base URL's own
grid, re-render it into its own file (the harness keys renders by pathname, so that needs a
harness change), or read the ItemList from its server HTML `audit/raw/collection-<cat>.html`.

## 3. `collection` model

```jsonc
{
  "kind": "collection",
  "level": "category",                  // "category" (/collection/x) | "subcategory" (/collection/x/y)
  "path": "/collection/flower",
  "category": "flower",                 // first slug segment
  "subcategory": null,                  // second slug segment, e.g. "gummy"
  "parentPath": null,                   // "/collection/edible" for /collection/edible/gummy
  "sortParam": null,                    // "brandAsc" | "priceDesc" on ?sort= URLs, from the URL
  "capture": Capture,                   // { matchesUrl, signal, observed }: read first (§2)
  "h1": "FLOWER",
  "banner": Banner,                     // present on all 47
  "breadcrumb": [ {"label":"Home","href":"/"}, {"label":"Menu","href":"/shop"}, {"label":"All Flower","href":null} ],
  "categoryLinks": [ CategoryLink ],    // 11 items on category pages, [] on subcategories
  "filters": Filters,                   // present on all 47
  "gridState": "not-captured",          // "empty" | "loading" | "cards" | "unknown" | "not-captured" (capture.matchesUrl false)
  "emptyState": EmptyState | null,
  "cards": [ Card ],                    // when gridState === "cards"; always [] in this crawl
  "productCount": null,                 // products.length; null when capture.matchesUrl is false
  "products": [ Product ],              // [] when capture.matchesUrl is false
  "extraBlocks": [],                    // RICH() blocks for any unmodelled text; [] on all pages
  "extraButtons": [],                   // unmodelled button labels (e.g. a grid "load more"); [] on all pages
  "_jsonld": [ {BreadcrumbList}, {ItemList} ]  // raw JSON-LD, for re-emitting structured data; no ItemList when capture.matchesUrl is false
}
```
(The example is `/collection/flower`, one of the 9 base URLs whose render belongs to its `?sort=` twin.)

### `CategoryLink` (items of `categoryLinks`)
| field | type | example | notes |
|---|---|---|---|
| `label` | string \| null | `"Deals"`, `"Pre-Roll"` | visible link text. If it is ever empty, fall back to `image.alt` (`"Deals icon"`) or to `href` |
| `href` | string | `"/deals"`, `"/collection/flower?sort=brandAsc"` | carousel links carry the default sort param |
| `ariaLabel` | string \| null | `"Go to Deals"` / `"Flower, current page"` | |
| `current` | boolean | `true` on the link to the page itself | `/collection/cbd` has **no** current link because CBD is not in the carousel |
| `image` | Image | `{src:"https://sunny-dayz.cdn.prismic.io/sunny-dayz/…_deals.svg?fit=max&w=128", alt:"Deals icon"}` | SVG icon |

The 11 links are the same on all 10 category pathnames, in this order: Deals, Flower, Vapes,
Pre-Roll, Edibles, Extracts, Drinks, Tinctures, Capsules, Topicals, Accessories. The carousel's
Previous/Next buttons are hidden (CSS `--hide`) and are not modelled.

### Collection edge cases
- **Grid state.** No product card was ever rendered.
  - `"empty"` on 18 URLs, which show the empty state: cartridge/all-in-one, cbd/topical, edible/baked-good, edible/chocolate, extract/badder, extract/live-rosin, merch/hat, merch/lighter, merch/rolling-papers, preroll/flower, tincture/other, topical/lubricant, topical/other, plus 5 `?sort=` URLs: edible?sort=priceDesc, extract, flower, merch and preroll ?sort=brandAsc.
  - `"loading"` on 20 URLs, where the crawl caught the 24-card skeleton and `emptyState` is `null`. That is 15 subcategories (beverage/other, cartridge/510-thread, edible/chew, edible/gummy, edible/oil, edible/other, extract/kief, flower/pre-pack, merch/battery, merch/grinder, merch/other, merch/pipe, merch/t-shirt, topical/cream, topical/oil) and `/collection/cbd`, plus 4 `?sort=brandAsc` URLs: beverage, cartridge, tincture and topical.
  - `"not-captured"` on the 9 base URLs with a `?sort=` twin (beverage, cartridge, edible, extract, flower, merch, preroll, tincture, topical). Their render belongs to the twin, so this URL's grid state is unknown. The twin's state is in `capture.observed.gridState`. It does **not** describe the base URL: the crawl's own render stats (`audit/render-verification.json`) show "no search results found" on base `/collection/cartridge`, whose twin was `loading`. They show no empty state on base edible, extract, flower, merch and preroll, whose twins were `empty`.
  - Render the product grid from `products` for `"empty"` and `"loading"`. Use the empty-state copy only when `products` is empty or a client filter matches nothing. For `"not-captured"` the model has no product list of this URL's own (see `Capture`).
- **Query variants.** A `?sort=` URL and its base URL share one render file (`audit/rendered/collection-<cat>.json`), and it holds the **`?sort=` URL's** capture on all 9 pairs. The `?sort=` models therefore describe their own URL (`capture.matchesUrl: true`, `sortSelected` set, the ItemList in that sort order). The base models get the same query-independent fields and `capture.matchesUrl: false`; see `Capture`.
- **The h1, breadcrumb and title can each be worded or cased differently.** Render the value from the matching field and do not derive one from another. Examples: h1 `DRINKS`, breadcrumb `Drinks`, title `…| BEVERAGE`. `/collection/extract` has h1 `Concentrates`, breadcrumb `Concentrates` and the carousel link `Extracts`. Others: `/collection/flower` breadcrumb `All Flower`, `/collection/preroll` h1 `PRE-ROLLS` / breadcrumb `Pre Rolls`, `/collection/topical` h1 `TOPICALS` / breadcrumb `Topical`, `/collection/cartridge/all-in-one` h1 `ALL-IN-ONE` / breadcrumb `ALL IN ONE`, `/collection/flower/pre-pack` h1 `PRE-PACK` / breadcrumb `PRE PACK`.
- **Duplicate h1s.** `OTHER` appears under beverage, edible, merch, tincture and topical. `OIL` appears under edible and topical. `FLOWER` is used by both `/collection/flower` and `/collection/preroll/flower`. Use `path` and `parentPath`, never h1, as the key.
- **Breadcrumb on subcategories** is `Home › Menu › <SUB>`. It skips the parent category. Use `parentPath` if the redesign wants the parent level.
- **Subcategory description** is always `"Best " + h1` (e.g. `"Best 510 THREAD"`).
- **`_jsonld`** starts with `_`, so the coverage scorer ignores it. It is raw data, and its strings are still entity-encoded.

## 4. `listing` model

One envelope for all seven pages. A structure the page does not have is `null` or `[]`.

```jsonc
{
  "kind": "shop",                 // shop | deals | promotions | daily-deals | product-group-our-products | our-strains | store-locator
  "path": "/shop",
  "theme": "dark",                // "dark" when <main> has class dark-theme (only /shop), else null
  "capture": Capture,             // same rule as collection (§2). matchesUrl true on /shop, /deals, /product-group/our-products; null on the 4 pages without a sort control
  "h1": "BROWSE ALL PRODUCTS",    // null on /promotions and /daily-deals (they have no h1)
  "banner": Banner | null,
  "breadcrumb": [ BreadcrumbItem ],
  "promoCarousel": PromoCarousel | null,
  "filters": Filters | null,
  "gridState": "loading" | "empty" | "cards" | "unknown" | "not-captured" | null,   // null = no product grid on the page; "not-captured" never occurs on listing pages in this crawl
  "emptyState": EmptyState | null,
  "cards": [ Card ],              // always [] in this crawl
  "productCount": 20,
  "products": [ Product ],
  "search": [ SearchBox ],
  "notice": Notice | null,
  "galleries": [ Gallery ],
  "stores": [ Store ],
  "storeListToggleAriaLabel": "Close" | null,
  "map": Map | null,
  "extraBlocks": [], "extraButtons": [],
  "_jsonld": [ ... ]
}
```

### Which fields each listing page fills
| page | h1 | banner | breadcrumb | promoCarousel | filters / grid | products | other |
|---|---|---|---|---|---|---|---|
| `/shop` | `BROWSE ALL PRODUCTS` | yes (no description) | Home › Browse All Products | "Promo Carousel", 0 promotions | yes, `loading` | 20 | `theme:"dark"`. The JSON-LD in `<main>` has no BreadcrumbList |
| `/deals` | `DEALS` | yes | Home › Deals | "Today's deals", 0 promotions | yes, `loading` | 0 (empty ItemList) | |
| `/product-group/our-products` | `Our Products` | yes (the banner uses `…BannerSliceDispensary.jpg` with `rect=` crops) | Home › Shop › Our Products | — | yes, `loading` | 20 | |
| `/promotions` | null | — | Home › Promotions Page | — | — | 0 | `search[1]`, `notice` |
| `/daily-deals` | null | — | Home › Daily deals | — | — | 0 | breadcrumb only. The page renders nothing else |
| `/our-strains` | `Our Strains` | yes, description `SunnyDayz Cultivated.` | Home › Our Strains | — | — | 0 | `galleries[2]` |
| `/store-locator` | `Our Stores` | — | Home › Our Stores | — | — | 0 | `search[2]`, `stores[1]`, `map` |

### `PromoCarousel`
```jsonc
{
  "ariaLabel": "Promotions carousel: Promo Carousel, 0 promotions available",
  "heading": "Promo Carousel",            // /deals: "Today's deals"
  "countText": "0 promotions available",  // sr-only suffix of the heading; the leading " - " is stripped
  "promotionCount": 0,                     // parsed from the aria-label
  "seeAll": { "label": "SEE ALL", "countBadge": "(0)", "href": "/promotions",
              "ariaLabel": "Go to See all, 0 promotions available" },
  "state": "loading",                      // "items" | "loading" (placeholder slides only) | "empty"
  "placeholderSlides": 15,
  "promotions": [],                        // [{text, link:{label,href}|null, image}]; always [] in this crawl
  "controls": { "previous": "Previous", "next": "Next" }   // sr-only button labels, visible in the text flow
}
```
Both pages show 0 promotions. The `promotions` item shape is generic because no filled slide
exists to model it from.

### `SearchBox` (items of `search`)
`{ "name": "searchBox", "placeholder": "Search", "ariaLabel": "Search", "buttonAriaLabel": "Search" }`.
`/store-locator` has two: `searchBox` (store-list header) and `searchBox2` (filter header, the
mobile duplicate). The submit buttons are icon-only.

### `Notice` (`/promotions` "not found" block)
```json
{ "heading": "Promotion not found.", "text": "Click", "link": { "label": "here to visit the Shop Page.", "href": "/shop" } }
```
Render as `{text} <a href={link.href}>{link.label}</a>` under the heading.

### `Gallery` (items of `galleries`, `/our-strains`)
| field | type | example |
|---|---|---|
| `heading` | string \| null | `"A look at what we're growing."` (gallery 1), `null` (gallery 2) |
| `headingLevel` | string \| null | `"h1"`. The source marks this as a second `<h1>`, so choose the level on purpose |
| `intro` | string[] | `["Small Batch. Real Farmers. Real Flavor."]`, or `[]` |
| `items` | `{caption: string \| null, image: Image}[]` | `[{caption:"KEY LIME OG", image:{src:"…qtrrsdWsCrOMsFqT_1.png?…rect=123%2C0%2C744%2C1006…", alt:"Image"}}, {caption:"CHOICE", …}]`. Gallery 2 has `LAUREL PALMER` and `TROP STRAWBERRY` |

The source renders each item twice: a swiper carousel plus a hidden grid. Items are
de-duplicated. Every image alt is the literal word `"Image"`.

### `Store` (items of `stores`, `/store-locator`)
```jsonc
{
  "name": "Sunny Dayz",
  "href": "/dispensary/sunny-dayz",
  "detailsAriaLabel": "View Sunny Dayz location details",
  "address": { "text": "105 Greenfield Rd, South Deerfield, MA 01373",
               "mapsHref": "https://maps.google.com/?q=42.486377,-72.6137382",
               "ariaLabel": "View the address … on Google Maps (opens in new tab)",
               "lat": 42.486377, "lng": -72.6137382 },
  "phone": { "label": "+1 (413) 350-5034", "href": "tel: 4133505034", "ariaLabel": "Call +1 (413) 350-5034" },
  "customerTypes": ["ADULT"],
  "customerTypesAriaLabel": "Store services: ADULT",
  "status": { "badge": "CLOSED", "message": "until 10:00 AM ET", "ariaLabel": "Store status: CLOSED" },
  "image": { "src": "", "alt": "Sunny Dayz location", "placeholder": true }
}
```
- `status` is a **live open/closed indicator frozen at crawl time**. Do not print it as static
  text. Compute it from store hours at runtime, and use these strings only as format examples.
- `phone.href` is kept raw and contains a space (`tel: 4133505034`). Strip whitespace when you
  emit the link.
- `image` is the lazy placeholder, so the card has no real photo.
- The address link ends in a decorative `↗` glyph (`aria-hidden`). It is not modelled.

### `Map`
`{ "multiLocation": true, "markers": [ { "name": "Sunny Dayz", "lat": 42.486377, "lng": -72.6137382 } ] }`.
The source map is client-rendered, and its `<figure>` is empty in the capture. The markers come
from the stores' Google Maps links.

## 5. Always-empty fields (present for forward compatibility)
`cards` (also `capture.observed.cards`), `filters.sortOptions`, `filters.quickFilters`,
`promoCarousel.promotions`, `extraBlocks` and `extraButtons` are `[]` on all 54 models. A template
may ignore them. If a future re-crawl fills `extraBlocks`, a new unmodelled content block appeared.
`extraBlocks` holds RICH blocks `{t:'h2'|'p'|'ul'|…, text, html, items}`. Inside the product grid,
only the modelled parts (filter bar, cards, empty state, skeleton) are left out of the safety net.
Any other grid text or button (e.g. a "load more" control) lands in `extraBlocks`/`extraButtons`,
and so does a product card outside the grid.

## 6. Verification (2026-09-23)
- `node tools/extract-model.mjs --type collection`: 47 pages, 0 errors, 0 below 0.98, min coverage 1.0.
- `node tools/extract-model.mjs --type listing`: 7 pages, 0 errors, 0 below 0.98, min coverage 1.0.
- Positive controls: a wrapper around the current extractor under `tmp/` deletes one field, run with `--extractor`:
  - `emptyState` deleted (top-level and `capture.observed`, `tmp/control-col2-emptystate.js`): 23 of 47 below (0.43–0.75). That is the 18 pages with `gridState` `"empty"` plus the 5 base URLs whose `capture.observed.gridState` is `"empty"`. The rest stay at 1.0.
  - `categoryLinks` deleted (`tmp/control-col2-categorylinks.js`): 19 of 47 below. This is exactly the 19 category URLs (0.33–0.75).
  - `capture.observed` deleted (`tmp/control-capture-observed.js`): 9 of 47 below. This is exactly the 9 base URLs (0.53–0.95), so the quarantined strings are counted where they now live.
  - listing `promoCarousel` deleted (`tmp/control-lst2-promo.js`): 2 of 7 below, `/shop` 0.57 and `/deals` 0.42.
  - The 20 product descriptions per page do not hide a missing field, because every control dropped every affected page below 0.98.
- Card path (`tmp/cards-control.mjs`, which writes nothing to `content/`). It injects 3 real cards from `audit/rendered/dispensary-sunny-dayz.json` and 1 "Stock photo" card from `blog-the-best-strains-for-the-summer.json` into the `/collection/cbd` and `/shop` grids, plus a synthetic grid button, and checks every injected word against the model:
  - before this fix: `add`, `cart`, `stock`, `photo`, `load`, `more` missing, and `image.alt` with a trailing space.
  - after: 0 missing and 0 whitespace issues on both pages. The button lands in `extraButtons`. An unknown badge added to a card (`--badge`) lands in `otherText`. A card placed outside the grid (`--outside`) lands in `extraBlocks`/`extraButtons`.
  - `--url <base>?sort=x` with an unsorted render gives `capture.matchesUrl:false`, `signal:"sort-param-without-sort-selected"` (the reverse case).
- Capture flag: `matchesUrl:false` on exactly the 9 base URLs whose render file's `url` is the `?sort=` twin, and `true` on all 38 other collection models. The raw evidence for the rule: for each of the 9 pairs, `audit/raw/collection-<cat>.html` vs `audit/raw/collection-<cat>-sort-<param>.html` with scripts removed differ only in the sort trigger. The BreadcrumbList JSON-LD is identical, and the ItemList differs in order on all 9 and in set on 4.
- Product strings: 0 names, brands or image alts with stray whitespace (9 names and 9 alts before). The only other product change is `brand` `""` → `null` on 2 products.
