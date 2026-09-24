// use-asset-routing.mjs — preload for sr-assets, stacked AFTER use-browser-proxy.mjs:
//   node --import <use-browser-proxy.mjs> --import <this> scripts/sr-assets.mjs ...
// 1. /_next/image?url=X  -> fetch X from its CDN directly. The proxy is robots-disallowed
//    (Disallow: /_next/*) and only re-encodes X at a smaller width; X is the full-resolution
//    original. Every substitution is appended to audit/next-image-unwrap.jsonl.
// 2. any other /_next/*  -> refused before a request is made (robots.txt Disallow).
// 3. /compress?w=… and /product/compress?w=… -> refused: srcset parse artifacts. The source
//    writes `…png?auto=format,compress?w=828` and a comma-splitting srcset parser resolved the
//    tail as a page-relative URL. There is no such resource.
import fs from 'node:fs';
import path from 'node:path';

const HOST = process.env.SR_PROXY_HOST || 'www.sunnydayzcannabis.com';
const PROJECT = process.env.SR_PROJECT;
if (!PROJECT) throw new Error('set SR_PROJECT to the project directory');
const LOG = path.join(PROJECT, 'audit', 'next-image-unwrap.jsonl');
const prev = globalThis.fetch;

globalThis.fetch = async function (input, init = {}) {
  const url = typeof input === 'string' ? input : (input && input.url) || String(input);
  let u;
  try { u = new URL(url); } catch { return prev(input, init); }
  if (u.hostname !== HOST) return prev(input, init);
  if (u.pathname === '/_next/image') {
    const inner = u.searchParams.get('url');
    let target;
    try { target = new URL(inner, u.origin); } catch { throw new TypeError('refused: /_next/image with unparseable url= param'); }
    if (target.hostname === HOST) throw new TypeError('refused: /_next/image wraps a same-origin path ' + target.pathname);
    fs.appendFileSync(LOG, JSON.stringify({ proxy: url, original: target.toString(), width: u.searchParams.get('w'), at: new Date().toISOString() }) + '\n');
    return prev(target.toString(), init);
  }
  if (u.pathname.startsWith('/_next/')) throw new TypeError('refused: robots.txt Disallow /_next/* — not requested');
  if (/^\/(product\/)?compress$/.test(u.pathname)) throw new TypeError('refused: srcset parse artifact (comma inside "auto=format,compress") — not a real resource');
  return prev(input, init);
};
