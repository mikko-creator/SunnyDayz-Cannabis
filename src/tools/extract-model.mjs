// extract-model.mjs — rendered DOM -> typed content model, one JSON per page.
// Each saved <main> (audit/rendered/<slug>.json) is parsed inside an inert <template> in
// headless Chrome (no network, no script execution) and handed to the extractor for its page
// type: src/extract/<type>.js, a file whose body is `function extract(root, ctx) {...}`
// returning a plain object. Every model is scored against the rendered text it came from:
// coverage = share of the rendered <main> unique words that appear anywhere in the model.
//   node src/tools/extract-model.mjs [--type product] [--only <substring>] [--min 0.98]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch } from './cdp.mjs';
import { urlSlug } from './slug.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') ? a.concat([[v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]]) : a), []));
const MIN = Number(args.min || 0.98);
const OUTDIR = path.join(ROOT, 'content', 'model');
fs.mkdirSync(OUTDIR, { recursive: true });

export const slugOf = urlSlug;
const renderedSlug = urlSlug;

export function classify(url, title) {
  const p = decodeURIComponent(new URL(url).pathname).replace(/\/+$/, '') || '/';
  if (/^404\b/.test(title || '')) return 'notfound';
  if (p === '/') return 'home';
  if (/^\/product\//.test(p)) return 'product';
  if (/^\/collection\//.test(p)) return 'collection';
  if (/^\/brand\//.test(p)) return 'brand';
  if (p === '/brands') return 'brands';
  if (p === '/blog') return 'blog-index';
  if (/^\/blog\//.test(p)) return 'blog-post';
  if (/^\/strain\//.test(p)) return 'strain';
  if (['/shop', '/deals', '/promotions', '/daily-deals', '/product-group/our-products', '/our-strains', '/store-locator'].includes(p)) return 'listing';
  return 'page';
}

const words = (s) => (String(s || '').toLowerCase().match(/[a-z0-9$%.]+/g) || []).map((w) => w.replace(/\.+$/, '')).filter((w) => w.length > 1);
const flatText = (o) => { const out = []; (function walk(v) { if (v == null) return; if (typeof v === 'string' || typeof v === 'number') out.push(String(v)); else if (Array.isArray(v)) v.forEach(walk); else if (typeof v === 'object') Object.entries(v).forEach(([k, x]) => { if (!/^(src|href|url|image|srcset|_)/i.test(k)) walk(x); }); })(o); return out.join(' '); };

const ver = JSON.parse(fs.readFileSync(path.join(ROOT, 'audit/render-verification.json'), 'utf8'));
let pages = ver.results.filter((r) => !r.error).map((r) => ({ url: r.url, title: r.title, type: classify(r.url, r.title) }));
if (args.type) pages = pages.filter((p) => p.type === args.type);
if (args.only) pages = pages.filter((p) => p.url.includes(args.only));

const extractors = {};
for (const f of fs.readdirSync(path.join(ROOT, 'src/extract'))) if (f.endsWith('.js')) extractors[f.replace(/\.js$/, '')] = fs.readFileSync(path.join(ROOT, 'src/extract', f), 'utf8');
const common = extractors._common || '';
// --extractor <file>: replace the type's extractor (positive/negative controls for the coverage measure)
if (args.extractor && args.type) extractors[args.type] = fs.readFileSync(path.resolve(args.extractor), 'utf8');

const b = await launch({ port: 0 });
const pg = await b.newPage({ width: 1440, height: 900 });
await pg.goto('about:blank', { settle: 50, waitFor: 'true' });
const report = [];
try {
  for (const page of pages) {
    const src = extractors[page.type];
    if (!src) { report.push({ url: page.url, type: page.type, error: 'no extractor src/extract/' + page.type + '.js' }); continue; }
    const rendered = JSON.parse(fs.readFileSync(path.join(ROOT, 'audit/rendered', renderedSlug(page.url) + '.json'), 'utf8'));
    const ctx = { url: page.url, title: rendered.title, type: page.type };
    let model;
    try {
      model = await pg.eval(`(() => {
        const t = document.createElement('template');
        t.innerHTML = ${JSON.stringify(rendered.mainHtml || '')};
        const root = t.content;
        ${common}
        ${src}
        return extract(root, ${JSON.stringify(ctx)});
      })()`, { timeout: 30000 });
    } catch (e) { report.push({ url: page.url, type: page.type, error: String(e.message || e).slice(0, 400) }); continue; }
    const want = new Set(words(rendered.mainText));
    const got = new Set(words(flatText(model)));
    const missing = [...want].filter((w) => !got.has(w));
    const coverage = want.size ? (want.size - missing.length) / want.size : 1;
    const rec = { url: page.url, slug: slugOf(page.url), type: page.type, title: rendered.title, seoTitle: rendered.title, model };
    if (!args.extractor) fs.writeFileSync(path.join(OUTDIR, slugOf(page.url) + '.json'), JSON.stringify(rec, null, 1));
    report.push({ url: page.url, type: page.type, coverage: +coverage.toFixed(4), missing: missing.slice(0, 40), missingCount: missing.length });
  }
} finally { await b.close(); }

const byType = {};
for (const r of report) { const t = (byType[r.type] = byType[r.type] || { pages: 0, errors: 0, below: 0, minCoverage: 1 }); t.pages++; if (r.error) t.errors++; else { if (r.coverage < MIN) t.below++; t.minCoverage = Math.min(t.minCoverage, r.coverage); } }
const out = { schema: 'sunnydayz/model-report@1', generated: new Date().toISOString(), min: MIN, byType, pages: report.sort((a, b) => (a.coverage ?? -1) - (b.coverage ?? -1)) };
fs.writeFileSync(path.join(ROOT, 'content', args.type ? `model-report.${args.type}.json` : 'model-report.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(byType));
for (const r of out.pages.slice(0, 8)) console.log(r.error ? 'ERR ' + r.url + ' ' + r.error : (r.coverage * 100).toFixed(1) + '% ' + r.url.replace(/^https?:\/\/[^/]+/, '') + ' missing: ' + r.missing.slice(0, 15).join(' '));
