// blog-index.js — /blog: page heading, search box, "Featured posts" slider (hero slides + thumbnail
// cards), "All Posts" grid. Spec: src/content/model-spec/blog.md.
function extract(root, ctx) {
  // one blog post teaser card (<article class="article_article__...">), used by the thumbs rail and the grid
  const biCard = (art) => {
    const a = Q(art, 'a[href]');
    const time = Q(art, 'time');
    const share = Q(art, C('sharing_sharing') + ' button');
    return {
      title: T(Q(art, C('article_article__title'))),
      href: a ? rel(a.getAttribute('href')) : null,
      excerpt: T(Q(art, C('article_article__description'))) || null,
      date: time ? T(time) : null,
      datetime: time ? time.getAttribute('datetime') : null,
      dateLabel: time ? time.getAttribute('aria-label') : null,
      image: IMG(Q(art, 'figure')),
      shareLabel: share ? share.getAttribute('aria-label') : null,
    };
  };
  const biTime = (el) => { const t = Q(el, 'time'); return t ? { date: T(t), datetime: t.getAttribute('datetime'), dateLabel: t.getAttribute('aria-label') } : { date: null, datetime: null, dateLabel: null }; };

  const header = Q(root, '.blog__header');
  const searchInput = Q(root, '.blog__search_box input');
  const searchBtn = Q(root, 'button.blog__search_box__button') || Q(root, C('blog__search_box__button'));

  // Featured posts: a fade slider of big slides (each has its own <h1> title) + a vertical thumbs rail
  const feat = Q(root, C('bannerfeaturedposts_banner_feature__section'));
  const slides = QA(feat, 'a' + C('bannerfeaturedposts_banner_feature__main_banner')).map((a) => {
    const share = Q(a, C('sharing_sharing') + ' button');
    return {
      title: T(Q(a, 'h1, h2, h3')),
      href: rel(a.getAttribute('href')),
      ...biTime(a),
      image: {
        desktop: IMG(Q(a, 'figure' + C('main_banner__desktop'))),
        mobile: IMG(Q(a, 'figure' + C('main_banner__mobile'))),
      },
      shareLabel: share ? share.getAttribute('aria-label') : null,
    };
  });
  const thumbsRail = Q(feat, C('bannerfeaturedposts_banner_feature__carrousel_thumbs'));
  const thumbs = QA(thumbsRail, 'article').map(biCard);
  const bullets = QA(feat, '.swiper-pagination-bullet').length;

  // All Posts grid
  const allHeading = Q(root, 'h2.blog__collection_title') || Q(root, C('blog__collection_title'));
  const grid = Q(root, C('articlelist_articles__collection')) || Q(root, '.blog__section');
  const posts = QA(grid, 'article').map(biCard);

  // pagination: the source renders every post on one page; record any pager that does appear
  const pager = Q(root, 'nav[aria-label*="agination" i], ' + C('pagination_'));
  const pagination = pager ? { labels: QA(pager, 'a, button, span').map((x) => T(x) || x.getAttribute('aria-label') || '').filter(Boolean), links: QA(pager, 'a[href]').map(LINK) } : null;

  // empty-state text inside the grid area, if the grid ever renders without posts
  const emptyState = posts.length ? null : (T(Q(root, '.blog__section')) || null);

  return {
    breadcrumb: BREADCRUMB(root),
    h1: T(Q(header, 'h1') || Q(root, 'h1')),
    search: searchInput || searchBtn ? {
      placeholder: searchInput ? searchInput.getAttribute('placeholder') : null,
      inputLabel: searchInput ? searchInput.getAttribute('aria-label') : null,
      inputName: searchInput ? searchInput.getAttribute('name') : null,
      inputType: searchInput ? searchInput.getAttribute('type') : null,
      buttonLabel: searchBtn ? (T(searchBtn) || searchBtn.getAttribute('aria-label')) : null,
    } : null,
    featured: feat ? {
      heading: T(Q(feat, 'h2')),
      slides,
      thumbs,
      bulletCount: bullets,
    } : null,
    allPosts: {
      heading: T(allHeading),
      posts,
      emptyState,
    },
    pagination,
    jsonld: JSONLD(root),
  };
}
