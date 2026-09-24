// append-redesign-tokens.mjs — (re)append src/styles/tokens.redesign-layer.txt to tokens.css
// between markers. Idempotent: an existing block is replaced, never duplicated. Re-run after
// any sr-tokens.mjs run, which regenerates tokens.css from the capture.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const file = path.join(ROOT, 'src/styles/tokens.css');
const layer = fs.readFileSync(path.join(ROOT, 'src/styles/tokens.redesign-layer.txt'), 'utf8').trim();
const BEGIN = '/* >>> BEGIN REDESIGN LAYER (src/tools/append-redesign-tokens.mjs) >>> */';
const END = '/* <<< END REDESIGN LAYER <<< */';
let css = fs.readFileSync(file, 'utf8');
const i = css.indexOf(BEGIN), j = css.indexOf(END);
if (i >= 0 && j > i) css = css.slice(0, i).trimEnd() + '\n';
css = css.trimEnd() + '\n\n' + BEGIN + '\n' + layer + '\n' + END + '\n';
fs.writeFileSync(file, css);
const n = (css.match(/--[a-zA-Z][\w-]*\s*:/g) || []).length;
console.log('tokens.css', css.length, 'bytes,', n, 'custom properties, markers', css.split(BEGIN).length - 1);
