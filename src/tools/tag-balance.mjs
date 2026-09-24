// tag-balance.mjs — every built page's elements open and close in order. A browser silently
// "repairs" a stray or missing close tag, so no text-parity or overflow check can see one; this
// walks the raw markup with a stack. Void elements and <script>/<style>/<template> bodies are
// skipped; optional end tags (p, li, dt, dd, option, tr, td, th, thead, tbody) are closed the way
// the HTML parser closes them only where the spec allows it — anything else is a finding.
// Control: the same check run on a planted unclosed <div> must report it.
//   node src/tools/tag-balance.mjs   -> audit/tag-balance.json (exit 1 on any finding or a failed control)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIST = path.join(ROOT, 'dist');
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const OPTIONAL = new Set(['p', 'li', 'dt', 'dd', 'option', 'tr', 'td', 'th', 'thead', 'tbody']);

export function check(html) {
  const s = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style|template)\b[^>]*>[\s\S]*?<\/\1>/gi, '<$1></$1>');
  const stack = []; const problems = [];
  for (const m of s.matchAll(/<(\/?)([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*?(\/?)>/g)) {
    const close = m[1] === '/'; const tag = m[2].toLowerCase();
    if (VOID.has(tag) || (!close && m[3] === '/' && /^(svg|path|circle|rect|line|polyline|polygon|ellipse|use|stop)$/.test(tag))) continue;
    if (!close) { stack.push({ tag, at: m.index }); continue; }
    // implicit closes of optional-end-tag elements that sit above the element being closed
    let i = stack.length - 1;
    while (i >= 0 && stack[i].tag !== tag && OPTIONAL.has(stack[i].tag)) i--;
    if (i >= 0 && stack[i].tag === tag) { stack.length = i; continue; }
    problems.push({ kind: 'stray-close', tag, at: m.index, open: stack.slice(-3).map((x) => x.tag).join('>') });
  }
  for (const x of stack) if (!OPTIONAL.has(x.tag) && !/^(html|body|head)$/.test(x.tag)) problems.push({ kind: 'unclosed', tag: x.tag, at: x.at });
  return problems;
}

const files = [];
(function walk(d, r) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const x = r ? r + '/' + e.name : e.name; if (e.isDirectory()) walk(path.join(d, e.name), x); else if (e.name.endsWith('.html')) files.push(x); } }(DIST, ''));
const findings = [];
for (const f of files) {
  const html = fs.readFileSync(path.join(DIST, f), 'utf8');
  for (const p of check(html)) findings.push({ file: f, ...p, context: html.slice(Math.max(0, p.at - 60), p.at + 60).replace(/\s+/g, ' ') });
}
const control = check('<main><section><div class="a"><p>x</p></section></main>');
const fired = control.some((p) => p.tag === 'div' || p.tag === 'section');
fs.writeFileSync(path.join(ROOT, 'audit/tag-balance.json'), JSON.stringify({ schema: 'sunnydayz/tag-balance@1', generated: new Date().toISOString(), pages: files.length, findings, control: { input: 'unclosed <div> inside <section>', reported: control, fired } }, null, 1));
console.log('pages', files.length, '· findings', findings.length, '· control', fired ? 'fired (' + control.map((p) => p.kind + ' ' + p.tag).join(', ') + ')' : 'DID NOT FIRE');
for (const f of findings.slice(0, 12)) console.log('  ' + f.file + ' ' + f.kind + ' <' + f.tag + '> … ' + f.context);
if (findings.length || !fired) process.exit(1);
