// finalize.mjs — the ONE command that produces the shipped dist/. Order matters: src/build.mjs
// wipes dist/, so the SEO pass and the sitemap correction must run after every build.
//   1. node src/build.mjs                                   (pages, assets, _redirects)
//   2. sr-seo --apply --site-url <SITE>                     (robots.txt, sitemap.xml, llms.txt, twitter:*)
//   3. node src/tools/finalize-seo.mjs --site-url <SITE>        (sitemap/llms from canonicals, noindex out)
// Any step failing stops the chain with its exit code.
//   node src/tools/finalize.mjs
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SITE = 'https://www.sunnydayzcannabis.com';
const SKILL = path.join(os.homedir(), '.claude', 'skills', 'site-reforge', 'scripts');
const steps = [
  ['build', [path.join(ROOT, 'src/build.mjs')]],
  ['sr-seo --apply', [path.join(SKILL, 'sr-seo.mjs'), '--project', ROOT, '--apply', '--site-url', SITE]],
  ['finalize-seo', [path.join(ROOT, 'src/tools/finalize-seo.mjs'), '--site-url', SITE]],
];
for (const [name, args] of steps) {
  const r = spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8' });
  const out = (r.stdout || '').trim().split('\n');
  console.log('== ' + name + ' (exit ' + r.status + ')\n  ' + out.slice(-4).join('\n  '));
  if (r.status !== 0) { console.error((r.stderr || '').slice(-1500)); process.exit(r.status || 1); }
}
console.log('dist/ finalized for ' + SITE);
