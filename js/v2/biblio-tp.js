/* biblio-tp.js — vue dynamique de la bibliothèque TP
   Affiche les TP officiels (data/tp_biblio.json) + les TP user importés en drag-drop.
   Zone de drop visible en haut. */

(function() {
  'use strict';

  let bib = null;

  async function init() {
    if (!bib && window.Affectations) bib = await Affectations.biblio();
    render();
  }

  function render() {
    const root = document.getElementById('biblio-root');
    if (!root) return;
    if (!bib) { root.innerHTML = '<p>Chargement…</p>'; return; }

    const userTPs = window.TPImport ? TPImport.listUserTPs() : [];
    /* Regroupement par semaine */
    const all = [...(bib.tps || []).map(t => ({ ...t, isOfficiel: true })), ...userTPs];
    const groups = {};
    all.forEach(t => {
      const key = t.semaine || 'S-';
      (groups[key] = groups[key] || []).push(t);
    });
    const orderedKeys = Object.keys(groups).sort();

    root.innerHTML = `
      <div class="biblio-drop-zone" id="biblio-drop">
        <div class="biblio-drop-icon">📥</div>
        <div class="biblio-drop-text">
          <strong>Glisse-dépose un nouveau TP ici</strong> (HTML ou PDF, max 4 Mo)
          <span>ou clique pour parcourir</span>
        </div>
      </div>

      ${orderedKeys.map(k => renderGroup(k, groups[k])).join('')}

      ${(bib.tps || []).find(t => t.id) ? '' : '<p class="biblio-empty">Aucun TP officiel — utilise le drop pour démarrer ta bibliothèque.</p>'}
    `;

    /* Bind drop zone */
    if (window.TPImport) TPImport.bindDropZone(document.getElementById('biblio-drop'));

    /* Bind cards user */
    root.querySelectorAll('.biblio-card-user').forEach(card => {
      const id = card.dataset.id;
      const open = card.querySelector('.biblio-open');
      const expo = card.querySelector('.biblio-export');
      const del = card.querySelector('.biblio-del');
      if (open) open.onclick = (e) => { e.preventDefault(); TPImport.openTP(id); };
      if (expo) expo.onclick = (e) => { e.preventDefault(); e.stopPropagation(); TPImport.exportTP(id); };
      if (del)  del.onclick  = (e) => { e.preventDefault(); e.stopPropagation(); TPImport.remove(id); };
    });
  }

  function semaineLabel(k) {
    const m = { 'S1': 'Semaine 1 (27/04)', 'S2': 'Semaine 2 (04/05)', 'S3': 'Semaine 3 (11/05)', 'S-': 'Hors session — stock' };
    return m[k] || k;
  }

  function renderGroup(key, tps) {
    return `
      <article class="biblio-sem ${key === 'S-' ? 'biblio-extra' : ''}">
        <header class="biblio-sem-hdr">
          <span>${semaineLabel(key)}</span>
          <span class="dt">${tps.length} TP</span>
        </header>
        ${tps.map(t => renderCard(t)).join('')}
      </article>
    `;
  }

  function renderCard(t) {
    if (t.isOfficiel) {
      return `
        <a class="biblio-tp" href="${t.url}" target="_blank" rel="noopener" title="${escapeHtml(t.titre)}">
          <span class="biblio-tp-id">${t.id}</span>
          <span class="biblio-tp-tit">${escapeHtml(t.titre)}</span>
          <span class="biblio-tp-meta">${escapeHtml(t.duree || '')}</span>
        </a>
      `;
    }
    /* TP user — actions multiples */
    const compTags = (t.comp || []).map(c => `<span class="biblio-comp-tag">${c}</span>`).join('');
    const sizeTag = t.tailleKo ? `<span class="biblio-size">${t.tailleKo} Ko</span>` : '';
    const fromTag = t.importPar ? `<span class="biblio-by">par ${t.importPar}</span>` : '';
    const localOnly = !t.dataUrl;
    return `
      <div class="biblio-tp biblio-card-user ${localOnly ? 'is-meta-only' : ''}" data-id="${t.id}" title="${escapeHtml(t.titre)}">
        <span class="biblio-tp-id biblio-tp-id-user">${t.id}</span>
        <div class="biblio-tp-tit-wrap">
          <a href="#" class="biblio-tp-tit biblio-open">${escapeHtml(t.titre)}${localOnly ? ' <small>(méta seulement)</small>' : ''}</a>
          <div class="biblio-user-meta">
            ${compTags} ${sizeTag} ${fromTag}
          </div>
        </div>
        <div class="biblio-actions">
          ${t.dataUrl ? '<button class="biblio-export" title="Exporter ce TP (pour le partager à un collègue)">💾</button>' : ''}
          <button class="biblio-del" title="Supprimer ce TP de mon poste">🗑</button>
        </div>
      </div>
    `;
  }

  function escapeHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function refresh() { if (bib) render(); else init(); }

  function onShown() {
    if (!bib) init();
    else render();
  }

  /* Refresh quand sync 4 profs ramène de nouveaux TP user */
  ['correspondance-loaded', 'sync-merged'].forEach(ev => {
    document.addEventListener(ev, () => {
      if (document.getElementById('biblio-root')) render();
    });
  });

  window.BiblioTP = { init, refresh, onShown, render };
})();
