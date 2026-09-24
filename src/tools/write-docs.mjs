// write-docs.mjs — docs/README.md, DEPLOY.md, BRAND-SYSTEM.md, CHANGE-LOG.md from the evidence on
// disk. Every table is computed from an audit/ or src/content/ file named beside it; only the prose is
// authored. Client flags are located in dist/ at generation time, so each one cites real pages.
//   node src/tools/write-docs.mjs  (run after src/tools/finalize.mjs and the checks that feed it)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const J = (f, d) => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8')); } catch (e) { if (d !== undefined) return d; throw new Error('missing evidence: ' + f); } };
const T = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const F = '```';
const cell = (s) => String(s == null ? '' : s).replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();
const row = (...c) => '| ' + c.map(cell).join(' | ') + ' |';
const ORIGIN = 'https://www.sunnydayzcannabis.com';
const rel = (u) => String(u || '').replace(ORIGIN, '') || '/';

const project = J('project.json');
const build = J('src/content/build-report.json');
const ledger = J('audit/change-control.json');
const rules = J('audit/ledger-rules.json');
const match = J('audit/preset-match.json');
const parity = J('audit/parity-report.json', null);
const seoFin = J('audit/seo-finalize.json');
const seoRep = J('audit/seo-report.json');
const contrast = J('audit/contrast.json');
const csp = J('audit/csp-check.json');
const sweeps = J('audit/sweep-findings.json');
const derived = J('src/content/derived-descriptions.json');
const removed = J('src/content/removed.json');
const linkFixes = J('src/content/link-fixes.json');
const chrome = J('src/content/chrome.json');
const manifest = J('assets/generated/manifest.json');
const baseline = J('audit/design-baseline.json');
const arch = J('audit/architecture.json');
const fabTrace = J('audit/fabrication-trace.json');
const authz = J('facts/authorization.json');
const gate = J('audit/gate.json', null);

// ---- dist scans ---------------------------------------------------------------------------------
const DIST = path.join(ROOT, 'dist');
const htmlFiles = [];
(function walk(d, r) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const x = r ? r + '/' + e.name : e.name; if (e.isDirectory()) walk(path.join(d, e.name), x); else if (e.name.endsWith('.html')) htmlFiles.push(x); } }(DIST, ''));
const pagesWith = (re) => htmlFiles.filter((f) => re.test(fs.readFileSync(path.join(DIST, f), 'utf8'))).map((f) => '/' + f.replace(/(index)?\.html$/, '').replace(/\/$/, ''));
const hosts = new Map();
for (const f of htmlFiles) for (const m of fs.readFileSync(path.join(DIST, f), 'utf8').matchAll(/(?:href|src)="(https?:\/\/[^"]+)"/g)) { const h = new URL(m[1]).host; if (h === new URL(ORIGIN).host) continue; if (!hosts.has(h)) hosts.set(h, new Set()); hosts.get(h).add(f); }
const integ = new Map();
for (const f of htmlFiles) for (const m of fs.readFileSync(path.join(DIST, f), 'utf8').matchAll(/data-integration="([^"]+)"/g)) { if (!integ.has(m[1])) integ.set(m[1], { n: 0, pages: new Set() }); const x = integ.get(m[1]); x.n++; x.pages.add(f); }

const FLAGS = [
  ['Testimonials name other businesses (a Stiiizy dispensary, Rancho Santa Fe) — they read as template copy, not Sunny Dayz reviews', /Stiiizy|Rancho Santa Fe/],
  ['Location page is an unfilled template: "[Name] Dispensary", Los Angeles zip codes, "Glandale"', /\[Name\]|Glandale/],
  ['"[Your Company Name]" placeholder left in the article', /\[Your Company Name\]/],
  ['Markdown residue "**" printed at the start of list paragraphs', /<p>\*\*/],
  ['Article promotes another business ("King’s Crew", Long Beach, CA)', /King.s Crew|Long Beach/],
  ['A stray paragraph reading only "3.5"', /<p>3\.5<\/p>/],
  ['Opening-hours typo "10:00am to 9:00am"', /10:00am to 9:00am/],
  ['E-mail address typo "sonnydayz"', /sonnydayz/i],
  ['Category label misspelt "TINTURES"', /TINTURES/],
];
const flagRows = FLAGS.map(([what, re]) => [what, pagesWith(re)]).filter(([, p]) => p.length);

