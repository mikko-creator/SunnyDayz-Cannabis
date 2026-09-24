# Blog content model: `blog-index` and `blog-post`

Extractors: `src/extract/blog-index.js`, `src/extract/blog-post.js`.
Output: `content/model/<slug>.json`, one per page. Reports: `content/model-report.blog-index.json` and `content/model-report.blog-post.json`.

## Pages covered (7)

Every inventory (`content-inventory`, `site-inventory`, `link-graph`, `seo-inventory`) lists exactly these 7 URLs. There are no case variants, no query-string variants, no render errors and no soft-404s among them.

| type | URL path | model file (`slug`) |
|---|---|---|
| blog-index | `/blog` | `blog.json` |
| blog-post | `/blog/the-best-strains-for-the-summer` | `blog-the-best-strains-for-the-summer.json` |
| blog-post | `/blog/cannabinoids-and-the-body--all-new-products` | `blog-cannabinoids-and-the-body-all-new-products.json` |
| blog-post | `/blog/whats-the-best-vape-pen-for-you` | `blog-whats-the-best-vape-pen-for-you.json` |
| blog-post | `/blog/quiz-toasties-classic-and-toasties-bold--which-toa` | `blog-quiz-toasties-classic-and-toasties-bold-which-toa.json` |
| blog-post | `/blog/camino-gummies-ranked-by-customer-reviews` | `blog-camino-gummies-ranked-by-customer-reviews.json` |
| blog-post | `/blog/purple-wookie-strain` | `blog-purple-wookie-strain.json` |

**Slug edge case.** Two source URLs contain a double hyphen (`--all-new-products`, `--which-toa`), and the quiz slug is cut off mid-word at the source (`which-toa`). The model filename collapses `--` to `-`, but every `href` in every model keeps the source path exactly. Route pages by `href` or `url`, never by rebuilding a path from the filename.

## File wrapper (written by the harness, same for every type)

```jsonc
{
  "url": "https://www.sunnydayzcannabis.com/blog",   // absolute source URL
  "slug": "blog",                                   // model filename without .json
  "type": "blog-index",                             // or "blog-post"
  "title": "Blogs",                                 // <title> of the source page
  "seoTitle": "Blogs",                              // same value as title
  "model": { /* shapes below */ }
}
```

Source `<title>` values: `/blog` is **"Blogs"**. Each post's title equals its h1 (for example "Camino Gummies Ranked by Customer Reviews", "QUIZ: TOASTIES CLASSIC AND TOASTIES BOLD – WHICH TOASTIES STYLE IS FOR YOU?").

---

## Shared sub-shapes

### `PostCard` (a teaser `<article class="article_article__…">`)
Used in `blog-index.featured.thumbs[]`, `blog-index.allPosts.posts[]`, `blog-post.featured.posts[]` and `blog-post.related.posts[]`.

| field | type | optional | notes |
|---|---|---|---|
| `title` | string | no | Source casing is kept (some titles are ALL CAPS). Do not change the case in data; use CSS if needed. |
| `href` | string | no | Site-relative, e.g. `/blog/the-best-strains-for-the-summer`. |
| `excerpt` | string \| null | yes | Truncated by the server to **100 characters + "..."** on all 6 posts, sometimes mid-word ("…Purple Wooki..."). Render as given. It is in the DOM of every card, but **not in the 1440px rendered text** (CSS-hidden at that width). Visibility at other widths was not verified. |
| `date` | string \| null | yes | Display date, e.g. `"July 20th, 2024"`. **null for Purple Wookie** (the source has no `<time>`). |
| `datetime` | string \| null | yes | ISO date from `<time datetime>`, e.g. `"2024-07-20"`. null when `date` is null. |
| `dateLabel` | string \| null | yes | `<time aria-label>`, e.g. `"Published on: July 20th, 2024"`. Use as the accessible name. |
| `image` | `{src, alt}` \| null | yes | The largest srcset candidate, e.g. `https://images.prismic.io/sunny-dayz/Z5vMbpbqstJ9-DzZ_mariguana-alimentos.webp?auto=format%2Ccompress&fit=max&w=3840`. Alt is always the generic `"Preview image of the article"`. |
| `shareLabel` | string \| null | yes | aria-label of the icon-only native share button, `"Share"`. The button has no visible text. |

