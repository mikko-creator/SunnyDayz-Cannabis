// make-pages-preview.mjs — turn dist/ into a copy that works under a GitHub Pages project subpath.
// dist/ is built for a domain root: every reference is root-absolute ("/shop", "/assets/…"), and at
// https://<user>.github.io/<repo>/ each of those would resolve against the domain root and 404
// (<base href> does not help — it only affects relative URLs). This copies dist/ and prefixes every
// root-absolute reference, in every place the build emits one (measured, see docs/DEPLOY.md):
//   HTML  href/src/srcset/action/poster/data-src-* attributes (the hero film's data-src-lg/-sm), the cart
//         JSON in data-add (&quot;url&quot;/&quot;image&quot;),
//         inline style url()
//   CSS   url()
//   JS    the two path literals in site.js (cart placeholder image, 404 "go back" fallback)
// JSON-LD blocks are left verbatim (source-faithful; they do not affect rendering). The preview is
// marked noindex so it never competes with the production site, and _redirects (a Netlify/Cloudflare
// file) is dropped. The preview is DERIVED: re-run this after every rebuild or it goes stale.
//   node src/tools/make-pages-preview.mjs --prefix /SunnyDayz-Cannabis --out <dir> [--dist dist]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') ? a.concat([[v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]]) : a), []));
const P = String(args.prefix || '').replace(/\/+$/, '');
if (!/^\/[A-Za-z0-9._-]+$/.test(P)) { console.error('--prefix must look like /Repo-Name'); process.exit(2); }
const SRC = path.resolve(ROOT, args.dist || 'dist');
const OUT = args.out ? path.resolve(args.out) : null;
if (!OUT) { console.error('--out <dir> is required'); process.exit(2); }
if (OUT === SRC || OUT.startsWith(SRC + path.sep)) { console.error('--out must not be inside the dist it reads'); process.exit(2); }

// a root-absolute URL: starts with one "/" (not "//"), not already under the prefix
const needs = (u) => u.startsWith('/') && !u.startsWith('//') && u !== P && !u.startsWith(P + '/');
const fix = (u) => (needs(u) ? P + u : u);
const stats = { html: 0, css: 0, js: 0, copied: 0, refs: 0 };
const count = (u) => { if (needs(u)) stats.refs++; return fix(u); };

function rewriteHtml(s) {
  // keep JSON-LD verbatim: cut it out, rewrite the rest, put it back
  const keep = [];
  s = s.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, (m) => { keep.push(m); return `\u0000LD${keep.length - 1}\u0000`; });
  s = s.replace(/(\s(?:href|src|action|poster|data-src(?:-[a-z]+)?)=")([^"]*)(")/g, (m, a, u, z) => a + count(u) + z);
  s = s.replace(/(\s(?:srcset|imagesrcset)=")([^"]*)(")/g, (m, a, list, z) => a + list.split(',').map((part) => part.replace(/^(\s*)(\S+)/, (mm, sp, u) => sp + count(u))).join(',') + z);
  s = s.replace(/(&quot;(?:url|image|href|src)&quot;:&quot;)(\/[^&]*)(&quot;)/g, (m, a, u, z) => a + count(u) + z);
  s = s.replace(/(url\(\s*['"]?)(\/[^'")]+)/g, (m, a, u) => a + count(u));
  s = s.replace(/<meta name="robots" content="[^"]*">/g, '<meta name="robots" content="noindex, nofollow">');
  if (!/<meta name="robots"/.test(s)) s = s.replace(/<head>/, '<head>\n<meta name="robots" content="noindex, nofollow">');
  return s.replace(/\u0000LD(\d+)\u0000/g, (m, i) => keep[Number(i)]);
}
const rewriteCss = (s) => s.replace(/(url\(\s*['"]?)(\/[^'")]+)/g, (m, a, u) => a + count(u));
function rewriteJs(s, rel) {
  // only the literals measured in site.js; anything else root-absolute is reported, never guessed at
  let n = 0;
  s = s.replace(/'\/assets\/img\/brand\/placeholder\.svg'/g, () => { n++; stats.refs++; return `'${P}/assets/img/brand/placeholder.svg'`; });
  s = s.replace(/location\.href = '\/'/g, () => { n++; stats.refs++; return `location.href = '${P}/'`; });
  const left = [...s.matchAll(/['"](\/[A-Za-z0-9_\-./]+)['"]/g)].map((m) => m[1]).filter(needs);
  if (left.length) { console.error(`unhandled root-absolute literals in ${rel}: ${left.join(', ')}`); process.exit(3); }
  return s;
}

fs.rmSync(OUT, { recursive: true, force: true });
function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f), rel = path.relative(SRC, p), o = path.join(OUT, rel);
    if (fs.statSync(p).isDirectory()) { walk(p); continue; }
    if (rel === '_redirects' || /^(robots\.txt|sitemap\.xml|llms\.txt)$/.test(rel)) continue; // production-only files
    fs.mkdirSync(path.dirname(o), { recursive: true });
    const ext = path.extname(f);
    if (ext === '.html') { fs.writeFileSync(o, rewriteHtml(fs.readFileSync(p, 'utf8'))); stats.html++; }
    else if (ext === '.css') { fs.writeFileSync(o, rewriteCss(fs.readFileSync(p, 'utf8'))); stats.css++; }
    else if (ext === '.js') { fs.writeFileSync(o, rewriteJs(fs.readFileSync(p, 'utf8'), rel)); stats.js++; }
    else { fs.copyFileSync(p, o); stats.copied++; }
  }
}
walk(SRC);
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
console.log(`preview for ${P}/ -> ${OUT}\n  html ${stats.html} · css ${stats.css} · js ${stats.js} · other files ${stats.copied} · references prefixed ${stats.refs}`);