const gateFails = gate ? (gate.results || gate.checks || []).filter((c) => c.status !== 'PASS' && c.status !== 'NA') : null;
// the reason behind a check that is red by design or by an upstream artifact — printed only while it fails
const phantoms = (J('audit/image-inventory.json').images || []).filter((i) => !i.localFile && !i.external);
const GATE_WHY = {
  C07: `the ${phantoms.length} entries are srcset parse artifacts, not images: the source writes \`…png?auto=format,compress?w=N\`, the extractor split the srcset at that comma and resolved the tail as a page-relative URL (\`${rel(phantoms[0] && phantoms[0].src)}\`, …). ${phantoms.filter((i) => !(i.pages || []).length).length} of ${phantoms.length} are referenced by no page. They are closed in \`audit/failures.json\` by \`src/tools/accept-failures.mjs\`; the inventory itself is left as the extractor wrote it.`,
  C20: `every remaining finding is copy that appears on the live site in the same context — traced one by one in \`audit/fabrication-trace.json\` (${fabTrace.traced} of ${fabTrace.findings} traced, ${fabTrace.untraced} untraced).`,
  C22: 'this is a redesign; the pixel comparison against the old design is expected to differ. The per-page drift is in `audit/pixeldiff-report.json`.',
};
const tally = (l) => l.reduce((a, f) => { a[f.severity] = (a[f.severity] || 0) + 1; return a; }, {});
const allSweep = sweeps.dimensions.flatMap((d) => d.findings);
const sweepT = tally(allSweep);

fs.mkdirSync(path.join(ROOT, 'docs'), { recursive: true });

