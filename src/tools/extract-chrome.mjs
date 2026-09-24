// extract-chrome.mjs — site chrome model (nav, mega menu, footer, compliance, cart copy) from
// the captured homepage chrome (audit/rendered/_chrome.json). Every label and href is LOOKED UP
// in the capture; a label the capture does not carry fails the run rather than being typed in.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const c = JSON.parse(fs.readFileSync(path.join(ROOT, 'audit/rendered/_chrome.json'), 'utf8'));
// U+00A0 (e.g. "by TREEZ") compares as a plain space on both sides of every lookup.
const nb = (s) => String(s || '').replace(/ /g, ' ');
const text = nb(c.chromeText);
const links = c.links.filter((l) => l.text).map((l) => ({ ...l, text: nb(l.text) }));
const errors = [];
// the n-th link carrying this exact label (labels repeat between header and footer)
function L(label, nth = 0) {
  const hits = links.filter((l) => l.text === label);
  if (!hits[nth]) { errors.push('link not in capture: ' + label + ' #' + nth); return { label, href: null }; }
  return { label, href: hits[nth].href };
}
function T(s) { if (!text.includes(s)) errors.push('text not in capture: ' + s.slice(0, 60)); return s; }
// Server-rendered chrome that the client-side chrome capture does not carry (the Treez fulfilment
// chooser and the express band's second state): looked up in the static page text instead, and
// the number of pages carrying it is recorded.
const inventory = JSON.parse(fs.readFileSync(path.join(ROOT, 'audit/content-inventory.json'), 'utf8'));
function S(s) {
  const n = inventory.pages.filter((p) => nb(p.bodyText).replace(/\s+/g, ' ').includes(s)).length;
  if (!n) errors.push('text not in static source: ' + s.slice(0, 60));
  return { text: s, pages: n };
}
// The announcement is an icon-less <a> labelled only by aria-label, so the text-keyed chrome capture
// drops it; its href is read from the untouched server HTML (audit/raw), with the page count recorded.
function R(label) {
  const dir = path.join(ROOT, 'audit/raw'); const files = fs.readdirSync(dir).filter((x) => x.endsWith('.html'));
  const re = new RegExp('<a aria-label="' + label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '" href="([^"]+)"');
  const hrefs = {}; for (const x of files) { const m = fs.readFileSync(path.join(dir, x), 'utf8').match(re); if (m) hrefs[m[1]] = (hrefs[m[1]] || 0) + 1; }
  const top = Object.entries(hrefs).sort((a, b) => b[1] - a[1])[0];
  if (!top) { errors.push('link not in raw HTML: ' + label); return null; }
  return { href: top[0], pages: top[1], of: files.length };
}
const brandLogos = c.logo.filter((l) => /prismic/.test(l.src) && !/SDC/i.test(l.src) && !/svg/.test(l.src));

