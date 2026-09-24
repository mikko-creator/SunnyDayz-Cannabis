// slug.mjs — one file name per URL, safe on a case-insensitive disk.
// The first scheme kept case and dropped the query, so on NTFS /strain/Cbd and /strain/cbd
// shared a file, and /collection/flower and /collection/flower?sort=brandAsc shared one too —
// the later render silently overwrote the earlier. Here an upper-case letter becomes "~" + its
// lower-case form and the query string becomes a "--q-" suffix. A lower-case, query-free path
// keeps exactly its old name, so snapshots that never collided stay valid.
export function urlSlug(u) {
  const x = new URL(u);
  let p;
  try { p = decodeURIComponent(x.pathname); } catch { p = x.pathname; }
  p = p.replace(/\/+$/, '');
  let s = p ? p.replace(/[A-Z]/g, (c) => '~' + c.toLowerCase()).replace(/[^a-z0-9~]+/g, '-').replace(/^-|-$/g, '') : 'index';
  if (x.search) s += '--q-' + x.search.slice(1).replace(/[^a-zA-Z0-9]+/g, '-').replace(/[A-Z]/g, (c) => '~' + c.toLowerCase());
  return s;
}
// the scheme the first renders were written under (for finding the snapshots that collided)
export function legacySlug(u) {
  const x = new URL(u);
  const p = decodeURIComponent(x.pathname).replace(/\/+$/, '');
  return p ? p.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') : 'index';
}
