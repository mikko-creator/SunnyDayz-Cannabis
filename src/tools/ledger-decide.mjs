// ledger-decide.mjs — one change-control decision per source section, by the component that
// rebuilt it. Every row goes through the skill's own CLIs: decision/slot/why via
// `sr-plan --set`, preset via `sr-match --answer` (validated against the preset index).
// The rule that decided each row is written to audit/ledger-rules.json.
//   node src/tools/ledger-decide.mjs [--dry]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SKILL = path.join(os.homedir(), '.claude', 'skills', 'site-reforge', 'scripts');
const DRY = process.argv.includes('--dry');
const PRESETS_ONLY = process.argv.includes('--presets-only');
const ledger = JSON.parse(fs.readFileSync(path.join(ROOT, 'audit/change-control.json'), 'utf8'));
const index = JSON.parse(fs.readFileSync(path.join(ROOT, 'audit/preset-index.json'), 'utf8'));
const known = new Set(index.libraries.flatMap((l) => (l.presets || []).map((p) => p.id)));

const P = {
  hero: '01-transitions-hero-motion-8-the-dominant-hero',
  floating: '01-transitions-hero-motion-11-your-product-floating',
  parallax: '01-transitions-hero-motion-20-parallax',
  nav: 'navbar',
  cta: 'cta-banner',
  edge: '00-top12-8-image-bottom-fade-directional-scrim-into-the-next-section',
  grid: '14-ecommerce-2-sgen-living-styleguide-14-e-commerce-flow-components-live-2',
  rail: '14-ecommerce-3-sgen-living-styleguide-14-e-commerce-flow-components-live-3',
  chips: '10-sections-12-color-code-the-path',
  cards: '00-top12-3-soft-large-blur-ink-tinted-card-shadow-lift-on-hover',
  prose: '00-top12-2-display-face-on-headings-oversized-tight-negative-tracked-type',
  gallery: '03-layout-imagery-components-5-living-styleguide-03-layout-imagery-components-sgen-5',
  faq: 'accordion-faq',
  layout: '03-layout-imagery-components-6-living-styleguide-03-layout-imagery-components-sgen-6',
  motion: '00-top12-4-scroll-reveal-entrance-with-sibling-stagger',
};
for (const [k, v] of Object.entries(P)) if (!known.has(v)) throw new Error('preset not in index: ' + k + ' = ' + v);

