# Model spec: `strain`

Extractor: `src/extract/strain.js`. Harness: `node tools/extract-model.mjs --type strain`.
Output: `content/model/<slug>.json`, one record per URL. The slug comes from `tools/slug.mjs`: an upper-case letter becomes `~` + its lower-case form, so `/strain/Cbd` is saved as `strain-~cbd.json` and `/strain/cbd` as `strain-cbd.json`. Since 2026-09-23T06:11Z each of the 9 URLs has its own render and its own model. The server HTML in `audit/raw/` is still collided; read §6 before using it.

## 1. Pages

`/strain/S%20I` is a soft 404. It is typed `notfound` and is not covered here.

| URL | Model file | h1 in capture | Breadcrumb leaf | Grid state in capture | `products` (JSON-LD ItemList) | Banner image (desktop / mobile) |
|---|---|---|---|---|---|---|
| `/strain/cbd` | `strain-cbd.json` | Explore Our CBD Products: / Premium Quality for Your Well-being | CBD Rich | `loading` | 1 | CategoriesBanner-37 / -36 |
| `/strain/indica` | `strain-indica.json` | Cannabis Indica Products: / Relaxation and Well-being Guaranteed | Indica | `loading` | 20 | CategoriesBanner-33 / -32 |
| `/strain/hybrid` | `strain-hybrid.json` | Discover Our Hybrid Cannabis Products: / The Best Fusion of Effects and Flavors | Hybrid | `empty` | 20 | CategoriesBanner-29 / -28 |
| `/strain/sativa` | `strain-sativa.json` | Discover Our Selection / of High Quality Cannabis Sativa Products | Sativa | `empty` | 20 | CategoriesBanner-35 / -34 (site default) |
| `/strain/si` | `strain-si.json` | S/I (+ description "Shop our selection of strains") | S I | `loading` | 1 | CategoriesBanner-35 / -34 (site default) |
| `/strain/Cbd` | `strain-~cbd.json` | CBD (+ description "Shop our selection of strains") | CBD | `empty` | 1 (same list as `/strain/cbd`) | CategoriesBanner-35 / -34 (site default) |
| `/strain/Indica` | `strain-~indica.json` | INDICA (+ same description) | INDICA | `empty` | 20 (same list as twin) | CategoriesBanner-35 / -34 |
| `/strain/Hybrid` | `strain-~hybrid.json` | HYBRID (+ same description) | HYBRID | `loading` | 20 (same list as twin) | CategoriesBanner-35 / -34 |
| `/strain/Sativa` | `strain-~sativa.json` | SATIVA (+ same description) | SATIVA | `empty` | 20 (same list as twin) | CategoriesBanner-35 / -34 |

"/" in the h1 column marks a `<br>` line break. Source: `content/model/strain-*.json` from the final run of §8. The 4 capitalised URLs and their lowercase twins were rendered 2026-09-23T06:11:56Z–06:12:10Z; `/strain/si` is the earlier 04:36Z render. **The grid state is a timing artefact, not a page property.** `loading` means the capture caught the 24 skeleton cards; `empty` means the search API had already failed (§4). The same URL has shown both states in different captures.

## 2. Record envelope

The harness writes this, not the extractor:

```json
{ "url": "https://www.sunnydayzcannabis.com/strain/hybrid", "slug": "strain-hybrid", "type": "strain",
  "title": "Discover Our Hybrid Cannabis Products: The Best Fusion of Effects and Flavors",
  "seoTitle": "<same as title>", "model": { ... } }
```

`title` is the rendered `<title>`. On the lowercase pages the server already sends this SEO title. Their meta description has the same text, and their canonical points to themselves. The capitalised twins send `<title>`/meta description `CBD`, `HYBRID`, `INDICA` or `SATIVA`, with canonical pointing to the **lowercase** URL. Evidence: headless Chrome with script execution disabled, 2026-09-23T05:19:56Z (see §5). Do **not** read the lowercase pages' title or meta from `audit/content-inventory.json` or `audit/raw/`: those rows hold the capitalised twin's server HTML (§6).

## 3. `model` shape

Every key is always present, down to each `grid.cards[]` entry (its `buttons` key included, see that row). "nullable" means the value can be `null`. Two values have more than one shape: `grid.pagination` (placeholder object vs loaded-pager object, see that row), and any image object produced by `_common.js` `IMG()` (`banner.image.*`, `grid.cards[].image`). `IMG()` returns `{src:"", alt, placeholder:true}` when the source only has the lazy-load SVG. It never does that for the Prismic banners in the capture.

