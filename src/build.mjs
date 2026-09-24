// build.mjs — src/content/model/*.json + src/content/chrome.json + src/styles|scripts|assets -> dist/
//   node src/build.mjs [--only <type>]
// Deterministic: same inputs, same bytes (image encodes are cached by source hash + width).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { ROOT, DIST, ORIGIN, readJSON, fileOf, pathOf, flushImages, imageLog } from './build/lib.mjs';
import { allModels, derivedDescriptions } from './build/components.mjs';

const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') ? a.concat([[v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]]) : a), []));
const chrome = readJSON(path.join(ROOT, 'src/content/chrome.json'));
if (!chrome) throw new Error('src/content/chrome.json missing — run src/tools/extract-chrome.mjs');

// ---- templates by page type (a type with no template is reported, never silently skipped) --
const TEMPLATES = {};
for (const f of fs.readdirSync(path.join(ROOT, 'src/build/pages'))) {
  if (!f.endsWith('.mjs')) continue;
  const mod = await import('file:///' + path.join(ROOT, 'src/build/pages', f).replace(/\\/g, '/'));
  for (const [k, fn] of Object.entries(mod)) if (typeof fn === 'function' && fn.types) for (const tname of fn.types) TEMPLATES[tname] = fn;
  if (mod.home) TEMPLATES.home = mod.home;
}

