// lib.mjs — shared helpers for the static build: escaping, routing, icons, image pipeline.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
// SDZ_DIST=<dir> builds a preview copy elsewhere (e.g. tmp/) without touching the shipped dist/
export const DIST = process.env.SDZ_DIST ? path.resolve(ROOT, process.env.SDZ_DIST) : path.join(ROOT, 'dist');
export const ORIGIN = 'https://www.sunnydayzcannabis.com';

export const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const attr = esc;
export const readJSON = (p, d = null) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return d; } };
export const cx = (...a) => a.filter(Boolean).join(' ');
// decode HTML entities that arrive in model strings (JSON-LD carries &apos; etc.)
export const decode = (s) => String(s ?? '').replace(/&apos;/g, "'").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ');
export const t = (s) => esc(decode(s));

// ---- routing: source URL -> output file & site path -----------------------------------
export function pathOf(url) {
  const u = new URL(url, ORIGIN);
  const p = decodeURIComponent(u.pathname).replace(/\/+$/, '');
  return p || '/';
}
export function fileOf(url) {
  const p = pathOf(url);
  if (p === '/') return 'index.html';
  return p.slice(1) + '.html';
}
// Dead internal links on the live site and their fixes (src/content/link-fixes.json): applied here,
// once, so every template gets the same answer. to:null means "drop the link" (see dropped()).
const FIXES = new Map((readJSON(path.join(ROOT, 'src/content/link-fixes.json'), { fixes: [] }).fixes || []).map((f) => [f.from, f.to]));
const fixOf = (p) => { let d; try { d = decodeURIComponent(p); } catch { d = p; } d = d.replace(/\/+$/, ''); return FIXES.has(d) ? FIXES.get(d) : FIXES.has(d.toLowerCase()) ? FIXES.get(d.toLowerCase()) : undefined; };
export function dropped(h) { if (!h || /^(https?:|mailto:|tel:)/i.test(h)) return false; return fixOf(String(h).split(/[?#]/)[0]) === null; }
// hrefs inside the build stay root-relative; sr-rebase can make them portable later.
export function href(h) {
  if (!h) return '/';
  if (/^(https?:|mailto:|tel:)/i.test(h)) {
    try { const u = new URL(h); if (u.origin === ORIGIN) return href(u.pathname + u.search + u.hash); } catch { /* keep */ }
    return h;
  }
  const p = h.startsWith('/') ? h : '/' + h;
  const [base, rest = ''] = p.split(/(?=[?#])/);
  const f = fixOf(base);
  return f ? f + rest : p;
}

// ---- icons (inline SVG, currentColor) --------------------------------------------------
const I = (d, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"${extra}>${d}</svg>`;
export const icon = {
  arrow: I('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  arrowL: I('<path d="M19 12H5M11 6l-6 6 6 6"/>'),
  chevron: I('<path d="M6 9l6 6 6-6"/>'),
  bag: I('<path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8z"/><path d="M9 8V7a3 3 0 0 1 6 0v1"/>'),
  menu: I('<path d="M4 7h16M4 12h16M4 17h10"/>'),
  close: I('<path d="M6 6l12 12M18 6L6 18"/>'),
  pin: I('<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>'),
  home: I('<path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z"/>'),
  grid: I('<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>'),
  tag: I('<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="7.5" r="1.5"/>'),
  leaf: I('<path d="M12 21c0-6 0-9-5-13M12 21c0-6 0-9 5-13M12 21V9M12 9c-2-3-2-5 0-7 2 2 2 4 0 7z"/>'),
  play: I('<path d="M8 5v14l11-7z"/>'),
  pause: I('<path d="M8 5v14M16 5v14"/>'),
  search: I('<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>'),
  sun: I('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  truck: I('<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="17.5" r="1.5"/><circle cx="17.5" cy="17.5" r="1.5"/>'),
  warn: I('<path d="M12 3l9 16H3z"/><path d="M12 10v4M12 17h.01"/>'),
};

// ---- image pipeline ---------------------------------------------------------------------
// Resolves any image URL a model carries to the downloaded original (audit/image-inventory.json),
// encodes WebP variants once into tmp/imgcache, and copies what a page uses into dist.
const inv = readJSON(path.join(ROOT, 'audit/image-inventory.json'), { images: [] }).images;
const keyOf = (u) => { try { const x = new URL(u, ORIGIN); if (x.pathname === '/_next/image' && x.searchParams.get('url')) return keyOf(x.searchParams.get('url')); return (x.host + decodeURIComponent(x.pathname)).toLowerCase(); } catch { return String(u); } };
const byKey = new Map();
// true when the URL was downloaded (lookup without logging a miss)
export const knownImage = (u) => !!u && byKey.has(keyOf(u));
for (const r of inv) {
  if (!r.localFile || r.downloadError) continue;
  const k = keyOf(r.src);
  const prev = byKey.get(k);
  if (!prev || (r.intrinsicWidth || 0) > (prev.intrinsicWidth || 0)) byKey.set(k, r);
}
const CACHE = path.join(ROOT, 'tmp', 'imgcache');
fs.mkdirSync(CACHE, { recursive: true });
export const imageLog = { resolved: 0, missing: new Map(), encoded: 0, cached: 0, lowRes: new Map() };
const CWEBP = (() => { try { execFileSync('cwebp', ['-version'], { stdio: 'pipe' }); return 'cwebp'; } catch { return null; } })();

function encode(srcAbs, sha, w, alpha) {
  const out = path.join(CACHE, `${sha.slice(0, 12)}-${w}.webp`);
  if (fs.existsSync(out) && fs.statSync(out).size > 0) { imageLog.cached++; return out; }
  const args = ['-quiet', '-q', '80', '-metadata', 'none', '-resize', String(w), '0'];
  if (alpha) args.push('-alpha_q', '100', '-exact');
  execFileSync(CWEBP, [...args, srcAbs, '-o', out], { stdio: 'pipe' });
  imageLog.encoded++;
  return out;
}
const used = new Map(); // dist-relative path -> absolute source to copy

// returns { src, srcset, width, height } in site paths, or null when the URL was never downloaded
export function image(url, { max = 1200, widths = [480, 800, 1200], page = '' } = {}) {
  if (!url) return null;
  const rec = byKey.get(keyOf(url));
  if (!rec) { imageLog.missing.set(url, (imageLog.missing.get(url) || new Set()).add(page)); return null; }
  imageLog.resolved++;
  const abs = path.join(ROOT, rec.localFile);
  const W = rec.intrinsicWidth || max, H = rec.intrinsicHeight || Math.round(max * 0.75);
  if (W < 400 && page) imageLog.lowRes.set(rec.src, `${W}x${H}`);
  const fmt = String(rec.format || '').toLowerCase();
  if (fmt === 'svg' || fmt === 'gif' || !CWEBP) {
    const ext = fmt === 'svg' ? 'svg' : fmt === 'gif' ? 'gif' : (path.extname(abs).slice(1) || 'img');
    const rel = `assets/img/${rec.sha256.slice(0, 12)}.${ext}`;
    used.set(rel, abs);
    return { src: '/' + rel, width: W, height: H };
  }
  const alpha = fmt === 'png' || fmt === 'webp';
  const ws = [...new Set(widths.filter((w) => w < W).concat(Math.min(W, max)))].filter((w) => w <= max).sort((a, b) => a - b);
  const set = ws.map((w) => { const f = encode(abs, rec.sha256, w, alpha); const rel = `assets/img/${path.basename(f)}`; used.set(rel, f); return { rel, w }; });
  const big = set[set.length - 1];
  const h = Math.round((H / W) * big.w);
  return { src: '/' + big.rel, srcset: set.length > 1 ? set.map((s) => `/${s.rel} ${s.w}w`).join(', ') : '', width: big.w, height: h };
}
// generated (fal) + brand files that live in src/assets are copied wholesale by the build.
export function flushImages() {
  for (const [rel, abs] of used) {
    const out = path.join(DIST, rel);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    if (!fs.existsSync(out) || fs.statSync(out).size !== fs.statSync(abs).size) fs.copyFileSync(abs, out);
  }
  return used.size;
}
// lazy:false = eager; high (default: !lazy) adds fetchpriority="high" — pass high:false for above-the-fold
// images that are not the page's largest paint, so they do not compete with the one that is
export function imgTag(im, { alt = '', cls = '', sizes = '100vw', lazy = true, high = !lazy, extra = '' } = {}) {
  if (!im) return '';
  return `<img${cls ? ` class="${cls}"` : ''} src="${attr(im.src)}"${im.srcset ? ` srcset="${attr(im.srcset)}" sizes="${attr(sizes)}"` : ''} width="${im.width}" height="${im.height}" alt="${t(alt)}"${lazy ? ' loading="lazy" decoding="async"' : ` loading="eager" decoding="async"${high ? ' fetchpriority="high"' : ''}`}${extra}>`;
}
export const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
