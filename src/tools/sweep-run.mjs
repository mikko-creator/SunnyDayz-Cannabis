// sweep-run.mjs — drives sr-sweep's IIFE (sr-sweep.mjs --emit) through headless Chrome, one page
// per template at every configured breakpoint, and merges each result with sr-sweep --merge.
//   node src/tools/sweep-run.mjs --side rebuild   [--base http://127.0.0.1:8793]
//   node src/tools/sweep-run.mjs --side baseline  (the live site, sequential, 1.5 s apart)
// Guards: innerWidth must equal the breakpoint (mobile:false — see run-capture) and the document
// must answer 200; the page is scrolled top->bottom->top first so lazy images have loaded and a
// broken one can be seen (img-broken only fires on complete images). The rebuild runs as a
// returning visitor (age consent set); the live site served headless Chrome with no age gate.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { launch, sleep } from './cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SKILL = path.join(os.homedir(), '.claude', 'skills', 'site-reforge', 'scripts');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const SIDE = arg('side', 'rebuild');
if (!/^(rebuild|baseline)$/.test(SIDE)) throw new Error('--side rebuild|baseline');
const BASE = SIDE === 'baseline' ? 'https://www.sunnydayzcannabis.com' : arg('base', 'http://127.0.0.1:8793');
const project = JSON.parse(fs.readFileSync(path.join(ROOT, 'project.json'), 'utf8'));
const WIDTHS = (arg('widths', '') ? arg('widths').split(',').map(Number) : project.config.breakpoints);
const PATHS = (arg('paths', '') ? arg('paths').split(',') : [
  '/', '/shop', '/collection/flower', '/collection/edible/gummy',
  '/product/ahh-moments-ahh-moments-atlantic-bliss-rso-chocolate-100-mg-edible-100-milligrams',
  '/brand/ahh-moments', '/brands', '/blog', '/blog/purple-wookie-strain', '/strain/indica',
  '/our-strains', '/store-locator', '/daily-deals', '/about-us', '/contact-us', '/dispensary/sunny-dayz',
  '/weed-delivery/dispensary-in-glendale', '/collection/pill',
]);
// --diag: the same detector with its 15-per-check cap lifted, written to tmp/sweeps/diag and NEVER merged
const DIAG = process.argv.includes('--diag');
const EMITTED = execFileSync(process.execPath, [path.join(SKILL, 'sr-sweep.mjs'), '--emit'], { encoding: 'utf8' });
if (DIAG && !EMITTED.includes('var CAP = 15;')) throw new Error('detector cap line not found');
const SWEEP = DIAG ? EMITTED.replace('var CAP = 15;', 'var CAP = 1e6;') : EMITTED;
const OUT = path.join(ROOT, 'tmp', 'sweeps', DIAG ? 'diag-' + SIDE : SIDE);
fs.mkdirSync(OUT, { recursive: true });
const slug = (p) => (p.replace(/^\/+|\/+$/g, '').replace(/[^A-Za-z0-9]+/g, '-') || 'index');

const b = await launch({ port: 0 });
const log = [];
try {
  for (const w of WIDTHS) {
    const pg = await b.newPage({ width: w, height: 900, mobile: false });
    await pg.send('Network.setBlockedURLs', { urls: ['*google-analytics.com*', '*googletagmanager.com*', '*surfside.io*', '*doubleclick.net*', '*facebook.net*', '*hotjar*', '*clarity.ms*'] });
    if (SIDE === 'rebuild') await pg.send('Page.addScriptToEvaluateOnNewDocument', { source: "try{localStorage.setItem('sdz-age-21','true')}catch(e){}" });
    let status = 0;
    const onResp = (m) => { if (m.sessionId === pg.sessionId && m.method === 'Network.responseReceived' && m.params.type === 'Document') status = m.params.response.status; };
    b.on(onResp);
    for (const p of PATHS) {
      status = 0;
      const href = await pg.goto(BASE + p, { settle: SIDE === 'baseline' ? 3500 : 900, timeout: 60000 });
      if (status !== 200) throw new Error(`document status ${status} for ${href}`);
      if (/age-gate/.test(href)) throw new Error('landed on the age gate: ' + href);
      const iw = await pg.eval('window.innerWidth');
      if (iw !== w) throw new Error(`viewport not applied: wanted ${w} got ${iw} on ${p}`);
      await pg.eval(`(async () => { document.documentElement.style.scrollBehavior = 'auto'; const H = () => document.documentElement.scrollHeight; for (let y = 0; y < H(); y += Math.round(innerHeight * 0.8)) { scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); } scrollTo(0, H()); await new Promise(r => setTimeout(r, 400)); scrollTo(0, 0); for (let i = 0; i < 40 && scrollY !== 0; i++) await new Promise(r => setTimeout(r, 50)); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); if (scrollY !== 0) throw new Error('did not return to top: ' + scrollY); return true; })()`, { timeout: 120000 });
      const res = await pg.eval(SWEEP, { timeout: 120000 });
      if (!res || res.schema !== 'site-reforge/sweep@1') throw new Error('sweep returned no result on ' + p);
      if (res.viewport.w !== w) throw new Error(`sweep viewport ${res.viewport.w} != ${w} on ${p}`);
      const label = slug(p) + '.' + w;
      const file = path.join(OUT, label + '.json');
      fs.writeFileSync(file, JSON.stringify(res));
      if (!DIAG) execFileSync(process.execPath, [path.join(SKILL, 'sr-sweep.mjs'), '--project', ROOT, '--merge', file, '--label', label, ...(SIDE === 'baseline' ? ['--side', 'baseline'] : [])], { stdio: 'pipe' });
      log.push({ path: p, w, counts: res.counts, docW: res.documentScrollWidth });
      console.log(SIDE, String(w).padStart(4), p.padEnd(44).slice(0, 44), JSON.stringify(res.counts), res.documentScrollWidth > w ? 'OVERFLOW ' + res.documentScrollWidth : '');
      if (SIDE === 'baseline') await sleep(1500);
    }
    await b.send('Target.closeTarget', { targetId: pg.targetId }).catch(() => {});
  }
} finally {
  fs.writeFileSync(path.join(OUT, '_run.json'), JSON.stringify({ side: SIDE, base: BASE, widths: WIDTHS, paths: PATHS, results: log }, null, 1));
  await b.close();
}