Example (real, from `/blog`):
```json
{"title":"THE BEST STRAINS FOR THE SUMMER","href":"/blog/the-best-strains-for-the-summer",
 "excerpt":"Summer is the perfect time to explore and enjoy cannabis, with longer days, warm nights, and a more ...",
 "date":"July 20th, 2024","datetime":"2024-07-20","dateLabel":"Published on: July 20th, 2024",
 "image":{"src":"https://images.prismic.io/sunny-dayz/Z5vMbpbqstJ9-DzZ_mariguana-alimentos.webp?auto=format%2Ccompress&fit=max&w=3840","alt":"Preview image of the article"},
 "shareLabel":"Share"}
```

The source has **no category, tag, author or read-time** on any card or post, in either the DOM or the JSON-LD. Those fields are deliberately absent. Do not add them to templates.

### `Breadcrumb`: `[{label: string, href: string|null}]`
The last crumb (the current page) has `href: null`.
- `/blog`: `[{"label":"Home","href":"/"},{"label":"Our Blog","href":null}]`
- post: `[{"label":"Home","href":"/"},{"label":"Blogs","href":"/blog"},{"label":"<post title>","href":null}]`

The same page is labelled **"Our Blog"** on the index and **"Blogs"** in the post breadcrumbs. That mismatch comes from the source.

### `Image`: `{src: string, alt: string}`
`src` is an absolute Prismic URL (`images.prismic.io/sunny-dayz/…?auto=format%2Ccompress&fit=max&w=3840`), already unwrapped from `/_next/image`.

---

## `blog-index` model (`/blog`)

```jsonc
{
  "breadcrumb": Breadcrumb,                 // [{Home,/},{Our Blog,null}]
  "h1": "Our Blog",                         // string
  "search": {                               // object | null (null if the page has no search box)
    "placeholder": "Search",                // input placeholder
    "inputLabel": "Search",                 // input aria-label
    "inputName": "searchBox",               // input name attribute
    "inputType": "search",
    "buttonLabel": "Search"                 // submit button: visible text, or its aria-label when icon-only (it is icon-only here)
  },
  "featured": {                             // object | null
    "heading": "Featured posts",            // h2
    "slides": [FeaturedSlide],              // 5 on the source: the 5 newest dated posts
    "thumbs": [PostCard],                   // 5: vertical thumbnail rail, same posts and order as slides
    "bulletCount": 5                        // number of swiper pagination dots (the dots have no text)
  },
  "allPosts": {
    "heading": "All Posts",                 // h2.blog__collection_title
    "posts": [PostCard],                    // 6 on the source, newest first; Purple Wookie is last with date null
    "emptyState": null                      // string | null: text of the grid area when it renders no posts (never seen; null on the source)
  },
  "pagination": null,                       // {labels: string[], links: [{label, href}]} | null. The source has NO pagination: every post is on one page.
  "jsonld": [ {"@type":"BreadcrumbList", …} ]   // raw JSON-LD objects found in <main>
}
```

### `FeaturedSlide`
| field | type | optional | example |
|---|---|---|---|
| `title` | string | no | `"THE BEST STRAINS FOR THE SUMMER"`. On the source this is an **`<h1>`** inside every slide, so `/blog` has 6 h1 elements. The template should render it as h2 (or lower) to keep one h1 per page. That is a design choice, not a source fact. |
| `href` | string | no | `"/blog/the-best-strains-for-the-summer"`. The whole slide is one link. |
| `date` / `datetime` / `dateLabel` | string \| null | yes | same meaning as in PostCard |
| `image.desktop` | Image \| null | yes | alt `"Thumbnail image of the article"` |
| `image.mobile` | Image \| null | yes | The same `src` as desktop on every slide of the source. Keep both fields for art direction. |
| `shareLabel` | string \| null | yes | `"Share"` |

Source facts: the slider uses a fade effect with 5 slides and 5 bullets, driven by a vertical thumbs rail. The rail cards carry `excerpt`; the big slides do not. Purple Wookie (undated) is never featured.

**Edge cases.** `allPosts.posts` can be empty; in that case `emptyState` holds whatever text the grid area renders, and on the source it is null. Search results and a "no results" state were never rendered in any capture, so no copy exists for them. The template must not invent a no-results message; flag it for the client instead.

---

## `blog-post` model (`/blog/<slug>`)

