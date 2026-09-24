# Model spec: `product`

Extractor: `src/extract/product.js`. Harness: `node tools/extract-model.mjs --type product`.
Output: `content/model/product-<slug>.json`, one record per URL. **Read §6 first:** the Product JSON-LD is not in the model. The extractor only receives `<main>`, and the JSON-LD sits outside it.

## 1. Pages

146 URLs under `/product/`. There are no soft 404s, no case-variant twins and no query-string variants among them. Every page uses one Treez PDP template (`main.main__details`). Pages differ only in which optional sections are present.

| Category (`category.label`) | Pages | Subcategories seen (`subcategories[0].label`) |
|---|---|---|
| Edible | 39 | CHOCOLATE 9, CHEW 7, GUMMY 14, BAKED GOOD 2, OIL 2, OTHER 5 (the "hash caps" capsules are filed here; there is no "pill" category) |
| Preroll | 25 | FLOWER 25 |
| Flower | 24 | PRE-PACK 24 |
| Merch | 22 | ROLLING PAPERS 11, PIPE 5, LIGHTER 2, GRINDER 1, BATTERY 1, HAT 1, T SHIRT 1 |
| Cartridge | 12 | 510 THREAD 9, ALL-IN-ONE 3 |
| Extract | 9 | LIVE ROSIN 6, BADDER 2, KIEF 1 |
| Tincture | 7 | OTHER 7 |
| Topical | 4 | OIL, OTHER, LUBRICANT, CREAM (1 each) |
| Beverage | 3 | OTHER 3 |
| Cbd | 1 | TOPICAL 1 |

The purchase area has two capture states: `purchaseState` is `"hidden"` on 69 pages and `"placeholder"` on 77 (see §4.3).

## 2. Record envelope

The harness writes this, not the extractor:

```json
{ "url": "https://www.sunnydayzcannabis.com/product/omg-omg-mac-1-3-5g-flower-3-5-g-flower-3-5-grams",
  "slug": "product-omg-omg-mac-1-3-5g-flower-3-5-g-flower-3-5-grams", "type": "product",
  "title": "<rendered document title>", "seoTitle": "<same as title>", "model": { ... } }
```

## 3. `model` shape

Every key is always present. "nullable" means the value can be `null`. "array" fields are `[]` when the section is absent, never `null`. Counts are out of 146 pages.

### 3.1 Header

| Field | Type | Present on | Example (real page) | Notes |
|---|---|---|---|---|
| `breadcrumb` | `{label: string, href: string\|null}[]` | 146 (always 4 items) | `[{"label":"Home","href":"/"},{"label":"Menu","href":"/shop"},{"label":"Flower","href":"/collection/flower"},{"label":"OMG - Mac 1 - 3.5G Flower","href":null}]` | The leaf is the current page (`href: null`). Its label always equals `h1`. |
| `h1` | string | 146 | `"OMG - Mac 1 - 3.5G Flower"` | Case as in the DOM. Separators vary by brand: `"Ahh Moments \| Atlantic Bliss RSO \| Chocolate"`. |
| `name` | string | 146 | same as `h1` | Alias kept for card/ItemList joins. |
| `brand` | `{label: string, href: string\|null}`, nullable | 146 (never null in capture) | `{"label":"OMG","href":"/brand/omg"}` | The eyebrow link above the h1. On 2 merch pages it is plain text with no link: `{"label":"not specified","href":null}` (HG grinder, E-Z Wider cones). The site shows it upper-cased through CSS (`NOT SPECIFIED`). Render with `text-transform: uppercase` and keep the stored value. |
| `badges` | `{label: string, title: string\|null, tone: string\|null}[]` | 1 | `[{"label":"Low Stock","title":"Low Stock","tone":"warning"}]` (Doja Confetti) | Sits above the brand eyebrow. `tone` comes from the `ProductBadge_product_badge__<tone>` class. |
| `strainType` | `{label: string, key: string\|null, ariaLabel: string\|null}`, nullable | 119 | `{"label":"Hybrid","key":"hybrid","ariaLabel":"Flower type: Hybrid"}` | `key` ∈ `hybrid` 51, `indica` 39, `sativa` 27, `si` 1 (label `"S/I"`), `cbd` 1 (label `"Cbd"`). The site displays it upper-cased (`HYBRID`) through CSS. `null` on the 22 merch pages and on 5 others: Guava Biscotti flower, Nature's Heritage 2pk pre-roll, Cherry Whip dry sift, and Treeworks Chill and Party gummies. Use `key` for the colour class. |
| `category` | `{label: string, href: string}`, nullable | 146 | `{"label":"Flower","href":"/collection/flower"}` | Values as in §1. The label is title case as in the DOM (`"Preroll"`, `"Cbd"`). |
| `subcategories` | `{label: string, href: string}[]` | 146 (always exactly 1) | `[{"label":"PRE-PACK","href":"/collection/flower/pre-pack"}]` | Upper case in the DOM. The array allows for several. |

