# Model spec: `brand` and `brands` pages

Templates for these two page types are built **only** from this spec. Every field below comes from
`src/extract/brand.js` or `src/extract/brands.js`. Values come from the page's rendered `<main>` or
from its own JSON-LD. The extractors derive a few structural values from the URL or from
attributes: `path`, `slug`, the counts, `gridState` and `logo.missing`. They never invent display
text.

| Type | Pages | Model files |
|---|---|---|
| `brand` | 30: `/brand/<slug>`, listed in §6 | `content/model/brand-<slug>.json` |
| `brands` | 1: `/brands` | `content/model/brands.json` |

No brand URL is a soft 404, a query-string variant or a case variant. All 30 are lower-case
pathnames with exactly one render each.

**Shared shapes with `collection`.** `banner`, `filters`, `gridState`, `emptyState`, `cards`,
`products[]`, `extraBlocks` and `extraButtons` on a brand page have the same names, types and
semantics as on `collection` pages (`content/model-spec/collection.md` §2). They are the same Treez
components, so one set of template partials renders both page types. The shapes are repeated in
full below, so this spec stands on its own.

---

## 1. Record envelope (written by the harness)

```jsonc
{
  "url": "https://www.sunnydayzcannabis.com/brand/doja",  // absolute source URL
  "slug": "brand-doja",                                  // model file name without .json
  "type": "brand",                                       // or "brands"
  "title": "DOJA",                                       // source <title>; use it for <title>/SEO
  "seoTitle": "DOJA",                                    // same value as title
  "model": { /* §3 or §4 */ }
}
```
On all 30 brand pages, `title` equals `model.name`. The `/brands` title is **"All brands"**, while
its h1 is "Our Curated Brands".

---

## 2. Sub-shapes

### `Image`
```jsonc
{ "src": "https://images.prismic.io/sunny-dayz/Z5vMoZbqstJ9-D0K_Categories_Banner.png?auto=format%2Ccompress&fit=max&w=3840", "alt": "Banner" }
// no usable image in the DOM:
{ "src": "", "alt": "KANHA brand logo", "placeholder": true, "missing": "empty-src", "width": 163, "height": 230 }
```
- `src` is absolute. `/_next/image` wrappers are unwrapped, and the largest `srcset` candidate is kept.
- `placeholder: true` means the DOM held no real image. The `src` is then `""`.
- `missing`, `width` and `height` appear **only on `/brands` logos**. They are described in §4.

### `BreadcrumbItem`
`{ "label": string, "href": string | null }`. The last item is the current page and has
`href: null`. Hrefs are site-relative.

### `Banner` (field `banner`, brand pages only)
| field | type | optional | example | notes |
|---|---|---|---|---|
| `title` | string | no | `"DOJA"` | the banner `<h1>` text, same value as `model.h1` |
| `description` | string \| null | yes | `"Shop cannabis products from DOJA at a dispensary near you"` | set on all 30 pages. It always reads `"Shop cannabis products from " + <h1> + " at a dispensary near you"` (source copy, kept verbatim) |
| `desktopImage` | Image \| null | yes | see below | |
| `mobileImage` | Image \| null | yes | see below | |

On all 30 pages both images are the **same generic file**:
`https://images.prismic.io/sunny-dayz/Z5vMoZbqstJ9-D0K_Categories_Banner.png?auto=format%2Ccompress&fit=max&w=3840`,
alt `"Banner"`. No brand has its own banner art. The source renders the banner text white
(inline `color:#FFFFFF`) over the image. The extractor does not model that style.

### `Filters` (field `filters`)
| field | type | example | notes |
|---|---|---|---|
| `filterLabel` | string \| null | `"FILTER"` | the filter-drawer button text. The drawer contents are never in the DOM |
| `sortLabel` | string \| null | `"Sort By"` | placeholder label of the sort select |
| `sortAriaLabel` | string \| null | `"Sort by"` | the accessible name of the sort trigger |
| `sortSelected` | string \| null | `null` | **`null` on all 30 brand pages**: no sort is selected |
| `sortOptions` | string[] | `[]` | the listbox is closed in every capture, so this is **always `[]`** |
| `quickFilters` | string[] | `[]` | chips in the filter slider container. **Always `[]`** |

### `EmptyState` (field `emptyState`)
`{ "heading": string | null, "text": string | null }`, kept verbatim. It is identical on every page that has it:
```json
{ "heading": "No search results found",
  "text": "No results match the filter criteria. Remove a filter or clear all filters to search again" }
```
It is `null` whenever `gridState` is not `"empty"`.

