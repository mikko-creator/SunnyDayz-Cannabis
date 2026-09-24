// accept-failures.mjs — close deliberate refusals in audit/failures.json with their reason.
// Only items whose reason matches a rule below are touched; anything else stays open (C24).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const file = path.join(ROOT, 'audit/failures.json');
const f = JSON.parse(fs.readFileSync(file, 'utf8'));
const RULES = [
  { stage: 'assets:css', re: /robots\.txt Disallow \/_next\//, why: 'Not requested: robots.txt Disallow /_next/*. The design evidence is the in-browser computed-style capture (60 captures, 4 breakpoints) whose cssRules/@keyframes harvest reads these same-origin sheets inside the page.' },
  { stage: 'assets:script', re: /robots\.txt Disallow \/_next\//, why: 'Not requested: robots.txt Disallow /_next/*. Platform runtime (Next.js/Treez bundles) is removed from the rebuild by design (tenet 5); nothing needs these files.' },
  { stage: 'assets:image', re: /srcset parse artifact/, why: 'Phantom URL, not a resource: the source writes "…png?auto=format,compress?w=N" and the comma-splitting srcset parser resolved the tail as a page-relative path. The real image (images.prismic.io URL) is inventoried and downloaded.' },
];
let n = 0;
for (const it of f.items) {
  if (it.resolved || it.accepted) continue;
  const r = RULES.find((x) => x.stage === it.stage && x.re.test(String(it.reason)));
  if (r) { it.accepted = true; it.acceptedReason = r.why; it.acceptedBy = 'src/tools/accept-failures.mjs'; n++; }
}
fs.writeFileSync(file, JSON.stringify(f, null, 2));
const open = f.items.filter((i) => !i.resolved && !i.accepted);
console.log('accepted', n, 'still open', open.length, open.slice(0, 5).map((i) => i.stage + ' ' + i.target));
