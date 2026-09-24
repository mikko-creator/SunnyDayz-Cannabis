# Model spec: `home`

Extractor: `src/extract/home.js`. Output: `content/model/index.json`. Report: `content/model-report.home.json`.
Templates for the homepage are built **only** from this spec. Every value comes from the rendered
`<main>` of `/`: its text, its attributes, its inline `style` attributes, or the CMS `<style>` blocks
inside a section. The extractor derives a few structural values (`collection`, `slideCount`,
`placeholderSlides`, `copies`, `copiesA11y`, `padding`, `spacingBottom`, `contentSide`) from URLs,
class names, attributes or element counts. It never invents display text.

## Pages covered (1)

| type | URL | model file (`slug`) | `<title>` |
|---|---|---|---|
| `home` | `https://www.sunnydayzcannabis.com/` | `index.json` | `Welcome to our online store` |

The audit (`render-verification`, `content-inventory`, `link-graph`, `seo-inventory`, ...) contains
no query-string, case or `/index` variant of `/`. Coverage on the audited render is 1.0 (0 missing
words, 0 errors).

## 1. Record envelope (written by the harness)

```jsonc
{
  "url": "https://www.sunnydayzcannabis.com/",
  "slug": "index",
  "type": "home",
  "title": "Welcome to our online store",     // source <title>: use for <title>/SEO
  "seoTitle": "Welcome to our online store",
  "model": { "h1": null, "sections": [ /* Section, in DOM order */ ] }
}
```

## 2. Top level

| field | type | notes |
|---|---|---|
| `h1` | `string \| null` | **Always `null` on the audited page: the source homepage has no `<h1>`.** Do not invent one. If the redesign needs an h1 for SEO, that is a design decision, not source content. |
| `sections` | `Section[]` | One entry per `<section>` child of `<main>`, **in DOM order** (16 on the audited page). Render them in this order. |

### Fields on every Section

