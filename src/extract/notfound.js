// notfound.js — URLs where the source serves its 404 template with HTTP 200 (soft 404).
function extract(root, ctx) {
  const body = (root.firstElementChild || root).cloneNode(true);
  QA(body, 'script').forEach((n) => n.remove());
  return { h1: T(Q(root, 'h1')), blocks: RICH(body), links: QA(root, 'a[href]').map(LINK).filter((l) => l && l.label), buttons: QA(root, 'button').map((b) => T(b)).filter(Boolean), softNotFound: true };
}
