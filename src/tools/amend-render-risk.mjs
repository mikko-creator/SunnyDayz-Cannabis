// amend-render-risk.mjs — apply the browser render evidence to audit/content-inventory.json.
// sr-extract flags a page HIGH render-risk from static heuristics and has no input for a
// browser capture. src/tools/render-compare.mjs rendered every page; this moves a HIGH page to
// renderRisk.browserVerified ONLY when its render is non-empty and contains its static text
// (so the static capture was not a shell), and records the amendment. Re-run after any
// sr-extract run, which rewrites content-inventory.json.
//   node src/tools/amend-render-risk.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { urlSlug } from './slug.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const invFile = path.join(ROOT, 'audit/content-inventory.json');
const inv = JSON.parse(fs.readFileSync(invFile, 'utf8'));
const ver = JSON.parse(fs.readFileSync(path.join(ROOT, 'audit/render-verification.json'), 'utf8'));
const byUrl = new Map(ver.results.map((r) => [r.url, r]));
const words = (s) => (String(s || '').toLowerCase().match(/[a-z0-9$%.]+/g) || []).map((w) => w.replace(/\.+$/, '')).filter((w) => w.length > 1);

// Candidates come from each page's own renderRisk.level — never from renderRisk.high, which this
// tool rewrites. Reading its own output made a second run find nothing and blank the record of
// the pages the first run had verified (observed 2026-09-23).
const high = inv.pages.filter((p) => p.renderRisk && p.renderRisk.level === 'high').map((p) => p.url);
const verified = [], kept = [];
for (const url of high) {
  const r = byUrl.get(url);
  const page = inv.pages.find((p) => p.url === url);
  if (!r || r.error || !page) { kept.push(url); continue; }
  const slug = urlSlug(url);
  const rendered = JSON.parse(fs.readFileSync(path.join(ROOT, 'audit/rendered', slug + '.json'), 'utf8'));
  const rset = new Set(words(rendered.bodyText));
  const sw = [...new Set(words(page.bodyText))];
  const coverage = sw.length ? sw.filter((w) => rset.has(w)).length / sw.length : 0;
  // Not a shell: the render has real text AND contains what the static fetch saw.
  if (rendered.renderedChars >= 400 && coverage >= 0.95) {
    verified.push({ url, staticChars: page.bodyText.length, renderedChars: rendered.renderedChars, staticWordsFoundInRender: +coverage.toFixed(4),
      evidence: 'audit/rendered/' + slug + '.json', note: 'Static capture is a subset of the rendered page; rebuild content is sourced from the render.' });
  } else kept.push(url);
}
inv.renderRisk.high = kept;
inv.renderRisk.browserVerified = verified;
// same outcome as the last run -> keep its timestamp, so a re-run is byte-identical
// matched by file name: the tool moved from src/tools/ to src/tools/, and its earlier record keeps the old path
const mine = (a) => String(a.tool || '').endsWith('amend-render-risk.mjs');
const prevAm = (inv.amendments || []).find(mine);
const sameOutcome = prevAm && JSON.stringify(prevAm.moved) === JSON.stringify(verified.map((v) => v.url)) && JSON.stringify(prevAm.stillHigh) === JSON.stringify(kept);
inv.amendments = (inv.amendments || []).filter((a) => !mine(a)).concat({
  tool: 'src/tools/amend-render-risk.mjs', at: sameOutcome ? prevAm.at : new Date().toISOString(),
  moved: verified.map((v) => v.url), stillHigh: kept,
  why: 'Browser render (audit/render-verification.json, 264/264 pages, 0 errors) shows these HIGH pages are not shells: each render is non-empty and contains >=95% of the static words. The HIGH score came from ~157 KB of Next.js script on every page.',
});
fs.writeFileSync(invFile, JSON.stringify(inv, null, 2));
console.log('verified', verified.length, 'still high', kept.length);
for (const v of verified) console.log('  ', v.url.split('/').pop(), v.staticChars, '->', v.renderedChars, 'coverage', v.staticWordsFoundInRender);