```jsonc
{
  "breadcrumb": Breadcrumb,                 // Home > Blogs > <title>
  "h1": "Camino Gummies Ranked by Customer Reviews",  // string, from the hero banner
  "date": "February 24th, 2024",            // string | null (null on purple-wookie-strain)
  "datetime": "2024-02-24",                 // string | null
  "dateLabel": "Published on: February 24th, 2024",   // string | null
  "shareLabel": "Share",                    // string | null: icon-only native share button in the hero
  "hero": {                                 // object | null
    "desktop": {"src": "https://images.prismic.io/sunny-dayz/Z5vMr5bqstJ9-D0a_Camino-Relaunch-Mobile.png?auto=format%2Ccompress&fit=max&w=3840", "alt": "Blog banner"},
    "mobile":  {"src": "…same…", "alt": "Blog banner"}
  },
  "body": [RichBlock],                      // article body, in source order
  "featured": {                             // object | null: sidebar rail
    "heading": "Featured post",             // singular here; the index says "Featured posts"
    "posts": [PostCard]                     // 5: the same 5 newest dated posts on every post page, INCLUDING the current post
  },
  "productCarousels": [ProductCarousel],    // [] on 5 posts; 1 ("Best Flower") on the-best-strains-for-the-summer
  "related": {                              // object | null
    "heading": "Related Post",              // singular, from the source
    "posts": [PostCard],                    // 5: every other post, EXCLUDING the current one, newest first; Purple Wookie is last with date null
    "nav": SliderNav
  },
  "order": ["hero","breadcrumb","article","productCarousel","related"],  // DOM order of top-level blocks ("productCarousel" appears only when present)
  "jsonld": [ {"@type":"Article", …}, {"@type":"BreadcrumbList", …} ]
}
```

`"article"` in `order` means the `.blog-article` container. In the DOM it holds the `featured` rail first and then the `body`. How the two sit side by side on screen at each breakpoint was not measured here; take it from the design captures.

Hero facts: `hero.desktop.src === hero.mobile.src` on all 6 posts, and it is the same image as that post's `PostCard.image`. Every hero has an image.

### `RichBlock` (the `RICH()` blocks from `_common.js`, with every `text` re-read inline-aware)
`RICH()` gives the block structure and `html`. `blog-post.js` then re-reads every `text` (headings, paragraphs, list items, quotes, table cells) from that block's own source element with `bpText()`. Inline siblings join with no separator, as the browser renders them; `<br>` and block elements become one space; whitespace is collapsed. This replaces `T()` from `_common.js`, which puts a space between every pair of text nodes. `T()` turned the source's `<strong>For Beginners</strong>: If …` into `"For Beginners : If …"`, which was wrong in 10 vape-post paragraphs before this fix. So `text` is the plain text as displayed and equals the text of `html` (with `<br>` read as a space). If the two traversals ever disagree, the extractor throws and the page reports an error; it never emits misaligned text.

| `t` | fields | seen on |
|---|---|---|
| `"p"` | `text` (plain, as displayed), `html` (inline HTML limited to a/strong/b/em/i/br/sup/sub/u/small/code, with site-relative links) | all posts |
| `"h2"` | `text` | purple-wookie-strain (7). The source wraps each heading's text in `<strong>`; the model keeps only the text. |
| `"h3"` | `text` | summer (8), cannabinoids (3), vape (6) |
| `"ul"` / `"ol"` | `items: [{text, html}]` | summer (7 `ul`) |
| `"img"` | `src`, `alt` | not present in any post body |
| `"quote"`, `"table"`, `"hr"` | see `_common.js` | not present |

Block counts per post: camino `p:16` · quiz `p:19` · cannabinoids `p:13 h3:3` · vape `p:17 h3:6` · summer `p:17 h3:8 ul:7` · purple-wookie `h2:7 p:12`.

Body edge cases to handle in templates:
- **Bold paragraphs used as headings.** Camino and Quiz have no heading elements; their section titles are `{"t":"p","html":"<strong>1. Flavor and Taste</strong>"}`. Cannabinoids opens paragraphs with `<strong>1. The Endocannabinoid System (ECS)</strong><br>The ECS…`. Keep them as paragraphs; if needed, style a `p` whose `html` is exactly one `<strong>…</strong>` as a subheading.
- **Numbered headings.** Vape and summer `h3.text` include the number, e.g. `"1. Sour Diesel"`. Do not add CSS counters on top of that.
- **Labels inside paragraphs.** In summer, `"Key Benefits:"` is a `p` whose html is `<strong>Key Benefits:</strong>`, followed by a `ul`.
- **Empty spacer paragraphs.** Purple Wookie has 5 empty `<p></p>` elements that `RICH()` drops. Paragraph spacing replaces them.
- **No links and no images** occur inside any post body. `html` may still contain `<a href>` if the content changes; links are already site-relative.