// ---- clean + static copies -----------------------------------------------------------------
if (fs.existsSync(DIST)) for (const e of fs.readdirSync(DIST)) fs.rmSync(path.join(DIST, e), { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });
const copyDir = (from, to, filter = () => true) => {
  if (!fs.existsSync(from)) return 0; let n = 0;
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    const a = path.join(from, e.name), b = path.join(to, e.name);
    if (e.isDirectory()) n += copyDir(a, b, filter);
    else if (filter(a)) { fs.mkdirSync(to, { recursive: true }); fs.copyFileSync(a, b); n++; }
  }
  return n;
};
// CSS: comments stripped on the way out (motion.css cites source-platform URLs as evidence)
fs.mkdirSync(path.join(DIST, 'styles'), { recursive: true });
for (const f of fs.readdirSync(path.join(ROOT, 'src/styles'))) {
  if (!f.endsWith('.css')) continue;
  const css = fs.readFileSync(path.join(ROOT, 'src/styles', f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\n{3,}/g, '\n\n');
  fs.writeFileSync(path.join(DIST, 'styles', f), css);
}
copyDir(path.join(ROOT, 'src/scripts'), path.join(DIST, 'scripts'));
copyDir(path.join(ROOT, 'src/assets/fonts'), path.join(DIST, 'assets/fonts'));
copyDir(path.join(ROOT, 'src/assets/img'), path.join(DIST, 'assets/img'));
// hero video: the source file itself (1920x1080), renamed; poster from the source's poster frame
fs.mkdirSync(path.join(DIST, 'assets/video'), { recursive: true });
fs.copyFileSync(path.join(ROOT, 'assets/source/video/output-3.mp4'), path.join(DIST, 'assets/video/hero-1080.mp4'));
// phones in portrait: a 720x1080 centre crop of the same film (the slice they already showed), 1.2 Mbps,
// no audio — 5.6 MB instead of 27.8 MB. Encoded once with ffmpeg (docs/DEPLOY.md), not at build time.
// The webm is no longer shipped: site.js sets one mp4 src, so it was never fetched.
fs.copyFileSync(path.join(ROOT, 'assets/source/video/hero-portrait.mp4'), path.join(DIST, 'assets/video/hero-portrait.mp4'));
const poster = path.join(ROOT, 'tmp/imgcache/hero-poster.webp');
if (!fs.existsSync(poster)) execFileSync('cwebp', ['-quiet', '-q', '82', '-metadata', 'none', path.join(ROOT, 'assets/source/video/output-3-poster.jpg'), '-o', poster]);
fs.copyFileSync(poster, path.join(DIST, 'assets/video/hero-poster.webp'));
// the portrait poster: the same 720x1080 centre crop, so poster and phone video frame identically
const posterP = path.join(ROOT, 'tmp/imgcache/hero-poster-portrait.webp');
if (!fs.existsSync(posterP)) execFileSync('cwebp', ['-quiet', '-q', '80', '-metadata', 'none', '-crop', '600', '0', '720', '1080', path.join(ROOT, 'assets/source/video/output-3-poster.jpg'), '-o', posterP]);
fs.copyFileSync(posterP, path.join(DIST, 'assets/video/hero-poster-portrait.webp'));

// ---- render pages ---------------------------------------------------------------------------
const report = { schema: 'sunnydayz/build@1', generated: new Date().toISOString(), pages: [], skipped: [], redirects: [], errors: [] };
const models = allModels();
// A page whose path is also a FOLDER of other pages (/collection/flower + /collection/flower/pre-pack,
// /blog + /blog/<post>) is written as <path>/index.html: a server resolving /collection/flower
// finds the directory first, and "flower.html beside flower/" 404s on several static hosts
// (measured: sr-serve answered 404 for /collection/flower).
const outPathOf = (rec) => (rec.type === 'strain' && rec.model && rec.model.urlLowercasePath ? rec.model.urlLowercasePath.toLowerCase() : pathOf(rec.url));
const allPaths = models.map(outPathOf);
const folders = new Set(allPaths.filter((p) => p !== '/' && allPaths.some((q) => q.startsWith(p + '/'))));
const fileFor = (url) => { const p = pathOf(url); return folders.has(p) ? p.slice(1) + '/index.html' : fileOf(url); };
const lowerSeen = new Map();
for (const rec of models) {
  if (args.only && rec.type !== args.only) continue;
  const tpl = TEMPLATES[rec.type];
  if (!tpl) { report.skipped.push({ url: rec.url, type: rec.type, why: 'no template for type' }); continue; }
  // a capitalised strain twin is served as a 301 to its lowercase page (its only unique copy,
  // "Shop our selection of strains", is merged there) — it must not overwrite that page
  if (rec.type === 'strain' && /[A-Z]/.test(decodeURIComponent(new URL(rec.url).pathname))) { report.skipped.push({ url: rec.url, type: rec.type, why: 'case twin: 301 to ' + rec.model.urlLowercasePath }); continue; }
  // strain models publish at their lowercase path (NTFS case collision; capitalised URL = 301)
  const outUrl = rec.type === 'strain' && rec.model && rec.model.urlLowercasePath ? ORIGIN + rec.model.urlLowercasePath.toLowerCase() : rec.url;
  const u = new URL(outUrl);
  if (u.search) { report.skipped.push({ url: rec.url, type: rec.type, why: 'query-string variant: served by ' + fileOf(u.origin + u.pathname) }); continue; }
  const file = fileFor(outUrl);
  const lk = file.toLowerCase();
  if (lowerSeen.has(lk) && lowerSeen.get(lk) !== file) {
    // case-only twin (e.g. /strain/Cbd vs /strain/cbd) — one file on a case-insensitive disk; the
    // capitalised URL is served as a 301 to the lowercase page (see _redirects).
    const keep = file === lk ? file : lowerSeen.get(lk);
    const from = file === lk ? lowerSeen.get(lk) : file;
    report.redirects.push({ from: '/' + from.replace(/\.html$/, ''), to: '/' + keep.replace(/\.html$/, ''), status: 301, why: 'case-only duplicate of the lowercase page' });
    if (file !== lk) continue;
  }
  lowerSeen.set(lk, file);
  try {
    const html = tpl(rec, { chrome, models });
    const out = path.join(DIST, file);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, html);
    report.pages.push({ url: rec.url, type: rec.type, file });
  } catch (e) { report.errors.push({ url: rec.url, type: rec.type, error: String(e.stack || e).slice(0, 600) }); }
}
const copied = flushImages();