### 3.2 Gallery

| Field | Type | Present on | Example | Notes |
|---|---|---|---|---|
| `image` | `{src, alt}` or `{src:"", alt, placeholder:true}`, nullable | 146 (139 real, 7 placeholder) | `{"src":"https://d1hhy58mqsa6c3.cloudfront.net/e4106378-53c0-4bab-a8e2-a72ac74e5d5f/e5c618d1-a8e1-48f9-ae31-0d8afbd94f69?w=3840&q=100","alt":"OMG - Mac 1 - 3.5G Flower"}` | The first real slide image, taken at the largest srcset candidate. The CloudFront URL has no file extension. `alt` is the source `alt` attribute with whitespace normalised exactly as `h1` is (runs of whitespace collapsed to one space, then trimmed). The source alt and the source `<h1>` text are the same string. On 9 pages that string has stray spaces. 8 are real-image pages: Blazy Susan Filter Tips Tin and Pink Cones Shorty, Bubby's Pumpkin Bites, the HG grinder (`"HG - Aluminum Grinder  - Black 2.5 Inch "`), Impressed Rainbow Belts and Zangria, Sweetgrass Muscle Salve, and Tower Three Maple Butter. 1 is a placeholder page, the SunnyDayz Battery (`" Sunnydayz Battery"`). After normalisation `alt === h1` on all 146 pages, and on all 149 `images` + `thumbnails` entries. The 7 placeholder pages are exactly the `stockPhoto` pages (§4.2). If the capture ever carries the JSON-LD inside `<main>`, the extractor fills a missing image from `Product.image` and adds `fromJsonld: true`. That never happens in this capture. |
| `images` | same item shape as `image`, as an array | 146 (1 item on 145 pages, 2 on 1) | Harbor House GMO pre-roll has 2 distinct CloudFront images | Every `.slick-track` slide in order. |
| `thumbnails` | `{src, alt, placeholder?, active: boolean}[]` | 1 (GMO) | `[{"src":"","alt":"Harbor House - GMO - 1G Pre-roll","placeholder":true,"active":true}, …]` | The slick thumb strip. In the capture it holds only lazy placeholders. Build thumbnails from `images` instead. |
| `galleryNav` | `{label: string, direction: "prev"\|"next"\|null, disabled: boolean}[]` | 1 (GMO) | `[{"label":"Previous","direction":"prev","disabled":true},{"label":"Next","direction":"next","disabled":false}]` | Slider arrow button labels (visible text). Present only when there are 2 or more slides. |
| `stockPhoto` | boolean | true on 7 | `true` on `/product/sunnydayz-sunnydayz-t-shirt-one-size-merch` | The source overlays a "Stock photo" label on the placeholder. |
| `stockPhotoLabel` | string, nullable | 7 | `"Stock photo"` | Overlay text. Render it only when `stockPhoto` is true. |

### 3.3 Body sections

