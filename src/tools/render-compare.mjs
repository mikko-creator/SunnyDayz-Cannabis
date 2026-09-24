// render-compare.mjs — does the static capture hold the page's content?
// Renders every inventoried page in headless Chrome and compares the rendered <main>/<body>
// text with the static bodyText sr-extract recorded. Writes audit/rendered/<slug>.json and
// audit/render-verification.json. audit/raw/ is never touched.
//   node src/tools/render-compare.mjs [--concurrency 2] [--only <substring>]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, sleep } from './cdp.mjs';
import { urlSlug } from './slug.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') ? a.concat([[v.slice(2), arr[i + 1]]]) : a), []));
const CONC = Number(args.concurrency || 2);
const content = JSON.parse(fs.readFileSync(path.join(ROOT, 'audit/content-inventory.json'), 'utf8'));
const OUT = path.join(ROOT, 'audit/rendered');
fs.mkdirSync(OUT, { recursive: true });

const words = (s) => (String(s || '').toLowerCase().match(/[a-z0-9$%.]+/g) || []).map((w) => w.replace(/\.+$/, '')).filter((w) => w.length > 1);
const slug = urlSlug;

let pages = content.pages;
if (args.only) pages = pages.filter((p) => p.url.includes(args.only));
if (args['urls-file']) { const want = new Set(JSON.parse(fs.readFileSync(path.resolve(args['urls-file']), 'utf8'))); pages = pages.filter((p) => want.has(p.url)); }
const b = await launch({ port: 9370 });
const BLOCK = ['*google-analytics.com*', '*googletagmanager.com*', '*surfside.io*', '*doubleclick.net*', '*facebook.net*', '*hotjar*', '*clarity.ms*',
  '*.jpg', '*.jpeg', '*.png', '*.webp', '*.avif', '*.gif', '*.mp4', '*.webm', '*.woff2', '*.woff', '*.ttf', '*/_next/image*', '*player.cloudinary.com*'];
const results = [];
const queue = [...pages];
async function worker(id) {
  const p = await b.newPage({ width: 1440, height: 900 });
  await p.send('Network.setBlockedURLs', { urls: BLOCK });
  while (queue.length) {
    const page = queue.shift();
    const t0 = Date.now();
    try {
      const href = await p.goto(page.url, { settle: 1800, timeout: 45000 });
      const r = await p.eval(`(() => {
        const main = document.querySelector('main') || document.body;
        return { title: document.title, href: location.href, bodyText: document.body.innerText, mainText: main.innerText,
                 mainHtml: main.outerHTML.length < 2e6 ? main.outerHTML : null, h1: [...document.querySelectorAll('h1')].map(h => h.innerText.trim()) };
      })()`);
      const staticW = new Set(words(page.bodyText));
      const rendW = words(r.bodyText);
      const rendSet = new Set(rendW);
      const renderOnly = [...rendSet].filter((w) => !staticW.has(w));
      const staticOnly = [...staticW].filter((w) => !rendSet.has(w));
      const rec = {
        url: page.url, landed: r.href, title: r.title, h1: r.h1,
        staticChars: (page.bodyText || '').length, renderedChars: r.bodyText.length,
        renderedUniqueWords: rendSet.size, staticUniqueWords: staticW.size,
        renderOnlyWords: renderOnly.length, renderOnlyRatio: rendSet.size ? +(renderOnly.length / rendSet.size).toFixed(4) : 0,
        staticOnlyWords: staticOnly.length, renderOnlySample: renderOnly.slice(0, 40), ms: Date.now() - t0,
      };
      fs.writeFileSync(path.join(OUT, slug(page.url) + '.json'), JSON.stringify({ ...rec, bodyText: r.bodyText, mainText: r.mainText, mainHtml: r.mainHtml }));
      results.push(rec);
      console.log(`[w${id}] ${results.length}/${pages.length} ${slug(page.url)} static=${rec.staticChars} rendered=${rec.renderedChars} renderOnly=${rec.renderOnlyWords} (${(rec.renderOnlyRatio * 100).toFixed(1)}%)`);
    } catch (e) {
      results.push({ url: page.url, error: String(e.message || e).slice(0, 300) });
      console.log(`[w${id}] ERR ${page.url} ${String(e.message || e).slice(0, 160)}`);
    }
    await sleep(400);
  }
}
try {
  await Promise.all(Array.from({ length: CONC }, (_, i) => worker(i)));
} finally {
  const summary = {
    schema: 'sunnydayz/render-verification@1', generated: new Date().toISOString(), pages: results.length,
    errors: results.filter((r) => r.error).length,
    method: 'Headless Chrome render (analytics/images/media/fonts blocked) vs sr-extract static bodyText; unique-word sets.',
    results: results.sort((a, b) => (b.renderOnlyRatio || 0) - (a.renderOnlyRatio || 0)),
  };
  if (args['urls-file']) {
    // merge: replace the rows for re-rendered URLs, keep every other row
    const vf = path.join(ROOT, 'audit/render-verification.json');
    const prev = JSON.parse(fs.readFileSync(vf, 'utf8'));
    const redone = new Map(results.map((r) => [r.url, r]));
    prev.results = prev.results.map((r) => redone.get(r.url) || r);
    for (const r of results) if (!prev.results.some((x) => x.url === r.url)) prev.results.push(r);
    prev.errors = prev.results.filter((r) => r.error).length;
    prev.rerendered = (prev.rerendered || []).concat({ at: new Date().toISOString(), urls: results.map((r) => r.url), why: 'snapshot-name collision (case-insensitive disk / query dropped); re-rendered under src/tools/slug.mjs names' });
    fs.writeFileSync(vf, JSON.stringify(prev, null, 1));
  } else if (!args.only) fs.writeFileSync(path.join(ROOT, 'audit/render-verification.json'), JSON.stringify(summary, null, 1));
  else fs.writeFileSync(path.join(ROOT, 'audit/render-verification.partial.json'), JSON.stringify(summary, null, 1));
  await b.close();
}
