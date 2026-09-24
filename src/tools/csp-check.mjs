// csp-check.mjs — proves the Content-Security-Policy recommended in docs/DEPLOY.md does not break
// the site. Each page is loaded with the policy injected as a real RESPONSE HEADER (CDP Fetch
// interception on the document) and every securitypolicyviolation is recorded; site.js revealing
// the live store status shows the external script ran under it. The inline script is judged by
// violations alone (site.js also sets the js class). Control: the same run with the inline-script
// hash removed MUST record a script-src violation.
//   node src/tools/csp-check.mjs   -> audit/csp-check.json (exit 1 on any violation or a failed control)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, sleep } from './cdp.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const BASE = 'http://127.0.0.1:8793';
const HASH = "'sha256-jEKeIZhl4a389+P5khwn9QmdZoDUXNSlnXFcMMiAgKE='";
export const CSP = `default-src 'self'; script-src 'self' ${HASH}; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; media-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'`;
const PAGES = ['/', '/shop', '/collection/flower', '/product/ahh-moments-ahh-moments-atlantic-bliss-rso-chocolate-100-mg-edible-100-milligrams', '/brands', '/blog/purple-wookie-strain', '/strain/indica', '/store-locator', '/contact-us', '/dispensary/sunny-dayz'];

async function run(policy, pages) {
  const b = await launch({ port: 0 });
  const rows = [];
  try {
    const p = await b.newPage({ width: 1280, height: 900 });
    await p.send('Page.addScriptToEvaluateOnNewDocument', { source: "window.__csp = []; document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(e.violatedDirective + ' ' + (e.blockedURI || '') + ' ' + (e.sourceFile || '') + ':' + (e.lineNumber || ''))); try { localStorage.setItem('sdz-age-21', 'true'); } catch (e) {}" });
    await p.send('Fetch.enable', { patterns: [{ urlPattern: BASE + '/*', resourceType: 'Document', requestStage: 'Response' }] });
    let injected = 0;
    b.on(async (m) => {
      if (m.sessionId !== p.sessionId || m.method !== 'Fetch.requestPaused') return;
      const { requestId, responseStatusCode, responseHeaders = [] } = m.params;
      const body = await p.send('Fetch.getResponseBody', { requestId });
      const headers = responseHeaders.filter((h) => !/^content-security-policy$/i.test(h.name)).concat([{ name: 'Content-Security-Policy', value: policy }]);
      injected++;
      await p.send('Fetch.fulfillRequest', { requestId, responseCode: responseStatusCode || 200, responseHeaders: headers, body: body.base64Encoded ? body.body : Buffer.from(body.body).toString('base64') });
    });
    for (const pth of pages) {
      await p.goto(BASE + pth, { settle: 900 });
      await p.eval(`(async () => { document.documentElement.style.scrollBehavior = 'auto'; for (let y = 0; y < document.documentElement.scrollHeight; y += 700) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } scrollTo(0, 0); return true; })()`);
      await sleep(400);
      const r = await p.eval(`({ violations: window.__csp || [], js: document.documentElement.classList.contains('js'), storeStatus: !!document.querySelector('[data-store-status]:not([hidden])'), hasStoreWidget: !!document.querySelector('[data-store-status]') })`);
      rows.push({ path: pth, ...r });
    }
    rows.injected = injected;
  } finally { await b.close(); }
  return rows;
}

const main = await run(CSP, PAGES);
const control = await run(CSP.replace(' ' + HASH, ''), ['/']);
const ok = main.injected >= PAGES.length && main.every((r) => r.violations.length === 0 && r.js && (!r.hasStoreWidget || r.storeStatus));
// the js class is NOT evidence here: site.js also sets it. The inline script's fate is read from
// the violation itself — none under the policy, a script-src violation once its hash is removed.
const controlFired = control[0].violations.some((v) => /^script-src/.test(v));
fs.writeFileSync(path.join(ROOT, 'audit/csp-check.json'), JSON.stringify({ schema: 'sunnydayz/csp-check@1', generated: new Date().toISOString(), policy: CSP, headerInjectedOn: main.injected, pages: main, control: { policy: 'same, inline-script hash removed', result: control[0], fired: controlFired }, pass: ok && controlFired }, null, 1));
for (const r of main) console.log((r.violations.length ? 'VIOLATION ' : 'ok        ') + r.path.padEnd(40).slice(0, 40) + ' js=' + r.js + (r.hasStoreWidget ? ' storeStatus=' + r.storeStatus : '') + ' ' + r.violations.join(' | '));
console.log('header injected on', main.injected, 'documents · control (hash removed):', controlFired ? 'violation recorded, inline script blocked — the check can fire' : 'DID NOT FIRE', JSON.stringify(control[0].violations));
if (!(ok && controlFired)) process.exit(1);
