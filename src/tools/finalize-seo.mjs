// finalize-seo.mjs — runs AFTER `sr-seo --apply` and corrects the two files it emits from file
// paths rather than addresses:
//   sitemap.xml  sr-seo writes one <loc> per built FILE (/about-us.html, raw spaces, noindex pages
//                included). Every page's canonical names /about-us, so the sitemap and the
//                canonicals disagreed. Here each <loc> is the page's own canonical (absolute, on
//                --site-url), noindex pages are left out, duplicates collapse, and every URL is
//                percent-encoded. lastmod stays the built file's mtime, as sr-seo does it.
//   llms.txt     same address list, as markdown links labelled with each page's own <title>.
// Every <loc> is checked to resolve to a built file under the host's clean-URL rule
// (/x -> x.html or x/index.html); one that does not fails the run.
//   node src/tools/finalize-seo.mjs --site-url https://www.sunnydayzcannabis.com  -> audit/seo-finalize.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIST = path.join(ROOT, 'dist');
const i = process.argv.indexOf('--site-url');
const SITE = (i > 0 ? process.argv[i + 1] : '').replace(/\/$/, '');
if (!/^https:\/\//.test(SITE)) { console.error('finalize-seo: --site-url https://… is required'); process.exit(2); }
if (!fs.existsSync(path.join(DIST, 'sitemap.xml'))) { console.error('finalize-seo: dist/sitemap.xml absent — run sr-seo --apply first'); process.exit(2); }

const files = [];
(function walk(d, rel) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const r = rel ? rel + '/' + e.name : e.name; if (e.isDirectory()) walk(path.join(d, e.name), r); else if (/\.html$/.test(e.name)) files.push(r); } }(DIST, ''));
files.sort();

