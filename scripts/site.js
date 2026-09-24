/* site.js — the redesign's only script. Vanilla, deferred, no dependencies.
   Integration point for the storefront: window.SDZ.cart (see docs/DEPLOY.md). */
(function () {
  'use strict';
  var d = document, root = d.documentElement;
  root.classList.remove('no-js'); root.classList.add('js');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var $ = function (s, c) { return (c || d).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); };
  var store = {
    get: function (k, f) { try { var v = localStorage.getItem(k); return v === null ? f : JSON.parse(v); } catch (e) { return f; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } }
  };

  /* ---------- focus trap helper ---------- */
  function trap(container, onEscape) {
    function onKey(e) {
      if (e.key === 'Escape' && onEscape) { onEscape(); return; }
      if (e.key !== 'Tab') return;
      var f = $$('a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])', container).filter(function (x) { return x.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && d.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && d.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    container.addEventListener('keydown', onKey);
    return function () { container.removeEventListener('keydown', onKey); };
  }
  var lockCount = 0;
  function lock(on) { lockCount += on ? 1 : -1; root.style.overflow = lockCount > 0 ? 'hidden' : ''; }

  /* ---------- age gate (source copy, 21+) ---------- */
  var gate = $('#agegate');
  // the legal pages stay readable without consent — the gate itself links to its terms
  var legal = /^\/(?:[^/]+\/)?(terms-and-conditions|privacy-policy)(\.html)?\/?$/.test(location.pathname);
  if (gate && !legal && store.get('sdz-age-21', false) !== true) {
    gate.hidden = false; lock(true);
    var release = trap(gate);
    var yes = $('[data-age-yes]', gate); if (yes) yes.focus();
    gate.addEventListener('click', function (e) {
      if (e.target.closest('[data-age-yes]')) { store.set('sdz-age-21', true); gate.hidden = true; release(); lock(false); }
      // exit leaves the site: back to where the visitor came from when that was another site,
      // otherwise to the exit address (a direct landing used to do nothing; same-site back only
      // reached another gated page)
      if (e.target.closest('[data-age-exit]')) {
        var ext = false; try { ext = !!d.referrer && new URL(d.referrer).origin !== location.origin; } catch (x) { /* bad referrer */ }
        if (ext && history.length > 1) history.back(); else location.replace(gate.getAttribute('data-exit-url') || 'https://www.google.com/');
      }
    });
  }

  /* ---------- header: hide on scroll down, show on scroll up ---------- */
  var header = $('[data-header]'), lastY = window.scrollY, ticking = false;
  if (header) window.addEventListener('scroll', function () {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () {
      var y = window.scrollY, open = $('.mega.is-open');
      header.classList.toggle('is-hidden', !open && y > 240 && y > lastY + 4);
      if (y < lastY - 4 || y < 240) header.classList.remove('is-hidden');
      lastY = y; ticking = false;
    });
  }, { passive: true });

  /* ---------- mega menu ---------- */
  $$('[data-mega]').forEach(function (btn) {
    var panel = d.getElementById(btn.getAttribute('aria-controls')); if (!panel) return;
    var timer;
    function set(open) { btn.setAttribute('aria-expanded', String(open)); panel.classList.toggle('is-open', open); }
    btn.addEventListener('click', function () { set(btn.getAttribute('aria-expanded') !== 'true'); });
    if (finePointer) {
      [btn, panel].forEach(function (el) {
        el.addEventListener('mouseenter', function () { clearTimeout(timer); set(true); });
        el.addEventListener('mouseleave', function () { timer = setTimeout(function () { set(false); }, 220); });
      });
    }
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && panel.classList.contains('is-open')) { set(false); btn.focus(); } });
    d.addEventListener('click', function (e) { if (!panel.contains(e.target) && !btn.contains(e.target)) set(false); });
  });

  /* ---------- mobile drawer ---------- */
  var mnav = $('#mnav'), mOpener = null; // mOpener: the control that opened the menu gets focus back
  if (mnav) {
    var mRelease = null;
    $$('[data-mnav-open]').forEach(function (b) { b.addEventListener('click', function () { mOpener = b; mnav.classList.add('is-open'); lock(true); mRelease = trap(mnav, closeM); var c = $('[data-mnav-close]', mnav); if (c) c.focus(); $$('[data-mnav-open]').forEach(function (x) { x.setAttribute('aria-expanded', 'true'); }); }); });
    // closing returns focus to the button that opened the menu, and closes the menu's store chooser
    function closeM() {
      mnav.classList.remove('is-open'); lock(false); if (mRelease) mRelease();
      $$('[data-mnav-open]').forEach(function (x) { x.setAttribute('aria-expanded', 'false'); });
      var cm = $('#chooser-m'); if (cm) cm.hidden = true; $$('#mnav [data-chooser-open]').forEach(function (x) { x.setAttribute('aria-expanded', 'false'); });
      if (mOpener && mOpener.getClientRects().length) mOpener.focus();
    }
    $$('[data-mnav-close]', mnav).forEach(function (b) { b.addEventListener('click', closeM); });
  }

  /* ---------- cart drawer + demo cart ---------- */
  var drawer = $('#cart'), scrim = $('#scrim'), cartRelease = null, cartOpener = null;
  function grams(w) { var m = String(w || '').match(/([\d.]+)\s*g\b/i); return m ? parseFloat(m[1]) : 0; }
  function money(n) { return '$' + (Math.round(n * 100) / 100).toString(); }
  function cart() { return store.get('sdz-cart', []); }
  function renderCart() {
    if (!drawer) return;
    var items = cart(), list = $('[data-cart-lines]', drawer), empty = $('[data-cart-empty]', drawer);
    var count = items.reduce(function (n, i) { return n + i.qty; }, 0);
    $$('[data-cart-count]').forEach(function (b) { b.textContent = String(count); b.hidden = count === 0; });
    if (list) list.innerHTML = items.map(function (i, k) {
      var nm = i.name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
      return '<div class="line"><img src="' + (i.image || '/SunnyDayz-Cannabis/assets/img/brand/placeholder.svg') + '" alt="" width="64" height="64"><div><b>' + i.name.replace(/</g, '&lt;') + '</b><div class="muted">' + [i.weight, i.price].filter(Boolean).join(' · ') + '</div></div>'
        + '<div class="qty"><button type="button" data-dec="' + k + '" aria-label="Decrease quantity of ' + nm + '">−</button><span>' + i.qty + '</span><button type="button" data-inc="' + k + '" aria-label="Increase quantity of ' + nm + '">+</button></div></div>';
    }).join('');
    if (empty) empty.hidden = items.length > 0;
    var sub = items.reduce(function (n, i) { return n + (parseFloat(String(i.price || '').replace(/[^\d.]/g, '')) || 0) * i.qty; }, 0);
    var wt = items.reduce(function (n, i) { return n + grams(i.weight) * i.qty; }, 0);
    var s = $('[data-cart-subtotal]', drawer); if (s) s.textContent = money(sub);
    var w = $('[data-cart-weight]', drawer); if (w) w.textContent = wt.toFixed(2) + ' G';
  }
  function openCart() { if (!drawer) return; cartOpener = d.activeElement; var tt = $('#toast'); if (tt) tt.classList.remove('is-on'); drawer.classList.add('is-open'); if (scrim) scrim.classList.add('is-open'); lock(true); cartRelease = trap(drawer, closeCart); var c = $('[data-cart-close]', drawer); if (c) c.focus(); }
  function closeCart() { if (!drawer) return; drawer.classList.remove('is-open'); if (scrim) scrim.classList.remove('is-open'); lock(false); if (cartRelease) cartRelease(); if (cartOpener && cartOpener.focus && cartOpener.getClientRects().length) cartOpener.focus(); }
  $$('[data-cart-open]').forEach(function (b) { b.addEventListener('click', openCart); });
  $$('[data-cart-close]').forEach(function (b) { b.addEventListener('click', closeCart); });
  if (scrim) scrim.addEventListener('click', closeCart);
  if (drawer) drawer.addEventListener('click', function (e) {
    var inc = e.target.closest('[data-inc]'), dec = e.target.closest('[data-dec]'); if (!inc && !dec) return;
    var ak = inc ? 'data-inc' : 'data-dec', items = cart(), k = +(inc || dec).getAttribute(ak);
    items[k].qty += inc ? 1 : -1; if (items[k].qty <= 0) items.splice(k, 1);
    store.set('sdz-cart', items); renderCart();
    // renderCart rebuilt the lines: keep focus on the same button (or the close button when the line went)
    var nb = $('[' + ak + '="' + k + '"]', drawer) || $('[data-cart-close]', drawer); if (nb) nb.focus();
  });
  var toast = $('#toast'), toastTimer;
  d.addEventListener('click', function (e) {
    var b = e.target.closest('[data-add]'); if (!b) return;
    e.preventDefault();
    var p; try { p = JSON.parse(b.getAttribute('data-add')); } catch (x) { return; }
    var sel = b.closest('[data-buybox]'); var v = sel && $('.variant[aria-pressed="true"]', sel);
    if (v) { p.price = v.getAttribute('data-price') || p.price; p.weight = v.getAttribute('data-weight') || p.weight; }
    var items = cart(), hit = items.filter(function (i) { return i.url === p.url && i.weight === p.weight; })[0];
    if (hit) hit.qty += 1; else items.push({ url: p.url, name: p.name, price: p.price, weight: p.weight, image: p.image, qty: 1 });
    store.set('sdz-cart', items); renderCart();
    if (toast) { toast.textContent = '✓ ' + p.name; toast.classList.add('is-on'); clearTimeout(toastTimer); toastTimer = setTimeout(function () { toast.classList.remove('is-on'); }, 2400); }
  });
  $$('[data-buybox] .variant').forEach(function (v) { v.addEventListener('click', function () { $$('.variant', v.parentNode).forEach(function (x) { x.setAttribute('aria-pressed', String(x === v)); }); }); });
  window.SDZ = { cart: { items: cart, open: openCart, close: closeCart, render: renderCart } };
  renderCart();

  /* ---------- rails (scroll-snap carousels) ---------- */
  $$('[data-rail]').forEach(function (rail) {
    var track = $('.rail__track', rail), prev = $('[data-prev]', rail), next = $('[data-next]', rail), bar = $('.rail__progress span', rail);
    if (!track) return;
    function step(dir) { track.scrollBy({ left: dir * track.clientWidth * 0.85, behavior: reduce ? 'auto' : 'smooth' }); }
    if (prev) prev.addEventListener('click', function () { step(-1); });
    if (next) next.addEventListener('click', function () { step(1); });
    function upd() {
      var max = track.scrollWidth - track.clientWidth;
      if (bar) { var p = track.clientWidth / Math.max(track.scrollWidth, 1); bar.style.setProperty('--p', (p * 100).toFixed(1) + '%'); bar.style.setProperty('--x', ((max > 0 ? track.scrollLeft / max : 0) * (1 / p - 1) * 100).toFixed(1) + '%'); }
      if (prev) prev.disabled = track.scrollLeft <= 2; if (next) next.disabled = track.scrollLeft >= max - 2;
    }
    track.addEventListener('scroll', upd, { passive: true }); window.addEventListener('resize', upd); upd();
  });

  /* ---------- reveal fallback (no scroll-timeline support) ---------- */
  var native = window.CSS && CSS.supports && CSS.supports('animation-timeline: view()');
  // native path: whatever is already on screen when the page opens is shown whole — a view() reveal
  // can never finish for content that sits low in the first viewport until the visitor scrolls
  // (any part on screen counts: a reveal that starts in the last few px of the viewport stayed a faded
  // strip). Re-checked when the width changes — a rotation brings new content into view at once; a
  // height-only resize (a phone's address bar) is ordinary scrolling and keeps its reveals.
  function markShown() { var vh = window.innerHeight; $$('.reveal:not(.is-shown)').forEach(function (el) { var r = el.getBoundingClientRect(); if (r.top < vh && r.bottom > 0) el.classList.add('is-shown'); }); }
  if (native && !reduce) {
    markShown();
    var lastW = window.innerWidth, markT;
    window.addEventListener('resize', function () { if (window.innerWidth === lastW) return; lastW = window.innerWidth; clearTimeout(markT); markT = setTimeout(markShown, 150); });
  }
  if (!native && 'IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } }); }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    $$('.reveal, .bar').forEach(function (el) { io.observe(el); });
  } else { $$('.reveal, .bar').forEach(function (el) { el.classList.add('is-in'); }); }

  /* ---------- pointer depth: tilt + magnetic ---------- */
  if (finePointer && !reduce) {
    $$('[data-tilt]').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        el.style.setProperty('--tilt-y', (x * 7).toFixed(2) + 'deg'); el.style.setProperty('--tilt-x', (-y * 7).toFixed(2) + 'deg');
      });
      el.addEventListener('pointerleave', function () { el.style.setProperty('--tilt-x', '0deg'); el.style.setProperty('--tilt-y', '0deg'); });
    });
    $$('.magnet').forEach(function (el) {
      el.addEventListener('pointermove', function (e) { var r = el.getBoundingClientRect(); el.style.transform = 'translate(' + ((e.clientX - r.left - r.width / 2) * 0.18).toFixed(1) + 'px,' + ((e.clientY - r.top - r.height / 2) * 0.25).toFixed(1) + 'px)'; });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });
  }

  /* ---------- hero video ---------- */
  // The markup carries no autoplay and no src: the film is requested only after the page's load event,
  // so it never competes with the poster (the largest paint) — and not at all under reduced motion or
  // Save-Data / 2G-3G (the toggle still plays it on request). Portrait phones get the 720x1080 crop.
  $$('[data-hero-video]').forEach(function (v) {
    var btn = $('[data-hero-toggle]'), c = navigator.connection || {};
    var lite = !!c.saveData || /^(slow-2g|2g|3g)$/.test(c.effectiveType || '');
    var auto = !reduce && !lite, loaded = d.readyState === 'complete';
    // userPaused = the visitor pressed pause; the observer's own off-screen pause must not count as that.
    // userPlayed = the visitor pressed play (reduced motion / Save-Data): resume it after scrolling back.
    var userPaused = false, userPlayed = false;
    var mq = window.matchMedia(v.getAttribute('data-sm-media') || 'not all');
    function pick() { var sm = v.getAttribute('data-src-sm'); return (sm && mq.matches) ? sm : v.getAttribute('data-src-lg'); }
    function ensureSrc() { if (!v.getAttribute('src')) v.src = pick(); }
    function tryPlay() { ensureSrc(); var p = v.play(); if (p && p.catch) p.catch(function () { /* refused: the poster stays */ }); }
    function show(playing) { if (!btn) return; btn.setAttribute('aria-pressed', String(!playing)); btn.classList.toggle('is-paused', !playing); }
    function sync() { show(!v.paused); }
    // the button acts on the state it SHOWS: before load it shows "pause" for a film that is about to
    // start, and a press there must stop that start, not trigger it
    if (btn) btn.addEventListener('click', function () {
      if (btn.getAttribute('aria-pressed') === 'true') { userPaused = false; userPlayed = true; tryPlay(); }
      else { userPaused = true; userPlayed = false; v.pause(); show(false); }
    });
    v.addEventListener('play', sync); v.addEventListener('pause', sync);
    // a rotation across the portrait query swaps the film, keeping its place
    if (mq.addEventListener) mq.addEventListener('change', function () {
      if (!v.getAttribute('src')) return;
      var next = pick(); if (v.getAttribute('src') === next) return;
      var was = !v.paused, at = v.currentTime;
      v.src = next;
      v.addEventListener('loadedmetadata', function () { try { v.currentTime = at; } catch (x) { /* not seekable yet */ } }, { once: true });
      if (was) tryPlay();
    });
    if (auto) { if (loaded) tryPlay(); else window.addEventListener('load', function () { loaded = true; if (!userPaused) tryPlay(); }, { once: true }); }
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { es.forEach(function (en) { if (!en.isIntersecting) { if (!v.paused) v.pause(); } else if (!userPaused && ((auto && loaded) || userPlayed)) tryPlay(); }); }, { threshold: 0.05 }).observe(v);
    show(auto); // the toggle shows the intended state while the page is still loading
  });

  /* ---------- fulfilment chooser (pickup / express) — Treez integration point ---------- */
  function setMode(mode) {
    store.set('sdz-mode', mode);
    $$('[data-mode-text]').forEach(function (el) { el.hidden = el.getAttribute('data-mode-text') !== mode; });
    $$('.chooser [data-mode]').forEach(function (el) { el.setAttribute('aria-pressed', String(el.getAttribute('data-mode') === mode)); });
  }
  setMode(store.get('sdz-mode', 'pickup'));
  $$('[data-chooser-open]').forEach(function (btn) {
    var panel = d.getElementById(btn.getAttribute('aria-controls')); if (!panel) return;
    function set(open) { panel.hidden = !open; btn.setAttribute('aria-expanded', String(open)); if (open) { var f = $('[data-mode][aria-pressed="true"]', panel) || $('[data-mode]', panel); if (f) f.focus(); } }
    btn.addEventListener('click', function (e) { e.stopPropagation(); set(panel.hidden); });
    d.addEventListener('click', function (e) { if (!panel.hidden && !panel.contains(e.target) && !btn.contains(e.target)) set(false); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) { set(false); btn.focus(); } });
  });
  d.addEventListener('click', function (e) {
    var m = e.target.closest('[data-mode]'); if (!m) return;
    setMode(m.getAttribute('data-mode'));
    if (m.tagName !== 'A') {
      var p = m.closest('.chooser'); if (!p) return;
      p.hidden = true;
      // the opener's state follows, and focus goes back to it instead of falling to <body>
      var o = $('[aria-controls="' + p.id + '"]'); if (o) { o.setAttribute('aria-expanded', 'false'); if (o.getClientRects().length) o.focus(); }
    }
  });
  // "Choose your store" opens the chooser itself: the header one when it shows, otherwise the menu's
  $$('[data-chooser-proxy]').forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); var o = $('.nav [data-chooser-open]') || $('[data-chooser-open]'); if (o && getComputedStyle(o).display !== 'none') o.click(); else { var mb = $('[data-mnav-open]'); if (mb) { mb.click(); mOpener = b; var mp = $('#mnav [data-chooser-open]'); if (mp && mp.getAttribute('aria-expanded') !== 'true') mp.click(); } } }); });

  /* ---------- 404: GO BACK returns to the previous page, or home when there is none ---------- */
  document.addEventListener('click', function (e) {
    if (!e.target.closest('[data-go-back]')) return;
    if (history.length > 1 && document.referrer && new URL(document.referrer).origin === location.origin) history.back(); else location.href = '/SunnyDayz-Cannabis/';
  });

  /* ---------- live store status from the published hours (America/New_York) ---------- */
  $$('[data-store-hours]').forEach(function (box) {
    var rows; try { rows = JSON.parse(box.getAttribute('data-store-hours')); } catch (e) { return; }
    var out = $('[data-store-status]', box); if (!out || !rows.length) return;
    function now() {
      var parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'long', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date());
      var g = function (t) { var p = parts.filter(function (x) { return x.type === t; })[0]; return p ? p.value : ''; };
      return { day: g('weekday'), min: (Number(g('hour')) % 24) * 60 + Number(g('minute')) };
    }
    function render() {
      var n = now(), i = rows.findIndex(function (r) { return r[0] === n.day; }); if (i < 0) return;
      var r = rows[i], open = n.min >= r[1] && n.min < r[2], next = open ? r : (n.min < r[1] ? r : rows[(i + 1) % rows.length]);
      $('[data-status-badge]', out).textContent = open ? 'OPEN' : 'CLOSED';
      $('[data-status-msg]', out).textContent = 'until ' + (open ? r[4] : next[3]) + ' ET';
      out.classList.toggle('is-open', open); out.hidden = false;
      $$('li[data-day]', box).forEach(function (li) { li.classList.toggle('is-today', li.getAttribute('data-day') === n.day); });
    }
    render(); setInterval(render, 60000);
  });

  /* ---------- search forms that filter the page (zip codes, lists) ---------- */
  $$('form[data-filter-form]').forEach(function (form) {
    // filter the code grid when there is one (never the page's other bullet lists), and say so when
    // nothing matches — the same message /brands uses
    var input = $('input', form), items = $$('main .prose .list-grid li');
    if (!items.length) items = $$('main .prose li');
    var empty = form.nextElementSibling && form.nextElementSibling.matches('[data-filter-empty]') ? form.nextElementSibling : null;
    function apply() {
      var q = input.value.trim().toLowerCase(), n = 0;
      items.forEach(function (li) { var hide = !!q && li.textContent.toLowerCase().indexOf(q) < 0; li.hidden = hide; if (!hide) n++; });
      if (empty) empty.textContent = q && !n ? 'No search results found' : '';
    }
    form.addEventListener('submit', function (e) { e.preventDefault(); apply(); });
    input.addEventListener('input', apply);
  });

  /* ---------- brands: search + "Load more brands" ---------- */
  $$('[data-brands]').forEach(function (sec) {
    var input = $('[data-brand-search]', sec), tiles = $$('[data-brand-tile]', sec), more = $('[data-load-more]', sec), empty = $('[data-brand-empty]', sec), expanded = false;
    function apply() {
      var q = ((input && input.value) || '').trim().toLowerCase(), shown = 0;
      tiles.forEach(function (t) { var hide = (q && t.getAttribute('data-name').indexOf(q) < 0) || (!q && !expanded && t.hasAttribute('data-more')); t.hidden = !!hide; if (!hide) shown++; });
      if (empty) empty.hidden = shown > 0; if (more) more.hidden = expanded || !!q;
    }
    if (input) input.addEventListener('input', apply);
    var bform = $('form[data-brand-form]', sec); if (bform) bform.addEventListener('submit', function (e) { e.preventDefault(); apply(); });
    if (more) more.addEventListener('click', function () { expanded = true; apply(); var first = $('[data-more]', sec); if (first) first.focus(); });
    // the markup ships every brand visible (no-JS readers get the full list); collapse it here
    apply();
  });
  /* ---------- blog: post search ---------- */
  $$('[data-post-search]').forEach(function (input) {
    var posts = $$('[data-post]'), empty = $('[data-post-empty]');
    input.addEventListener('input', function () {
      var q = input.value.trim().toLowerCase(), n = 0;
      posts.forEach(function (p) { var ok = !q || (p.getAttribute('data-text') || '').indexOf(q) >= 0; p.hidden = !ok; if (ok) n++; });
      if (empty) empty.hidden = n > 0;
    });
  });
  /* ---------- native share (shown only where the browser supports it) ---------- */
  $$('[data-share-slot]').forEach(function (slot) {
    if (!navigator.share) return;
    var b = d.createElement('button'); b.type = 'button'; b.className = 'btn btn--sm'; b.textContent = slot.getAttribute('data-label') || 'Share';
    b.addEventListener('click', function () { navigator.share({ title: document.title, url: location.href }).catch(function () {}); });
    slot.replaceWith(b);
  });

  /* ---------- collection filter + sort ---------- */
  $$('[data-collection]').forEach(function (col) {
    var grid = $('[data-grid]', col), cards = $$('[data-card]', col), empty = $('[data-empty]', col), sort = $('[data-sort]', col);
    var active = { strain: '', brand: '' };
    function apply() {
      var shown = 0;
      cards.forEach(function (c) {
        var ok = (!active.strain || c.getAttribute('data-strain') === active.strain) && (!active.brand || c.getAttribute('data-brand') === active.brand);
        c.hidden = !ok; if (ok) shown++;
      });
      if (empty) empty.hidden = shown > 0;
      if (sort && sort.value) {
        var key = sort.value, dir = /Desc$/.test(key) ? -1 : 1, by = key.replace(/(Asc|Desc)$/, '');
        cards.slice().sort(function (a, b) {
          var x = a.getAttribute('data-' + by) || '', y = b.getAttribute('data-' + by) || '';
          if (by === 'price') return dir * ((parseFloat(x) || 0) - (parseFloat(y) || 0));
          return dir * x.localeCompare(y);
        }).forEach(function (c) { grid.appendChild(c); });
      }
    }
    $$('[data-filter]', col).forEach(function (chip) {
      chip.addEventListener('click', function () {
        var k = chip.getAttribute('data-filter'), v = chip.getAttribute('data-value');
        active[k] = active[k] === v ? '' : v;
        $$('[data-filter="' + k + '"]', col).forEach(function (x) { x.setAttribute('aria-pressed', String(active[k] === x.getAttribute('data-value'))); });
        apply();
      });
    });
    if (sort) sort.addEventListener('change', apply);
    var clear = $('[data-clear]', col); if (clear) clear.addEventListener('click', function () { active = { strain: '', brand: '' }; $$('[data-filter]', col).forEach(function (x) { x.setAttribute('aria-pressed', 'false'); }); apply(); });
  });

  /* ---------- category chips: on a phone scroller, bring the current category into view ---------- */
  // measured after the webfonts load: the chips widen by ~80px when Poppins replaces the fallback
  function currentChipIntoView() {
    $$('nav.cat-links').forEach(function (nav) {
      var cur = $('.is-current', nav);
      if (!cur || nav.scrollWidth <= nav.clientWidth) return;
      var n = nav.getBoundingClientRect(), c = cur.getBoundingClientRect();
      if (c.left >= n.left && c.right <= n.right - 44) return; // already clear of the edge fade
      nav.scrollLeft += c.left - n.left - 16;
    });
  }
  if (d.fonts && d.fonts.ready) d.fonts.ready.then(currentChipIntoView); else currentChipIntoView();
  // and again when a rotation or resize turns the wrapped row back into a phone scroller
  var chipMq = window.matchMedia('(max-width: 599px)');
  if (chipMq.addEventListener) chipMq.addEventListener('change', function (e) { if (e.matches) currentChipIntoView(); });
  // a focused chip is brought clear of the 44px edge fade (scroll-padding only acts when the browser
  // has to scroll, so a chip already inside the row stayed under the fade)
  $$('nav.cat-links').forEach(function (nav) {
    nav.addEventListener('focusin', function (e) {
      var c = e.target.closest('a, button'); if (!c || nav.scrollWidth <= nav.clientWidth) return;
      var n = nav.getBoundingClientRect(), r = c.getBoundingClientRect();
      if (r.right > n.right - 56) nav.scrollLeft += r.right - (n.right - 56);
      else if (r.left < n.left + 6) nav.scrollLeft -= (n.left + 6) - r.left;
    });
  });
})();