### `Product` (items of `products`, from the page's JSON-LD `ItemList`)
| field | type | optional | example | notes |
|---|---|---|---|---|
| `position` | number | no | `1` | 1-based and sequential on every page |
| `url` | string | no | `"/product/doja-doja-confetti-3-5g-flower-3-5-g-flower-3-5-grams"` | always `/product/…`. **All 143 URLs have a crawled product page**, so join strain, THC, gallery, `stockPhoto` and `variants[]` from that page's model. Each item is a **variant group**; size siblings are not listed separately (§5.2) |
| `name` | string | no | `"Doja Confetti - 3.5G Flower"`, `"Betty's Eddies \| Tropical Smoothie \| Chews \| 1:6"` | HTML entities are decoded (`&apos;`→`'`, `&amp;`→`&`, `&quot;`→`"`). **8 names carry a leading or trailing space verbatim** (e.g. `" Sunnydayz Battery"`, `"Tower Three - Maple Butter - 3.5G Flower "`). Trim when rendering |
| `brand` | string | no | `"DOJA"`, `"BETTY'S EDDIES"` | upper-case, entities decoded. It equals the page's `name` for all 143 products |
| `description` | string | no | 636–1026 chars | plain text, entities decoded |
| `price` | string | no | `"$40"`, `"$2.50"` | display string, `"$" + offers.price` |
| `priceAmount` | number \| null | yes | `40`, `2.5` | numeric form for sorting |
| `currency` | string \| null | yes | `"USD"` | always USD |
| `availability` | string \| null | yes | `"InStock"` | always `InStock` (143/143) |
| `image` | Image \| null | yes | `{src:"https://d1hhy58mqsa6c3.cloudfront.net/<uuid>/<uuid>", alt:"<name>"}` | never null and never a placeholder. **136** are Treez CDN photos with no file extension. **7** are Prismic category stock images (see §5.6) |

The JSON-LD has no alt text, so `image.alt` is the product name.

### `Card` (items of `cards`)
This is the `CARD()` shape from `_common.js`: `{url, name, brand, price, weight, strain, strainKey,
thc, tac, cbd, badges[], image, stockPhoto}`. **`cards` is `[]` on all 30 pages**, because no
product card was ever rendered (§5.1). The field exists so that a future re-crawl which renders
cards does not lose them.

---

## 3. `brand` model

```jsonc
{
  "kind": "brand",
  "path": "/brand/doja",            // site-relative source path; use as the route and the join key
  "slug": "doja",                   // path without "/brand/"
  "name": "DOJA",                   // brand display name = the h1 text (upper-case, apostrophes kept)
  "h1": "DOJA",
  "logo": null,                     // ALWAYS null: the brand page DOM carries no logo (§5.3)
  "banner": Banner,                 // present on all 30
  "breadcrumb": [ {"label":"Home","href":"/"}, {"label":"Brands","href":"/brands"}, {"label":"DOJA","href":null} ],
  "filters": Filters,               // present on all 30
  "gridState": "empty",             // "empty" | "loading" | "cards" | "unknown" | null (null = no grid section)
  "emptyState": EmptyState | null,  // set if and only if gridState === "empty"
  "cards": [],                      // Card[]; always [] in this crawl
  "productCount": 1,                // products.length = ItemList entries = VARIANT GROUPS, not SKUs (1–18; §5.2)
  "products": [ Product ],
  "extraBlocks": [],                // RICH() blocks for unmodelled text outside banner/nav/grid; [] on all 30
  "extraButtons": [],               // unmodelled button labels; [] on all 30
  "_jsonld": [ {BreadcrumbList}, {ItemList} ]   // raw JSON-LD, for re-emitting structured data
}
```

| field | type | optional | notes |
|---|---|---|---|
| `kind` | `"brand"` | no | constant |
| `path` | string | no | e.g. `"/brand/bettys-eddies"` |
| `slug` | string | no | e.g. `"bettys-eddies"`. Apostrophes are dropped in slugs: `bettys-eddies`, `bubbys`, `natures-heritage` |
| `name` | string \| null | no (never null here) | same value as `h1`. Use it on cards, in the page heading and for alt text |
| `h1` | string \| null | no (never null here) | |
| `logo` | null | — | reserved. See §5.3 for the logo situation |
| `banner` | Banner \| null | no (present on all 30) | §2 |
| `breadcrumb` | BreadcrumbItem[] | no | always 3 items. **The last label can differ from `name`** (§5.4) |
| `filters` | Filters \| null | no (present on all 30) | §2 |
| `gridState` | string \| null | no | `"empty"` on 14 pages, `"loading"` on 16 (§5.1) |
| `emptyState` | EmptyState \| null | yes | set on the 14 `"empty"` pages |
| `cards` | Card[] | no | `[]` |
| `productCount` | number | no | products.length, the number of entries in the brand's ItemList. **Each entry is a variant group, so this is not a SKU count.** It is provably short on `/brand/breathe-free`: 7 here, but the brand has 8 crawled product pages (§5.2) |
| `products` | Product[] | no | 1–18 per page, 143 in total, 143 unique URLs. No product appears on two brand pages. Size variants that are collapsed into a group are **not** listed. For the full grid, apply the variant join in §5.2 |
| `extraBlocks` | RICH block[] | no | `[]`. If a re-crawl fills it, a new content block (such as a brand story) appeared. Items are `{t:'h2'\|'p'\|'ul'\|…, text, html, items}` |
| `extraButtons` | string[] | no | `[]` |
| `_jsonld` | object[] | no | a `BreadcrumbList` and an `ItemList` on all 30 pages. The leading `_` keeps it out of coverage scoring. Its strings are **still entity-encoded** (`BETTY&apos;S EDDIES`), so decode them before display. The BreadcrumbList's last name also drops the apostrophe (`"BETTYS EDDIES"`) |

