/* biblio-tp.js — bibliothèque organisée par PACK de séance (v2.0-PACKS)
   Refonte demandée par Franck :
   - Plus de cartes éparpillées, on regroupe par "séance complète"
   - Chaque pack = plan prof + exercices + ressources + évaluation papier + évaluation numérique
   - Bouton "✍ Évaluer numériquement" sur chaque pack qui le supporte → modale de saisie élève par élève
*/

(function() {
  'use strict';

  let packs = null;
  let bareme = null;
  let userTPs = [];
  let currentTab = 'eleves';
  let searchTerm = '';
  let filterBloc = null;
  let openedPackId = null;

  const COMP_TO_BLOC = {
    'C2.2': '0',
    'C4.7': 'A', 'C4.1': 'A', 'C4.2': 'A', 'C4.3': 'A', 'C4.6': 'A', 'C3.7': 'A',
    'C4.5': 'B', 'C5.1': 'B',
    'C1.3': 'C'
  };
  const BLOCS = [
    { code: '0', label: 'Bloc 0 · Sécurité',     couleur: '#c53030' },
    { code: 'A', label: 'Bloc A · Manipulations', couleur: '#1b3a63' },
    { code: 'B', label: 'Bloc B · Mesures',       couleur: '#2d8659' },
    { code: 'C', label: 'Bloc C · Documentation', couleur: '#dd6b20' }
  ];

  async function init() {
    if (!packs) {
      const j = await Catalog.load('seances_pack.json');
      packs = (j && j.packs) || [];
    }
    if (!bareme && window.CCF) bareme = await CCF.load('ep3');
    refresh();
  }

  function refresh() {
    if (window.TPImport) userTPs = TPImport.listUserTPs();
    render();
  }

  function filterPack(p) {
    if (filterBloc && p.bloc_ccf && p.bloc_ccf !== filterBloc && p.bloc_ccf !== '*') return false;
    if (searchTerm) {
      const t = (p.titre + ' ' + p.description + ' ' + (p.comp_ciblees || []).join(' ') + ' ' +
                (p.ressources || []).map(r => r.titre + ' ' + r.id).join(' ')).toLowerCase();
      if (!t.includes(searchTerm.toLowerCase())) return false;
    }
    return true;
  }

  function render() {
    const root = document.getElementById('biblio-root');
    if (!root) return;
    if (!packs) { root.innerHTML = '<p>Chargement…</p>'; return; }

    const visiblePacks = packs.filter(filterPack);
    const totalRes = packs.reduce((s, p) => s + (p.ressources || []).length, 0);
    const userCount = userTPs.length;

    root.innerHTML = `
      <div class="biblio-drop-zone" id="biblio-drop">
        <div class="biblio-drop-icon">📥</div>
        <div class="biblio-drop-text">
          <strong>Glisse-dépose un nouveau TP ici</strong> (HTML ou PDF, max 4 Mo)
          <span>il sera ajouté à un nouveau pack "Mes TP perso"</span>
        </div>
      </div>

      <div class="biblio-filters">
        <input type="search" id="biblio-search" placeholder="🔍 Rechercher dans les packs (CERFA, manomètres, sécurité…)" value="${escapeAttr(searchTerm)}" />

        <div class="biblio-chips" data-group="bloc">
          <span class="chip-lab">Bloc CCF :</span>
          ${BLOCS.map(b => `
            <button class="biblio-chip ${filterBloc === b.code ? 'active' : ''}" data-bloc="${b.code}" style="--c:${b.couleur}">
              ${b.label}
            </button>
          `).join('')}
          ${filterBloc ? `<button class="biblio-chip-clear" data-clear="bloc">×</button>` : ''}
        </div>

        <div class="biblio-result-count">
          ${visiblePacks.length} séance${visiblePacks.length > 1 ? 's' : ''} · ${totalRes} ressources${userCount > 0 ? ' · ' + userCount + ' TP perso' : ''}
        </div>
      </div>

      <div class="packs-wrap">
        ${visiblePacks.length === 0
          ? '<p class="biblio-empty">Aucun pack ne correspond à ces filtres.</p>'
          : visiblePacks.map(p => renderPack(p)).join('')}

        ${userTPs.length > 0 ? `
          <article class="pack-card user-pack" data-pack-id="USER">
            <header class="pack-hdr" style="background:linear-gradient(135deg,#dd6b20 0%,#ff6b35 100%);">
              <span class="pack-ico">⭐</span>
              <div class="pack-hdr-text">
                <h3 class="pack-titre">Mes TP perso (drag-droppés)</h3>
                <p class="pack-desc">${userTPs.length} fichier${userTPs.length > 1 ? 's' : ''} importé${userTPs.length > 1 ? 's' : ''}</p>
              </div>
              <button class="pack-toggle" data-pack-toggle="USER">${openedPackId === 'USER' ? '▲' : '▼'}</button>
            </header>
            ${openedPackId === 'USER' ? `
              <div class="pack-body">
                ${userTPs.map(t => renderUserResource(t)).join('')}
              </div>` : ''}
          </article>
        ` : ''}
      </div>
    `;

    bindEvents();
  }

  function renderPack(p) {
    const isOpen = openedPackId === p.id;
    const blocsBadge = (p.bloc_ccf && p.bloc_ccf !== '*')
      ? `<span class="pack-bloc-badge" style="background:${(BLOCS.find(b=>b.code===p.bloc_ccf)||{}).couleur||'#888'}">Bloc ${p.bloc_ccf}</span>`
      : '<span class="pack-bloc-badge" style="background:#6b3a8a">Transversal</span>';
    const compsBadge = (p.comp_ciblees || []).map(c => `<span class="pack-comp-pill">${c}</span>`).join('');
    const hasEval = !!p.evaluation_numerique;
    const nbRes = (p.ressources || []).length;

    return `
      <article class="pack-card" data-pack-id="${p.id}">
        <header class="pack-hdr" style="background:linear-gradient(135deg,${p.couleur} 0%, ${p.couleur}dd 100%);">
          <span class="pack-ico">${p.icone || '📦'}</span>
          <div class="pack-hdr-text">
            <h3 class="pack-titre">${escapeHtml(p.titre)}</h3>
            <p class="pack-desc">${escapeHtml(p.description || '')}</p>
            <div class="pack-meta">
              ${blocsBadge}
              ${compsBadge}
              <span class="pack-duree">⏱ ${escapeHtml(p.duree_estimee || '?')}</span>
              <span class="pack-nbres">📁 ${nbRes} ressource${nbRes > 1 ? 's' : ''}</span>
              ${hasEval ? '<span class="pack-eval-tag">✍ Éval numérique</span>' : ''}
            </div>
          </div>
          <button class="pack-toggle" data-pack-toggle="${p.id}">${isOpen ? '▲' : '▼'}</button>
        </header>
        ${isOpen ? `
          <div class="pack-body">
            ${(p.ressources || []).map(r => renderResource(r, p)).join('')}
            ${hasEval ? renderEvalLauncher(p) : ''}
          </div>
        ` : ''}
      </article>
    `;
  }

  function renderResource(r, pack) {
    const typeMeta = {
      'plan-prof':         { ico: '📋', label: 'Plan prof',        cls: 'res-plan',   audience: 'prof' },
      'exercice-html':     { ico: '🛠', label: 'Exercice (HTML)',  cls: 'res-html',   audience: 'eleve' },
      'exercice-pdf':      { ico: '📄', label: 'Exercice (PDF)',   cls: 'res-pdf',    audience: 'eleve' },
      'evaluation-html':   { ico: '✍', label: 'Évaluation papier',cls: 'res-eval',   audience: 'eleve' },
      'formulaire-vierge': { ico: '📑', label: 'Formulaire vierge',cls: 'res-form',   audience: 'eleve' },
      'ressource':         { ico: '📎', label: 'Ressource',        cls: 'res-misc',   audience: 'eleve' }
    };
    const meta = typeMeta[r.type] || typeMeta['ressource'];
    const isPDF = (r.url || '').toLowerCase().endsWith('.pdf');
    const isProf = meta.audience === 'prof';
    const distribuable = !isProf;

    /* Stats : combien d'élèves ont reçu / fait */
    const affects = (window.Affectations && Affectations.byTP(r.id)) || [];
    const stats = affects.length > 0
      ? `<span class="res-stats">📤 ${affects.length} · ✅ ${affects.filter(a => a.statut === 'fait' || a.statut === 'valide').length}</span>`
      : '';

    return `
      <div class="pack-resource ${meta.cls}" data-res-id="${escapeAttr(r.id)}" data-res-url="${escapeAttr(r.url)}">
        <span class="res-ico">${meta.ico}</span>
        <div class="res-info">
          <div class="res-titre">${escapeHtml(r.titre)}</div>
          <div class="res-tags">
            <span class="res-type-tag">${meta.label}</span>
            ${r.duree ? `<span class="res-duree">⏱ ${escapeHtml(r.duree)}</span>` : ''}
            ${isPDF ? '<span class="res-pdf-tag">PDF</span>' : ''}
            ${stats}
          </div>
        </div>
        <div class="res-actions">
          <button class="res-btn res-open" title="Ouvrir dans un nouvel onglet">${isPDF ? '📄' : '👁'} Ouvrir</button>
          ${distribuable ? `<button class="res-btn res-distrib" data-id="${escapeAttr(r.id)}" title="Distribuer aux élèves">📤</button>` : ''}
        </div>
      </div>
    `;
  }

  function renderUserResource(t) {
    const localOnly = !t.dataUrl;
    return `
      <div class="pack-resource res-user" data-user="1" data-res-id="${escapeAttr(t.id)}">
        <span class="res-ico">⭐</span>
        <div class="res-info">
          <div class="res-titre">${escapeHtml(t.titre)}</div>
          <div class="res-tags">
            <span class="res-type-tag">Importé par ${escapeHtml(t.importPar || '?')}</span>
            ${t.tailleKo ? `<span class="res-duree">${t.tailleKo} Ko</span>` : ''}
            ${(t.comp || []).map(c => `<span class="pack-comp-pill">${c}</span>`).join('')}
            ${localOnly ? '<span class="res-warn">⚠ méta seulement</span>' : ''}
          </div>
        </div>
        <div class="res-actions">
          ${!localOnly ? '<button class="res-btn res-user-open">👁 Ouvrir</button>' : ''}
          ${!localOnly ? '<button class="res-btn res-user-export" title="Télécharger pour partager">💾</button>' : ''}
          <button class="res-btn res-user-del" title="Supprimer de mon poste">🗑</button>
        </div>
      </div>
    `;
  }

  function renderEvalLauncher(p) {
    const ev = p.evaluation_numerique;
    return `
      <div class="pack-eval-launcher">
        <div class="pack-eval-info">
          <strong>✍ Évaluation numérique disponible</strong>
          <p>${ev.items.length} questions · /${ev.total_max} pts · alimente ${ev.comp_alimente || '?'}</p>
        </div>
        <button class="pack-eval-btn" data-pack-eval="${p.id}">
          ✍ Évaluer un élève maintenant
        </button>
      </div>
    `;
  }

  function bindEvents() {
    if (window.TPImport) TPImport.bindDropZone(document.getElementById('biblio-drop'));

    /* Search */
    const search = document.getElementById('biblio-search');
    if (search) {
      let to = null;
      search.oninput = (e) => {
        clearTimeout(to);
        searchTerm = e.target.value;
        to = setTimeout(render, 200);
      };
    }

    /* Filtres bloc */
    document.querySelectorAll('.biblio-chip').forEach(b => {
      b.onclick = () => { filterBloc = filterBloc === b.dataset.bloc ? null : b.dataset.bloc; render(); };
    });
    document.querySelectorAll('.biblio-chip-clear').forEach(b => {
      b.onclick = () => { filterBloc = null; render(); };
    });

    /* Toggle pack */
    document.querySelectorAll('.pack-toggle, .pack-hdr').forEach(el => {
      el.onclick = (e) => {
        if (e.target.closest('.pack-toggle') || e.target === el || e.target.closest('.pack-hdr-text')) {
          const id = (el.dataset.packToggle) || el.closest('.pack-card').dataset.packId;
          openedPackId = openedPackId === id ? null : id;
          render();
        }
      };
    });

    /* Ouverture ressource */
    document.querySelectorAll('.pack-resource').forEach(r => {
      const open = r.querySelector('.res-open');
      if (open) open.onclick = (e) => { e.stopPropagation(); window.open(r.dataset.resUrl, '_blank', 'noopener'); };
      const dist = r.querySelector('.res-distrib');
      if (dist) dist.onclick = (e) => {
        e.stopPropagation();
        if (window.DistributeModal && DistributeModal.open) {
          window._distributePreselectTP = dist.dataset.id;
          DistributeModal.open();
        }
      };
      const userOpen = r.querySelector('.res-user-open');
      if (userOpen) userOpen.onclick = (e) => { e.stopPropagation(); if (window.TPImport) TPImport.openTP(r.dataset.resId); };
      const userExp = r.querySelector('.res-user-export');
      if (userExp) userExp.onclick = (e) => { e.stopPropagation(); if (window.TPImport) TPImport.exportTP(r.dataset.resId); };
      const userDel = r.querySelector('.res-user-del');
      if (userDel) userDel.onclick = (e) => { e.stopPropagation(); if (window.TPImport) TPImport.remove(r.dataset.resId); };
    });

    /* Lance modale d'évaluation numérique */
    document.querySelectorAll('.pack-eval-btn').forEach(b => {
      b.onclick = (e) => {
        e.stopPropagation();
        const packId = b.dataset.packEval;
        const pack = packs.find(p => p.id === packId);
        if (pack && window.PackEvalModal && PackEvalModal.open) {
          PackEvalModal.open(pack);
        }
      };
    });
  }

  function escapeHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function escapeAttr(s) { return escapeHtml(s); }

  function onShown() {
    if (!packs || !bareme) init();
    else refresh();
  }

  ['correspondance-loaded', 'sync-merged'].forEach(ev => {
    document.addEventListener(ev, () => {
      if (document.getElementById('biblio-root')) refresh();
    });
  });

  window.BiblioTP = { init, refresh, onShown, render };
})();