| Field | Type | Present on | Example | Notes |
|---|---|---|---|---|
| `sectionTitles` | object of `string\|null` | always | `{"details":"Details","description":"Product descriptions","warning":"Warning","about":"About this product","terpenes":"Terpenes","cannabinoids":"Cannabinoids"}` | Headings as rendered. Each is `null` when its section is absent: `details` 116, `description` 146, `warning` 63, `about` 146, `terpenes` 43, `cannabinoids` 71. Render a section heading only when it is non-null. |
| `details` | `{label: string, value: string\|null, icon: string\|null, _iconSvg?: string}[]` | 116 (0 items on 30, 1 on 67, 2 on 44, 3 on 5) | `[{"label":"THC","value":"23.61%","icon":"vector"},{"label":"CBD","value":"0.37%","icon":"water_drop_black"},{"label":"TAC","value":"25.62%","icon":"inline-svg","_iconSvg":"<svg …>"}]` | The chips under the "Details" heading. `label` ∈ THC 116, CBD 17, TAC 37 (170 chips). `value` is a percentage (`"23.61%"`) on 123 chips, or an upper-case mg amount on 47 chips: Edible THC 38, Edible CBD 2, Topical THC 4, Beverage THC 3 (values seen: `5MG`, `50MG`, `100MG`, `300MG`, `500MG`, `700MG`, `1000MG`; e.g. Keef Original Cola THC `"5MG"`). Tinctures use percentages, never mg: all 7 tincture pages, e.g. Treeworks Gentle Drops THC `"0.169%"`, CBD `"1.972%"`, TAC `"2.141%"`. Unit is not implied by category either way: 1 edible (Sweetgrass Infused Olive Oil) shows `"0.267%"` / `"0.28%"`. Render `value` verbatim; never derive a unit from `category`. `icon` is an icon-font token (`vector` for THC, `water_drop_black` for CBD), or `"inline-svg"` for TAC, whose leaf glyph is an unclassed inline `<svg>` kept verbatim in `_iconSvg` (`_` keys are not scored as text). The same label/value pairs repeat in `about`. |
| `disclaimer` | string, nullable | 116 (exactly the pages with `details`) | `"*This % may represent an aggregate of THC/CBD, THCa/CBDa, THCb/CBDb within the product. Consumers should review the actual product label for exact % of THC/CBD."` | The `<small>` text under the chips. It is identical on every page, but it is stored per page. |
| `description` | string, nullable | 146 | `"OMG brings you Mac 1, a premium hybrid flower that's earned legendary status among cannabis …"` (91 to 154 words, median 126) | Text of `<pre class="details__description">`, trimmed. No capture contains newlines, but the value is whitespace-significant, so render it with `white-space: pre-line`. Apostrophes are real characters, not `&apos;`. |
| `warnings` | object[] | 63 (always 1 item when present) | see below | Collapsible accordions, **closed on load** (see `collapsed`). The source uses a button (`title`, `aria-controls`) that controls a panel. |
| `warnings[].title` | string | | `"Proposition 65 Warning for California Consumers"` | Button label. The only warning seen. |
| `warnings[].collapsed` | boolean, nullable | | `true` (all 63) | Initial state as served. Read from the panel's `data-collapsed` (source: `<div class="collapse accordion__content" data-collapsed="true" style="height:0">` on all 63 pages). Falls back to the button's `aria-expanded`, then to an inline `height:0`; `null` when the markup states neither. Render the panel closed when `true` (the source button has no `aria-expanded`; the rebuild should add `aria-expanded="false"` itself). |
| `warnings[].toggleIcon` | string, nullable | | `"angle-down"` (all 63) | Icon-font token of the chevron inside the button (`<i class="icon icon_angle-down">`). |
| `warnings[].toggleAriaLabel` | string, nullable | | `"Expand content"` (all 63) | The chevron's `aria-label`. Not visible text. |
| `warnings[].label` | string, nullable | | `"WARNING:"` | Bold lead-in span. |
| `warnings[].lines` | string[] | | `["This product can expose you to chemicals including β-myrcene and cannabis smoke, which are known to the State of California to cause cancer, and chemicals including cannabis smoke and 9-tetrahydrocannabinol, which are known to the State of California to cause birth defects or other reproductive harm."]` | Paragraphs. The source's hard line breaks inside the paragraph are collapsed to spaces. |
| `warnings[].moreInfo` | `{text, label, href}`, nullable | | `{"text":"For more information go to","label":"www.P65Warnings.ca.gov","href":"https://www.P65Warnings.ca.gov"}` | The trailing sentence and its link. The external `href` is kept verbatim, including its case. Open it in a new tab (source: `target=_blank rel="noopener noreferrer"`). |
| `warnings[].links` | `{label, href}[]` | | `[]` | Any further links in the panel. None in the capture. |

