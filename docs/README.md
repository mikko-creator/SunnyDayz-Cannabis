# Sunny Dayz Cannabis — developer README

A redesign of https://www.sunnydayzcannabis.com ("Sunlit Clay": neumorphic clay surfaces, grain and contour textures,
pop-out imagery, scroll-driven motion), rebuilt as a static site with no runtime dependencies.
Every word on the pages comes from the live site; the evidence for every decision is in `audit/`.

- **250 pages**, 4 redirects, 0 build errors, 0 broken internal links, 0 missing images (`src/content/build-report.json`).
- The hero is the client's own video, full-bleed at 100vw: the 1920×1080 MP4 on desktop and a 720×1080 centre crop (5.6 MB, no audio) on phones in portrait. It starts after the page has loaded, and not at all under reduced motion or Save-Data (the play button still starts it).
- 12 category images were generated with fal.ai for the redesign — see `docs/CHANGE-LOG.md` → Imagery.

## Run it locally

```bash
node src/tools/serve.mjs --root dist --port 8080
```

Then open http://localhost:8080. `dist/` is prebuilt; nothing needs installing (Node 18+ only).
`src/tools/serve.mjs` is the zero-dependency static server from the site-reforge toolkit, copied
verbatim; it serves `/about-us` from `about-us.html` the way the production host must.

To rebuild `dist/` from source:

```bash
node src/tools/finalize.mjs     # build -> SEO pass (robots, sitemap, llms.txt, social tags) -> sitemap/llms from canonicals
```

The SEO step calls `sr-seo.mjs` from the site-reforge skill (`~/.claude/skills/site-reforge/scripts`).
Without the skill, `node src/build.mjs` still produces every page, but not robots.txt,
sitemap.xml or llms.txt.

## Structure

| path | what |
|---|---|
| `src/build.mjs`, `src/build/` | the generator: layout, components, one template per page type |
| `src/styles/tokens.css` | the brand system — change values HERE, never at a call site |
| `src/styles/motion.css` | animation copied verbatim from the source site (52 keyframes) — kept as evidence, built but not linked: nothing references it |
| `src/styles/redesign-motion.css` | the redesign's own scroll-driven motion + reduced-motion block |
| `src/styles/{base,neumorph,components}.css` | textures, neumorphic primitives, components |
| `src/scripts/site.js` | all behaviour (age gate, menus, demo cart, filters, store status) — no framework |
| `src/assets/` | fonts (self-hosted), generated imagery (`img/gen/`), brand marks |
| `src/content/model/*.json` | the extracted content of every source page (264 files) |
| `src/content/chrome.json` | header, mega menu, footer and compliance copy, each string looked up in the capture |
| `dist/` | built output that ships |
| `assets/source/` | original assets as downloaded from the live site — kept in the project workspace, not in the git repository (about 650 MB); `src/build.mjs` reads them, so a rebuild needs that folder |
| `audit/` | inventories, reports and the gate record |
| `src/tools/` | the project's own verification and generation tools |
| `docs/` | this directory — `QA-LOG.md` (hand-written) records the QA rounds, the phone pass and what the client must decide |

## Before you change anything

Read `docs/CHANGE-LOG.md`. Every one of the 1531 sections of the old site has a recorded
decision; that file says which were improved, which were replaced and why, and lists every string
that was added, derived or removed.

## Known open items

### Gate
- **C07** Image inventory completed with real dimensions: FAIL — 16 same-origin image(s) never downloaded
  Why: the 16 entries are srcset parse artifacts, not images: the source writes `…png?auto=format,compress?w=N`, the extractor split the srcset at that comma and resolved the tail as a page-relative URL (`/compress?w=1080&q=100`, …). 16 of 16 are referenced by no page. They are closed in `audit/failures.json` by `src/tools/accept-failures.mjs`; the inventory itself is left as the extractor wrote it.
- **C20** No invented content: FAIL — 0 blocker + 12 major unsourced claims
  Why: every remaining finding is copy that appears on the live site in the same context — traced one by one in `audit/fabrication-trace.json` (12 of 12 traced, 0 untraced).
- **C22** Design matches the source pixel-for-pixel at every breakpoint: FAIL — worst drift 98.625% on product.768.png
  Why: this is a redesign; the pixel comparison against the old design is expected to differ. The per-page drift is in `audit/pixeldiff-report.json`.

### Must be wired before this replaces the live site
- **Ordering.** The cart is a front-end demo kept in the browser (`localStorage` key `sdz-cart`).
  Real ordering is the client's Treez storefront; the hook points carry `data-integration`:
  - `treez-express-delivery` — 830 element(s) on 250 page(s)
  - `treez-checkout` — 250 element(s) on 250 page(s)
  The checkout button links to `https://www.sunnydayzcannabis.com/checkout`, which exists only while Treez serves that domain.
- **Social links.** The source's Instagram/Facebook links point to "/" and the store record has no
  profiles; they were left out. The client needs to supply the URLs.
- **Age gate.** It works the same way (21+ confirmation, remembered in `localStorage`). The source's
  EXIT behaviour could not be captured; here EXIT goes back when the visitor came from another site,
  and otherwise leaves for `https://www.google.com/` — set `ageGateExitUrl` in `src/content/chrome.json`
  to change that. The Terms and Privacy pages are readable without passing the gate (the gate links to
  them). Both are the client's compliance call — see `docs/QA-LOG.md`.

### Content on the live site the client should review (kept verbatim — not ours to rewrite)
- Testimonials name other businesses (a Stiiizy dispensary, Rancho Santa Fe) — they read as template copy, not Sunny Dayz reviews — /dispensary/sunny-dayz, /weed-delivery/dispensary-in-glendale
- Location page is an unfilled template: "[Name] Dispensary", Los Angeles zip codes, "Glandale" — /weed-delivery/dispensary-in-glendale
- "[Your Company Name]" placeholder left in the article — /blog/cannabinoids-and-the-body--all-new-products
- Markdown residue "**" printed at the start of list paragraphs — /blog/whats-the-best-vape-pen-for-you
- Article promotes another business ("King’s Crew", Long Beach, CA) — /blog/purple-wookie-strain
- A stray paragraph reading only "3.5" — /blog/the-best-strains-for-the-summer
- Opening-hours typo "10:00am to 9:00am" — /contact-us
- E-mail address typo "sonnydayz" — /dispensary/sunny-dayz
- Category label misspelt "TINTURES" — /dispensary/sunny-dayz, /
- 41 product photos served by the storefront are under 400px wide; they are shown as-is (`src/content/build-report.json` → images.lowRes).
- The source's own SEO defects (missing descriptions, short titles, one canonical pointing at a URL
  that does not exist) are listed in `audit/seo-report.json` → findings.source. Descriptions were
  derived only where the source had none (see CHANGE-LOG).
