// fab-trace.mjs — evidence for the sr-fabrication findings that survive a faithful layout.
// sr-fabrication takes each match PLUS up to 50-60 following characters and requires that whole
// window in the STATIC source text. A redesign reorders elements, and this site renders most of
// its content client-side, so a window can fail while every string in it is on the live site.
// This splits each flagged window into its own text nodes (lines) and looks each one up in BOTH
// the static corpus (audit/content-inventory.json) and the rendered corpus (audit/rendered/*.json,
// the live site in a real browser). A finding is TRACED only if every line is found.
//   node src/tools/fab-trace.mjs   -> audit/fabrication-trace.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const norm = (s) => String(s || '').toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();
const fab = JSON.parse(fs.readFileSync(path.join(ROOT, 'audit/fabrication-report.json'), 'utf8'));
const inv = JSON.parse(fs.readFileSync(path.join(ROOT, 'audit/content-inventory.json'), 'utf8'));
const staticCorpus = norm(inv.pages.map((p) => [p.title, p.bodyText].join(' \n ')).join(' \n '));
const rendered = fs.readdirSync(path.join(ROOT, 'audit/rendered')).filter((f) => f.endsWith('.json')).map((f) => {
  const j = JSON.parse(fs.readFileSync(path.join(ROOT, 'audit/rendered', f), 'utf8'));
  return { file: 'audit/rendered/' + f, url: j.url, text: norm(j.bodyText || j.chromeText || '') };
});
const out = [];
for (const f of fab.findings) {
  const lines = String(f.claim).split(/\n/).map((l) => l.trim()).filter(Boolean);
  const pieces = lines.map((l) => {
    const n = norm(l);
    if (staticCorpus.includes(n)) return { text: l, found: 'static' };
    const r = rendered.find((x) => x.text.includes(n));
    return r ? { text: l, found: 'rendered', evidence: r.file, url: r.url } : { text: l, found: null };
  });
  // the whole window as the live site shows it (rendered), where it exists verbatim
  const whole = rendered.find((x) => x.text.includes(norm(f.claim)));
  out.push({ code: f.code, file: f.file, claim: f.claim.replace(/\s+/g, ' ').trim(), traced: pieces.every((p) => p.found), wholeWindowOnLiveSite: whole ? whole.file : null, pieces });
}
const summary = { schema: 'sunnydayz/fabrication-trace@1', generated: new Date().toISOString(), findings: out.length, traced: out.filter((x) => x.traced).length, untraced: out.filter((x) => !x.traced).length,
  method: 'Each sr-fabrication claim window split into its text nodes; each node looked up in the static source text and in the browser-rendered live pages.', items: out };
fs.writeFileSync(path.join(ROOT, 'audit/fabrication-trace.json'), JSON.stringify(summary, null, 1));
console.log('findings', summary.findings, 'traced', summary.traced, 'untraced', summary.untraced);
for (const x of out) console.log((x.traced ? 'TRACED  ' : 'OPEN    ') + x.code.replace('fabrication:', '').padEnd(12) + x.file.padEnd(46) + JSON.stringify(x.claim.slice(0, 60)) + (x.wholeWindowOnLiveSite ? '  [whole window on live site]' : ''));