### 3.4 Purchase area

| Field | Type | Present on | Example | Notes |
|---|---|---|---|---|
| `purchaseState` | `"hidden"\|"placeholder"\|"visible"\|null` | always | `"hidden"` 69, `"placeholder"` 77 | `hidden` means the variant/price/cart block is in the DOM with class `hidden` (not displayed), and the availability alert shows instead. `placeholder` means the capture only has 2 skeleton loaders and no purchase data. `visible` never occurs in the capture. See §4.3. |
| `variantsTitle` | string, nullable | 69 | `"Available variants"` | Heading over the variant buttons. |
| `variants` | `{weight: string, price: string\|null, active: boolean, href: string\|null}[]` | 69 (1 item on 68, 2 on 1) | `[{"weight":"3.5g","price":"$40","active":true,"href":null}]` | `weight` ∈ `"each"` 25, `"1g"` 17, `"3.5g"` 10, `"0.5g"` 5, `"3g"` 1, and `""` on 12 merch pages (the source label is empty). A variant that links to a sibling product is an `<a>`, and its `href` is resolved against the page URL to `/product/<slug>`. Example (Breathe Free Mango Smoothie 3pk): `[{"weight":"1g","price":"$20","active":true,"href":"/product/breathe-free-breathe-free-mango-smoothie-1g-pre-roll-1-g-3-pack-preroll-1-grams"},{"weight":"1g","price":"$8","active":false,"href":"/product/breathe-free-breathe-free-mango-smoothie-1g-pre-roll-1-g-preroll-1-grams"}]`. |
| `price` | `{current: string\|null, original: string\|null, ariaLabel: string\|null}`, nullable | 69 | `{"current":"$40","original":null,"ariaLabel":"Product price: $40"}` | `current` is from `<ins>` and always equals the active variant's price. `original` (`<del>`, a sale strike-through) is never present in the capture. |
| `actions` | `{kind, label, ariaLabel, href?}[]` | 69 (always 3 items when present) | `[{"kind":"add-to-cart","label":"Add To Cart","ariaLabel":"Add OMG - Mac 1 - 3.5G Flower to cart"},{"kind":"favorite","label":"","ariaLabel":"Add OMG - Mac 1 - 3.5G Flower to favorites"},{"kind":"continue-shopping","label":"Continue Shopping","ariaLabel":"Go to continue shopping","href":"/shop"}]` | `kind` ∈ `add-to-cart`, `favorite` (icon-only, so `label` is `""`), `continue-shopping`. |
| `availabilityMessage` | string, nullable | 69 | `"This product is unavailable in your selected store"` | The alert that is visible when `purchaseState == "hidden"`. It is the only message seen. |
| `availabilityTone` | string, nullable | 69 | `"warning"` | The tone the alert **paints**. All 69 source alerts carry two tone classes (`class="alert alert_success alert_warning alert_layout_icon"`), so the class list alone does not decide it. Class-attribute order is irrelevant; stylesheet order decides. The site's `/_next/static/css/6bc1fa4dfc6990ff.css`, linked 16th of 18 on every product page, declares `.alert_success`, `.alert_error`, `.alert_warning`, `.alert_info` in that order, each with a single class and so equal specificity. The later rule wins, giving `warning`. The extractor encodes that order (`success < error < warning < info`). It returns the single tone when there is one, and `null` if a mix contains a tone outside that list. **Verified by computed style** (`tmp/product-alert-tone.mjs`, with the page's 18 stylesheets in `tmp/product-alert-css/`): the real alert paints background `rgb(255, 228, 160)` (#ffe4a0) and text, border and icon `rgb(102, 75, 7)` (#664b07). Controls: success-only paints `rgb(167, 228, 187)`, no tone paints transparent, and the reversed class order `alert_warning alert_success` still paints warning. |
| `availabilityTones` | string[] | always (`["success","warning"]` on 69, `[]` on 77) | `["success","warning"]` | Every `alert_<tone>` class on the alert, in class-attribute order (the raw DOM fact behind `availabilityTone`). |

### 3.5 About, share, lab results

| Field | Type | Present on | Example | Notes |
|---|---|---|---|---|
| `about` | `{label: string, value: string, href?: string}[]` | 146 | `[{"label":"Licensed Producer","value":"OMG","href":"/brand/omg"},{"label":"Flower Type","value":"Hybrid","href":"/strain/Hybrid"},{"label":"THC","value":"23.61%"},{"label":"CBD","value":"0.37%"},{"label":"TAC","value":"25.62%"},{"label":"Package Info","value":"Omg Mac 1 3 5 G Flower 3 5 G"},{"label":"Available Weights","value":"3.5g"}]` | Rows under "About this product", in DOM order. The trailing colon is stripped from the label; render it as `Label:`. The key `href` is present only when the value is a link. Labels: Licensed Producer 146 (linked on 144; `"Not Specified"` on 2 with no href), Package Info 146, Flower Type 119 (always linked, e.g. `/strain/Hybrid`, `/strain/S%20I`, `/strain/Cbd`: capitalised strain URLs), THC 116, Available Weights 70, TAC 37, CBD 17. `Package Info` is a machine-generated string; keep it verbatim. |
| `share` | `{label: string\|null, buttons: {network: string\|null, ariaLabel: string\|null}[]}`, nullable | 146 | `{"label":"Share","buttons":[{"network":"facebook","ariaLabel":"Share on Facebook"},{"network":"twitter",…},{"network":"pinterest",…},{"network":"whatsapp",…}]}` | Icon-only buttons. The source carries no share URLs, so the template builds them from the page URL. |
| `terpenes` | `{name: string, value: string\|null, aroma: string\|null, effects: string\|null}[]` | 43 pages | `[{"name":"Limonene","value":"0.836 %","aroma":"Citrus","effects":"Elevated mood, anti-anxiety"},{"name":"Beta Caryophyllene","value":"0.407 %","aroma":"Peppery","effects":"Anti-inflammatory, analgesic, calming"}]` (Bountiful Candy Fumez) | `value` keeps the source's space before `%`. The list includes two non-terpene rows that have no aroma or effects (`aroma: null, effects: null`): `"Total Terpenes"` (13 pages) and `"Moisture"` (2 pages, e.g. OMG Mac 1: `{"name":"Moisture","value":"6 %"}`). Render the description line only when `aroma` or `effects` is non-null. Each item has an icon `<figure><svg>` in the source (not modelled). |
| `cannabinoids` | `{group: string, items: {name: string, value: string\|null}[]}[]` | 71 pages | `[{"group":"THC","items":[{"name":"THCA","value":"26.55%"},{"name":"THC","value":"23.61%"}]},{"group":"CBD","items":[{"name":"CBGA","value":"1.14%"},{"name":"CBD","value":"0.37%"},{"name":"CBDA","value":"0.12%"}]},{"group":"TAC","items":[{"name":"Total Cannabinoids","value":"25.62%"}]}]` | Group combinations: THC+CBD+TAC 32, THC 20, THC+CBD 14, THC+TAC 5. Names: THC group {THC, THCA, THCV}; CBD group {CBD, CBDA, CBG, CBGA, CBN, CBC}; TAC group {Total Cannabinoids}. Values have up to 4 decimals. The example above (OMG Mac 1) matches `details` exactly, but that is not guaranteed. Of the 123 `details` chips that have a same-named lab item (THC→THC, CBD→CBD, TAC→Total Cannabinoids), 69 are identical and 54 differ. Every difference is the lab value rounded half-up to 3 decimals, with trailing zeros dropped. Example: Ahh Moments Cherry Berry Shot (tincture), where `cannabinoids` shows THC `"0.0591%"` and Total `"0.1298%"`, and `details` shows `"0.059%"` and `"0.13%"`; also Breathe Free Lemongrass Gas, `"27.6605%"` → `"27.661%"`. Do not dedupe the two, and do not recompute one from the other. |
| `jsonld` | object, nullable | **0** | `null` on all 146 pages | See §6. The shape, when present, is `{name, brand, image, price, currency, availability, url}`. |

## 4. Edge cases the template must handle

1. **Merch (22 pages):** no `strainType`, no `details` or `disclaimer`, no `warnings`, no lab results. The 12 merch pages with `purchaseState == "hidden"` have `variants[0].weight == ""`, so render the price without a weight label. `about` has only Licensed Producer and Package Info.
2. **Stock-photo pages (7):** `stockPhoto: true`, `stockPhotoLabel: "Stock photo"`, `image: {src:"", alt:<h1>, placeholder:true}`. The pages are the SunnyDayz T-shirt, hat and battery, RAW Dog Walker cones, Blazy Susan purple papers 1¼, Ahh Moments Strawberry Cream chocolate, and Breathe Free Guava Biscotti flower. The source shows only its placeholder SVG with the label over it. The JSON-LD `Product.image` for these pages is a generic Prismic category picture (e.g. `https://images.prismic.io/sunny-dayz/Z5vMl5bqstJ9-D0B_gear-paraphernalia.png?auto=format,compress` for merch), not a product photo. The build may use it (§6), and should keep the "Stock photo" label when it does.
3. **Purchase area captured in two states:**
   - `"hidden"` (69 pages): `variants`, `price` and `actions` are populated, but the source did not display them. It displayed `availabilityMessage` ("This product is unavailable in your selected store") instead. That reflects the capture's store selection, not a permanent product state. The template decides whether to show the cart block (live inventory) or the message.
   - `"placeholder"` (77 pages): `variants: []`, `price: null`, `actions: []`, `availabilityMessage: null`, and `variantsTitle: null`. Take the price from JSON-LD (§6). The labels `Available variants`, `Add To Cart` and `Continue Shopping` are identical on all 69 hidden-state pages, so the template may reuse them.
4. **Two variants linking to sibling products** (1 page, Breathe Free Mango Smoothie 3pk): both variants show the weight `"1g"` and differ by price and `href`. The inactive variant is a link to another product page.
5. **Multi-image gallery** (1 page, Harbor House GMO): `images` has 2 entries, `galleryNav` holds Previous/Next, and `thumbnails` holds only placeholders.
6. **Unlinked brand** (2 pages): `brand.href == null`, and `about[0]` is `{"label":"Licensed Producer","value":"Not Specified"}` with no `href` key.
7. **Terpene rows without aroma** ("Total Terpenes", "Moisture"): `aroma` and `effects` are `null`.
8. **Odd strain keys:** `si` (label `S/I`, aria "Flower type: S I", about link `/strain/S%20I`, which is a soft-404 URL on the source) and `cbd`. The strain spec covers the redirect of capitalised `/strain/*` URLs.
9. **Upper-casing is CSS:** `strainType.label` (`Hybrid`) and the brand eyebrow (`not specified`) are displayed upper-cased on the source. The stored values keep DOM case.
10. **Section absent means empty or null, never missing.** Every key is present on every page, and no field ever throws. Guard on `length` or `null`, not on `in`.

## 5. What is not in the model (by design)

- Share URLs and favourite and cart behaviour: these are client-side. Only labels and aria-labels are kept.
- Icon glyphs: the icon-font tokens are in `details[].icon`, `share.buttons[].network` and `warnings[].toggleIcon`. The inline SVGs of the Prop 65 figure, the terpene icons, the cart button and the availability alert are not kept. The TAC chip's SVG is kept in `_iconSvg`.
- Slick slider inline styles and widths.

## 6. Build-time join: Product JSON-LD (required)

The harness passes the extractor only `rendered.mainHtml`, the outerHTML of `<main>`. On every product page, the server-rendered `<script type="application/ld+json">` blocks (BreadcrumbList and Product) sit **before** `<main>` in `audit/raw/<slug>.html`. For example, the Pink Runtz Product block is at character offset 25804, and `<main>` starts at 27234. So `model.jsonld` is `null` on all 146 pages. This is a harness boundary, not an extractor gap. No product `mainHtml` contains any `application/ld+json` block (0 of 146). None of the 77 placeholder-state `<main>` elements contains a price: 0 of 77 match `$<digit>`, while all 69 hidden-state ones do, which is the probe's positive control. So `price`, `variants` and `jsonld` cannot be filled from the DOM the extractor receives. All 146 raw files contain a Product block before `<main>`, and the build must join it from there:

```json
{"@type":"Product","name":"OMG - Pink Runtz - 3.5G Flower","brand":{"@type":"Brand","name":"OMG"},
 "image":"https://d1hhy58mqsa6c3.cloudfront.net/e4106378-53c0-4bab-a8e2-a72ac74e5d5f/639272a9-83fc-4480-b4e4-b0025def2089",
 "description":"<same as model.description, but with &apos; entities>",
 "offers":{"@type":"Offer","price":"40","priceCurrency":"USD","availability":"http://schema.org/InStock","itemCondition":"NewCondition",
           "url":"https://www.sunnydayzcannabis.com/product/omg-omg-pink-runtz-3-5g-flower-3-5-g-flower-3-5-grams","seller":{"@type":"Organization","name":"Sunny Dayz"}},
 "review":[]}
```

Join notes:
- Map it to the documented `jsonld` shape: `price` "40", `currency` "USD", `availability` "InStock" (the part after the last `/`), `url` via site-relative `offers.url`, `image`, `brand` (`brand.name`), and `name`.
- Decode `&apos;` and any other entities in `description` and `name` before re-emitting.
- Price for the 77 placeholder-state pages: use `"$" + offers.price`.
- The JSON-LD says `InStock` even on pages whose DOM says "unavailable in your selected store". The two sources disagree; do not treat either one as live inventory.

## 7. Verification (2026-09-23, re-run after the verifier fix pass)

- Harness: `{"product":{"pages":146,"errors":0,"below":0,"minCoverage":1}}`. Every page scores 1.0.
- Fix-pass diff against the pre-fix models: only the new fields changed. `availabilityTones` was added on 146 pages, `image.alt` and `images[].alt` changed on 9 (whitespace only), and `warnings[].collapsed`, `toggleIcon` and `toggleAriaLabel` were added on 63. `availabilityTone` is unchanged on all 146.
- Branch controls (`tmp/product-unit-controls.mjs [old-product.js]`): the real extractor runs on mutated copies of captured DOMs, and 12 of 12 cases pass. Tone: reversed class order gives `warning`, success-only gives `success`, an unknown tone in a mix gives `null`. `collapsed`: `data-collapsed` true or false, `aria-expanded` fallback, `height:0` fallback, no markup gives `null`. Alt: an untidy alt equals `h1`. The pre-fix extractor returned `success`, `bogus` and the untidy alt, so these controls do detect the defects.
- Alert tone by computed style: `tmp/product-alert-tone.mjs tmp/product-alert-css <scratch.html>` (see §3.4).
- Stricter checks (scratch scripts in `tmp/`):
  - `tmp/linecheck.js`: each of the 5,140 non-empty mainText lines is covered by a single model object. 0 uncovered.
  - `tmp/nodecheck.mjs`: each of the 6,326 text nodes in `<main>`, including the hidden purchase block, is a case-sensitive substring of a model string. 0 unclaimed.
- Positive controls:
  - Harness, `description` deleted (`tmp/control-product.js`): all 146 pages fall below 0.98 (coverage 0.1842 to 0.6818).
  - Harness, `warnings` emptied (`tmp/control-product-warnings.js`): exactly the 63 Prop 65 pages fall (0.8301 to 0.9035); the other 83 stay at 1.0.
  - Line check without `disclaimer`: 116 uncovered lines (one per disclaimer page).
  - Text-node audit without `actions`: 138 unclaimed nodes on 69 pages.