// ================================ README =========================================================
const README = `# Sunny Dayz Cannabis — developer README

A redesign of ${ORIGIN} ("Sunlit Clay": neumorphic clay surfaces, grain and contour textures,
pop-out imagery, scroll-driven motion), rebuilt as a static site with no runtime dependencies.
Every word on the pages comes from the live site; the evidence for every decision is in \`audit/\`.

- **${build.pages.length} pages**, ${build.redirects.length} redirects, ${build.errors.length} build errors, ${build.links.brokenInternal.length} broken internal links, ${build.images.missing.length} missing images (\`src/content/build-report.json\`).
- The hero is the client's own video, full-bleed at 100vw: the 1920×1080 MP4 on desktop and a 720×1080 centre crop (5.6 MB, no audio) on phones in portrait. It starts after the page has loaded, and not at all under reduced motion or Save-Data (the play button still starts it).
- ${manifest.items.length} category images were generated with fal.ai for the redesign — see \`docs/CHANGE-LOG.md\` → Imagery.

## Run it locally

${F}bash
node src/tools/serve.mjs --root dist --port 8080
${F}

Then open http://localhost:8080. \`dist/\` is prebuilt; nothing needs installing (Node 18+ only).
\`src/tools/serve.mjs\` is the zero-dependency static server from the site-reforge toolkit, copied
verbatim; it serves \`/about-us\` from \`about-us.html\` the way the production host must.

To rebuild \`dist/\` from source:

${F}bash
node src/tools/finalize.mjs     # build -> SEO pass (robots, sitemap, llms.txt, social tags) -> sitemap/llms from canonicals
${F}

The SEO step calls \`sr-seo.mjs\` from the site-reforge skill (\`~/.claude/skills/site-reforge/scripts\`).
Without the skill, \`node src/build.mjs\` still produces every page, but not robots.txt,
sitemap.xml or llms.txt.

## Structure

| path | what |
|---|---|
| \`src/build.mjs\`, \`src/build/\` | the generator: layout, components, one template per page type |
| \`src/styles/tokens.css\` | the brand system — change values HERE, never at a call site |
| \`src/styles/motion.css\` | animation copied verbatim from the source site (52 keyframes) — kept as evidence, built but not linked: nothing references it |
| \`src/styles/redesign-motion.css\` | the redesign's own scroll-driven motion + reduced-motion block |
| \`src/styles/{base,neumorph,components}.css\` | textures, neumorphic primitives, components |
| \`src/scripts/site.js\` | all behaviour (age gate, menus, demo cart, filters, store status) — no framework |
| \`src/assets/\` | fonts (self-hosted), generated imagery (\`img/gen/\`), brand marks |
| \`src/content/model/*.json\` | the extracted content of every source page (${fs.readdirSync(path.join(ROOT, 'src/content/model')).length} files) |
| \`src/content/chrome.json\` | header, mega menu, footer and compliance copy, each string looked up in the capture |
| \`dist/\` | built output that ships |
| \`assets/source/\` | original assets as downloaded from the live site — kept in the project workspace, not in the git repository (about 650 MB); \`src/build.mjs\` reads them, so a rebuild needs that folder |
| \`audit/\` | inventories, reports and the gate record |
| \`src/tools/\` | the project's own verification and generation tools |
| \`docs/\` | this directory — \`QA-LOG.md\` (hand-written) records the QA rounds, the phone pass and what the client must decide |

## Before you change anything

Read \`docs/CHANGE-LOG.md\`. Every one of the ${ledger.rows.length} sections of the old site has a recorded
decision; that file says which were improved, which were replaced and why, and lists every string
that was added, derived or removed.

## Known open items

### Gate
${gateFails === null ? 'The gate has not been run against this build yet (`audit/gate.json` absent).' : gateFails.length === 0 ? 'None — every gate check passed.' : gateFails.map((c) => `- **${c.id}** ${c.label}: ${c.status} — ${c.evidence}${GATE_WHY[c.id] ? `\n  Why: ${GATE_WHY[c.id]}` : ''}`).join('\n')}

### Must be wired before this replaces the live site
- **Ordering.** The cart is a front-end demo kept in the browser (\`localStorage\` key \`sdz-cart\`).
  Real ordering is the client's Treez storefront; the hook points carry \`data-integration\`:
${[...integ].map(([k, v]) => `  - \`${k}\` — ${v.n} element(s) on ${v.pages.size} page(s)`).join('\n')}
  The checkout button links to \`${ORIGIN}/checkout\`, which exists only while Treez serves that domain.
- **Social links.** The source's Instagram/Facebook links point to "/" and the store record has no
  profiles; they were left out. The client needs to supply the URLs.
- **Age gate.** It works the same way (21+ confirmation, remembered in \`localStorage\`). The source's
  EXIT behaviour could not be captured; here EXIT goes back when the visitor came from another site,
  and otherwise leaves for \`https://www.google.com/\` — set \`ageGateExitUrl\` in \`src/content/chrome.json\`
  to change that. The Terms and Privacy pages are readable without passing the gate (the gate links to
  them). Both are the client's compliance call — see \`docs/QA-LOG.md\`.

### Content on the live site the client should review (kept verbatim — not ours to rewrite)
${flagRows.map(([what, pages]) => `- ${what} — ${pages.join(', ')}`).join('\n')}
- ${build.images.lowRes.length} product photos served by the storefront are under 400px wide; they are shown as-is (\`src/content/build-report.json\` → images.lowRes).
- The source's own SEO defects (missing descriptions, short titles, one canonical pointing at a URL
  that does not exist) are listed in \`audit/seo-report.json\` → findings.source. Descriptions were
  derived only where the source had none (see CHANGE-LOG).
`;

