// capture-chrome.mjs — one full-body render of the homepage for the site chrome (header, mega
// menu, footer, cart drawer), which lives outside <main> and is client-rendered.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch } from './cdp.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const b = await launch({ port: 9390 });
const p = await b.newPage({ width: 1440, height: 900 });
await p.send('Network.setBlockedURLs', { urls: ['*google-analytics.com*', '*googletagmanager.com*', '*surfside.io*', '*doubleclick.net*', '*.mp4', '*player.cloudinary.com*'] });
await p.goto('https://www.sunnydayzcannabis.com/', { settle: 3000 });
const r = await p.eval(`(() => {
  const main = document.querySelector('main');
  const clone = document.body.cloneNode(true);
  clone.querySelectorAll('main, script, style, noscript, iframe').forEach((n) => n.remove());
  const links = [...document.querySelectorAll('header a, nav a, footer a')].map((a) => ({ text: a.innerText.trim(), href: a.getAttribute('href') }));
  return { url: location.href, chromeHtml: clone.innerHTML, chromeText: clone.innerText, links,
           logo: [...document.querySelectorAll('header img, footer img')].map((i) => ({ src: i.currentSrc || i.src, alt: i.alt, w: i.naturalWidth, h: i.naturalHeight })) };
})()`);
fs.writeFileSync(path.join(ROOT, 'audit/rendered/_chrome.json'), JSON.stringify(r, null, 1));
console.log('chrome html', r.chromeHtml.length, 'links', r.links.length, 'logos', JSON.stringify(r.logo));
await b.close();