### Full example: `/brand/doja` (the empty-grid state; the product description is shortened here)
```json
{
 "kind": "brand", "path": "/brand/doja", "slug": "doja", "name": "DOJA", "h1": "DOJA", "logo": null,
 "banner": {
  "title": "DOJA",
  "description": "Shop cannabis products from DOJA at a dispensary near you",
  "desktopImage": {"src": "https://images.prismic.io/sunny-dayz/Z5vMoZbqstJ9-D0K_Categories_Banner.png?auto=format%2Ccompress&fit=max&w=3840", "alt": "Banner"},
  "mobileImage":  {"src": "https://images.prismic.io/sunny-dayz/Z5vMoZbqstJ9-D0K_Categories_Banner.png?auto=format%2Ccompress&fit=max&w=3840", "alt": "Banner"}
 },
 "breadcrumb": [{"label": "Home", "href": "/"}, {"label": "Brands", "href": "/brands"}, {"label": "DOJA", "href": null}],
 "filters": {"filterLabel": "FILTER", "sortLabel": "Sort By", "sortAriaLabel": "Sort by", "sortSelected": null, "sortOptions": [], "quickFilters": []},
 "gridState": "empty",
 "emptyState": {"heading": "No search results found", "text": "No results match the filter criteria. Remove a filter or clear all filters to search again"},
 "cards": [],
 "productCount": 1,
 "products": [{
  "position": 1,
  "url": "/product/doja-doja-confetti-3-5g-flower-3-5-g-flower-3-5-grams",
  "name": "Doja Confetti - 3.5G Flower", "brand": "DOJA",
  "description": "Doja Confetti brings a celebration of premium cannabis flower to your collection...",
  "price": "$40", "priceAmount": 40, "currency": "USD", "availability": "InStock",
  "image": {"src": "https://d1hhy58mqsa6c3.cloudfront.net/e4106378-53c0-4bab-a8e2-a72ac74e5d5f/e5a028ed-a685-492e-9b17-4c95178cc3af", "alt": "Doja Confetti - 3.5G Flower"}
 }],
 "extraBlocks": [], "extraButtons": [], "_jsonld": ["…BreadcrumbList…", "…ItemList…"]
}
```
The loading state, from `/brand/sweetgrass-botanicals`, differs only in these fields:
`"gridState": "loading", "emptyState": null, "productCount": 18`. Its 18 products have positions 1–18.

---

## 4. `brands` model (`/brands`)

```jsonc
{
  "kind": "brands",
  "path": "/brands",
  "breadcrumb": [ {"label":"Home","href":"/"}, {"label":"Brands","href":null} ],
  "h1": "Our Curated Brands",
  "search": {
    "input":  { "name": "brands-search", "type": "search", "placeholder": "Search brands", "ariaLabel": "Search brands", "value": "" },
    "submit": { "label": "Search", "ariaLabel": "More locations" }
  },
  "letters": [],                       // alphabet/letter filter; the page has NONE, always []
  "brands": [ BrandTile ],             // 24 tiles, alphabetical, the first page of the list only
  "brandCount": 24,                    // brands.length (rendered tiles, NOT the number of brands)
  "loadMore": { "label": "Load more brands", "ariaLabel": "Load more brands" },
  "hasMore": true,                     // true when the load-more button is present
  "extraBlocks": [],                   // RICH blocks for unmodelled text in the section; []
  "extraButtons": [],                  // []
  "_jsonld": []                        // always []: the page's BreadcrumbList is streamed OUTSIDE <main> (§5.9)
}
```

### `BrandTile` (items of `brands`)
| field | type | optional | example | notes |
|---|---|---|---|---|
| `name` | string | no | `"BETTY'S EDDIES"` | tile text, upper-case with the apostrophe kept. It equals the brand page's `name` for all 24 |
| `href` | string | no | `"/brand/bettys-eddies"` | site-relative. It equals the brand page's `path`, so use it as the join key |
| `slug` | string | no | `"bettys-eddies"` | |
| `logo` | Image | no | see below | **no tile has a usable logo in the rendered DOM** |