// ---- redirects: case twins + source redirect chains ------------------------------------------
// every crawled capitalised /strain/ URL whose lowercase twin was published -> 301
const inv = readJSON(path.join(ROOT, 'audit/site-inventory.json'), { pages: [] });
const published = new Set(report.pages.map((p) => '/' + p.file.replace(/\.html$/, '')));
for (const pg of inv.pages) {
  const p = decodeURIComponent(new URL(pg.url).pathname).replace(/\/+$/, '');
  if (/^\/strain\//.test(p) && p !== p.toLowerCase() && published.has(p.toLowerCase()) && !report.redirects.some((r) => r.from === p)) report.redirects.push({ from: p, to: p.toLowerCase(), status: 301, why: 'case-only twin; the source declares the lowercase URL canonical' });
}
const lines = report.redirects.map((r) => `${r.from} ${r.to} ${r.status}`);
fs.writeFileSync(path.join(DIST, '_redirects'), lines.join('\n') + (lines.length ? '\n' : ''));

// ---- internal link check over what was written -------------------------------------------------
const written = new Set(report.pages.map((p) => '/' + p.file.replace(/(^|\/)index\.html$/, '').replace(/\.html$/, '')));
written.add('/');
const redirectFrom = new Set(report.redirects.map((r) => r.from));
const broken = new Map();
for (const p of report.pages) {
  const html = fs.readFileSync(path.join(DIST, p.file), 'utf8');
  for (const m of html.matchAll(/\bhref="(\/[^"#?]*)[^"]*"/g)) {
    const h = decodeURIComponent(m[1]).replace(/\/+$/, '') || '/';
    if (/^\/(assets|styles|scripts)\//.test(h)) { if (!fs.existsSync(path.join(DIST, h))) (broken.get(h) || broken.set(h, new Set()).get(h)).add(p.file); continue; }
    if (!written.has(h) && !redirectFrom.has(h)) (broken.get(h) || broken.set(h, new Set()).get(h)).add(p.file);
  }
}
report.links = { brokenInternal: [...broken].map(([h, s]) => ({ href: h, pages: s.size, sample: [...s].slice(0, 3) })).sort((a, b) => b.pages - a.pages) };
report.images = { resolved: imageLog.resolved, encoded: imageLog.encoded, cached: imageLog.cached, copied, missing: [...imageLog.missing].map(([u, s]) => ({ url: u, pages: [...s].slice(0, 3) })), lowRes: [...imageLog.lowRes].map(([u, d]) => ({ url: u, px: d })) };
fs.writeFileSync(path.join(ROOT, 'src/content/build-report.json'), JSON.stringify(report, null, 1));
// every deliberate removal, from the chrome model and from the content templates (same module
// instance the pages were rendered with, so the list is what THIS build dropped)
const { REMOVED } = await import('file:///' + path.join(ROOT, 'src/build/pages/content.mjs').replace(/\\/g, '/'));
fs.writeFileSync(path.join(ROOT, 'src/content/removed.json'), JSON.stringify({ schema: 'sunnydayz/removed@1', chrome: chrome.removed || [], content: REMOVED }, null, 1));
fs.writeFileSync(path.join(ROOT, 'src/content/derived-descriptions.json'), JSON.stringify({ schema: 'sunnydayz/derived-descriptions@1', note: "Meta descriptions for pages the source served without one. first-paragraph = the page's own copy, verbatim, cut at a word boundary; facts-line = captured H1(s) + the store name/address from src/content/chrome.json. No other words.", count: derivedDescriptions.length, items: derivedDescriptions }, null, 1));
console.log(`pages ${report.pages.length} · skipped ${report.skipped.length} · errors ${report.errors.length} · redirects ${report.redirects.length}`);
console.log(`images resolved ${report.images.resolved} · encoded ${report.images.encoded} · cached ${report.images.cached} · files ${copied} · missing ${report.images.missing.length} · low-res ${report.images.lowRes.length}`);
console.log(`broken internal links ${report.links.brokenInternal.length}: ` + report.links.brokenInternal.slice(0, 12).map((b) => `${b.href}(${b.pages})`).join(' '));
const skippedTypes = {}; for (const s of report.skipped) skippedTypes[s.type + ': ' + s.why.split(':')[0]] = (skippedTypes[s.type + ': ' + s.why.split(':')[0]] || 0) + 1;
console.log('skipped by reason', JSON.stringify(skippedTypes));
for (const e of report.errors.slice(0, 3)) console.log('ERROR', e.url, e.error);