| Field | Type | Example (real page) | Notes |
|---|---|---|---|
| `urlPath` | string | `"/strain/hybrid"` | Decoded pathname of `ctx.url`, case preserved. Keys starting with `url` are not scored for coverage. |
| `urlKey` | string | `"hybrid"`, `"si"`, `"Cbd"` | Path segment after `/strain/`, case preserved. |
| `urlCaseVariant` | boolean | `false`; `true` for `/strain/Cbd` | `true` when the path has upper-case letters. The build 301s these to `urlLowercasePath`. |
| `urlLowercasePath` | string | `"/strain/cbd"` | Redirect target for case variants. Equals `urlPath` otherwise. |
| `h1` | string | `"Discover Our Hybrid Cannabis Products: The Best Fusion of Effects and Flavors"` | Whole h1, with the `<br>` flattened to a space. Use it for `<title>` and SEO. |
| `breadcrumb` | `{label: string, href: string\|null}[]` | `[{"label":"Home","href":"/"},{"label":"Menu","href":"/shop"},{"label":"Hybrid","href":null}]` | Always 3 items. The last one is the current page (`href: null`). The leaf label is **not** always the h1: `CBD Rich` on cbd, `S I` on si. |
| `banner` | object, nullable | | `null` only if the page has no banner section (never observed). |
| `banner.lines` | string[] | `["Discover Our Hybrid Cannabis Products:","The Best Fusion of Effects and Flavors"]`; si: `["S/I"]` | The h1 split at `<br>`. Render one line per entry. |
| `banner.description` | string, nullable | si and the 4 capitalised twins: `"Shop our selection of strains"`; `null` on cbd, indica, hybrid and sativa | Paragraph under the h1. |
| `banner.image.desktop` / `.mobile` | `{src, alt}`, nullable | `{"src":"https://images.prismic.io/sunny-dayz/Z5vMq5bqstJ9-D0W_CategoriesBanner-29.png?auto=format%2Ccompress&fit=max&w=3840","alt":"Banner"}` | Largest srcset candidate from Prismic. `alt` is always the literal `"Banner"` on the source. The desktop and mobile files differ. |
| `seoBlocks` | RICH block[] | `[]` on all 9 pages | Any `<main>` copy outside the banner, breadcrumb and collection. None in the capture. Kept so a future CMS paragraph is not lost. Block shape as in `_common.js` `RICH()`. |
| `toolbar` | object, nullable | | Treez collection toolbar. |
| `toolbar.filterLabel` | string, nullable | `"FILTER"` | Label of the button that opens the filter drawer. |
| `toolbar.activeFilters` | string[] | `[]` | Chips in the filter slider. Empty in every capture. |
| `toolbar.sortLabel` | string, nullable | `"Sort By"` | Placeholder label of the sort select. |
| `toolbar.sortAriaLabel` | string, nullable | `"Sort by"` | Accessible name of the sort trigger. |
| `toolbar.sortOptions` | string[] | `[]` | The listbox options are not in the DOM until the select opens, so this is always empty in the capture. The template must supply its own sort options, or omit sort. |
| `grid` | object | | What the rendered grid showed at capture time (see §4). |
| `grid.state` | `"loaded"\|"empty"\|"loading"\|"none"` | cbd: `"loading"`; hybrid: `"empty"` (in this capture; see §1) | `loaded` = real cards; `empty` = "No search results found" block; `loading` = skeleton cards. |
| `grid.placeholderCount` | number | `24` (loading), `0` (empty) | Number of skeleton cards. |
| `grid.emptyState` | `{title, message}`, nullable | `{"title":"No search results found","message":"No results match the filter criteria. Remove a filter or clear all filters to search again"}` | Present only when `state == "empty"`. |
| `grid.cards` | CARD[] | `[]` on all 9 pages | `_common.js` `CARD()` shape (`url,name,brand,price,weight,strain,strainKey,thc,tac,cbd,badges,image,stockPhoto`) plus `buttons: string[]`. `buttons` is **always present**: `["Add To Cart"]`, or `[]` when the card has no button with text. Icon-only buttons have empty text and are dropped: the real cards have an empty icon button plus "Add To Cart", which gives `["Add To Cart"]`. Before the 2026-09-23 fix the key was left out on a card with no button text, so `card.buttons.length` threw. `image` can be `{src:"",alt,placeholder:true}`: join the image from `products[].image` or the product page model by `url`. |
| `grid.pagination` | object, nullable | loading: `{"placeholder":true,"pageSlots":5}`; empty: `null` | For a loaded grid: `{items:[{label,href,current}], text}`. Untested, because no capture has a loaded grid. |
| `products` | object[] | see below | **The authoritative product list.** It comes from the page's own JSON-LD ItemList, in list order. In the **rendered** `<main>` (what the extractor reads), the ItemList is present on all 9 current renders, and on the 8 scratch re-renders of §6. Where it sits in the **server** HTML varies (see note below the table). |
| `products[].position` | number | `1` | |
| `products[].url` | string | `"/product/betty-s-eddies-betty-s-eddies-tropical-smoothie-chews-1-6-50-mg-10-pack-edible-50-milligrams"` | Site-relative. Taken from `offers.url`. |
| `products[].name` | string | `"Betty's Eddies \| Tropical Smoothie \| Chews \| 1:6"` | HTML entities decoded. The source JSON-LD literally holds `&apos;` (149 times in the ItemLists of the 5 distinct lowercase/si renders: indica 43, hybrid 60, sativa 44, si 2, cbd 0; re-counted on the current renders). |
| `products[].brand` | string, nullable | `"BETTY'S EDDIES"` | Upper case as on the site. Entities decoded. |
| `products[].description` | string, nullable | `"Betty's Eddies Tropical Smoothie Chews deliver a d…"` (full text in the file) | Long SEO description, 91–154 words (median 126) across the 62 distinct captured items (re-checked on the 9 current models). Not shown on the source grid. It is scored for coverage and contains visible-page words, so it can hide a lost page string (§8). |
| `products[].price` | string, nullable | `"$20"` | `"$" + offers.price`. |
| `products[].priceValue` | number, nullable | `20` | |
| `products[].priceCurrency` | string, nullable | `"USD"` | |
| `products[].availability` | string, nullable | `"InStock"` | All 62 captured items are `InStock`. |
| `products[].image` | `{src, alt}`, nullable | `{"src":"https://d1hhy58mqsa6c3.cloudfront.net/e4106378-…/6f6512fe-…","alt":"<name>"}` | The CloudFront URL has no file extension. `alt` is the product name, not an alt attribute from the source (same convention as `ITEMLIST()`). |
| `productCount` | number | `20`, `1` | `products.length`. This is **not** the total inventory: the ItemList is the first page only, and the skeleton shows 5 page slots. |
| `_ui.filterDrawerId` | string, nullable | `"filters-treez-drawer"` | `aria-controls` of the FILTER button. `_` keys are DOM tokens, not text, and are not scored. |
| `_ui.emptyStateIcon` | string, nullable | `"search"` (empty state), else `null` | Icon-font token of the empty-state icon. |
| `_jsonld.breadcrumbList` | object, nullable | raw schema.org BreadcrumbList | Raw, for re-emission. Its leaf `name` matches `breadcrumb[2].label`. Entities are **not** decoded here. |
| `_jsonld.itemList` | object, nullable | raw schema.org ItemList | Raw, for re-emission. Entities are **not** decoded. Decode before re-emitting, or re-serialise from `products`. |