`logo` is always `{src:"", alt:"<NAME> brand logo", placeholder:true, missing, width:163, height:230}`:
- `missing: "placeholder-svg"` on **14** tiles, where the source rendered its own
  `/images/product-placeholder.svg` (a single-colour grey `#BABABA` placeholder graphic). These are BETTY'S EDDIES, BIC, BLAZY
  SUSAN, BREATH FREE, BUBBY'S, COAST, DOJA, ELEMENTS, GRAV, IN HOUSE, NATURE'S HERITAGE, OMG, RAW and SUGAREE.
- `missing: "empty-src"` on **10** tiles, where the rendered `<img>` had `src=""` and no `srcset`.
  These are AHH MOMENTS, BOUNTIFUL FARMS, BREATHE FREE, CLARAVITA, HARBOR HOUSE, IMPRESSED, KANHA,
  KEEF, LEVIA and MASS YIELD. **These 10 do have real Prismic logos in the server HTML**
  (§5.3). The hydrated DOM that the extractor reads has lost them.
- `width`/`height` (163×230) are the `<img>` intrinsic size attributes. Use them for the tile's
  aspect ratio. The source uses `object-fit: contain`.

Example tile: `{"name":"KANHA","href":"/brand/kanha","slug":"kanha","logo":{"src":"","alt":"KANHA brand logo","placeholder":true,"missing":"empty-src","width":163,"height":230}}`

### Search form
The DOM text of the submit button is `"Search"`. The live CSS upper-cases it (rendered text
`"SEARCH"`), and the load-more button renders as `"LOAD MORE BRANDS"` the same way. Store the data
as given and upper-case with CSS. **`submit.ariaLabel` is `"More locations"` in the source.** This
is a copy-paste bug on the live site. Kept verbatim, but a template should use `label` (or
"Search brands") as the accessible name.

---

## 5. Edge cases

### 5.1 The rendered grid never holds product cards
The crawl caught the Treez grid in one of two states. The products still exist, declared in JSON-LD.
- `"empty"` on 14 pages: bettys-eddies, blazy-susan, breath-free, bubbys, doja, grav, impressed,
  kanha, levia, natures-heritage, raw, sunnydayz, the-fresh-connection, tower-three. The source
  literally showed "No search results found" even though each of these brands has 1–11 products
  in its ItemList.
- `"loading"` on 16 pages: ahh-moments, bic, bountiful-farms, breathe-free, claravita, coast,
  elements, harbor-house, in-house, keef, mass-yield, omg, sugaree, sweetgrass-botanicals,
  the-healing-rose, treeworks. The grid held a 24-card skeleton plus a skeleton pagination bar.
  `emptyState` is null.

**Render the product grid from `products` in both states, extended by the variant join in §5.2.**
Use the `emptyState` copy only when `products` is empty (never true in this crawl) or when a
client-side filter matches nothing.

### 5.2 Product counts: the ItemList lists variant groups, not SKUs
`productCount` ranges from 1 to 18 (sweetgrass-botanicals), 143 in total. **A brand's ItemList is
not its complete SKU set.** It holds one entry per *variant group*: when a product has size
variants, only the group's lead SKU is listed and its siblings are folded into that entry.