### `ProductCarousel` (summer post only: `section[aria-label="Best Flower carousel"]`)
```jsonc
{
  "ariaLabel": "Best Flower carousel",
  "heading": "Best Flower",
  "seeAll":      {"label":"See all","href":"/collection/flower","ariaLabel":"Go to /collection/flower"},  // header link | null
  "cards": [ProductCard],                 // 20
  "seeAllSlide": {"label":"See all","href":"/collection/flower","ariaLabel":"Go to /collection/flower"},  // final slide (slide 21 of 21) | null
  "nav": SliderNav                        // ariaLabel "Best Flower carousel navigation"
}
```

`ProductCard` is the `CARD()` shape from `_common.js` plus two label fields:
```json
{"url":"/product/mass-yield-mass-yield-peanut-butter-gelato-3-5g-flower-3-5-g-flower-3-5-grams",
 "name":"Mass Yield - Peanut Butter Gelato - 3.5G Flower","brand":"MASS YIELD","price":"$25","weight":"3.5g",
 "strain":"Indica","strainKey":"indica","thc":"22.39%","tac":"26.6%","cbd":null,
 "badges":["MASS YIELD","Indica","THC: 22.39%","TAC: 26.6%","PRE PACK"],
 "image":{"src":"","alt":"Mass Yield - Peanut Butter Gelato - 3.5G Flower","placeholder":true},
 "stockPhoto":false,"addToCartLabel":"Add To Cart","stockPhotoLabel":null}
```
- `image.placeholder: true` on **all 20 cards**. That is correct for the extractor contract: every card `<img>` in the rendered `<main>` is `src=".../images/product-placeholder.svg"` with no `srcset`, and the rendered carousel has no CloudFront, Prismic or `/_next/image` URL anywhere. **It is not lazy loading.** The server HTML (`audit/raw/blog-the-best-strains-for-the-summer.html`) has a real next/image `srcSet` (640w…3840w) on all 20 cards, so the page's client-side code swapped the placeholder in during the headless render. Why it did (for example an image-error fallback) was not traced.
- **Image join (build step).** Join each card to the product page's model through `url`. This was checked on all 20 cards:
  - **19 cards** resolve to a product model whose image is the same CloudFront asset the server HTML carries for that card (URLs compared without the query string).
  - **1 card does not resolve: "Breathe Free - Guava Biscotti - 3.5G Flower"** (card 10 of 20, the `stockPhoto` card). Its product model `product-breath-free-breathe-free-guava-biscotti-3-5g-flower-3-5-g-flower-3-5-grams.json` is also `[{"src":"","placeholder":true}]`. That page's rendered DOM has only the placeholder, while its server HTML references the stock image 28 times. The image the source serves for this card, per both pages' server HTML, is `https://images.prismic.io/sunny-dayz/Z5vMhZbqstJ9-Dzv_flowers-sativa.png?auto=format,compress` (alt `"Breathe Free - Guava Biscotti - 3.5G Flower"`). The build needs an explicit fallback for this card, such as taking that URL from the server HTML. Otherwise it renders a "Stock photo" label over no image. The URL is deliberately **not** in the model, because the extractor reads only the rendered DOM and JSON-LD.
- `stockPhoto: true` and `stockPhotoLabel: "Stock photo"` on 1 card ("Breathe Free - Guava Biscotti - 3.5G Flower"). Render the label over the image when present.
- `strain` / `strainKey` are null on 2 cards (Breathe Free, Doja Confetti). `cbd` is set on 5 cards and `tac` on 8; otherwise null.
- `brand` is the source's badge text and can differ from the name (for example "BREATH FREE" vs "Breathe Free - …"). Do not correct it.
- `addToCartLabel` is `"Add To Cart"`; the live site upper-cases it with CSS. The favorites button is icon-only with aria-label `"Add <name> to favorites"`, and that label is not stored.
- The price and weight render as `"$25" / "3.5g"` with a literal `/` separator that is not stored.

