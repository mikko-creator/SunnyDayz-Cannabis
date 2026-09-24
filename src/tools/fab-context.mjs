// fab-context.mjs — for each distinct sr-fabrication finding, show the rebuild's claim window next
// to what follows the same words in the source corpus: separates a true unsourced claim from a
// context-window mismatch (the detector takes the match + up to 50-60 following chars).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const r = JSON.parse(fs.readFileSync(path.join(ROOT, 'audit/fabrication-report.json'), 'utf8'));
const c = JSON.parse(fs.readFileSync(path.join(ROOT, 'audit/content-inventory.json'), 'utf8'));
const norm = (s) => String(s || '').toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();
const corpus = norm(c.pages.map((p) => [p.title, p.metaDescription, p.bodyText, p.footerText].join(' \n ')).join(' \n '));
const seen = new Map();
for (const f of r.findings) {
  const n = norm(f.claim);
  const key = f.code + '|' + n.split(' ').slice(0, 2).join(' ');
  if (!seen.has(key)) seen.set(key, { f, n, count: 0 });
  seen.get(key).count++;
}
for (const { f, n, count } of seen.values()) {
  const head = n.split(' ').slice(0, 2).join(' ');
  const i = corpus.indexOf(head);
  console.log(`\n${f.code}  x${count}  e.g. ${f.file}`);
  console.log('  rebuild window: ' + JSON.stringify(n.slice(0, 90)));
  console.log('  source context: ' + (i >= 0 ? JSON.stringify(corpus.slice(i, i + 90)) : '(first words not in source corpus: "' + head + '")'));
}
