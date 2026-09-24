# Deployment

## Target

Any static host that (1) serves `/about-us` from `about-us.html` and `/collection/flower` from
`collection/flower/index.html` **without adding a trailing slash or a `.html`**, and (2) reads a
`_redirects` file. **Netlify** and **Cloudflare Pages** do both by default. Every URL the source
served keeps its exact address this way: the sitemap's 240 URLs were each requested from a local
server with the same rule and all answered 200 (`src/tools/finalize-seo.mjs --probe`, `audit/seo-finalize.json` → probe).

On nginx: `try_files $uri $uri.html $uri/index.html =404;` plus the redirects below as `return 301`.

## Build

```bash
none — dist/ is static and ships as-is
# to regenerate it: node src/tools/finalize.mjs
```

Publish directory: `dist/`. Site URL used for canonicals, sitemap and social tags: https://www.sunnydayzcannabis.com.

Serve text compressed (gzip or brotli): the home page's HTML is 261 KB raw and about 22 KB gzipped.
Netlify, Cloudflare Pages and GitHub Pages compress by default.

### The phone hero video

`assets/source/video/hero-portrait.mp4` is encoded once, outside the build (the build only copies it),
from the client's film — a 720×1080 centre crop, the slice a phone showed anyway, at 1.2 Mbps with no
audio (5.6 MB instead of 27.8 MB). To re-encode after the client supplies a new film:

```bash
ffmpeg -i assets/source/video/output-3.mp4 -vf "crop=720:1080:600:0" -c:v libx264 -preset slow \
  -profile:v high -crf 26 -maxrate 1200k -bufsize 2400k -pix_fmt yuv420p -an -movflags +faststart \
  assets/source/video/hero-portrait.mp4
```

### A preview under a sub-path (GitHub Pages)

`dist/` is built for a domain root, so every link is root-absolute. For a project-page preview such as
`https://<user>.github.io/<Repo>/`, generate a prefixed copy and check it from the live URL:

```bash
node src/tools/make-pages-preview.mjs --prefix /<Repo> --out <dir>      # marks every page noindex
node src/tools/crawl-preview.mjs --base https://<user>.github.io/<Repo>/ --pages-from <dir>
```

The preview is derived: regenerate it after every rebuild.

## DNS and redirects

No page on the source answered with a redirect during the crawl (`audit/site-inventory.json`:
0 pages with a `redirectChain`). The source's age gate redirected non-browser clients to
`/age-gate`; that was platform behaviour, not a moved URL, and is not reproduced.

The build adds these permanent redirects (`dist/_redirects`): the source served each strain page
under two spellings; the lowercase one is canonical.

| from | to | status |
|---|---|---|
| /strain/Cbd | /strain/cbd | 301 |
| /strain/Hybrid | /strain/hybrid | 301 |
| /strain/Indica | /strain/indica | 301 |
| /strain/Sativa | /strain/sativa | 301 |

Internal links that were dead on the live site (they answered 200 with a "404" page) were pointed at
the page they meant, or dropped; they are link changes, not redirects — see `src/content/link-fixes.json`.

## Headers

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
X-Frame-Options: SAMEORIGIN
Content-Security-Policy: default-src 'self'; script-src 'self' 'sha256-jEKeIZhl4a389+P5khwn9QmdZoDUXNSlnXFcMMiAgKE='; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; media-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'
```

The policy was tested by injecting it as a response header on 10 page types:
10 of 10 loaded with zero violations, with `site.js` running
(`audit/csp-check.json`, `src/tools/csp-check.mjs`). The hash covers the one inline script (the
`no-js` → `js` class switch); if that line changes, recompute it. Control: with the hash removed the
same run records a `script-src` violation, so the test can fail. `style-src 'unsafe-inline'` is
needed for the per-element custom properties in `style` attributes (stagger indexes, crop origins).

External hosts the pages link to (none is loaded as a script, style or frame):

| host | pages | what |
|---|---|---|
| www.facebook.com | 146 | share link — the source’s Share buttons on product pages (src/content/model → share) |
| twitter.com | 146 | share link — the source’s Share buttons on product pages (src/content/model → share) |
| pinterest.com | 146 | share link — the source’s Share buttons on product pages (src/content/model → share) |
| wa.me | 146 | share link — the source’s Share buttons on product pages (src/content/model → share) |
| www.p65warnings.ca.gov | 63 | Prop 65 warning link (product pages, source copy) |
| app.treezloyalty.com | 1 | Sun Club loyalty sign-up (the client’s Treez loyalty programme) |
| maps.google.com | 1 | store directions link |

## Forms

The source's forms (`audit/architecture.json` → formsByAction):

| action | fields | pages |
|---|---|---|
| (same page) [get] | brands-search | /brands, /weed-delivery/dispensary-in-glendale |

Both are search/filter forms that post nowhere. The rebuild keeps them as GET forms with a real
`action` (`/brands` and the page itself) and filters the list in the browser; without JavaScript
they still submit to a page that shows the full list. No form collects personal data, so none
needs a back end.

## Post-deploy verification

```bash
node ~/.claude/skills/site-reforge/scripts/sr-parity.mjs --project . --new dist --map audit/parity-map.json
node ~/.claude/skills/site-reforge/scripts/sr-decontaminate.mjs --project . --strict
node src/tools/csp-check.mjs          # against a local server; edit BASE to point at the deployed host
```