// ================================ DEPLOY =========================================================
const siteUrl = seoFin.siteUrl;
const DEPLOY = `# Deployment

## Target

Any static host that (1) serves \`/about-us\` from \`about-us.html\` and \`/collection/flower\` from
\`collection/flower/index.html\` **without adding a trailing slash or a \`.html\`**, and (2) reads a
\`_redirects\` file. **Netlify** and **Cloudflare Pages** do both by default. Every URL the source
served keeps its exact address this way: the sitemap's ${seoFin.after.locs} URLs were each requested from a local
server with the same rule and all answered 200 (\`src/tools/finalize-seo.mjs --probe\`, \`audit/seo-finalize.json\` → probe).

On nginx: \`try_files $uri $uri.html $uri/index.html =404;\` plus the redirects below as \`return 301\`.

## Build

${F}bash
none — dist/ is static and ships as-is
# to regenerate it: node src/tools/finalize.mjs
${F}

Publish directory: \`dist/\`. Site URL used for canonicals, sitemap and social tags: ${siteUrl}.

Serve text compressed (gzip or brotli): the home page's HTML is 261 KB raw and about 22 KB gzipped.
Netlify, Cloudflare Pages and GitHub Pages compress by default.

### The phone hero video

\`assets/source/video/hero-portrait.mp4\` is encoded once, outside the build (the build only copies it),
from the client's film — a 720×1080 centre crop, the slice a phone showed anyway, at 1.2 Mbps with no
audio (5.6 MB instead of 27.8 MB). To re-encode after the client supplies a new film:

${F}bash
ffmpeg -i assets/source/video/output-3.mp4 -vf "crop=720:1080:600:0" -c:v libx264 -preset slow \\
  -profile:v high -crf 26 -maxrate 1200k -bufsize 2400k -pix_fmt yuv420p -an -movflags +faststart \\
  assets/source/video/hero-portrait.mp4
${F}

### A preview under a sub-path (GitHub Pages)

\`dist/\` is built for a domain root, so every link is root-absolute. For a project-page preview such as
\`https://<user>.github.io/<Repo>/\`, generate a prefixed copy and check it from the live URL:

${F}bash
node src/tools/make-pages-preview.mjs --prefix /<Repo> --out <dir>      # marks every page noindex
node src/tools/crawl-preview.mjs --base https://<user>.github.io/<Repo>/ --pages-from <dir>
${F}

The preview is derived: regenerate it after every rebuild.

## DNS and redirects

No page on the source answered with a redirect during the crawl (\`audit/site-inventory.json\`:
0 pages with a \`redirectChain\`). The source's age gate redirected non-browser clients to
\`/age-gate\`; that was platform behaviour, not a moved URL, and is not reproduced.

The build adds these permanent redirects (\`dist/_redirects\`): the source served each strain page
under two spellings; the lowercase one is canonical.

| from | to | status |
|---|---|---|
${build.redirects.map((r) => row(r.from, r.to, r.status || 301)).join('\n')}

Internal links that were dead on the live site (they answered 200 with a "404" page) were pointed at
the page they meant, or dropped; they are link changes, not redirects — see \`src/content/link-fixes.json\`.

## Headers

${F}
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
X-Frame-Options: SAMEORIGIN
Content-Security-Policy: ${csp.policy}
${F}

The policy was tested by injecting it as a response header on ${csp.headerInjectedOn} page types:
${csp.pages.filter((p) => p.violations.length === 0).length} of ${csp.pages.length} loaded with zero violations, with \`site.js\` running
(\`audit/csp-check.json\`, \`src/tools/csp-check.mjs\`). The hash covers the one inline script (the
\`no-js\` → \`js\` class switch); if that line changes, recompute it. Control: with the hash removed the
same run records a \`script-src\` violation, so the test can fail. \`style-src 'unsafe-inline'\` is
needed for the per-element custom properties in \`style\` attributes (stagger indexes, crop origins).

External hosts the pages link to (none is loaded as a script, style or frame):

| host | pages | what |
|---|---|---|
${[...hosts].sort((a, b) => b[1].size - a[1].size).map(([h, s]) => row(h, s.size, /schema\.org/.test(h) ? 'structured-data vocabulary URLs inside JSON-LD' : /P65/i.test(h) ? 'Prop 65 warning link (product pages, source copy)' : /maps\.google/.test(h) ? 'store directions link' : /treezloyalty/.test(h) ? 'Sun Club loyalty sign-up (the client’s Treez loyalty programme)' : /facebook|twitter|pinterest|wa\.me/.test(h) ? 'share link — the source’s Share buttons on product pages (src/content/model → share)' : 'UNDESCRIBED — review')).join('\n')}

## Forms

The source's forms (\`audit/architecture.json\` → formsByAction):

| action | fields | pages |
|---|---|---|
${arch.formsByAction.map((f) => row(f.action, (f.fields || []).join(', '), f.pages.map(rel).join(', '))).join('\n')}

Both are search/filter forms that post nowhere. The rebuild keeps them as GET forms with a real
\`action\` (\`/brands\` and the page itself) and filters the list in the browser; without JavaScript
they still submit to a page that shows the full list. No form collects personal data, so none
needs a back end.

## Post-deploy verification

${F}bash
node ~/.claude/skills/site-reforge/scripts/sr-parity.mjs --project . --new dist --map audit/parity-map.json
node ~/.claude/skills/site-reforge/scripts/sr-decontaminate.mjs --project . --strict
node src/tools/csp-check.mjs          # against a local server; edit BASE to point at the deployed host
${F}
`;

