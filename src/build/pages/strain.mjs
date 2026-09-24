// strain.mjs — /strain/*. Model: src/content/model-spec/strain.md. Published at urlLowercasePath
// (case twins collide on NTFS and duplicate content on a case-sensitive host; the capitalised
// URL is a 301). The capitalised twins' only unique copy, "Shop our selection of strains",
// is merged here so nothing they said is lost.
import { t } from '../lib.mjs';
import { page } from '../layout.mjs';
import { banner, categoryArt, canopyArt, toolbar, grid, toCard } from './_grid.mjs';
import { popFigure, rich } from '../components.mjs';

const TWIN_COPY = 'Shop our selection of strains'; // on /strain/{Cbd,Hybrid,Indica,Sativa} and /strain/si (strain spec §5)
const TWINNED = new Set(['/strain/cbd', '/strain/hybrid', '/strain/indica', '/strain/sativa']);

export function strain(rec) {
  const m = rec.model;
  const path = (m.urlLowercasePath || m.urlPath || '').toLowerCase();
  const id = path.replace(/[^a-z0-9]+/gi, '-');
  const cards = (m.products || []).map(toCard);
  const desc = (m.banner && m.banner.description) || (TWINNED.has(path) ? TWIN_COPY : null);
  const art = popFigure('flower', { top: '46%', origin: '50% 66%', ratio: '4 / 3.2', sizes: '(max-width: 1024px) 90vw, 520px', load: 'eager' }) || canopyArt();
  const lines = (m.banner && m.banner.lines && m.banner.lines.length) ? m.banner.lines : [m.h1];
  const body = `${banner({ breadcrumb: m.breadcrumb, h1Lines: lines, description: desc, art, page: rec.url })}
<section class="section section--tight" data-collection><div class="shell">
  ${(m.seoBlocks || []).length ? `<div class="prose reveal" style="margin-bottom:28px">${rich(m.seoBlocks, { page: rec.url })}</div>` : ''}
  ${toolbar(m.toolbar || {}, cards, id)}
  ${grid({ cards, empty: (m.grid && m.grid.emptyState) || { title: 'No search results found', message: 'No results match the filter criteria. Remove a filter or clear all filters to search again' }, page: rec.url, id })}
</div></section>`;
  // title from the lowercase page's own h1: the SEO inventory row for these URLs was read from
  // the capitalised twin's raw HTML (NTFS collision, strain spec §6)
  return page({ url: 'https://www.sunnydayzcannabis.com' + path, title: m.h1, titleOverride: m.h1, descriptionOverride: m.h1, body });
}
strain.types = ['strain'];