const decode = (s) => String(s).replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const xmlEsc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
// percent-encode each path segment exactly once (a segment already encoded is decoded first)
const encodeUrl = (u) => { const x = new URL(u); x.pathname = x.pathname.split('/').map((seg) => { let d = seg; try { d = decodeURIComponent(seg); } catch { /* keep */ } return encodeURIComponent(d); }).join('/'); return x.href.replace(/\/$/, x.pathname === '/' ? '/' : ''); };
const servedBy = (u) => {
  let p = decodeURIComponent(new URL(u).pathname).replace(/\/+$/, '');
  if (!p) return fs.existsSync(path.join(DIST, 'index.html')) ? 'index.html' : null;
  p = p.replace(/^\//, '');
  for (const c of [p + '.html', p + '/index.html']) if (fs.existsSync(path.join(DIST, c))) return c;
  return null;
};

// canonicals exactly as the SOURCE declared them: a build page carrying one of these verbatim is
// preserving the client's field (sr-seo never rewrites a filled field), so a target that does not
// exist is the SOURCE's defect — excluded from the sitemap and reported, not a build failure
const sourceCanon = new Set(JSON.parse(fs.readFileSync(path.join(ROOT, 'audit/seo-inventory.json'), 'utf8')).pages.map((p) => p.canonical).filter(Boolean));
const sourceDefects = [];
const kept = new Map(); const excluded = []; const errors = [];
for (const f of files) {
  const html = fs.readFileSync(path.join(DIST, f), 'utf8');
  const head = html.slice(0, html.indexOf('</head>') + 7);
  const robots = (head.match(/<meta name="robots" content="([^"]*)"/) || [])[1] || '';
  const canon = decode((head.match(/<link rel="canonical" href="([^"]+)"/) || [])[1] || '');
  const title = decode((head.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '').trim();
  if (/noindex/i.test(robots)) { excluded.push({ file: f, why: 'noindex' }); continue; }
  if (!canon) { errors.push(f + ': no canonical'); continue; }
  let abs; try { abs = new URL(canon); } catch { errors.push(f + ': canonical not a URL: ' + canon); continue; }
  if (abs.origin !== new URL(SITE).origin) { errors.push(f + ': canonical on another origin: ' + canon); continue; }
  const loc = encodeUrl(abs.href);
  const target = servedBy(loc);
  if (!target) {
    if (sourceCanon.has(canon)) { excluded.push({ file: f, why: 'source canonical names a URL neither site serves: ' + canon }); sourceDefects.push({ file: f, canonical: canon }); continue; }
    errors.push(f + ': canonical ' + loc + ' resolves to no built file'); continue;
  }
  if (target !== f) { excluded.push({ file: f, why: 'canonical names another page: ' + loc }); if (!kept.has(loc)) kept.set(loc, null); continue; }
  const lastmod = fs.statSync(path.join(DIST, f)).mtime.toISOString().slice(0, 10);
  kept.set(loc, { file: f, title, lastmod });
}
// a canonical target that is itself noindex / unbuilt must not be listed
for (const [loc, v] of kept) if (!v) { const t = servedBy(loc); const rec = files.includes(t) ? null : 'unbuilt'; if (rec || !t) { kept.delete(loc); errors.push('canonical target unbuilt: ' + loc); } else { const html = fs.readFileSync(path.join(DIST, t), 'utf8'); if (/<meta name="robots" content="[^"]*noindex/.test(html)) kept.delete(loc); else kept.set(loc, { file: t, title: decode((html.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '').trim(), lastmod: fs.statSync(path.join(DIST, t)).mtime.toISOString().slice(0, 10) }); } }
if (errors.length) { console.error('finalize-seo FAILED:\n  ' + errors.join('\n  ')); process.exit(1); }

const before = fs.readFileSync(path.join(DIST, 'sitemap.xml'), 'utf8');
const beforeLocs = [...before.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]);
const entries = [...kept].sort((a, b) => a[0].localeCompare(b[0]));
const xml = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...entries.map(([loc, v]) => '<url><loc>' + xmlEsc(loc) + '</loc><lastmod>' + v.lastmod + '</lastmod></url>'), '</urlset>'];
fs.writeFileSync(path.join(DIST, 'sitemap.xml'), xml.join('\n') + '\n', 'utf8');
const home = entries.find(([loc]) => new URL(loc).pathname === '/');
const llms = ['# ' + ((home && home[1].title) || SITE), '', '> ' + SITE, '', '## Pages', '',
  ...entries.map(([loc, v]) => '- [' + (v.title || loc).replace(/[[\]]/g, '') + '](' + loc + ')')];
fs.writeFileSync(path.join(DIST, 'llms.txt'), llms.join('\n') + '\n', 'utf8');

const report = { schema: 'sunnydayz/seo-finalize@1', generated: new Date().toISOString(), siteUrl: SITE,
  note: 'sitemap.xml + llms.txt rewritten after sr-seo --apply: <loc> = each page\'s canonical, noindex pages excluded, URLs percent-encoded, every <loc> resolved to a built file.',
  before: { locs: beforeLocs.length, htmlSuffixed: beforeLocs.filter((l) => /\.html$/.test(l)).length, withRawSpace: beforeLocs.filter((l) => / /.test(l)).length },
  after: { locs: entries.length, htmlSuffixed: entries.filter(([l]) => /\.html$/.test(l)).length },
  excluded, sourceDefects };
// --probe <base>: request every <loc> path from a running server that applies the clean-URL rule
// (src/tools/serve.mjs) and require a 200 with no redirect — the addresses must work, not just resolve
const pi = process.argv.indexOf('--probe');
if (pi > 0) {
  const base = process.argv[pi + 1].replace(/\/$/, '');
  const bad = []; let ok = 0;
  for (const [loc] of entries) { const u = new URL(loc); const r = await fetch(base + u.pathname + u.search, { redirect: 'manual' }); if (r.status === 200) ok++; else bad.push({ loc, status: r.status }); await r.arrayBuffer(); }
  const ctl = await fetch(base + '/__not-a-page__', { redirect: 'manual' }); await ctl.arrayBuffer();
  report.probe = { base, requested: entries.length, ok, bad, control: { path: '/__not-a-page__', status: ctl.status, fired: ctl.status === 404 } };
  console.log('probe', base, ok + '/' + entries.length, 'answered 200 · control /__not-a-page__ ->', ctl.status);
  if (bad.length || ctl.status !== 404) { fs.writeFileSync(path.join(ROOT, 'audit/seo-finalize.json'), JSON.stringify(report, null, 1)); console.error('probe FAILED', JSON.stringify(bad.slice(0, 5))); process.exit(1); }
}
fs.writeFileSync(path.join(ROOT, 'audit/seo-finalize.json'), JSON.stringify(report, null, 1));
console.log('sitemap', report.before.locs, '->', report.after.locs, 'locs · .html-suffixed', report.before.htmlSuffixed, '->', report.after.htmlSuffixed, '· raw spaces', report.before.withRawSpace, '-> 0 · excluded', excluded.length);
for (const e of excluded) console.log('  excluded', e.file, '—', e.why);
