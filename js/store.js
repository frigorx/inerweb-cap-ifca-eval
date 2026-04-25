/* store.js — abstraction localStorage + cache JSON
   Toutes les données métier passent par ces helpers. */

(function() {
  'use strict';

  const PREFIX = 'inerweb.cap-ifca.';

  window.Store = {
    get(key, def = null) {
      try {
        const v = localStorage.getItem(PREFIX + key);
        return v === null ? def : JSON.parse(v);
      } catch (e) { return def; }
    },
    set(key, val) {
      try { localStorage.setItem(PREFIX + key, JSON.stringify(val)); } catch (e) {}
    },
    remove(key) {
      try { localStorage.removeItem(PREFIX + key); } catch (e) {}
    },
    clear() {
      const all = Object.keys(localStorage);
      all.forEach(k => { if (k.startsWith(PREFIX)) localStorage.removeItem(k); });
    }
  };

  // Cache JSON catalogs (one fetch per session)
  const _cache = {};
  window.Catalog = {
    async load(file) {
      if (_cache[file]) return _cache[file];
      try {
        const r = await fetch(`data/${file}?v=${Date.now()}`, { cache: 'no-store' });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const j = await r.json();
        _cache[file] = j;
        return j;
      } catch (e) {
        console.error('[Catalog]', file, e);
        return null;
      }
    }
  };

  // Profs
  window.PROFS = [
    { code: 'FH', nom: 'F. Henninot', couleur: '#1b3a63' },
    { code: 'PW', nom: 'P. Whart',    couleur: '#ff6b35' },
    { code: 'ZN', nom: 'ZN (à conf.)', couleur: '#2d8659' },
    { code: 'TM', nom: 'TM (à conf.)', couleur: '#6b3a8a' }
  ];

  window.NIVEAUX = [
    { code: 'NA',  label: 'Non acquis',   score: 0, couleur: '#c53030' },
    { code: 'ECA', label: 'En cours',     score: 1, couleur: '#dd6b20' },
    { code: 'A',   label: 'Acquis',       score: 2, couleur: '#38a169' },
    { code: 'M',   label: 'Maîtrisé',     score: 3, couleur: '#1b3a63' }
  ];

  // Toast
  window.toast = function(msg, kind = 'info', ms = 3000) {
    const el = document.createElement('div');
    el.className = 'toast' + (kind === 'error' ? ' err' : '');
    el.textContent = msg;
    if (kind === 'error') el.style.background = '#c53030';
    if (kind === 'success') el.style.background = '#38a169';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), ms);
  };

  // Sync badge
  window.setSync = function(state, label) {
    const el = document.getElementById('sync-badge');
    const ic = el.querySelector('.icon');
    const lb = document.getElementById('sync-label');
    el.className = 'sync-badge ' + state;
    if (state === 'sync') ic.textContent = '🟢';
    else if (state === 'buffer') ic.textContent = '🟡';
    else if (state === 'error') ic.textContent = '🔴';
    if (label) lb.textContent = label;
  };

})();