// ================================ BRAND-SYSTEM ===================================================
const layer = T('src/styles/tokens.css').split('/* >>> BEGIN REDESIGN LAYER')[1] || '';
// a trailing comment belongs to its own line only ([ \t]*, never \s*, or the next line's comment attaches)
const tok = [...layer.matchAll(/^[ \t]*(--[a-z0-9-]+):[ \t]*([^;]+);(?:[ \t]*\/\*[ \t]*(.*?)[ \t]*\*\/)?/gm)].map((m) => ({ name: m[1], value: m[2].trim(), note: m[3] || '' }));
// what a var()/color-mix() token actually paints, from the contrast measurement (Chrome-resolved)
const painted = new Map(contrast.pairs.flatMap((p) => [[p.fg, p.fgHex], ...p.stops.map((s) => [s.bg, s.bgHex])]).filter(([k]) => /^--/.test(k)));
const shownValue = (t) => '`' + t.value + '`' + (/^(var|color-mix)\(/.test(t.value) && painted.has(t.name) ? ' → ' + painted.get(t.name) : '');
const widths = [...new Set((baseline.capturedViewports || []).map((v) => (v.viewport && v.viewport.w) || v.w || v.width).filter(Boolean))].sort((a, b) => a - b);
const pick = (re) => tok.filter((t) => re.test(t.name));
const ROLE = { '--ink': 'primary text', '--ink-2': 'secondary text', '--ink-3': 'muted text', '--paper': 'text on dark / solid fills', '--sun': 'primary accent, CTAs', '--sun-pale': 'accent on dark', '--ember': 'warm accent', '--peach': 'glow / light leak', '--gold': 'secondary accent', '--pine': 'brand dark, links, headings accents', '--olive': 'CBD family', '--dusk': 'indica family', '--clay': 'page surface', '--clay-hi': 'raised surface', '--clay-lo': 'inset surface / fields', '--clay-deep': 'deep inset', '--clay-light': 'neumorphic highlight', '--clay-shade': 'neumorphic shade', '--clay-shade-2': 'deep shade' };
const mq = new Map();
for (const f of ['base', 'neumorph', 'components', 'redesign-motion']) for (const m of T('src/styles/' + f + '.css').matchAll(/@media\s*\(([^)]*width[^)]*)\)/g)) mq.set(m[1].replace(/\s+/g, ' '), (mq.get(m[1].replace(/\s+/g, ' ')) || 0) + 1);
const fonts = fs.readdirSync(path.join(ROOT, 'src/assets/fonts')).filter((f) => f.endsWith('.woff2'));