| field | type | notes |
|---|---|---|
| `kind` | `"video-embed" \| "separator" \| "category-tiles" \| "product-carousel" \| "deals-carousel" \| "image-link-banner" \| "marquee" \| "side-by-side" \| "unknown"` | Switch on this. |
| `ariaLabel` | `string \| null` | The section's `aria-label`, e.g. `"Flower carousel"`, `"Promotions carousel: Today's Deals, 0 promotions available"`. Use it as the section's `aria-label`; it is not visible text. |
| `padding` | `"small" \| "medium" \| "large" \| null` | From the CMS class `padding-slice-<size>` (vertical rhythm). `null` on `separator` and `side-by-side`. |
| `withPadding` | `true` (optional) | Present only when the section carries `..._section_with_padding` (the About block). |
| `spacingBottom` | `true` (optional) | Present only when the section carries a bottom-spacing class: `categories_spacing_bottom__<hash>` on Categories (#2), plain `spacing_bottom` on Flower (#3) and Accessories (#12). No other section has one. It adds a **bottom margin equal to the section's `padding-slice-medium` padding**: computed `margin-bottom` is 12px at 390 and 768px and 18px at 1024 and 1440px (`audit/capture/baseline.index.<w>.style.json`, measured on #2 and #3). Vapes (#5), with the same padding and no class, has no bottom margin at any of the four widths. #12 is beyond the capture's 1500-element limit, so its value is inferred from the shared class and not measured. |

### Section order on the audited page

| # | `kind` | title / identity | notes |
|---|---|---|---|
| 0 | `video-embed` | Cloudinary `output-3` | The hero: a muted, autoplaying, looping video with no controls. |
| 1 | `separator` | wave/strip image | Overlaps the bottom of the hero (`overlapPrevious: true`). |
| 2 | `category-tiles` | `Categories` / `SHOP ALL` | 10 tiles, `spacingBottom` |
| 3 | `product-carousel` | `Flower` | 20 cards, `spacingBottom` |
| 4 | `deals-carousel` | `Today's Deals` | 0 promotions, 15 skeleton slides |
| 5 | `product-carousel` | `Vapes` | 12 cards |
| 6 | `product-carousel` | `Pre-rolls` | 20 cards |
| 7 | `product-carousel` | `Extracts` | 9 cards |
| 8 | `product-carousel` | `Drinks` | 3 cards, **no header link, no prev/next** |
| 9 | `product-carousel` | `Edibles` | 20 cards |
| 10 | `product-carousel` | `Tinctures` | 7 cards |
| 11 | `product-carousel` | `Topicals` | 4 cards, **no header link, no prev/next** |
| 12 | `product-carousel` | `Accessories` | 20 cards, no weights, `spacingBottom` |
| 13 | `image-link-banner` | Sun Club loyalty | Link to `app.treezloyalty.com` |
| 14 | `marquee` | "Small Batch, Real Farmers, Real Flavor." | Yellow ticker |
| 15 | `side-by-side` | `About us` | Text, CTA and photo |

The carousel list is **Flower, Vapes, Pre-rolls, Extracts, Drinks, Edibles, Tinctures, Topicals,
Accessories** (9). Today's Deals sits between Flower and Vapes. There is **no hero slider**. The
Sun Club loyalty banner is not a hero slide: it is a stand-alone code-embed section after
Accessories (#13).

---

## 3. Shared sub-shapes

### `Image`
```jsonc
{ "src": "https://images.prismic.io/sunny-dayz/D9KtxlM_3PlvoZcg_Flower---Category.png?auto=format%2Ccompress&rect=0%2C0%2C934%2C934&w=3840&fit=max", "alt": "Category image" }
// lazy-load placeholder (every product card on the homepage):
{ "src": "", "alt": "Mass Yield - Peanut Butter Gelato - 3.5G Flower", "placeholder": true }
```
`src` is absolute. It is the largest `srcset` candidate, with `/_next/image` wrappers unwrapped.
When `placeholder: true`, `src` is `""`: the DOM held only `/images/product-placeholder.svg`. **Join
the real image from the product page's model using the card's `url`.** This works for 108 of the 115
cards; **it finds nothing for the 7 `stockPhoto: true` cards** (see Card → Stock photo). `alt` is the
source alt, verbatim; some are generic (`"Category image"`, `"Image"`).

### `Link`
```jsonc
{
  "label": "See All",                    // visible text (T() of the <a>), "" when the link wraps only an image
  "href": "/collection/flower",          // site-relative via rel(); absolute only for other origins
  "ariaLabel": "Go to /collection/flower", // optional: the <a aria-label>
  "title": "Get to know us",             // optional: the <a title>
  "external": true,                      // optional: href is on another origin
  "target": "_blank", "rel": "noopener noreferrer", // optional: copied when present
  "hrefRaw": "See All Link",             // optional: only with hrefSuspect
  "hrefSuspect": true                    // optional: the CMS left a non-URL / space-containing href
}
```
`hrefSuspect: true` marks a CMS authoring error at the source: the raw `href` has whitespace or no
leading `/`, `http(s):`, `#`, `mailto:` or `tel:`. `href` then holds what `rel()` resolves it to
(`"/See%20All%20Link"`), which 404s on the source too. Decide per link whether to render it,
repoint it or drop it; do not treat it as a real route. The page has two of these: the Today's
Deals `seeAll` (`sections[4]`, see 4.5) and the empty marquee item (`sections[14].items[2]`, see
4.7).

### `Controls` (carousel prev/next)
```jsonc
{
  "ariaLabel": "Flower carousel navigation",   // the role=navigation wrapper's aria-label
  "prev": { "label": "Previous", "ariaLabel": "Previous slide", "disabled": true },
  "next": { "label": "Next",     "ariaLabel": "Next slide",     "disabled": false }
}
```
`label` is the button's screen-reader-only text (`span.sr-only`). It is part of the rendered
text, so keep it in the markup visually hidden, next to an icon. `disabled` is the state at load
(first slide): prev is always `true` and next always `false` on the audited page. `controls` is
`null` when the source renders no buttons (Drinks, Topicals).

### `ArrowStyle` (CMS-injected carousel arrow CSS)
```jsonc
{ "color": "#2E4520", "border": "1px solid transparent", "hoverColor": "#2E4520", "disabledColor": "#3E6327" }
```
Parsed from the section's own `<style>` block. A value is `null` when the CMS left it unset (the
block literally says `color: null` / `border: undefined`). Only Today's Deals sets values. Every
product carousel has all four `null`, so use the theme default arrow style there.

### `Card` (product card, `CARD()` from `_common.js` plus three home fields)
```jsonc
{
  "url": "/product/mass-yield-mass-yield-peanut-butter-gelato-3-5g-flower-3-5-g-flower-3-5-grams",
  "name": "Mass Yield - Peanut Butter Gelato - 3.5G Flower",
  "brand": "MASS YIELD",           // the brand badge beside the name (upper-case in the DOM)
  "price": "$25",                  // string with "$"; "$2.50" occurs
  "weight": "3.5g",                // "3.5g" | "0.5g" | "1g" | "3g" | "each" | null
  "strain": "Indica",              // "Indica" | "Sativa" | "Hybrid" | "S/I" | null
  "strainKey": "indica",           // "indica" | "sativa" | "hybrid" | "si" | null (drives strain colour)
  "thc": "22.39%",                 // "22.39%" or a dose "5MG"/"100MG"/"2000MG"; null when absent
  "tac": "26.6%",                  // null when absent
  "cbd": null,                     // "0.10%" or "100MG"; null when absent
  "badges": ["MASS YIELD", "Indica", "THC: 22.39%", "TAC: 26.6%", "PRE PACK"],
  "image": { "src": "", "alt": "Mass Yield - Peanut Butter Gelato - 3.5G Flower", "placeholder": true },
  "stockPhoto": false,
  "stockPhotoLabel": null,         // "Stock photo" when the source overlays that label on the image
  "addToCartLabel": "Add To Cart", // the add-to-cart button text
  "weightSeparator": "/"           // the "/" between price and weight; null when weight is null
}
```
- **`badges`** is the full ordered badge row as rendered: brand, then strain (when present), then
  `THC:` / `CBD:` / `TAC:` metrics, then the product subtype last (`PRE PACK`, `510 THREAD`,
  `ALL IN ONE`, `FLOWER`, `KIEF`, `LIVE ROSIN`, `BADDER`, `OTHER`, `GUMMY`, `CHOCOLATE`, `CHEW`,
  `BAKED GOOD`, `OIL`, `LUBRICANT`, `CREAM`, `ROLLING PAPERS`, `BATTERY`, `HAT`, `T SHIRT`,
  `LIGHTER`, `PIPE`). `brand`, `strain`, `thc`, `tac` and `cbd` are the named parts of the same
  row. Render either the named fields plus the last badge, or `badges` as-is, but not both.
- **Price line**: render `price`, then `weightSeparator` and `weight` when `weight` is non-null
  (`$25 / 3.5g`, `$7 / each`). Accessories cards have no weight and no separator (`$8`).
- **Images**: all 115 homepage cards have `image.placeholder: true`. Join from
  `content/model/product-*.json` by `url`. For the 108 cards with `stockPhoto: false` the product
  model's `image` equals the image the source's server HTML carries for that card (checked 108/108
  against the RSC `asset.image` in `audit/raw/index.html`). **The 7 stock-photo cards are the
  exception; see the next bullet.**
- **Stock photo**: 7 cards (1 Flower, 1 Edibles, 5 Accessories) have `stockPhoto: true` and
  `stockPhotoLabel: "Stock photo"`, an overlay label on the image.
  **The product-model join finds no image for these 7.** Their product models also hold only the
  placeholder (`image: {src:'', placeholder:true}`, `jsonld: null`). The image the source actually
  shows under the label is a generic Prismic *category* stock image. It exists only in the server HTML
  (`audit/raw/index.html`: the RSC product object's `asset.image`, and the `<img srcSet>` as
  `/_next/image?url=...`). It is not in the rendered `<main>` or in any JSON-LD (the homepage has
  none), so the extractor cannot put it in the model. If the build follows only the join, it ships
  a "Stock photo" label over an empty image. The build must either take the image below from the
  server HTML, which is the source's own asset, or drop the label when it has no image.

  | section | card `url` | server-HTML `asset.image` |
  |---|---|---|
  | #3 Flower | `/product/breath-free-breathe-free-guava-biscotti-3-5g-flower-3-5-g-flower-3-5-grams` | `https://images.prismic.io/sunny-dayz/Z5vMhZbqstJ9-Dzv_flowers-sativa.png?auto=format,compress` |
  | #9 Edibles | `/product/ahh-moments-ahh-moments-strawberry-cream-party-rosin-chocolate-100-mg-edible-100-milligrams` | `https://images.prismic.io/sunny-dayz/Z5vMk5bqstJ9-Dz9_edibles-others.png?auto=format,compress` |
  | #12 Accessories | `/product/raw-raw-classic-cones-dog-walker-single-70-24-one-size-merch` | `https://images.prismic.io/sunny-dayz/Z5vMl5bqstJ9-D0B_gear-paraphernalia.png?auto=format,compress` |
  | #12 Accessories | `/product/sunnydayz-sunnydayz-battery-one-size-merch` | same `gear-paraphernalia.png` |
  | #12 Accessories | `/product/sunnydayz-sunnydayz-hat-one-size-merch` | same `gear-paraphernalia.png` |
  | #12 Accessories | `/product/sunnydayz-sunnydayz-t-shirt-one-size-merch` | same `gear-paraphernalia.png` |
  | #12 Accessories | `/product/blazy-susan-blazy-susan-purple-rolling-papers-1-1-4-one-size-merch` | same `gear-paraphernalia.png` |

  Five cards share one image. This table was taken from `audit/raw/index.html` on the audited
  crawl, not from the model. Re-read it from the server HTML if the crawl is refreshed.
- **Case**: text is stored in DOM case. The source upper-cases some of it with CSS
  `text-transform`, so rendered text differs: `addToCartLabel` "Add To Cart" renders as "ADD TO
  CART" and `strain` "Indica" as "INDICA". Brand badges are upper-case in the DOM itself.
- **Source inconsistencies, kept verbatim**: brand `"BREATH FREE"` on the "Breathe Free - Guava
  Biscotti" card (another card says `"BREATHE FREE"`). Card names use both "1G Pre-roll" and "1G
  pre-roll".
- **Not captured as text**: the heart "add to favorites" icon button (icon only; its aria-label is
  `Add <name> to favorites`) and the cart icon svg.
- Counts on the audited page: strain null on 24 cards, `thc` null on 27, `tac` set on 37, `cbd` set
  on 13. Badge rows have 2 to 6 entries.

---

## 4. Section shapes

### 4.1 `video-embed` (the hero, #0)
```jsonc
{
  "kind": "video-embed", "ariaLabel": null, "padding": "small",
  "provider": "cloudinary",
  "src": "https://player.cloudinary.com/embed/?cloud_name=vuu4jci5&public_id=output-3&player%5Baspect_ratio%5D=984%3A443&player%5Bcrop_mode%5D=fill&player%5Bfluid%5D=true&player%5Bautoplay%5D=true&player%5Bloop%5D=true&player%5Bmuted%5D=true&player%5Bcontrols%5D=false",
  "cloudName": "vuu4jci5",
  "publicId": "output-3",
  "aspectRatio": "984:443",           // from the player[aspect_ratio] URL param
  "aspectPaddingBottom": "45%",       // the wrapper's padding-bottom box (what the source actually lays out)
  "player": { "aspect_ratio": "984:443", "crop_mode": "fill", "fluid": "true", "autoplay": "true", "loop": "true", "muted": "true", "controls": "false" },
  "allowFullscreen": true,
  "title": null                       // the source iframe has no title: add one for a11y in the template
}
```
The source lays the iframe out absolutely inside a `padding-bottom: 45%` box. That is not exactly
984:443 (45.02%). `player` values are strings, not booleans. `src` is the full original embed URL,
usable as-is.

### 4.2 `separator` (#1)
```jsonc
{
  "kind": "separator", "ariaLabel": null, "padding": null,
  "overlapPrevious": true,
  "image": "https://images.prismic.io/sunny-dayz/agctKaYofJOwHRuE_separetormainbanner.png?auto=format,compress",
  "vars": { "padding-top": "5.729166666666666%", "bg-color": "transparent", "bg-image": "url(...)", "bg-size": "cover",
            "bg-position": "left center", "top": "0px", "offset": "0px", "rotation": "0deg", "z-index": "3" }
}
```
A decorative image strip with no text. `vars` holds the section's `--separator-*` custom properties
with the prefix stripped. `padding-top` as a percentage of width sets the strip height.
`overlapPrevious` means it is pulled up over the hero video's bottom edge.

### 4.3 `category-tiles` (#2)
```jsonc
{
  "kind": "category-tiles", "ariaLabel": "Categories carousel", "padding": "medium",
  "spacingBottom": true,                                  // see "Fields on every Section"
  "title": "Categories",
  "shopAll": { "label": "SHOP ALL", "href": "/shop" },   // Link
  "controls": { /* Controls, ariaLabel "Categories carousel navigation" */ },
  "tiles": [
    { "label": "FLOWER", "href": "/collection/flower",
      "image": { "src": "https://images.prismic.io/sunny-dayz/D9KtxlM_3PlvoZcg_Flower---Category.png?...&w=3840&fit=max", "alt": "Category image", "title": "FLOWER" } }
    // ... 10 tiles
  ]
}
```
Tiles in order (label → href): FLOWER → `/collection/flower`, PRE-ROLLS → `/collection/preroll`,
CONCENTRATES → `/collection/concentrates`, VAPES & CARTRIDGES → `/collection/cartridge`,
**TINTURES** (sic, the source typo) → `/collection/tincture`, EDIBLES → `/collection/edible`,
BEVERAGES → `/collection/beverage`, TOPICALS → `/collection/topical`, ACCESSORIES →
`/collection/merch`, CBD → `/collection/cbd`. `image.title` is the `<img title>` and equals the
label. `image` is `null` if a tile has no `<img>` (none on the audited page).

### 4.4 `product-carousel` (#3, #5 to #12)
```jsonc
{
  "kind": "product-carousel", "ariaLabel": "Flower carousel", "padding": "medium",
  "spacingBottom": true,                        // Flower and Accessories only; absent on the other 7
  "title": "Flower",
  "collection": "flower",                       // from the /collection/<x> href (see-all or end slide)
  "seeAll": { "label": "See All", "href": "/collection/flower", "ariaLabel": "Go to /collection/flower" },  // Link | null
  "shopAllSlide": { "label": "See All", "href": "/collection/flower", "ariaLabel": "Go to /collection/flower" }, // | null
  "controls": { /* Controls */ },               // | null
  "slideCount": 21,                             // swiper slides = cards + the end "See All" slide
  "cards": [ /* Card */ ],
  "arrowStyle": { "color": null, "border": null, "hoverColor": null, "disabledColor": null }
}
```
| title | `collection` | cards | `seeAll` / `controls` |
|---|---|---|---|
| Flower | `flower` | 20 | present |
| Vapes | `cartridge` | 12 | present |
| Pre-rolls | `preroll` | 20 | present |
| Extracts | `extract` | 9 | present |
| Drinks | `beverage` | 3 | **`null` / `null`** |
| Edibles | `edible` | 20 | present |
| Tinctures | `tincture` | 7 | present |
| Topicals | `topical` | 4 | **`null` / `null`** |
| Accessories | `merch` | 20 | present |

- The **header** (title, `seeAll`, `controls`) renders **above** the cards. In the DOM it comes
  *after* the swiper wrapper, and CSS moves it up: at 1440px the categories header sits at y=737
  and its slides at y=796 (`audit/capture/baseline.index.1440.style.json`). The rendered text
  (`mainText`) follows DOM order, so it lists each title after its cards. Ignore that order.
- `shopAllSlide` is the last slide of the track: an arrow icon plus the text "See All", upper-cased
  by CSS to "SEE ALL". Every product carousel has one, including Drinks and Topicals, where it is
  the only "see all" affordance.
- Titles differ from category tile labels ("Vapes" vs "VAPES & CARTRIDGES", "Drinks" vs
  "BEVERAGES", "Extracts" → `/collection/extract` while the tile "CONCENTRATES" →
  `/collection/concentrates`). Keep each as authored.
- Empty carousel: `cards: []` if the source ever renders none. The template must still render the
  header and the end slide.

### 4.5 `deals-carousel` (#4, Today's Deals)
```jsonc
{
  "kind": "deals-carousel", "ariaLabel": "Promotions carousel: Today's Deals, 0 promotions available", "padding": "large",
  "title": "Today's Deals",
  "titleSrText": "- 0 promotions available",   // sr-only span inside the h2
  "titleColor": "rgb(107, 145, 83)",           // inline style on the h2
  "seeAll": {
    "label": "See All Text",                   // the CMS placeholder label, verbatim
    "count": "(0)",                            // aria-hidden span inside the link
    "text": "See All Text(0)",                 // label+count exactly as rendered (no space)
    "href": "/See%20All%20Link", "hrefRaw": "See All Link", "hrefSuspect": true,
    "ariaLabel": "Go to See All Text, 0 promotions available",
    "color": "rgb(46, 66, 34)"                 // inline style on the link
  },
  "controls": { /* Controls, ariaLabel "Today's Deals carousel navigation" */ },
  "promotions": [],                            // real promotion slides; empty on the audited page
  "placeholderSlides": 15,                     // loading-skeleton slides (image/title/code bars, no text)
  "backgroundColor": "rgb(79, 120, 54)",       // section inline background
  "arrowStyle": { "color": "#2E4520", "border": "1px solid transparent", "hoverColor": "#2E4520", "disabledColor": "#3E6327" }
}
```
- **Empty state**: the source shows 0 promotions. The track holds 15 grey skeleton slides that
  never resolve into content in the audited render. "See All Text" and "See All Link" are
  unfilled CMS placeholders. Everything above is kept verbatim so the build can reproduce the
  source exactly. Whether to hide the block while `promotions` is empty is a redesign decision.
- `promotions[]` entry shape, for when the source has deals (not seen on the audited page, so this
  shape is unverified against real data): `{ "text": string, "link": Link | null, "image": Image |
  null, "blocks": RichBlock[] }`.

### 4.6 `image-link-banner` (#13, Sun Club)
```jsonc
{
  "kind": "image-link-banner", "ariaLabel": null, "padding": "large",
  "link": { "label": "", "href": "https://app.treezloyalty.com/getpass/kranNR", "external": true, "target": "_blank", "rel": "noopener noreferrer" },
  "image": { "src": "https://res.cloudinary.com/vuu4jci5/image/upload/v1788439380/FINAL_LOYALTY_PROGRAM-1-2.jpg", "alt": "Sun Club" },
  "aspectPaddingBottom": "45%",
  "objectFit": "cover"
}
```
The whole image is the link: an absolutely positioned `<a>` fills a `padding-bottom: 45%` box, and
the `<img>` inside is `object-fit: cover`. There is no visible text; the accessible name is the
image alt "Sun Club". `link.label` is `""` for that reason. `link` or `image` may be `null` if the
embed lacks one.

### 4.7 `marquee` (#14)
```jsonc
{
  "kind": "marquee", "ariaLabel": "Content marquee carousel", "padding": "small",
  "items": [
    { "label": "Small Batch, Real Farmers, Real Flavor.", "href": "/shop", "ariaLabel": "Small Batch, Real Farmers, Real Flavor.",
      "image": null, "withCaption": true, "textOnly": true },
    { "label": "Small Batch, Real Farmers, Real Flavor.", "href": "/shop", ... },
    { "label": "", "href": "/Small%20Batch,%20Real%20Farmers,%20Real%20Flavor.", "ariaLabel": "Marquee item",
      "hrefRaw": "/Small Batch, Real Farmers, Real Flavor.", "hrefSuspect": true,
      "image": null, "withCaption": false, "textOnly": false },
    // ... 6 items: 5 captioned + the empty one at index 2
  ],
  "copies": 2,                // the source renders the item list twice (identical chunks) for a seamless loop
  "copiesA11y": [             // one entry per chunk, from the chunk <div>'s attributes
    { "ariaHidden": false, "inert": false },   // chunk 1: exposed normally
    { "ariaHidden": true,  "inert": true  }    // chunk 2: aria-hidden="true" inert
  ],
  "style": { "--cmc-item-h-sm": "24px", "--cmc-item-h-lg": "32px", "--cmc-label-color": "#231F20", "background": "#F9E200",
             "--cmc-marquee-duration": "100s", "--cmc-marquee-gap-desktop": "6px", "--cmc-marquee-gap-mobile": "6px" }
}
```
- `items` is one chunk. The DOM has `copies` identical chunks (10 visible labels in total). If the
  chunks ever differ, the model also carries `chunks: Item[][]`, and the template must then use
  it instead of `items`.
- **Only the first copy is accessible.** On the source, every chunk after the first is
  `aria-hidden="true"` and `inert`, so screen readers announce the 5 captions once and keyboard
  focus reaches only the first copy's links. `copiesA11y[n]` records this per chunk. When the
  template repeats `items` for the loop, put `aria-hidden="true"` and `inert` on each copy whose
  `copiesA11y` entry says so (all copies after the first on the audited page). Otherwise the
  duplicate labels and links are exposed to assistive tech and tab order, which the source does
  not do.
- Item index 2 is an **empty anchor**: no label and no image, with a suspect href made from the
  tagline. It renders as an empty gap in the ticker. Skip it or keep it as a spacer; do not link
  it.
- `style` merges the section's and the track's inline styles: label colour `#231F20` on yellow
  `#F9E200`, 100s loop, 6px gaps, item height 24px (small) and 32px (large).

### 4.8 `side-by-side` (#15, About us)
```jsonc
{
  "kind": "side-by-side", "ariaLabel": null, "padding": null, "withPadding": true,
  "title": "About us",
  "blocks": [   // RICH() blocks: { "t": "p", "text": string, "html": string }
    { "t": "p", "text": "SunnyDayz is an independently owned, vertically integrated craft cannabis company built around a simple belief: how cannabis is grown, made, and sold matters.", "html": "..." },
    { "t": "p", "text": "We cultivate in organic soil, hand water, hand trim, and select genetics for rich terpene profiles, flavor, and overall quality—not THC% alone. That same philosophy ...", "html": "...alone.&nbsp;That same..." },
    { "t": "p", "text": "Our deli-style Bud Bar brings transparency back to buying cannabis, ...", "html": "Our <strong>deli-style Bud Bar</strong>&nbsp;brings ..." },
    { "t": "p", "text": "At SunnyDayz, we’re doing things differently.", "html": "<strong>At SunnyDayz, we’re doing things differently.&nbsp;</strong>" },
    { "t": "p", "text": "Small Batch, Real farmers. Real flavor.", "html": "<strong>Small Batch, Real farmers. Real flavor.&nbsp;</strong>" }
  ],
  "cta": { "label": "Get to know us", "href": "/about-us", "ariaLabel": "Go to Get to know us", "title": "Get to know us", "target": "_self" },
  "image": { "src": "https://images.prismic.io/sunny-dayz/_DktzfZi16WXxGd2_Lifestyle_Fishing_SunnyDayz.jpg?auto=format%2Ccompress&rect=13%2C0%2C1744%2C1444&w=3840&fit=max", "alt": "Image" },
  "imageMobile": { "src": "https://images.prismic.io/sunny-dayz/_DktzfZi16WXxGd2_Lifestyle_Fishing_SunnyDayz.jpg?auto=format%2Ccompress&rect=0%2C68%2C1770%2C1308&w=3840&fit=max", "alt": "Image" },
  "contentSide": "left",      // text column on the left, photo on the right (from components_body__left)
  "textAlign": "left"
}
```
- `html` is sanitised inline HTML (only `strong/b/em/i/br/a/sup/sub/u/small/code` survive) and
  **may contain `&nbsp;` entities**. Render `html`, or render `text` if you do not want inline bold.
- `image` and `imageMobile` are the same photo with different crops (`rect=` in the URL): desktop
  1744×1444 and mobile 1770×1308. Use `imageMobile` below the mobile breakpoint.
- The tagline appears in two casings on the page: "Small Batch, **Real Farmers, Real Flavor.**"
  (marquee) and "Small Batch, **Real farmers. Real flavor.**" (About). Keep both as authored.
- `cta` is `null` and `blocks` is `[]` if absent. `contentSide` is `"left" | "right" | null`.

### 4.9 `unknown` (fallback, not present on the audited page)
```jsonc
{ "kind": "unknown", "ariaLabel": string | null, "padding": string | null, "className": "raw class attribute",
  "blocks": [ /* RICH blocks */ ], "links": [ /* Link */ ], "buttons": [ "label" ], "images": [ /* Image */ ] }
```
Any `<main>` section whose slice class the extractor does not recognise lands here, so no text is
dropped. A `codeembed` section with neither an iframe nor an `<a>`/`<img>` also falls through to
here. Treat an `unknown` in a fresh model as a signal to extend the extractor, not as a renderable
section.

---

## 5. Verification record

- Harness: `node tools/extract-model.mjs --type home` gives `{"home":{"pages":1,"errors":0,"below":0,"minCoverage":1}}`,
  with 0 missing words (re-run after the `spacingBottom` / `copiesA11y` additions).
- Layout and a11y flags, which coverage cannot see because they are not text, were checked with a
  regex pass over the raw `mainHtml` that is independent of the extractor. `spacing_bottom` classes
  sit on sections 2, 3 and 12 and `spacingBottom: true` is on exactly those 3. The marquee chunk
  tags are `[{}, {aria-hidden="true", inert}]` and `copiesA11y` matches. Run against the model from
  before these fields existed, the same check failed on all 4 points. The model diff for the fix is
  exactly those 4 additions and nothing else.
- Every one of the 109 distinct key names in `content/model/index.json` appears in this spec
  (control: removing `copiesA11y`, `spacingBottom` or `weightSeparator` from the spec text makes
  the check report that key).
- Stock-photo images: for the 108 non-stock cards, the product model's image equals the server-HTML
  RSC `asset.image` (108/108). For the 7 stock cards, the product models are placeholders and the
  server HTML holds a Prismic category image (table in Card → Stock photo). `mainHtml` holds none of
  those asset filenames (0 hits; control: the category tile asset `D9KtxlM_3PlvoZcg_Flower---Category`
  has 10 hits), and the homepage has no JSON-LD block (control: the same regex finds 2 on a product
  page).
- The card `brand`/`name` of all 115 cards were cross-checked against the DOM brand badge beside the
  name: 0 mismatches. The 20 `weight: null` cards are exactly the 20 Accessories cards.
- Positive controls (`--extractor tmp/control-home*.js`, models not written):
  - `cards` deleted from every product carousel: coverage 1.0 → 0.2449.
  - About `blocks` deleted: 1.0 → 0.8531.
  - `addToCartLabel` + `stockPhotoLabel` deleted: 1.0 → 0.9939. The missing words are "add",
    "stock" and "photo"; "cart" survives through product names ("Live Rosin Cart"). **This still
    passes the 0.98 gate**, so the gate does not by itself guarantee that these per-card labels
    are present. They are present in the model; see 4.4 and the Card shape.
  - Blind spot: blanking the visible marquee `label`s, the deals `titleSrText` and every
    `controls.prev/next.label` left coverage at **1.0**. The same words also sit in `ariaLabel`
    fields ("Small Batch, ...", "... 0 promotions available", "Previous slide"/"Next slide"), and
    coverage counts those, so the score cannot see this loss. Those visible fields were checked
    directly in `content/model/index.json` instead: all populated as shown in sections 3 and 4.
    **Templates must render `label` / `titleSrText`, not `ariaLabel`, as the visible text.**