**Where the ItemList sits in the server HTML.** This only matters to a build that parses server HTML instead of the model. The raw files on disk are the capitalised twins' server HTML plus si (§6). The placement is not uniform:

| Raw file (server HTML of) | `<main>` offsets | `"@type":"ItemList"` offset | Placement |
|---|---|---|---|
| `audit/raw/strain-cbd.html` (`/strain/Cbd`) | 23094–49247 | 29326 | **Inline inside `<main>`**, directly after a `<!--$-->` Suspense marker |
| `audit/raw/strain-hybrid.html` (`/strain/Hybrid`) | 23103–45656 | 459120 | Streamed chunk `<div hidden id="S:0">` after `</main>`, moved into `<main>` at hydration |
| `audit/raw/strain-indica.html` (`/strain/Indica`) | 23103–45656 | 466195 | same as hybrid (`S:0` at 466106) |
| `audit/raw/strain-sativa.html` (`/strain/Sativa`) | 23103–45656 | 474696 | same as hybrid (`S:0` at 474607) |
| `audit/raw/strain-si.html` (`/strain/si`) | 23094–45638 | 234569 | same as hybrid (`S:0` at 234480) |

The two 1-item lists (Cbd, si) differ, so item count does not predict placement. The lowercase pages' server HTML is not on disk (§6), so their placement is **unverified**. A server-HTML parser must look for the ItemList both inside `<main>` and in `div[hidden][id^="S:"]`.