const BRAND = `# Brand system — "Sunlit Clay"

Derived from the live site by \`sr-tokens.mjs\`, then extended by a redesign layer appended to
\`src/styles/tokens.css\` by \`src/tools/append-redesign-tokens.mjs\` (source text:
\`src/styles/tokens.redesign-layer.txt\`). The measured values and their evidence live in
\`audit/design-baseline.json\`.

## Evidence

\`audit/design-baseline.json\` → evidence: **${baseline.evidence}**, from ${(baseline.capturedViewports || []).length} page captures at ${widths.join(' / ')}px.
Every brand colour below is the source's own (occurrence counts in the capture are in the token
file's header comment). The clay surfaces and shadow tones are the only invented colours: a
neumorphic surface needs a mid-light solid ground and two shadow tones derived from it.

## Colour

| token | value | role |
|---|---|---|
${pick(/^--(ink|ink-2|ink-3|paper|sun|sun-pale|ember|peach|gold|pine|olive|dusk|clay|clay-hi|clay-lo|clay-deep|clay-light|clay-shade|clay-shade-2)$/).map((t) => row('`' + t.name + '`', shownValue(t), (ROLE[t.name] || '') + (t.note ? ' — ' + t.note : ''))).join('\n')}

Derived tones are \`color-mix()\`es of those, never re-typed: ${pick(/^--(pine-2|pine-ink|sun-2|ember-ink|dusk-2|olive-2|ink-glass|paper-glass|clay-glass)$/).map((t) => '`' + t.name + '`').join(', ')}.
Strain families map onto the palette: ${pick(/^--strain-/).map((t) => '`' + t.name + '` → `' + t.value + '`').join(', ')}.

Every text/background pair the CSS declares, measured by \`src/tools/contrast.mjs\` (Chrome resolves each
colour, including every \`color-mix()\`, to the sRGB it paints; a gradient is judged at its worst
stop). WCAG AA: 4.5:1 for body text, 3:1 for large text. Source: \`audit/contrast.json\`.

| foreground | background | ratio | use |
|---|---|---|---|
${contrast.pairs.map((p) => row('`' + p.fg + '` ' + p.fgHex, '`' + p.bg.replace(/^mix:(--[a-z-]+):(\d+):(--[a-z-]+)$/, '$2% $1 in $3').replace(/^over:(--[a-z-]+):white$/, '$1 over white') + '` ' + p.bgHex, p.ratio.toFixed(2) + ':1 ' + (p.pass ? '✓ AA' : '✗') + (p.large ? ' (large)' : ''), p.use)).join('\n')}

Three source-derived tokens were deepened to reach AA on the new surfaces: \`--ink-3\` (the source grey
measured 4.39:1 on clay), \`--ember-ink\` (the sativa badge measured 4.38:1) and \`--ink-glass\` (white
text on a product photo measured 3.71:1).

## Type

- **Display:** Fraunces (variable, optical sizes) — new to the redesign; the source set all its
  text in Poppins (\`audit/design-baseline.json\` → typography.families).
- **Body / UI:** Poppins — the source's own body face, now self-hosted.
- Self-hosted files: ${fonts.map((f) => '`' + f + '`').join(', ')}.
- Fluid scale (\`--step--1\` … \`--step-5\`): ${pick(/^--step-/).map((t) => '`' + t.name + '` ' + t.value).join(' · ')}.
- No text is set under 12px, and no text field under 16px on phones (the sweep's font check across
  18 templates × 4 widths, \`audit/sweep-findings.json\`).

## Space, shape, layout

- Container \`--shell\` ${pick(/^--shell$/).map((t) => t.value)}; gutter \`--gutter\` ${pick(/^--gutter$/).map((t) => t.value)}.
- Radii: ${pick(/^--radius/).map((t) => '`' + t.name + '` ' + t.value).join(' · ')}.
- Neumorphic depth: \`--neu-raise-sm\`, \`--neu-raise\`, \`--neu-raise-lg\` (lit top-left, shaded
  bottom-right), \`--neu-inset\` / \`--neu-inset-sm\` for wells and fields, \`--neu-pressed\` for the
  active state; \`--lift-shadow\` for floating bands and \`--cutout-shadow\` for pop-out images.
- Layering: a pop-out frame (\`.pop\`) is an offset outline, a clipped photo and a background-removed
  cut-out of the same photo that breaks out of the frame's top edge.
- Breakpoints in use: ${[...mq].map(([k, n]) => '`' + k + '` (' + n + ')').join(', ')}. Verified at
  ${sweeps.widths.join(' / ')}px: ${sweepT.blocker || 0} blocker and ${sweepT.major || 0} major findings on the rebuild
  (\`audit/sweep-findings.json\`). Every control on the 18 swept templates is at least 44×44px on a phone.

## Motion

Easings and durations are tokens (\`--ease-out\`, \`--ease-spring\`, \`--dur\`). The source's 52 keyframes
are kept verbatim in \`src/styles/motion.css\` as evidence — the file is not linked from any page, since
none of them is used; the redesign's motion is \`src/styles/redesign-motion.css\`. A reveal runs over a
fixed 30vh after the element enters (never a share of its height, which left tall blocks blurred while
read), and anything already on screen when the page opens is shown whole.
A \`prefers-reduced-motion\` block is present and must stay present: it stills every animation below.

| component | trigger | what moves |
|---|---|---|
| section reveals (\`.reveal\`) | scroll — \`animation-timeline: view()\`, IntersectionObserver fallback | fade + rise + un-blur, siblings staggered |
| hero video + copy | scroll — \`scroll(root)\` | the video pushes in and dims as the page scrolls away; the copy lifts off |
| pop-out cut-outs (\`.pop__cut.scroll-rise\`) | scroll | the cut-out rises out of its frame |
| offset outlines (\`.pop__outline.scroll-drift\`) | scroll | the outline drifts and rotates behind the frame |
| parallax layers (\`.parallax-slow/-fast\`) | scroll | light leaks and the about-section cut-out move at different rates |
| tagline band | scroll (named view timeline \`--tb\`) | the lines rise through the band — never on their own |
| lab-data bars | scroll | bars grow to their value |
| cards, buttons | hover / focus (pointer devices) | lift, tilt toward the pointer, magnetic CTAs |
| film grain | continuous, decorative | background texture only |

Nothing text-bearing moves on its own: the source's announcement and tagline marquees became a
still line and a scroll-driven band (WCAG 2.2.2, Pause/Stop/Hide).
`;

