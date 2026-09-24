// shot-el.mjs — scroll one element to the middle of the viewport (instantly) and screenshot the
// viewport, so scroll-linked effects are captured in the state a reader actually sees.
//   node src/tools/shot-el.mjs --url http://127.0.0.1:8793/ --sel ".tagline-band" --widths 390,1440 --out tmp/shots/tagline [--top]
import fs from 'node:fs';
import path from 'node:path';
import { launch, sleep } from './cdp.mjs';
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') ? a.concat([[v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]]) : a), []));
const widths = String(args.widths || '1440,390').split(',').map(Number);
const out = path.resolve(args.out || 'tmp/shots/el');
fs.mkdirSync(path.dirname(out), { recursive: true });
const b = await launch({ port: 0 });
try {
  for (const w of widths) {
    const p = await b.newPage({ width: w, height: Number(args.height || 900), mobile: false });
    await p.send('Page.addScriptToEvaluateOnNewDocument', { source: "try{localStorage.setItem('sdz-age-21','true')}catch(e){}" });
    if (args['reduced-motion']) await p.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await p.goto(args.url, { settle: 700 });
    if (await p.eval('innerWidth') !== w) throw new Error('viewport not applied at ' + w);
    const status = await p.eval("(performance.getEntriesByType('navigation')[0] || {}).responseStatus || 0");
    if (status !== 200) throw new Error('document status ' + status);
    await p.eval('document.fonts.ready.then(() => true)');
    const found = args.top ? true : await p.eval(`(() => { document.documentElement.style.scrollBehavior = 'auto'; const el = document.querySelector(${JSON.stringify(String(args.sel))}); if (!el) return false; const r = el.getBoundingClientRect(); scrollTo(0, scrollY + r.top + r.height / 2 - innerHeight / 2); return true; })()`);
    if (!found) throw new Error('selector not found: ' + args.sel);
    await sleep(Number(args.settle || 900));
    const info = await p.eval('({ sw: document.documentElement.scrollWidth, y: scrollY })');
    const file = `${out}.${w}.png`;
    await p.screenshot(file);
    console.log(w, 'scrollWidth', info.sw, info.sw > w ? 'OVERFLOW' : 'ok', 'scrollY', Math.round(info.y), '->', path.relative(process.cwd(), file));
    await b.send('Target.closeTarget', { targetId: p.targetId }).catch(() => {});
  }
} finally { await b.close(); }
