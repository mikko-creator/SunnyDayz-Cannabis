// page.js — rich-text pages (about-us, contact-us, privacy-policy, terms, dispensary, weed-delivery).
// FAQ accordions (button.accordion__title[aria-controls] + its panel) are captured as
// question/answer pairs and removed from the loose body, so no string is counted twice or lost.
function extract(root, ctx) {
  const main = root.firstElementChild || root;
  const h1 = Q(root, 'h1');
  const banner = Q(root, C('banner_page_banner__section'));
  const bannerImg = banner ? IMG(banner) : null;
  const body = main.cloneNode(true);
  QA(body, 'nav, script').forEach((n) => n.remove());
  const faqs = QA(body, '.accordion').map((acc) => {
    const btn = Q(acc, 'button[aria-controls], .accordion__title');
    const id = btn && btn.getAttribute('aria-controls');
    const panel = (id && acc.querySelector('[id="' + id.replace(/"/g, '\\"') + '"]')) || Q(acc, '.accordion__body');
    const item = { q: T(btn), a: panel ? RICH(panel) : [] };
    return item;
  }).filter((f) => f.q);
  QA(body, '.accordion').forEach((n) => n.remove());
  const blocks = RICH(body);
  const forms = QA(root, 'form').map((f) => ({ fields: QA(f, 'input,textarea,select').map((i) => ({ name: i.getAttribute('name'), type: i.getAttribute('type') || i.tagName.toLowerCase(), label: i.getAttribute('placeholder') || i.getAttribute('aria-label') || '' })), submit: T(Q(f, 'button,[type=submit]')) }));
  const iframes = QA(root, 'iframe').map((f) => ({ src: f.getAttribute('src'), title: f.getAttribute('title') || '' }));
  const faqButtons = new Set(faqs.map((f) => f.q));
  const buttons = QA(root, 'button').map((b) => T(b)).filter((b) => b && !faqButtons.has(b));
  const links = QA(root, 'a[href]').map(LINK).filter((l) => l && l.label);
  return { breadcrumb: BREADCRUMB(root), h1: T(h1), bannerImage: bannerImg, blocks, faqs, forms, iframes, buttons, links, jsonld: JSONLD(root) };
}