### `SliderNav`
```json
{"ariaLabel":"Carousel navigation","prev":{"text":"Previous","ariaLabel":"Previous slide"},"next":{"text":"Next","ariaLabel":"Next slide"}}
```
`text` is screen-reader-only (`.sr-only`); the visible buttons are arrow icons. The whole object is null when the slider has no navigation.

### `jsonld` (raw)
Each post has two objects:
```json
{"@context":"https://schema.org","@type":"Article","dateModified":"2025-01-30T19:10:56+0000","datePublished":"2025-01-30T19:10:56+0000",
 "description":"","headline":"","image":[],
 "mainEntityOfPage":{"@id":"https://www.sunnydayzcannabis.com//blog/camino-gummies-ranked-by-customer-reviews","@type":"WebPage"}}
```
plus a `BreadcrumbList` whose crumb 2 has `@id "/blog/"` (trailing slash). The source's Article JSON-LD is hollow: `headline`, `description` and `image` are empty, there is no author, and both dates are a **2025-01-30 migration timestamp** that does not match the visible date (for example 2024-02-24). The `@id` also has a double slash. For the rebuild's SEO, generate Article JSON-LD from `h1`, `datetime`, `hero` and the first `body` paragraph. Do not copy these dates.

---

## Layout defect on the live site: horizontal overflow at 390px

The brief said *one* post overflows. Measured live on 2026-09-23 (headless Chrome, 390×900, pages loaded one at a time, analytics blocked; run once in desktop mode and once with mobile emulation, same result), **all six posts** overflow and `/blog` does not.

| page | `documentElement.scrollWidth` at 390 |
|---|---|
| `/blog` | 390 (no overflow) |
| each of the 6 posts | **405** (15px of horizontal scroll) |

The one element causing it on every post is the **"Related Post" slider container**:
`main > section.relatedpost_blog_article__related_post__HAIec > div.container_container__nHyh4.Slider_slider__container__BV14s`,
with computed `width: 390px` (the full viewport width), `margin-left: 15px`, `margin-right: -15px`, `padding-left/right: 15px`, `max-width: none` and `overflow-x: clip`. Its box spans x = 15 to 405, 15px past the viewport. The CSS rule that produces the 390px width was not traced; only the computed values were measured. Nothing else leaks: the product carousel on the summer post and the off-screen swiper slides are clipped by their containers.

The audit's own capture `audit/capture/baseline.blog-purple-wookie-strain.390.style.json` records the same box (`x:15, w:390`). The audit captured only Purple Wookie and `/blog` at 390, which probably explains why the brief said one post. **Do not reproduce this.** Size the related-posts slider to its container (`width:auto` / `max-width:100%`) and keep the 15px gutter as padding.

---

## Content issues in the source copy (the model keeps them verbatim; raise with the client)

Nothing below was altered, because the model never invents or edits text.
1. **cannabinoids-and-the-body--all-new-products**: the unfilled template placeholder **"[Your Company Name]"** appears in 2 body paragraphs: "At [Your Company Name], we are excited to introduce…" and the Conclusion paragraph.
2. **whats-the-best-vape-pen-for-you**: 8 paragraphs start with literal Markdown residue `**1.` … `**5.`. For example `body[7]` is `text: "**1. Oil Vape Pens: Designed for…"` with `html: "**1. <strong>Oil Vape Pens</strong>: Designed for…"`. Only the label after the number is really bold; the `**` is visible text.
3. **purple-wookie-strain**: the body promotes **"King's Crew Dispensary"** in **"Long Beach, CA"** / "Southern California", which is another business in another state. The site chrome gives the Sunny Dayz store as "105 Greenfield Rd, South Deerfield, MA 01373". Across the body, "King's Crew" appears in 5 blocks and "Long Beach" in 4. The post also has no publish date.
4. **the-best-strains-for-the-summer**: the body ends with a lone paragraph `"3.5"`, kept as `{"t":"p","text":"3.5","html":"3.5"}` (`body[31]`). **It is authored content, not a leak.** In the page's Prismic payload (`audit/raw/blog-the-best-strains-for-the-summer.html`) it is the last item of the post's `main_content` rich-text array, `{"type":"paragraph","text":"3.5","spans":[]}`, right after "…Enjoy your summer and happy exploring!". The server also renders it as `<p>3.5</p>` inside the article. The Best Flower `products_carousel` slice has no weight field at all: its primary fields are `limit:20, sort_by:default, type:flower, filter_by_brand:default, product_group_id:null, filter_by_on_sale:false, filter_by_store:true` and `effects/flavors/generals:null`, plus title, see-all, spacing and colour fields. Why the editor typed it is unknown; a stray entry is a guess, not verified. Render it like any paragraph and ask the client whether to delete it at the source. Do not suppress it in a template.
5. **quiz-toasties-classic-and-toasties-bold--which-toa**: the title and closing line promise a quiz ("Take our quiz…"), but the page has no quiz, form, input or iframe. The copy describes toasted sandwiches.
6. Titles mix ALL CAPS and Title Case, the index h1 is "Our Blog" while the `<title>` is "Blogs", and the headings are singular "Featured post" and "Related Post". All of this is verbatim source.