const chrome = {
  schema: 'sunnydayz/chrome@1',
  source: 'audit/rendered/_chrome.json',
  announcement: T('Thanks for visiting our new website!'),
  announcementLink: R('Thanks for visiting our new website!'),
  store: { mode: T('Pickup'), name: T('Sunny Dayz'), address: T('105 Greenfield Rd, South Deerfield, MA 01373') },
  logo: c.logo.find((l) => /SDC-2025-logo-ai/.test(l.src)) || c.logo[0],
  nav: [
    L('Home'),
    { label: T('Shop'), mega: true },
    L('Brands'), L('Deals'), L('Our Products'), L('Strains'), L('About Us'), L('Contact Us', 0),
  ],
  mega: {
    category: { title: T('Shop By Category'), links: ['Cartridges', 'Flower', 'Pre-rolls', 'Edible', 'Concentrates', 'Tinctures', 'Capsules', 'Topicals', 'Accessories', 'Drinks', 'All'].map((x) => L(x)) },
    classification: { title: T('By Classification'), links: ['Sativa', 'Hybrid', 'Indica', 'CBD Rich'].map((x) => L(x)) },
    brand: { title: T('By Brand'), links: ["Ahh Moments", "Betty's Eddies", 'Breathe Free*', 'Bountiful Farms*', 'Cap Cod Labs', 'CNA Stores', 'Coast Cannabis Co.', 'The Fresh Connection', 'Harbor House', 'Healing Rose', 'Impressed Cannabis', 'Kanha', 'Keef Beverages', 'Levia', 'Mass Yield', 'Natures Heritage', 'Sweet Grass Botanicals', 'Tower Three', 'TreeWorks'].map((x, i) => ({ ...L(x), logo: brandLogos[i] ? brandLogos[i].src : null })) },
    topBrandsTitle: T('Top Brands'),
  },
  // source markup: "GET YOUR ORDER IN 60 MIN ETA: <button>CLICK TO SEE THE EXPRESS DELIVERY MENU</button>"
  // — a Treez fulfilment toggle with no URL; the build links it to /shop and marks the integration point.
  // Treez fulfilment chooser (pickup vs express), server-rendered twice per page (desktop + mobile)
  chooser: { heading: S('How do you want to shop?'), chooseStore: S('Choose your Store'), expressLead: S('YOU ARE BUYING FROM OUR EXPRESS MENU:') },
  express: { text: T('GET YOUR ORDER IN 60 MIN ETA: CLICK TO SEE THE EXPRESS DELIVERY MENU'), lead: T('GET YOUR ORDER IN 60 MIN ETA:'), action: T('CLICK TO SEE THE EXPRESS DELIVERY MENU'), href: '/shop', decision: 'IMPROVE — a dismissible top banner whose button switches Treez fulfilment mode becomes a permanent pre-footer band linking to the menu (/shop).' },
  footer: [
    { title: T('CATEGORIES'), links: [L('Vapes'), L('Flower', 1), L('Pre-rolls', 1), L('Edibles'), L('Extracts'), L('CBD'), L('Drinks', 1), L('Tincture'), L('Capsules', 1), L('Topicals', 1), L('Accesories')] },
    { title: T('SHOP BY'), links: [L('ALL'), L('Brands', 0), L('Deals', 0), L('Daily Deals')] },
    { title: T('ABOUT US'), links: [L('Our Story'), L('Contact Us', 1)] },
    { title: T('LEGAL'), links: [L('Terms and Conditions'), L('Privacy Policy')] },
  ],
  compliance: [
    T('For use by individuals registered qualifying patients or individuals 21 years of age or older only. Keep out of reach of children. It is illegal to drive a motor vehicle while under the influence of marihuana. National Poison Control Center 1-413-350-5034'),
    T('WARNING: Use by pregnant or breastfeeding women, or by women planning to become pregnant, may result in fetal injury, preterm birth, low birth weight, or developmental problems for the child.'),
  ],
  licence: T('MR284636'),
  copyright: T('Sunny Dayz. Copyright © 2026. All rights reserved.'),
  removed: [
    { text: T('Powered with love by TREEZ'), why: 'Platform attribution for the storefront platform, which does not power the rebuild.' },
    { text: 'Instagram / Facebook', why: 'Both captured links point to "/" and the store record carries instagram:null, facebook:null — there is no profile to link. Client to supply URLs.' },
    { text: 'wishlist icon (/wishlist)', why: 'Account feature behind robots Disallow /wishlist; no account backend in a static build.' },
  ],
  dock: [T('Home'), T('Shop'), T('Categories'), T('Deals')],
  cart: { title: T('Shopping cart'), pickup: T('Pickup at'), empty: T('Your bag is empty'), emptyCta: T('Let’s go shopping now!'), weight: T('Total Weight'), subtotal: T('Subtotal'), checkout: T('Proceed to checkout') },
};
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
fs.writeFileSync(path.join(ROOT, 'src/content/chrome.json'), JSON.stringify(chrome, null, 1));
console.log('chrome model ok:', chrome.nav.length, 'nav,', chrome.mega.brand.links.length, 'brands,', chrome.mega.brand.links.filter((b) => b.logo).length, 'brand logos,', chrome.footer.reduce((n, f) => n + f.links.length, 0), 'footer links');