const HOME_RAILS = /^(Flower|Vapes|Pre-rolls|Extracts|Drinks|Edibles|Topicals|Tinctures|Accessories)$/;
const RULES = [
  { id: 'announce', test: (r) => /promotion_promotion/.test(r.sourceClass), decision: 'IMPROVE', slot: 'strategic-cta', preset: P.cta, why: 'Announcement bar ("Thanks for visiting our new website!", links to /shop) rebuilt as one static line: auto-moving text needs a pause control (WCAG 2.2.2). Same copy and link.' },
  { id: 'megamenu', test: (r) => /megamenucustom_megamenu/.test(r.sourceClass), decision: 'IMPROVE', slot: 'footer', preset: P.nav, why: 'Mega menu rebuilt as a neumorphic panel + mobile drawer from the captured categories, classifications and brand logos; dead brand links remapped or dropped per src/content/link-fixes.json.' },
  { id: 'express', test: (r) => /expressshippingbanner/.test(r.sourceClass), decision: 'IMPROVE', slot: 'strategic-cta', preset: P.cta, why: 'Treez fulfilment banner rebuilt as the shop-page ribbon, the footer band and the fulfilment chooser, carrying both captured states.' },
  { id: 'separator', test: (r) => /components_separator/.test(r.sourceClass), decision: 'REPLACE', slot: '', preset: P.edge, why: 'Decorative separator image replaced by the redesign\'s layered section edges (hero clay lip, raised/inset bands).' },
  // home rows are matched by CLASS: sr-plan's labels are taken from headings in order and slide
  // past the chrome asides (the promotions aside is labelled "Categories", the menu "About us")
  { id: 'hero-video', test: (r) => r.pageType === 'home' && /codeembed/.test(r.sourceClass) && /padding-slice-small/.test(r.sourceClass), decision: 'IMPROVE', slot: 'value-proposition', preset: P.hero, why: 'Hero video (the client\'s own 1920x1080 file, a Cloudinary code embed on the source) rebuilt full-bleed at 100vw with the site tagline as the H1.' },
  { id: 'home-loyalty', test: (r) => r.pageType === 'home' && /codeembed/.test(r.sourceClass) && /padding-slice-large/.test(r.sourceClass), decision: 'IMPROVE', slot: 'strategic-cta', preset: P.cta, why: 'Sun Club loyalty banner (client image, links to the Treez loyalty sign-up) rebuilt as a layered, tilting frame.' },
  { id: 'home-categories', test: (r) => r.pageType === 'home' && /categories_categories__carousel/.test(r.sourceClass), decision: 'REPLACE', slot: 'value-proposition', preset: P.floating, why: 'Category tile artwork replaced by fal-generated product photography with pop-out cut-outs (operator request); every label and link preserved.' },
  { id: 'home-marquee', test: (r) => r.pageType === 'home' && /ContentMarqueeCarousel/.test(r.sourceClass), decision: 'IMPROVE', slot: 'value-proposition', preset: P.motion, why: 'Tagline marquee rebuilt as a tilted wall of type whose lines rise only as the page scrolls (never auto-moving, WCAG 2.2.2); the source\'s 12 copies kept, one broken item linking to a 404 dropped.' },
  { id: 'home-about', test: (r) => r.pageType === 'home' && /components_side_by_side/.test(r.sourceClass), decision: 'IMPROVE', slot: 'trust-positioning', preset: P.parallax, why: 'About block rebuilt as a layered split: the client\'s photo, a fal canopy image and a flower cut-out breaking the frame.' },
  { id: 'home-rail', test: (r) => r.pageType === 'home' && /products_product__section/.test(r.sourceClass), decision: 'IMPROVE', slot: 'strategic-cta', preset: P.rail, why: 'Product carousel / Today\'s Deals rebuilt as scroll-snap rails and a deals panel (card images joined from each product page).' },
  { id: 'product-details', test: (r) => /^details$/.test(r.sourceClass) || /^details$/.test(r.label), decision: 'IMPROVE', slot: 'benefits-solution', preset: P.floating, why: 'Product detail rebuilt: layered gallery stage, buy box in the captured availability state, lab data as bars, Prop 65 accordion.' },
  { id: 'banner', test: (r) => /banner_page_banner/.test(r.sourceClass), decision: 'IMPROVE', slot: 'value-proposition', preset: P.floating, why: 'Page banner rebuilt with display type and fal pop-out category art or the source banner in a layered frame.' },
  { id: 'grid', test: (r) => /CollectionTreez_collection_section/.test(r.sourceClass), decision: 'IMPROVE', slot: 'benefits-solution', preset: P.grid, why: 'Product grid rebuilt from the page\'s own ItemList (the live grid rendered empty) with client-side filter/sort using the source\'s labels.' },
  { id: 'catlinks', test: (r) => /linkscarousel_links|categories_container/.test(r.sourceClass), decision: 'IMPROVE', slot: 'strategic-cta', preset: P.chips, why: 'Category link carousel rebuilt as neumorphic chips.' },
  { id: 'gallery', test: (r) => /image_gallery/.test(r.sourceClass), decision: 'IMPROVE', slot: 'trust-positioning', preset: P.gallery, why: 'Strain gallery rebuilt as layered framed cards with a strain-tag row.' },
  // testimonials + FAQ match on CLASS only: on /dispensary/sunny-dayz the labels run one section
  // ahead (the hours banner is labelled "Testimonials", the testimonials "FAQS")
  { id: 'testimonials', test: (r) => /testimonials_testimonials/.test(r.sourceClass), decision: 'IMPROVE', slot: 'social-proof', preset: P.cards, why: 'Testimonials restyled as raised quote cards; every quote and name kept verbatim. Flagged in docs: the quotes name other businesses (Stiiizy, Rancho Santa Fe) and read as template copy.' },
  { id: 'faq', test: (r) => /faqsection_faqs/.test(r.sourceClass), decision: 'IMPROVE', slot: 'objection-handling', preset: P.faq, why: 'FAQ rebuilt as neumorphic accordions with real question/answer pairs.' },
  { id: 'post-cards', test: (r) => /article_article|relatedpost|articlelist|^Featured post$|^Related Post$|^All Posts$/i.test(r.sourceClass + ' ' + r.label), decision: 'IMPROVE', slot: 'benefits-solution', preset: P.cards, why: 'Post cards rebuilt as lifted neumorphic cards; titles, dates and excerpts verbatim.' },
  { id: 'article-body', test: (r) => r.pageType === 'blog-index' || /blog-article__content/.test(r.sourceClass), decision: 'IMPROVE', slot: 'benefits-solution', preset: P.prose, why: 'Article body rebuilt as prose with display headings; copy verbatim (source copy issues listed for the client in docs).' },
  { id: 'content-split', test: (r) => r.pageType === 'page' || r.pageType === 'form', decision: 'IMPROVE', slot: 'trust-positioning', preset: P.parallax, why: 'Section rebuilt in the sectionized split layout with layered images; copy verbatim.' },
  { id: 'default', test: () => true, decision: 'IMPROVE', slot: 'benefits-solution', preset: P.layout, why: 'Rebuilt in the redesign system; copy preserved (parity recall 99.1%).' },
];

