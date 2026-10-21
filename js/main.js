/*
 * The Sunday Table — site script (vanilla JavaScript, no dependencies).
 * Features: mobile menu, recipe search and filters, saved recipes (localStorage),
 * print button, image fallback, local saved-recipe storage.
 * This script never redirects, never alters browser history, and shows the same
 * content to every visitor and crawler.
 */

(function () {
  'use strict';

  var STORE_KEY = 'sundayTable.saved';

  /* ---------- Saved recipes (localStorage) ---------- */
  function readSaved() {
    try { var v = JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); return Array.isArray(v) ? v : []; }
    catch (e) { return []; }
  }
  function writeSaved(list) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(list)); } catch (e) { /* storage unavailable */ }
  }
  function syncSaved() {
    var saved = readSaved();
    document.querySelectorAll('[data-saved-count]').forEach(function (el) { el.textContent = saved.length; });
    document.querySelectorAll('[data-fav]').forEach(function (btn) {
      var on = saved.indexOf(btn.getAttribute('data-fav')) !== -1;
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      var label = btn.querySelector('[data-fav-label]');
      if (label) label.textContent = on ? 'Saved' : 'Save recipe';
      if (!label) {
        var base = btn.getAttribute('aria-label') || '';
        var name = base.replace(/^(Save|Remove) /, '').replace(/ (to|from) your saved recipes$/, '');
        btn.setAttribute('aria-label', on ? 'Remove ' + name + ' from your saved recipes' : 'Save ' + name + ' to your saved recipes');
      }
    });
  }
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-fav]');
    if (!btn) return;
    e.preventDefault();
    var slug = btn.getAttribute('data-fav');
    var saved = readSaved();
    var i = saved.indexOf(slug);
    if (i === -1) saved.push(slug); else saved.splice(i, 1);
    writeSaved(saved);
    syncSaved();
    if (finder) finder.apply();
  });
  window.addEventListener('storage', function (e) { if (e.key === STORE_KEY) syncSaved(); });

  /* ---------- Mobile menu ---------- */
  var toggle = document.querySelector('.menu-toggle');
  var nav = document.getElementById('site-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', open ? 'false' : 'true');
      nav.classList.toggle('is-open', !open);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        toggle.setAttribute('aria-expanded', 'false'); nav.classList.remove('is-open'); toggle.focus();
      }
    });
  }

  /* ---------- Search + filters (recipes.html) ---------- */
  var finder = null;
  var root = document.querySelector('[data-finder]');
  if (root) {
    var input = root.querySelector('[data-finder-input]');
    var cards = Array.prototype.slice.call(root.querySelectorAll('[data-finder-grid] .card'));
    var buttons = Array.prototype.slice.call(root.querySelectorAll('[data-filter]'));
    var status = root.querySelector('[data-finder-status]');
    var empty = root.querySelector('[data-finder-empty]');
    var emptyText = root.querySelector('[data-empty-text]');
    var params = new URLSearchParams(window.location.search);
    var state = { q: params.get('q') || '', cat: params.get('saved') === '1' ? 'saved' : (params.get('cat') || 'all') };
    var aliases = { dessert: 'desserts', quick: 'quick-easy', 'quick & easy': 'quick-easy', 'quick-easy': 'quick-easy' };
    if (!buttons.some(function (b) { return b.getAttribute('data-filter') === state.cat; })) state.cat = 'all';
    input.value = state.q;

    finder = {
      apply: function () {
        var terms = state.q.toLowerCase().trim().split(/\s+/).filter(Boolean).map(function (t) { return aliases[t] || t; });
        var saved = readSaved();
        var shown = 0;
        cards.forEach(function (card) {
          var hay = card.getAttribute('data-search') + ' ' + card.getAttribute('data-cats');
          var cats = card.getAttribute('data-cats').split(' ');
          var catOk = state.cat === 'all' || (state.cat === 'saved' ? saved.indexOf(card.getAttribute('data-recipe')) !== -1 : cats.indexOf(state.cat) !== -1);
          var qOk = terms.every(function (t) { return hay.indexOf(t) !== -1 || hay.indexOf(t.replace(/s$/, '')) !== -1; });
          var show = catOk && qOk;
          card.hidden = !show;
          if (show) shown++;
        });
        buttons.forEach(function (b) {
          var on = b.getAttribute('data-filter') === state.cat;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        var activeLabel = buttons.filter(function (b) { return b.classList.contains('is-active'); })[0];
        var label = activeLabel ? activeLabel.textContent : 'All';
        status.textContent = shown === cards.length ? 'Showing all ' + shown + ' recipes'
          : 'Showing ' + shown + ' recipe' + (shown === 1 ? '' : 's') + (state.cat !== 'all' ? ' in ' + label : '') + (state.q ? ' matching "' + state.q + '"' : '');
        empty.hidden = shown !== 0;
        if (shown === 0 && emptyText) {
          emptyText.textContent = state.cat === 'saved' && !state.q
            ? 'You have not saved any recipes yet. Tap the heart on any recipe card to keep it here on this device.'
            : 'Try a main ingredient such as chicken, salmon or pasta, or clear the search to see everything.';
        }
      }
    };
    var t;
    input.addEventListener('input', function () { clearTimeout(t); t = setTimeout(function () { state.q = input.value; finder.apply(); }, 120); });
    buttons.forEach(function (b) { b.addEventListener('click', function () { state.cat = b.getAttribute('data-filter'); finder.apply(); }); });
    function reset() { state.q = ''; input.value = ''; state.cat = 'all'; finder.apply(); input.focus(); }
    root.querySelector('[data-finder-clear]').addEventListener('click', function () { state.q = ''; input.value = ''; finder.apply(); input.focus(); });
    root.querySelector('[data-finder-reset]').addEventListener('click', reset);
    finder.apply();
  }

  /* ---------- Print ---------- */
  document.querySelectorAll('[data-print]').forEach(function (b) {
    b.addEventListener('click', function () { window.print(); });
  });

  /* ---------- Broken image fallback (keeps layout tidy) ---------- */
  document.querySelectorAll('img').forEach(function (img) {
    function fail() { var p = img.parentElement; if (p) p.classList.add('img-fallback'); }
    if (img.complete && img.naturalWidth === 0 && img.currentSrc) fail();
    img.addEventListener('error', fail, { once: true });
  });

  /* ---------- Gentle reveal on scroll ---------- */
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('.section-head, .grid .card, .cat-grid li, .list-rows li, .tip-list li, .dessert-row .card').forEach(function (el) {
      if (el.getBoundingClientRect().top > window.innerHeight) { el.classList.add('reveal'); io.observe(el); }
    });
  }

  /* ---------- Footer year ---------- */
  document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  syncSaved();
})();