// ================================ CHANGE-LOG =====================================================
const byRule = new Map(); for (const p of rules.plan) { if (!byRule.has(p.rule)) byRule.set(p.rule, []); byRule.get(p.rule).push(p); }
const lr = new Map(ledger.rows.map((r) => [r.id, r]));
const presetOf = new Map(ledger.rows.map((r) => [r.id, r.presetId]));
const CHANGELOG = `# Change log

One row per section of the source site, from \`audit/change-control.json\` (${ledger.rows.length} sections on
${new Set(ledger.rows.map((r) => r.url)).size} pages). Each decision was applied with \`sr-plan --set\` by the rule in
\`src/tools/ledger-decide.mjs\` that matched the section's source class; \`audit/ledger-rules.json\` records
which rule decided which row.

## Legend

- **PRESERVE** — kept as-is; content and function unchanged
- **IMPROVE** — same content and meaning, better structure, hierarchy or design
- **REPLACE** — superseded by a better structure (reason required)
- **REMOVE** — deliberately dropped (reason required)
- **ADD** — new section that did not exist on the source

Tally: ${Object.entries(ledger.rows.reduce((a, r) => { a[r.decision] = (a[r.decision] || 0) + 1; return a; }, {})).map(([k, v]) => k + ' ' + v).join(' · ')}. Nothing was removed as a section.

## Decisions by component

| rule | sections | decision | narrative slot | preset | why |
|---|---|---|---|---|---|
${[...byRule].map(([id, ps]) => row(id, ps.length, ps[0].decision, ps[0].slot || '—', ps[0].preset || '—', ps[0].why)).join('\n')}

Presets: every rebuilt row names one from the indexed library (\`audit/preset-match.json\`, ${match.undecided} undecided).
The layout matcher had matched ${rules.matcherOverrides.count} rows by signature; all ${rules.matcherOverrides.count} were answered with the preset the
redesign actually built (\`audit/ledger-rules.json\` → matcherOverrides). ${rules.answeredDirect.count} rows on \`?sort=\` pages hold an
\`=\` in their id, which \`sr-match --answer\` cannot parse; they were written with that command's own logic
(→ answeredDirect).

## Decisions

| page | section | decision | narrative slot | why |
|---|---|---|---|---|
${ledger.rows.map((r) => row(rel(r.url), '#' + r.index + ' ' + (r.sourceClass || r.label || '').split(' ')[0], r.decision, r.narrativeSlot || '—', r.why)).join('\n')}

## Copy that changed

No sentence of source copy was rewritten. These strings are new or moved, each built only from
captured text:

| where | original | rewritten | reason |
|---|---|---|---|
${derived.items.map((d) => row('meta description ' + d.page, '(none — the source served no description)', d.description, d.method === 'first-paragraph' ? 'the page’s own first paragraph, cut at a word boundary' : 'built from the page H1, the parent category and the store name/address in src/content/chrome.json (' + d.method + ')')).join('\n')}
${row('<title> and description, /strain/{cbd,hybrid,indica,sativa,si}', 'the capitalised twin page’s title (the crawl stored both spellings in one file on a case-insensitive disk)', 'the lowercase page’s own H1', 'the lowercase URL is canonical; its own heading is its title')}
${row('store status (store locator, dispensary page)', '"CLOSED until 10:00 AM ET" — frozen at crawl time', '"OPEN" / "CLOSED" + "until …" computed in the browser from the published hours', 'a frozen status is wrong most of the day; "OPEN" is the only new word, the counterpart of the source’s "CLOSED"')}
${row('announcement bar', '"Thanks for visiting our new website!" in a swiper', 'the same line, static, linking to /shop as the source does', 'moving text needs a pause control (WCAG 2.2.2)')}

### Structure that changed (same strings, different component)

| where | on the source | here | why |
|---|---|---|---|
${row('/dispensary/sunny-dayz, /weed-delivery/dispensary-in-glendale', 'sliders (testimonials, category tiles, city cards, product carousel); the page capture flattened each product card into loose lines and placed every slider before its heading', 'each slider rebuilt as its component under its own heading: quote cards, linked category tiles, city cards, and a product rail of the real product pages matched by exact name', 'the flattened capture rendered as ~9,700px of raw lines under the wrong headings; the one carousel product with no product page in the crawl (Doja Confetti - 3.5G Flower) is listed under Removed')}
${row('/dispensary/sunny-dayz', 'store banner photo (alt "Banner location page") inside the body; the Hours list as plain text', 'the store photo is the page’s hero image; the hours are the two-column hours list with today highlighted', 'the photo was otherwise never shown; the list text ran day and time together')}
${row('/contact-us', 'each reviewer name fused onto the end of its quote', 'the name split back out as the quote’s caption (both strings verbatim)', 'the contact values had been read as the reviewers’ names')}
${row('404 pages', 'GO BACK and SHOP NOW buttons (script-driven)', 'GO BACK returns to the previous page (home when there is none); SHOP NOW links to /shop', 'they rendered as inert labels; /shop is the site’s own "Shop" destination')}
${row('/shop', 'empty promo carousel: "Promo Carousel", SEE ALL (0), "0 promotions available" read to screen readers only', 'same strings; the count stays screen-reader-only, no "0" badge', 'as the source did it')}
${row('/daily-deals', 'breadcrumb only; the page renders nothing else', 'the in-page express ribbon is omitted so it does not repeat the footer’s identical call to action; no copy added', 'two identical CTAs back to back')}

### Links changed (\`src/content/link-fixes.json\`)

| from | to | why |
|---|---|---|
${linkFixes.fixes.map((x) => row(x.from, x.to || '(dropped)', x.why)).join('\n')}

### Removed

| where | what | why |
|---|---|---|
${removed.chrome.map((x) => row('site chrome', x.text, x.why)).join('\n')}
${removed.content.map((x) => row(rel(x.page), x.text, x.why)).join('\n')}

## Imagery

All photography of the client's products, brands, stores and people is the client's own, downloaded
from the live site and re-encoded to WebP (\`audit/image-inventory.json\`). ${manifest.items.length} images were
**generated** (fal.ai) for the category tiles and banners, plus background-removed cut-outs of ${manifest.items.filter((i) => i.cutout).length} of
them for the pop-out frames (\`assets/generated/manifest.json\`, which also records each prompt, seed and hash).

Why generating them was safe: each is a generic studio still life of a product *category* — it shows
no person, no real place, no specific branded product, no packaging text or logo (every prompt forbids
text and logos; an early vape image that rendered a glyph was regenerated), and it makes no claim
about a result. The safety checker passed all of them (\`nsfw: false\`). They replace only the
category artwork the source used; product photos stay the client's.

| image | category | model | depicts | cut-out |
|---|---|---|---|---|
${manifest.items.map((i) => row('`src/assets/img/gen/' + i.slug + '`', i.category, i.model, i.prompt.split('.')[0], i.cutout ? 'yes (' + i.cutout.model + ')' : 'no')).join('\n')}
`;

fs.writeFileSync(path.join(ROOT, 'docs/README.md'), README);
fs.writeFileSync(path.join(ROOT, 'docs/DEPLOY.md'), DEPLOY);
fs.writeFileSync(path.join(ROOT, 'docs/BRAND-SYSTEM.md'), BRAND);
fs.writeFileSync(path.join(ROOT, 'docs/CHANGE-LOG.md'), CHANGELOG);
const left = ['README.md', 'DEPLOY.md', 'BRAND-SYSTEM.md', 'CHANGE-LOG.md'].filter((f) => /<FILL[:>]/.test(T('docs/' + f)));
for (const f of ['README.md', 'DEPLOY.md', 'BRAND-SYSTEM.md', 'CHANGE-LOG.md']) console.log(f.padEnd(16), fs.statSync(path.join(ROOT, 'docs', f)).size, 'bytes');
console.log('client flags located:', flagRows.length, '· unfilled placeholders:', left.length ? left.join(', ') : 'none');
if (left.length) process.exit(1);