const plan = ledger.rows.map((r) => { const rule = RULES.find((x) => x.test(r)); return { id: r.id, rule: rule.id, decision: rule.decision, slot: rule.slot, preset: rule.preset, why: rule.why }; });
const tally = {}; for (const p of plan) tally[p.rule] = (tally[p.rule] || 0) + 1;
fs.writeFileSync(path.join(ROOT, 'audit/ledger-rules.json'), JSON.stringify({ schema: 'sunnydayz/ledger-rules@1', presets: P, rules: RULES.map(({ test, ...r }) => r), tally, plan }, null, 1));
console.log('rows', plan.length, JSON.stringify(tally));
if (DRY) process.exit(0);

// 1. decisions through sr-plan --set (one call per row: the CLI is the sanctioned writer)
//    --presets-only skips this when the decisions are already on the ledger (sr-plan --check)
let n = 0;
//    --changed re-sets only rows whose decision / slot / why differ from the ledger
const CHANGED = process.argv.includes('--changed');
const onLedger = new Map(ledger.rows.map((r) => [r.id, r]));
const differs = (p) => { const r = onLedger.get(p.id); return !r || r.decision !== p.decision || (r.narrativeSlot || '') !== (p.slot || '') || r.why !== p.why; };
const toSet = PRESETS_ONLY ? [] : CHANGED ? plan.filter(differs) : plan;
if (CHANGED) console.log('rows whose decision/slot/why changed:', toSet.length, toSet.map((p) => p.id.replace(/^[^/]+/, '')).join(' '));
for (const p of toSet) {
  const args = [path.join(SKILL, 'sr-plan.mjs'), '--project', ROOT, '--set', p.id, '--decision', p.decision, '--why', p.why];
  if (p.slot) args.push('--slot', p.slot);
  execFileSync(process.execPath, args, { stdio: 'pipe' });
  if (++n % 250 === 0) console.log('  decisions set', n);
}
// 2. presets through sr-match --answer, in batches that stay under the Windows command-line limit.
//    sr-match exits 1 while ANY row is still undecided, so every batch but the last exits 1 by
//    design. A batch is accepted only when its own output confirms every answer it was given and
//    reports the remaining count; the LAST batch must exit 0 (nothing left undecided).
const withPreset = plan.filter((p) => p.preset);
const matchFile = path.join(ROOT, 'audit/preset-match.json');
// the matcher's own verdict, recomputed on an untouched sandbox copy (tmp/match-sandbox) so the
// comparison does not read rows an earlier answer run already rewrote
const baseFile = path.join(ROOT, 'tmp/match-sandbox/audit/preset-match.json');
if (!fs.existsSync(baseFile)) throw new Error('run sr-match on tmp/match-sandbox first (the matcher baseline)');
const before = JSON.parse(fs.readFileSync(baseFile, 'utf8'));
const matcherPick = new Map((before.rows || []).filter((r) => r.status === 'MATCHED').map((r) => [r.rowId, r.chosen || (r.candidates && r.candidates[0] && r.candidates[0].presetId)]));
// sr-match parses "--answer <rowId>=<presetId>" at the FIRST '=', so a row id that itself holds
// an '=' (the ?sort= variant pages) cannot be expressed on its command line. Those rows get the
// same write the CLI's own answer loop performs (sr-match.mjs, the `answers.length` block):
// preset validated against the index, row.presetId set, match record ANSWERED with chosen and
// answeredAt, undecided recounted — done FIRST so the final CLI batch can exit 0.
const direct = withPreset.filter((p) => p.id.includes('='));
if (direct.length) {
  const ledgerFile = path.join(ROOT, 'audit/change-control.json');
  const L = JSON.parse(fs.readFileSync(ledgerFile, 'utf8'));
  const M = JSON.parse(fs.readFileSync(matchFile, 'utf8'));
  const stamp = new Date().toISOString();
  for (const p of direct) {
    if (!known.has(p.preset)) throw new Error('no preset ' + p.preset);
    const row = L.rows.find((r) => r.id === p.id); if (!row) throw new Error('no change-control row ' + p.id);
    row.presetId = p.preset;
    const rec = (M.rows || []).find((r) => r.rowId === p.id);
    if (rec) { rec.status = 'ANSWERED'; rec.chosen = p.preset; rec.answeredAt = stamp; }
  }
  L.updated = stamp; fs.writeFileSync(ledgerFile, JSON.stringify(L, null, 2) + '\n', 'utf8');
  M.generated = stamp; M.undecided = (M.rows || []).filter((r) => r.status === 'UNDECIDED').length;
  fs.writeFileSync(matchFile, JSON.stringify(M, null, 2) + '\n', 'utf8');
}
const batches = []; let cur = [], len = 0;
for (const p of withPreset.filter((x) => !x.id.includes('='))) { const s = p.id + '=' + p.preset; if (len + s.length > 20000) { batches.push(cur); cur = []; len = 0; } cur.push(s); len += s.length + 12; }
if (cur.length) batches.push(cur);
let done = 0, remaining = null;
batches.forEach((b, i) => {
  const r = spawnSync(process.execPath, [path.join(SKILL, 'sr-match.mjs'), '--project', ROOT, ...b.flatMap((x) => ['--answer', x])], { encoding: 'utf8' });
  const ok = (r.stdout.match(/^answered /gm) || []).length;
  const m = r.stdout.match(/remaining undecided: (\d+)/);
  if (ok !== b.length || !m) throw new Error('sr-match batch ' + (i + 1) + ': ' + ok + '/' + b.length + ' answered · ' + (r.stderr || r.stdout).slice(-400));
  remaining = Number(m[1]);
  const last = i === batches.length - 1;
  if (last ? r.status !== 0 : r.status > 1) throw new Error('sr-match batch ' + (i + 1) + ' exit ' + r.status + ' with ' + remaining + ' undecided');
  done += ok;
});
const overridden = withPreset.filter((p) => matcherPick.has(p.id) && matcherPick.get(p.id) !== p.preset).map((p) => ({ id: p.id, matcher: matcherPick.get(p.id), answered: p.preset }));
const rulesFile = path.join(ROOT, 'audit/ledger-rules.json');
const rules = JSON.parse(fs.readFileSync(rulesFile, 'utf8'));
rules.answeredDirect = { note: "Row ids containing '=' (?sort= variant pages) cannot be passed to sr-match --answer, which splits at the first '='; these were written with the CLI answer loop's own logic.", count: direct.length, rows: direct.map((p) => p.id) };
rules.matcherOverrides = { note: 'Rows the layout matcher had MATCHED whose preset was replaced by the one the redesign actually built with.', count: overridden.length, rows: overridden };
fs.writeFileSync(rulesFile, JSON.stringify(rules, null, 1));
console.log('decisions set', n, '· presets answered', done, '+', direct.length, 'direct', 'in', batches.length, 'batches · undecided now', remaining, '· matcher picks overridden', overridden.length);