---

## Verification (2026-09-23)

- `node tools/extract-model.mjs --type blog-index` gives `{"pages":1,"errors":0,"below":0,"minCoverage":1}`.
- `node tools/extract-model.mjs --type blog-post` gives `{"pages":6,"errors":0,"below":0,"minCoverage":1}` (every page 1.0).
- Positive controls (`--extractor`, models not written; each report was regenerated with the real extractor afterwards):
  - `tmp/control-blog.js` (post extractor without `body`): `{"pages":6,"errors":0,"below":6,"minCoverage":0.1907}`. Per page: purple-wookie 19.1%, vape 23.1%, cannabinoids 23.2%, quiz 24.0%, camino 24.8%, summer 49.3%.
  - `tmp/control-blog-carousel.js` (without `productCarousels`): only summer drops, to 0.7383 (missing `$25 3.5g mass yield peanut butter…`). The other 5 stay at 1.0.
  - `tmp/control-blog-index.js` (index without `allPosts`): `/blog` drops to 0.9362 (missing `purple wookie strain`, the only post not also in the featured slider).
- The coverage measure uses **visible** 1440px text (`innerText`). Fields that hold DOM-only text (`excerpt`, aria labels, `jsonld`) are extra; they are not what makes the pages pass.
- **Coverage cannot see punctuation or spacing.** It tokenises on `[a-z0-9$%.]`, so the old `"For Beginners : If"` defect scored 1.0. Body text fidelity is checked separately:
  - `node tmp/blog-textcheck.mjs` checks that every `body[].text` and `items[].text` occurs verbatim (whitespace-collapsed) in the rendered `mainText`, and flags any model string with a space before `: , ; ) . ! ?`. Before the fix it reported `{"bodyTexts":139,"notInRender":10,"spacePunct":10}`, exactly the 10 vape paragraphs, which proves the check can fire. After the fix it reports `{"bodyTexts":139,"notInRender":0,"spacePunct":0}`.
  - `text` vs the text of `html` (tags stripped, `<br>` read as a space): 0 differences across all 115 blocks and items that carry `html`.
  - `tmp/run-probe-inline.mjs` lists every element in the 7 rendered `<main>`s where `T()` differs from an inline-aware read. Besides the 10 vape paragraphs, the only differences are `<script>`/`<style>` bodies (not text) and the slider's "Previous"/"Next" button pair, which the model stores per button. No other model field is affected.
  - A model diff against the pre-fix snapshot changed exactly 10 paths (`blog-whats-the-best-vape-pen-for-you` `body[3,4,7,8,9,12,13,14,15,16].text`) and nothing in the other 6 models.
  - Fail-closed control: `tmp/control-blog-align.js` (the real extractor with one text source dropped to misalign the traversal) gives `{"pages":6,"errors":6}`, so the alignment guard fires. The reports were regenerated with the real extractor afterwards.
- Card images: `node tmp/blog-card-images.mjs` compares each Best Flower card's server-HTML image, rendered image and product-model image. It gives 20 of 20 with a real `srcSet` in the server HTML, 20 of 20 placeholders in the render, 19 joins resolving, and 1 failing (Breathe Free, see ProductCard).
- Final run (2026-09-23, after the fix): `blog-index` `{"pages":1,"errors":0,"below":0,"minCoverage":1}`; `blog-post` `{"pages":6,"errors":0,"below":0,"minCoverage":1}`.