**The gap this causes in this crawl.** `/brand/breathe-free` lists 7 products, but 8 crawled product pages carry
`brand.href: "/brand/breathe-free"`. The missing SKU is
`/product/breathe-free-breathe-free-mango-smoothie-1g-pre-roll-1-g-preroll-1-grams` (the 1G single
Mango Smoothie pre-roll). It is a size variant of listed position 2,
`/product/breathe-free-breathe-free-mango-smoothie-1g-pre-roll-1-g-3-pack-preroll-1-grams` (the
3-pack). The 3-pack's product model lists both in `variants[]`: `{weight:"1g", price:"$20",
active:true}` for itself and `{weight:"1g", price:"$8", active:false, href:<the single>}`. The brand
page's rendered `<main>` never names the single SKU. The only mention is in the out-of-contract
RSC payload, where it appears as a `siblings` entry of that hit. The `/collection/preroll?sort=brandAsc`
ItemList lists it as a separate item.

**Join rule for a complete brand grid (verified on all 30 brands).** The brand's SKU set is
`products[].url` ∪ the `variants[].href` of each listed product's own model
(`content/model/product-<slug>.json`). On every one of the 30 brands, this union exactly equals the
set of crawled product models whose `brand.href` equals the brand's `path`. Across all 30 brands it
adds 1 URL, the one above. The source brand page shows groups. Whether the redesign shows a variant
as its own card or as a size option on its group's card is a template decision.

The crawl has 146 product models. 143 are in a brand ItemList and 1 is the folded variant above.
The other 2 (`/product/e-z-wider-organic-hemp-cones-1-1-4-one-size-merch` and
`/product/hg-aluminum-grinder-black-2-5-inch-one-size-merch`) have brand `"not specified"` and no
brand page. The join covers only crawled product pages. A variant that was never crawled would still
be missing. None was found: every `/product/` URL in the raw RSC payloads of the 30 brand pages is
either in that page's ItemList or is this one variant.

Do not print `productCount` as the number of products a brand sells. If a count is shown, compute it
from the joined set.

### 5.3 Logos
- The **brand page DOM has no logo**, so `model.logo` is always `null`. The only logo slot on the
  site is the `/brands` tile, and every tile is a placeholder in the rendered DOM (§4).
- The 6 brands that are not in the rendered `/brands` list (§5.5) have no logo information in any
  extracted model.
- **Out-of-contract facts, for the build owner to decide on.** `audit/raw/brands.html` is the
  server HTML, which is neither the rendered DOM nor JSON-LD. It holds two things the extractors cannot see:
  - **Tile images.** The 10 `empty-src` tiles have a real Prismic logo in the server `<img>`: a `srcSet`, plus a `src` of
    `/_next/image?url=https%3A%2F%2Fimages.prismic.io%2Fsunny-dayz%2F…`. For AHH MOMENTS that is
    `…/u0b8do0_PesBEEMK_ahh-logo-1.jpg`. In the hydrated DOM that the harness saved, the same 10
    `<img>` have `src=""` and no `srcset`. The rendered `<main>` contains no Prismic URL anywhere
    (no `noscript`, no `data-src`). The harness passes only the rendered `<main>` to the
    extractor, so **no in-contract extractor can recover these 10 logos.** This loss stays open
    until a join is approved.
  - **A name→logo map.** The RSC payload (`self.__next_f.push` chunks) holds a `contentBrands`
    map with **21 keys** that point at **20 distinct files**: `FRESH CONNECTION` and
    `THE FRESH CONNECTION` share `…/x5Q0M9zKC-8zRNYI_TheFreshConnection.jpeg`. Examples:
    `KANHA → https://images.prismic.io/sunny-dayz/UaKooBng03SYbDZl_Screenshot2026-07-13at9.10.25AM.png…`,
    `TREEWORKS → …/2XT7hq4DJw4nAWG7_TreeWorks.png…`, `COAST CANNABIS CO. → …/UYu0JtSJgXrZU80P_CoastCannabisCo..jpeg…`.
    Joined against the 30 brand `name`s:

  | Match against brand `name` | Brands | Map key | `/brands` tile |
  |---|---|---|---|
  | exact key, tile in list | AHH MOMENTS, BOUNTIFUL FARMS, BREATHE FREE, CLARAVITA, HARBOR HOUSE, IMPRESSED, KANHA, KEEF, LEVIA, MASS YIELD | same as `name` | the 10 `empty-src` tiles |
  | exact key, not in list | THE FRESH CONNECTION, THE HEALING ROSE, TOWER THREE, TREEWORKS | same as `name` | behind "Load more" |
  | **key spelled differently** | BETTY'S EDDIES | `BETTYS EDDIES` (no apostrophe) | `placeholder-svg` |
  | **key spelled differently** | NATURE'S HERITAGE | `NATURES HERITAGE` (no apostrophe) | `placeholder-svg` |
  | **key spelled differently** | COAST | `COAST CANNABIS CO.` (longer name) | `placeholder-svg` |
  | **key spelled differently** | SWEETGRASS BOTANICALS | `SWEET GRASS BOTANICALS` (extra space) | behind "Load more" |
  | no key | BIC, BLAZY SUSAN, BREATH FREE, BUBBY'S, DOJA, ELEMENTS, GRAV, IN HOUSE, OMG, RAW, SUGAREE, SUNNYDAYZ | — | `placeholder-svg` (SUNNYDAYZ: behind "Load more") |
  | key with no brand page | — | `FRESH CONNECTION` (a second key for THE FRESH CONNECTION's file), `CAPE COD LABS`, `CNA STORES INC` | — |

  The 14 `placeholder-svg` tiles are exactly the 3 in-list brands whose key is spelled
  differently, plus the 11 in-list brands with no key. That fits a site lookup by exact name, but
  the site's own code was not read, so the cause is **unverified**. An approved join must use an
  explicit per-brand mapping, never exact names. Otherwise COAST, BETTY'S EDDIES,
  NATURE'S HERITAGE and SWEETGRASS BOTANICALS stay without logos even though the map has one for
  each. `tmp/verify-brands-logomap.mjs` re-derives this table from the raw HTML.
- The extractors do not read any of this data, because the contract is DOM + JSON-LD. If the
  redesign wants brand logos, it needs a separate, explicitly approved join from the raw HTML. Until
  then, templates must handle "no logo" for every brand: show a text/wordmark tile using `name`.

### 5.4 Breadcrumb label ≠ name (apostrophes)
Three brands show the brand name without its apostrophe in the breadcrumb, both in the DOM and in
the BreadcrumbList JSON-LD:

| path | `name` / `h1` / title | last breadcrumb label |
|---|---|---|
| `/brand/bettys-eddies` | BETTY'S EDDIES | BETTYS EDDIES |
| `/brand/bubbys` | BUBBY'S | BUBBYS |
| `/brand/natures-heritage` | NATURE'S HERITAGE | NATURES HERITAGE |

Render each value from its own field. To show the correct name, use `name` in the breadcrumb.

### 5.5 `/brands` shows 24 of 30 brands
The rendered list is the first page, 24 tiles in alphabetical order (AHH MOMENTS … SUGAREE), plus
"Load more brands". These **6 brand pages are not in `brands[]`**: `/brand/sunnydayz`,
`/brand/sweetgrass-botanicals`, `/brand/the-fresh-connection`, `/brand/the-healing-rose`,
`/brand/tower-three` and `/brand/treeworks`. Every tile has a brand page (24/24). For a complete
directory, take the union of `brands[]` with the 30 brand models, keyed by `href` = `path`. Take
the extra entries' `name` from the brand model. They have no logo data (§5.3). Keep the
alphabetical order.

### 5.6 Stock-photo product images
Seven products use a Prismic **category stock image** instead of a product photo:
`…/Z5vMl5bqstJ9-D0B_gear-paraphernalia.png` (Blazy Susan rolling papers, Raw cones, and the
Sunnydayz battery, T-shirt and hat), `…/Z5vMk5bqstJ9-Dz9_edibles-others.png` (Ahh Moments) and
`…/Z5vMhZbqstJ9-Dzv_flowers-sativa.png` (the Breath Free product). All 7 product pages show the
label "Stock photo" in their rendered text. None of the 136 CDN-image products do. The brand
page DOM and JSON-LD carry no such label, so the brand model has no `stockPhoto` field. **Join
`stockPhoto` from the product model by `url`.** Do not infer it from the image host.

### 5.7 Two near-identical brands
`/brand/breath-free` (BREATH FREE, 1 product) and `/brand/breathe-free` (BREATHE FREE, 7
products) are separate brand pages with no shared products. The single BREATH FREE product is
itself named `"Breathe Free - Guava Biscotti - 3.5G Flower"`. This is source data, kept as is.
Key on `path`, never on a normalised name.

### 5.8 Whitespace and entities
Product `name` strings can have leading or trailing spaces (8 of 143), so trim them at render
time. The model's JSON-LD-derived strings are entity-decoded. Only `_jsonld` stays encoded.

### 5.9 The `/brands` JSON-LD is outside `<main>`
`/brands` **does** emit JSON-LD: one `BreadcrumbList`. In `audit/raw/brands.html` the first `<main>` is
only a loading-spinner shell. The real content streams in later inside `<div hidden id="S:0">`
as the `<script type="application/ld+json">` followed by the real `<main id="main">`. So the script
sits **before** `<main>`, and the rendered `<main>` that the harness saves has 0 `ld+json` scripts.
`_jsonld` is therefore `[]`, and the extractor cannot carry the source JSON-LD. On all 30 brand
pages, by contrast, the rendered `<main>` holds two `ld+json` scripts, the BreadcrumbList and the
ItemList, and both reach `_jsonld`.

The source BreadcrumbList reads `Home` (`@id "/"`) → `Our Curated Brands` (no `@id`). The DOM
breadcrumb, which the model carries, reads `Home` → `Brands`. Consequences:
- A template that re-emits structured data from `_jsonld` (as §3 does for brand pages) emits
  **nothing** for `/brands`. The source's BreadcrumbList would be dropped.
- A BreadcrumbList generated from `model.breadcrumb` would end in "Brands", not the source's
  "Our Curated Brands" (that text is `model.h1`). Which label the structured data uses is a
  build-owner decision.

---

## 6. Page table (all 30 brand pages)

| path | name | breadcrumb label | products | gridState | `/brands` tile logo | stock-photo products |
|---|---|---|---|---|---|---|
| `/brand/ahh-moments` | AHH MOMENTS | same | 6 | loading | empty-src | 1 |
| `/brand/bettys-eddies` | BETTY'S EDDIES | **BETTYS EDDIES** | 7 | empty | placeholder-svg | |
| `/brand/bic` | BIC | same | 2 | loading | placeholder-svg | |
| `/brand/blazy-susan` | BLAZY SUSAN | same | 7 | empty | placeholder-svg | 1 |
| `/brand/bountiful-farms` | BOUNTIFUL FARMS | same | 3 | loading | empty-src | |
| `/brand/breath-free` | BREATH FREE | same | 1 | empty | placeholder-svg | 1 |
| `/brand/breathe-free` | BREATHE FREE | same | 7 | loading | empty-src | |
| `/brand/bubbys` | BUBBY'S | **BUBBYS** | 2 | empty | placeholder-svg | |
| `/brand/claravita` | CLARAVITA | same | 1 | loading | empty-src | |
| `/brand/coast` | COAST | same | 9 | loading | placeholder-svg | |
| `/brand/doja` | DOJA | same | 1 | empty | placeholder-svg | |
| `/brand/elements` | ELEMENTS | same | 1 | loading | placeholder-svg | |
| `/brand/grav` | GRAV | same | 5 | empty | placeholder-svg | |
| `/brand/harbor-house` | HARBOR HOUSE | same | 5 | loading | empty-src | |
| `/brand/impressed` | IMPRESSED | same | 4 | empty | empty-src | |
| `/brand/in-house` | IN HOUSE | same | 2 | loading | placeholder-svg | |
| `/brand/kanha` | KANHA | same | 8 | empty | empty-src | |
| `/brand/keef` | KEEF | same | 3 | loading | empty-src | |
| `/brand/levia` | LEVIA | same | 3 | empty | empty-src | |
| `/brand/mass-yield` | MASS YIELD | same | 7 | loading | empty-src | |
| `/brand/natures-heritage` | NATURE'S HERITAGE | **NATURES HERITAGE** | 2 | empty | placeholder-svg | |
| `/brand/omg` | OMG | same | 5 | loading | placeholder-svg | |
| `/brand/raw` | RAW | same | 2 | empty | placeholder-svg | 1 |
| `/brand/sugaree` | SUGAREE | same | 3 | loading | placeholder-svg | |
| `/brand/sunnydayz` | SUNNYDAYZ | same | 3 | empty | not in list (behind "Load more") | 3 |
| `/brand/sweetgrass-botanicals` | SWEETGRASS BOTANICALS | same | 18 | loading | not in list | |
| `/brand/the-fresh-connection` | THE FRESH CONNECTION | same | 6 | empty | not in list | |
| `/brand/the-healing-rose` | THE HEALING ROSE | same | 1 | loading | not in list | |
| `/brand/tower-three` | TOWER THREE | same | 11 | empty | not in list | |
| `/brand/treeworks` | TREEWORKS | same | 8 | loading | not in list | |

---

## 7. Always-empty fields (present for forward compatibility)
On all 30 brand models, these are `[]` or `null`: `cards`, `filters.sortOptions`,
`filters.quickFilters`, `filters.sortSelected`, `extraBlocks`, `extraButtons` and `logo`. On
`/brands` they are `letters`, `extraBlocks`, `extraButtons` and `_jsonld`. A template may ignore
them. If a re-crawl fills `extraBlocks` or `letters`, a new structure appeared on the source.
The `/brands` `_jsonld` is empty because the source JSON-LD sits outside `<main>`. The page does have
JSON-LD (§5.9), so a template must not take the empty array to mean it has none.

## 8. Verification (2026-09-23, re-run after the verifier fix pass)
- `node tools/extract-model.mjs --type brand`: 30 pages, 0 errors, 0 below 0.98, min coverage **1.0**.
- `node tools/extract-model.mjs --type brands`: 1 page, 0 errors, 0 below 0.98, coverage **1.0**.
- The verifier fix pass changed only comments in `brand.js` and `brands.js`, plus this spec. All
  31 models are identical to the pre-fix models: the sha1 of each `model` object matches, per
  `tmp/hash/brand-models.before.txt` and `tmp/hash/brand-models.final.txt`. Four of the five
  verifier findings were about the spec's guidance or the extractor comments. The fifth, the 10
  `empty-src` tile logos, is a real image loss that no in-contract extractor can fix (§5.3).
- Model checks: 143 products in total, which matches an independent count of JSON-LD `Product`
  nodes in `audit/rendered`. The grid states are 14 empty and 16 loading, which also matches the
  raw HTML. No HTML entity survives outside `_jsonld`. All 30 banners have a title, a description
  and a desktop image. The `empty-src` tile set equals the set of tiles with a real `srcset` in
  `audit/raw/brands.html` (10/10).
- **What the coverage score can and cannot show.** Coverage treats each page as a set of unique
  words. The JSON-LD product descriptions (636–1026 chars each) count as model text. So any visible
  word that also appears in a product description counts as present, whether or not its own field is
  filled. **A small field whose words all appear in product descriptions could be dropped without
  lowering coverage.** Coverage is therefore not a field-level fidelity proof on brand pages. The
  line-level check below is.
- Word-coverage controls. Each is a copy of the current extractor under `tmp/`, run with
  `--extractor`. Every copy was regenerated from the current extractor in this pass and re-run.
  Each diffs from the extractor by one line, except `control-brand-noempty-noproducts.js`, which
  applies two of those deletions together:
  - `tmp/control-brand.js` (no `emptyState`): 14/30 below, **exactly the 14 empty-state pages**, at
    0.61–0.70. The 16 loading pages stay at 1.0. **The removal is partly masked.** On 10 of the 14
    pages, one or two of the empty-state words ("no", "results", "all") still count as present
    because product descriptions contain them. Only doja, grav, breath-free and bubbys report the
    full 11-word set.
  - `tmp/control-brand-noempty-noproducts.js` (no `emptyState` and no `products`): 14/30 below, at
    0.50–0.55. Each page is missing 13–14 empty-state words. This isolates the masking above: it
    comes from the product descriptions.
  - `tmp/control-brand-noproducts.js` (no `products`, a negative control): 30/30 stay at 1.0. This
    shows the descriptions supply no visible word that the other fields lack. It does **not** show
    that they cannot hide a missing field (see the first control).
  - `tmp/control-brand-desc.js` (no `banner.description`): **30/30 below**, at 0.4286–0.8667.
  - `tmp/verify-brand-nofilters.js` (no `filters`): 30/30 below, at 0.7857–0.9667.
    `tmp/verify-brand-nobreadcrumb.js` (no `breadcrumb`): 30/30 below, at 0.8571–0.9667.
  - `tmp/control-brands.js` (no `brands[]`): `/brands` falls to **0.1795**, with 32 brand-name words missing.
  - `tmp/control-brands-loadmore.js` (no `loadMore`): `/brands` falls to **0.9744** (`load` missing).
  - Blind spot: `tmp/control-brands-nameonly.js` blanks only `brands[].name`, and coverage stays at
    1.0, because each logo `alt` ("KANHA brand logo") repeats the words. The line-level check below
    closes this blind spot.
- **Line-level fidelity check** (`node tmp/verify-brand-lines.mjs`). This check cannot be masked
  by product descriptions. Every non-empty line of the rendered `<main>` text must **equal** one
  whole string value of the model. The match ignores case and collapses whitespace, because the
  source CSS changes case. It skips the `products` subtree, `_` keys, URL keys, and keys that come
  from attributes or structure (`slug`, `path`, `alt`, `ariaLabel`, `sortAriaLabel`, `placeholder`,
  `kind`, `type`, `gridState`, `missing`). Result: 31 pages, 267 lines, **0 uncovered**. Positive
  controls blank one field in memory (`DROP=<field>`), and every one fires:

  | `DROP=` | uncovered lines | pages |
  |---|---|---|
  | `emptyState` | 28 | exactly the 14 empty-state pages |
  | `bannerDescription` | 30 | 30 |
  | `filters` | 60 | 30 |
  | `breadcrumb` | 65 | 31 |
  | `tileNames` (`brands[].name` only) | 24 | 1 (`/brands`) |
  | `loadMore` | 1 | 1 |
  | `searchSubmit` | 1 | 1 |
  | `h1Only` | 1 | 1 (`/brands`. On brand pages the h1 text is also in `name`, `banner.title` and the breadcrumb) |

  The first version of this check matched the `/brands` "SEARCH" line against
  `search.input.type` ("search") and "Brands" against `kind` ("brands"), so `searchSubmit` did not
  fire. Excluding `kind` and `type` fixed that. The table shows the corrected run.
- Brand completeness (§5.2). `tmp/verify-brand-completeness.mjs`: 144 product models carry a
  `brand.href`. 143 are in their brand's ItemList. 1 is not (the breathe-free 1G single), and the
  same URL is also found through `/collection/preroll`. `tmp/verify-brand-variant-union.mjs`: after the variant join,
  30/30 brands match the product models exactly. Out of contract, `tmp/verify-brand-siblings.mjs`
  checks the 30 brand pages' raw RSC payloads: they name exactly 1 `/product/` URL that is not in
  their ItemList (the same one). The same regex finds all 143 listed URLs, which serves as that
  probe's positive control.
- `/brands` logo diagnostics (§5.3): `tmp/verify-brands-logomap.mjs` parses 21 map keys and 20
  distinct files. The 10 `empty-src` tiles have a Prismic URL in the raw `<img>` (10/10) and none
  in the rendered `<img>` (0/10).
- A defect found outside coverage: `IMG()` in `_common.js` turns `<img src="">` into
  `"https://www.sunnydayzcannabis.com/"`, because `unwrapNext('')` resolves against ORIGIN. Both
  extractors guard against this locally, and the 10 `empty-src` logos would otherwise have
  shipped the site root as their image URL. `_common.js` itself is unchanged, so **other
  extractors that call `IMG()` on an empty-src image carry this bug**.