## 4. Grid states: what the template should render

- The product search API (`search-kyrok9udlk.gapcommerceapi.com/product/search`) returned **HTTP 403 to headless Chrome**. An unblocked render of `/strain/indica` at 2026-09-23T05:02Z got 14 × 403 and 0 cards. So the captured grid is either still loading (skeletons, at the audit's 1.8 s settle) or has given up (empty state). The page declares 20 in-stock products in the same document, so **`grid.state == "empty"` does not mean the strain has no products.** Evidence: at 1.8 s all 9 pages showed 24 skeletons; after at most 12 s all 9 showed the empty state (scratch re-render, 2026-09-23T04:59–05:00Z).
- Whether a real, non-headless browser receives products is **unverified**.
- Recommended template logic: render `products[]` as the grid, since they are the page's own server-rendered data. Keep `grid.emptyState` strings for the case `products.length == 0`. Render the toolbar from `toolbar.*`. Ignore `grid.placeholderCount`, which only tells you the source shows 24 cards per page.
- `grid.cards` is filled only when a capture has a loaded grid. The code path was tested by placing 3 real home-page product cards inside a strain page's collection container. It produced `state:"loaded"` with correct name, brand, price, weight, strain, THC/TAC and badges. Re-test on 2026-09-23 with `node tmp/strain-scratch.mjs inject src/extract/strain.js`, on the on-disk captures of `/strain/si` (loading) and `/strain/indica` (empty) as they were before the §6 re-render: 3 home cards, the 3rd with its buttons removed. All 3 cards have the same 14 keys, and the button values are `["Add To Cart"]`, `["Add To Cart"]` and `[]`. Positive control: the same test on the pre-fix extractor shows the 3rd card with no `buttons` key. The real loaded-grid markup of the Treez collection has never been captured.

## 5. Case-variant pairs: content on the capitalised page that its lowercase twin lacks

Source: scratch re-render of all 8 URLs, 2026-09-23T04:59:37Z–05:00:38Z. Method: `render-compare.mjs` (same blocklist, 1.8 s settle) plus a wait for the grid to settle. Words use the harness tokenizer on `<main>` innerText. **Re-confirmed 2026-09-23 from the on-disk renders**, which are now distinct per URL (§6), with `node tmp/strain-pairs.cjs`. Once the empty-state words are set aside (the two captures of a pair can be in different grid states), the words found only on the capitalised page are exactly the ones in the column below, and each pair's ItemList product URLs are equal.

| Pair | Words on capitalised page only | Unique strings on the capitalised page | Other differences |
|---|---|---|---|
| `/strain/Cbd` → `/strain/cbd` | `shop`, `selection`, `of`, `strains` | banner description **"Shop our selection of strains"** | h1 `CBD` (single line); breadcrumb leaf `CBD` (twin: `CBD Rich`); `<title>` `CBD`; banner = site default CategoriesBanner-35 / -34 (twin: -37 / -36) |
| `/strain/Hybrid` → `/strain/hybrid` | `shop`, `selection`, `strains` | **"Shop our selection of strains"** | h1 `HYBRID`; breadcrumb leaf `HYBRID` (twin: `Hybrid`); `<title>` `HYBRID`; banner default -35 / -34 (twin: -29 / -28) |
| `/strain/Indica` → `/strain/indica` | `shop`, `our`, `selection`, `of`, `strains` | **"Shop our selection of strains"** | h1 `INDICA`; breadcrumb leaf `INDICA` (twin: `Indica`); `<title>` `INDICA`; banner default -35 / -34 (twin: -33 / -32) |
| `/strain/Sativa` → `/strain/sativa` | `shop`, `strains` | **"Shop our selection of strains"** | h1 `SATIVA`; breadcrumb leaf `SATIVA` (twin: `Sativa`); `<title>` `SATIVA`; banner identical (both default -35 / -34) |

The rest of each pair is identical: toolbar (`FILTER`, `Sort By`), grid behaviour, and the JSON-LD ItemList (same product URLs in the same order; compared as full arrays on the on-disk renders and on the §6 scratch re-renders).

The server-rendered `<head>` differs too. Source: headless Chrome with JS disabled, all 8 URLs; confirmed against `audit/raw/strain-{cbd,hybrid,indica,sativa}.html`, which match the capitalised column.

| Pair | Capitalised: `<title>` / meta description / canonical | Lowercase: `<title>` = meta description / canonical |
|---|---|---|
| cbd | `CBD` / `CBD` / `https://www.sunnydayzcannabis.com/strain/cbd` | `Explore Our CBD Products: Premium Quality for Your Well-being` / self |
| hybrid | `HYBRID` / `HYBRID` / `…/strain/hybrid` | `Discover Our Hybrid Cannabis Products: The Best Fusion of Effects and Flavors` / self |
| indica | `INDICA` / `INDICA` / `…/strain/indica` | `Cannabis Indica Products: Relaxation and Well-being Guaranteed` / self |
| sativa | `SATIVA` / `SATIVA` / `…/strain/sativa` | `Discover Our Selection of High Quality Cannabis Sativa Products` / self |

**Merge guidance for the build:** the source already declares each capitalised twin canonical to its lowercase page, which fits the planned 301. The only visible content unique to a capitalised twin is the generic description "Shop our selection of strains". `/strain/si` carries the same string, so it is site-wide boilerplate, not strain-specific copy. Merging it into the lowercase page is optional. The upper-case h1, breadcrumb label and `<title>`/meta (`CBD` …) are the same word as on the lowercase page, differing only in case, and add no content.

## 6. Case-variant collision on NTFS: renders and models fixed, raw server HTML still collided

**History.** The first slug scheme kept case (`strain-Cbd` vs `strain-cbd`), and the Windows filesystem is case-insensitive, so each case pair shared one file. `audit/rendered/strain-{Cbd,…}.json` held the lowercase render, and the capitalised renders were lost. `content/model/` held 5 strain files for 9 URLs, and the files for cbd, indica and sativa carried the capitalised URL (`rec.url`, `urlPath`, `urlCaseVariant: true`) on lowercase content. The 4 capitalised URLs were scored at 1.0 against their twin's render, which was not a measurement of their own page.

**Fixed 2026-09-23 in `tools/`, by a change made outside the strain group.** `tools/slug.mjs` `urlSlug()` (06:11:02Z), used by `extract-model.mjs` and `render-compare.mjs`, turns each upper-case letter into `~` + its lower-case form. The 8 case-pair URLs (and `/strain/S%20I`) were re-rendered 06:11:56Z–06:12:10Z. Verified after the final run of §8:

- `audit/rendered/strain-~{cbd,hybrid,indica,sativa}.json` hold `/strain/{Cbd,Hybrid,Indica,Sativa}` (title `CBD`…, h1 `CBD`…). `strain-{cbd,…}.json` hold the lowercase URLs. On NTFS the lowercase files may still be listed as `strain-Cbd.json` etc. (name case of the first creation), but their `url` field is the lowercase URL.
- `content/model/` holds 9 strain files, one per URL, each labelled with its own URL (`rec.url` = `model.urlPath`; `urlCaseVariant` is `true` exactly on the 4 `~` files) and extracted from its own render (values in §1).
- The harness scores each URL against its own render. `urlPath`/`urlCaseVariant` can now be trusted.
- Leftover: `audit/rendered/strain-S-I.json` is the legacy-named copy of `/strain/S%20I` (the harness now reads `strain-~s-~i.json`). It is a `notfound` page, not part of this type.

**Still collided (not fixed by the `tools/` change; read with care):**

- `audit/raw/strain-{cbd,hybrid,indica,sativa}.html` (unchanged since 04:23Z) hold the **capitalised** twin's server HTML (`<title>CBD</title>`, h1 `CBD`, description "Shop our selection of strains"). The lowercase pages' server HTML, which carries the SEO title and h1, is **not on disk**.
- `audit/content-inventory.json` rows are read from those raw files. The lowercase URLs' rows still say title `CBD`, h1 `CBD` (checked 2026-09-23 after the fix), i.e. they describe the capitalised twin. The same applies to `staticChars`/`staticUniqueWords` in `render-verification.json` (`/strain/cbd` and `/strain/Cbd` both 1381). The *rendered* fields there are per-URL.
- `audit/render-residual.json` (04:36Z, not regenerated) still has identical rows for each pair.

**Build rule:** publish each lowercase model at its `urlPath`. Emit a 301 from each capitalised path (`urlCaseVariant: true`) to its `urlLowercasePath`, as the source's own canonical does (§5). The capitalised models are kept for their content record: the one unique string is the site-wide "Shop our selection of strains" (§5).

**The extractor could not have worked around the collision, and needed no change.** Its input holds no URL identity. On the renders, the JSON-LD BreadcrumbList leaf's `item` has no `@id`/URL (it is only `{"name":"CBD Rich"}` etc.; the other two items carry `"@id":"/"` and `"/shop"`), the ItemList has no `url`, and no `/strain/<key>` path appears in `mainHtml`. `urlPath`/`urlCaseVariant` reflect `ctx.url` only. Before the `tools/` fix landed, the extractor was checked on the real capitalised pages with a scratch re-render: all 8 case-pair URLs, 06:00:18Z–06:00:43Z, into `tmp/strain-rerender/`. The run used `node tmp/strain-scratch.mjs render …`: same blocklist, 1.8 s settle and capture fields as `render-compare.mjs`, and its own case-safe names (`/strain/Cbd` saved as `strain-_cbd.json`). The captures were scored with `node tmp/strain-scratch.mjs score`, which copies the harness's `words()`, `flatText()` and template evaluation. Parity check: this scorer reproduced the harness's 1.0 and its `noemptystate` control results (0.60 / 0.7037, same missing words) on the then-current on-disk renders. Results: `/strain/{Cbd,Indica,Hybrid,Sativa}` all 1.0 (11 words each), h1 = leaf = the upper-case word, description "Shop our selection of strains", banner -35 / -34, and product lists exactly equal to the twin's. The lowercase twins were also 1.0 (cbd 16, indica 13, hybrid 17, sativa 14 words). The harness models written after the `tools/` fix carry the same values (§1).

## 7. Edge cases

- **si**: h1 `S/I` and breadcrumb leaf `S I` contain only 1-letter words, which the coverage tokenizer ignores. Coverage of those two strings is therefore not measured on si. They are extracted all the same: `h1`, `banner.lines`, `breadcrumb[2].label`. `audit/raw/strain-si.html` declares canonical `https://www.sunnydayzcannabis.com/strain/s/i` (sic), while the soft-404 sibling is `/strain/S%20I`. Do not copy that canonical.
- **cbd and si have a 1-item ItemList.** A single-product grid must lay out correctly.
- **Missing images:** `banner.image.*` are always present on these pages. `products[].image` is always present in the capture (62/62). `grid.cards[].image` may be `{placeholder:true}`; join by `url`.
- **Empty arrays are normal:** `seoBlocks`, `toolbar.activeFilters`, `toolbar.sortOptions` and `grid.cards` are `[]` on every captured page.
- **Nulls:** `banner.description` (the 4 lowercase cbd/indica/hybrid/sativa pages; set on si and the 4 capitalised twins), `grid.emptyState` (loading pages), `grid.pagination` (empty pages), `_ui.emptyStateIcon` (loading pages).
- **Entities:** only `products[].name`, `.brand` and `.description` are decoded. `_jsonld` is raw.

## 8. Verification (2026-09-23)

- **Final run** (06:29:55Z, after all control runs, so `content/model-report.strain.json` is the real report): `node tools/extract-model.mjs --type strain` → `{"strain":{"pages":9,"errors":0,"below":0,"minCoverage":1}}`. All 9 pages are at 1.0, each scored against its own render (§6).
- **`grid.cards[].buttons` fix.** Before the harness change of §6, the fixed extractor left all 6 `content/model/strain-*.json` files then on disk (5 strain models + the `notfound` `strain-S-I.json`) byte-identical to the pre-fix snapshot. No capture has a loaded grid (`grid.cards` is `[]` everywhere), so the change cannot show in current output. It is proven by the injection test in §4.

**The product descriptions DO mask missing page text; treat a 1.0 on its own as an upper bound.** An earlier version of this section said "the product descriptions do not mask missing page text". That was wrong: the `products`-emptied control only showed that products are not *needed* for coverage, not that they cannot *mask* a loss. `products[].description` (and `name`/`brand`) is scored. It is JSON-LD text that is not visible on the grid, 91–154 words per item, and it contains many visible-page words. On `/strain/indica` it contains `home` (#15 "relaxing at home or on the go"), `indica` (#1 "1:1 THC:CBN indica tincture", 11 items), `by` (#3 "complemented by earthy", 5 items), `cannabis`, `relaxation`, `and` and `well` (`node tmp/strain-maskwords.cjs`). Visible text also masks visible text: on empty-state pages, `filter` comes from the empty-state message, and on the capitalised twins the h1 word equals the breadcrumb leaf.

Controls are generated from the current `strain.js` by `node tmp/make-strain-controls.mjs` into `tmp/control-strain-<name>.js`, and run with `node tools/extract-model.mjs --type strain --extractor tmp/control-strain-<name>.js`. Each removes one field group, once with `products[]` kept and once with it emptied (`-noproducts`). Run on the current captures (§1 grid states), 2026-09-23, reports generated 06:18:31Z–06:28:53Z. Per-page unique words: cbd 16, indica 13, hybrid 30, sativa 28, si 10, Cbd 25, Indica 25, Hybrid 11, Sativa 25.

| Control (field removed) | With `products[]` | `products[]` emptied |
|---|---|---|
| none (`noproducts` only) | 1.0 on all 9 | **1.0 on all 9. This is the regression gate** |
| `breadcrumb` | 9/9 below, min 0.80 (si). indica 0.9231 and Indica 0.96 miss **only `menu`** (`home` masked by product #15) | 9/9 below, min 0.80. indica 0.8462 and Indica 0.92 miss `home menu` |
| `toolbar` | 9/9 below, min 0.70 (si). Indica, Sativa, sativa and hybrid miss **only `sort`** (0.96–0.9667) | 9/9 below, min 0.70. Those four miss `sort by`. None of them misses `filter`: all four are empty-state pages, and the empty-state message contains `filter` |
| `grid.emptyState` (5 empty-state pages) | 5/5 below, min 0.52 (Cbd, 12 of 25 words). hybrid 0.7333, 8 of 30 | 5/5 below, min 0.44 (Cbd, Indica, Sativa: 14 words). hybrid 0.5667, 13 |
| `banner.description` (si + 4 capitalised twins) | 5/5 below, min 0.60 (si). Hybrid 0.7273, Cbd/Indica 0.84, Sativa 0.88 | 5/5 below, min 0.50 (si). Each misses all of `shop our selection of strains` |
| `h1` + `banner.lines` | **4/9 below only** (cbd, indica, hybrid, sativa), min 0.6875 (cbd). hybrid 0.9333, only `our fusion` | **Still 4/9**, min 0.4375 (cbd). **si and all 4 capitalised twins stay at 1.0** |

With products kept, every control that removed text fell below 0.98 on the affected page, **except the h1 removal on 5 of 9 pages**. The missing-word lists are shorter than the real loss, so a smaller loss can pass unseen. For example, with products kept, removing only the `Home` crumb on indica would miss no word: that follows from the `breadcrumb` row, where `home` is the crumb's only word and product #15 supplies it.

**Regression gate for this type.** Run `node tools/extract-model.mjs --type strain` and the `noproducts` control (`node tmp/make-strain-controls.mjs`, then `--extractor tmp/control-strain-noproducts.js`). Both must stay ≥ 0.98 on every page. Then run the plain command again **last**, because an `--extractor` run overwrites `content/model-report.strain.json`. Current `noproducts` result: 1.0 on all 9 pages (report 06:18:31Z), and 1.0 on the 8 scratch re-renders of §6.

**Losses coverage cannot see even with `products[]` emptied** (it is a unique-word measure). Check these structurally, e.g. assert `h1 !== ""` and `banner.lines.length > 0` on every strain model:

- **si:** the h1 `S/I` and leaf `S I` consist of 1-letter words (§7).
- **The 4 capitalised twins:** the h1 word (`INDICA`) is also the breadcrumb leaf (`INDICA`), so removing `h1` + `banner.lines` scores 1.0 with and without products (harness control above, and the §6 scratch re-renders).

`tmp/control-strain.js` is an older hand copy of `strain.js` (the `grid.emptyState` control), superseded by the generated `control-strain-noemptystate.js`. It still has the pre-fix `buttons` line, so do not use it.
