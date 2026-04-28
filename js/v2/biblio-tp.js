/* biblio-tp.js — bibliothèque TP refondue (v2.0-DIGEST)
   Organisation pour enseignant :
     ① zone drop import
     ② onglets 🎯 Pour les élèves / 📋 Pour préparer / 📦 Tout
     ③ recherche + filtre par compétence + filtre par bloc CCF
     ④ cartes compactes triées intelligemment
*/

(function() {
  'use strict';

  let bib = null;
  let bareme = null;
  let userTPs = [];
  let currentTab = 'eleves';
  let searchTerm = '';
  let filterComp = null;
  let filterBloc = null;

  /* Mapping compétence → Bloc du CCF EP3 (selon ton barème) */
  const COMP_TO_BLOC = {
    'C2.2': '0',
    'C4.5': 'B',
    'C4.7': 'A', 'C4.1': 'A', 'C4.2': 'A', 'C4.3': 'A', 'C4.6': 'A', 'C3.7': 'A',
    'C5.1': 'B',
    'C1.3': 'C'
  };
  const BLOCS = [
    { code: '0', label: 'Bloc 0 · Sécurité',     couleur: '#c53030' },
    { code: 'A', label: 'Bloc A · Manipulations', couleur: '#1b3a63' },
    { code: 'B', label: 'Bloc B · Mesures',       couleur: '#2d8659' },
    { code: 'C', label: 'Bloc C · Documentation', couleur: '#dd6b20' }
  ];

  async function init() {
    if (!bib && window.Affectations) bib = await Affectations.biblio();
    if (!bareme && window.CCF) bareme = await CCF.load('ep3');
    refresh();
  }

  function refresh() {
    if (window.TPImport) userTPs = TPImport.listUserTPs();
    render();
  }

  function getAllTPs() {
    const officiels = (bib && bib.tps || []).map(t => ({ ...t, isOfficiel: true }));
    return [...officiels, ...userTPs];
  }

  /** Détermine le type d'un TP pour catégorisation digeste. */
  function getType(t) {
    if (t.isUser) return 'user';
    if (t.tag === 'plan-prof' || (t.semaine || '').startsWith('S-plans')) return 'plan';
    if (t.tag === 'ressource' || (t.semaine || '').startsWith('S-ressources')) return 'ressource';
    if (t.tag === 'filler' || (t.semaine || '') === 'S-stock') return 'filler';
    return 'atelier';
  }

  /** Filtre 'Pour les élèves' = ce qui est distribuable aux élèves. */
  function isForEleves(t) {
    const ty = getType(t);
    return ty === 'atelier' || ty === 'filler' || ty === 'ressource' || ty === 'user';
  }
  function isForProf(t) {
    return getType(t) === 'plan';
  }

  function getBlocs(t) {
    const set = new Set();
    (t.comp || []).forEach(c => { if (COMP_TO_BLOC[c]) set.add(COMP_TO_BLOC[c]); });
    return Array.from(set);
  }

  /** Filtre principal selon onglet, recherche, comp, bloc. */
  function filter(tp) {
    if (currentTab === 'eleves' && !isForEleves(tp)) return false;
    if (currentTab === 'prof'   && !isForProf(tp))   return false;
    if (filterComp && !(tp.comp || []).includes(filterComp)) return false;
    if (filterBloc && !getBlocs(tp).includes(filterBloc)) return false;
    if (searchTerm) {
      const t = (tp.titre + ' ' + tp.id + ' ' + (tp.description || '')).toLowerCase();
      if (!t.includes(searchTerm.toLowerCase())) return false;
    }
    return true;
  }

  function render() {
    const root = document.getElementById('biblio-root');
    if (!root) return;
    if (!bib) { root.innerHTML = '<p>Chargement…</p>'; return; }

    const all = getAllTPs();
    const visible = all.filter(filter);
    const cE = all.filter(isForEleves).length;
    const cP = all.filter(isForProf).length;
    const cT = all.length;

    /* Compteurs filtres compétences */
    const compsAvailable = new Set();
    all.forEach(t => (t.comp || []).forEach(c => compsAvailable.add(c)));

    root.innerHTML = `
      <div class="biblio-drop-zone" id="biblio-drop">
        <div class="biblio-drop-icon">📥</div>
        <div class="biblio-drop-text">
          <strong>Glisse-dépose un nouveau TP ici</strong> (HTML ou PDF, max 4 Mo)
          <span>ou clique pour parcourir</span>
        </div>
      </div>

      <nav class="biblio-tabs">
        <button class="${currentTab === 'eleves' ? 'active' : ''}" data-tab="eleves">
          🎯 Pour les élèves <span class="b-count">${cE}</span>
        </button>
        <button class="${currentTab === 'prof' ? 'active' : ''}" data-tab="prof">
          📋 Pour préparer <span class="b-count">${cP}</span>
        </button>
        <button class="${currentTab === 'tout' ? 'active' : ''}" data-tab="tout">
          📦 Tout <span class="b-count">${cT}</span>
        </button>
      </nav>

      <div class="biblio-filters">
        <input type="search" id="biblio-search" placeholder="🔍 Rechercher (titre, mot-clé…)" value="${escapeAttr(searchTerm)}" />

        <div class="biblio-chips" data-group="bloc">
          <span class="chip-lab">Bloc CCF :</span>
          ${BLOCS.map(b => `
            <button class="biblio-chip ${filterBloc === b.code ? 'active' : ''}" data-bloc="${b.code}" style="--c:${b.couleur}">
              ${b.label}
            </button>
          `).join('')}
          ${filterBloc ? `<button class="biblio-chip-clear" data-clear="bloc">×</button>` : ''}
        </div>

        <div class="biblio-chips" data-group="comp">
          <span class="chip-lab">Compétence :</span>
          ${Array.from(compsAvailable).sort().map(c => `
            <button class="biblio-chip-comp ${filterComp === c ? 'active' : ''}" data-comp="${c}" title="${escapeAttr(bareme && bareme.competences[c] || c)}">
              ${c}
            </button>
          `).join('')}
          ${filterComp ? `<button class="biblio-chip-clear" data-clear="comp">×</button>` : ''}
        </div>

        <div class="biblio-result-count">
          ${visible.length} TP affiché${visible.length > 1 ? 's' : ''}
        </div>
      </div>

      <div class="biblio-cards-wrap">
        ${visible.length === 0
          ? '<p class="biblio-empty">Aucun TP ne correspond à ces filtres.</p>'
          : renderCards(visible)}
      </div>
    `;

    bindEvents();
  }

  /** Tri intelligent des cartes :
   *   1. ateliers d'abord (par semaine S1, S2, S3…)
   *   2. fillers ensuite (par durée croissante)
   *   3. user importés (par date)
   *   4. ressources
   *   5. plans en dernier (onglet prof seulement)
   */
  function sortTPs(list) {
    const order = { atelier: 1, filler: 2, user: 3, ressource: 4, plan: 5 };
    return list.slice().sort((a, b) => {
      const oa = order[getType(a)] || 9;
      const ob = order[getType(b)] || 9;
      if (oa !== ob) return oa - ob;
      if (a.semaine && b.semaine && a.semaine !== b.semaine) return a.semaine.localeCompare(b.semaine);
      if (a.date && b.date) return a.date.localeCompare(b.date);
      return (a.id || '').localeCompare(b.id || '');
    });
  }

  function renderCards(list) {
    const sorted = sortTPs(list);
    /* Regroupement par type */
    const groups = {};
    sorted.forEach(t => {
      const ty = getType(t);
      (groups[ty] = groups[ty] || []).push(t);
    });
    const groupLabels = {
      atelier:   { label: '🛠 TP atelier (officiels EP3)',          color: '#1b3a63' },
      filler:    { label: '⏱ Exercices rapides (1 h / 1 h 30)',     color: '#ff6b35' },
      user:      { label: '⭐ Mes TP perso (drag-droppés)',          color: '#dd6b20' },
      ressource: { label: '📄 Ressources & PDF imprimables',         color: '#2d8659' },
      plan:      { label: '📋 Plans de séance (réservé prof)',       color: '#6b3a8a' }
    };
    const order = ['atelier', 'filler', 'user', 'ressource', 'plan'];

    return order
      .filter(k => groups[k] && groups[k].length > 0)
      .map(k => `
        <section class="biblio-group" style="border-color:${groupLabels[k].color}">
          <h3 class="biblio-group-title" style="color:${groupLabels[k].color}">
            ${groupLabels[k].label}
            <span class="biblio-group-count">${groups[k].length}</span>
          </h3>
          <div class="biblio-grid-compact">
            ${groups[k].map(t => renderCard(t)).join('')}
          </div>
        </section>
      `).join('');
  }

  function renderCard(t) {
    const ty = getType(t);
    const blocs = getBlocs(t);
    const comps = (t.comp || []).slice(0, 4);
    const isUser = ty === 'user';
    const isPlan = ty === 'plan';
    const isPDF = (t.url || '').toLowerCase().endsWith('.pdf') || (t.typeFichier || '').includes('pdf');
    const localOnly = isUser && !t.dataUrl;
    const icoType = ty === 'atelier' ? '🛠' : ty === 'filler' ? '⏱' : ty === 'user' ? '⭐' : ty === 'ressource' ? '📄' : '📋';

    /* Stats : combien d'élèves ont déjà reçu ce TP, combien l'ont fait */
    const affects = (window.Affectations && Affectations.byTP(t.id)) || [];
    const distrib = affects.length;
    const fait = affects.filter(a => a.statut === 'fait' || a.statut === 'valide').length;

    const compsHTML = comps.map(c => `<span class="comp-pill">${c}</span>`).join('');
    const blocsHTML = blocs.map(b => {
      const meta = BLOCS.find(x => x.code === b);
      return `<span class="bloc-pill" style="background:${meta?meta.couleur:'#888'}">Bloc ${b}</span>`;
    }).join('');

    /* Action principale du clic carte */
    const cardClass = `biblio-card-c type-${ty} ${localOnly ? 'meta-only' : ''}`;
    const cardData = isUser ? `data-id="${t.id}" data-user="1"` : `data-url="${escapeAttr(t.url)}"`;

    return `
      <article class="${cardClass}" ${cardData} title="${escapeAttr(t.description || t.titre)}">
        <header class="biblio-card-hdr">
          <span class="biblio-card-ico">${icoType}</span>
          <span class="biblio-card-id">${escapeHtml(t.id)}</span>
          ${isPDF ? '<span class="biblio-card-pdf">PDF</span>' : ''}
          ${t.duree && t.duree !== '—' ? `<span class="biblio-card-duree">${escapeHtml(t.duree)}</span>` : ''}
        </header>
        <h4 class="biblio-card-titre">${escapeHtml(t.titre)}</h4>
        <div class="biblio-card-tags">
          ${blocsHTML}
          ${compsHTML}
        </div>
        ${distrib > 0 ? `<div class="biblio-card-stats">📤 ${distrib} distribué${distrib>1?'s':''} · ✅ ${fait} fait${fait>1?'s':''}</div>` : ''}
        ${localOnly ? '<div class="biblio-card-warn">⚠ méta seulement (importé sur un autre poste)</div>' : ''}
        <footer class="biblio-card-actions">
          ${!localOnly ? `<button class="card-btn card-open">${isPDF ? '📄 Ouvrir PDF' : '👁 Ouvrir'}</button>` : ''}
          ${!isPlan && !localOnly ? `<button class="card-btn card-distribute" data-id="${escapeAttr(t.id)}">📤 Distribuer</button>` : ''}
          ${isUser ? `<button class="card-btn card-export" title="Télécharger le fichier pour le partager">💾</button>
                     <button class="card-btn card-del" title="Supprimer de mon poste">🗑</button>` : ''}
        </footer>
      </article>
    `;
  }

  function bindEvents() {
    /* Drop zone */
    if (window.TPImport) TPImport.bindDropZone(document.getElementById('biblio-drop'));

    /* Onglets */
    document.querySelectorAll('.biblio-tabs button').forEach(b => {
      b.onclick = () => { currentTab = b.dataset.tab; render(); };
    });

    /* Recherche */
    const search = document.getElementById('biblio-search');
    if (search) {
      let to = null;
      search.oninput = (e) => {
        clearTimeout(to);
        searchTerm = e.target.value;
        to = setTimeout(render, 200);
      };
    }

    /* Filtre Bloc */
    document.querySelectorAll('.biblio-chip').forEach(b => {
      b.onclick = () => {
        const v = b.dataset.bloc;
        filterBloc = filterBloc === v ? null : v;
        render();
      };
    });
    document.querySelectorAll('.biblio-chip-comp').forEach(b => {
      b.onclick = () => {
        const v = b.dataset.comp;
        filterComp = filterComp === v ? null : v;
        render();
      };
    });
    document.querySelectorAll('.biblio-chip-clear').forEach(b => {
      b.onclick = () => {
        if (b.dataset.clear === 'bloc') filterBloc = null;
        if (b.dataset.clear === 'comp') filterComp = null;
        render();
      };
    });

    /* Cards click → ouvrir */
    document.querySelectorAll('.biblio-card-c').forEach(card => {
      const open = card.querySelector('.card-open');
      if (open) open.onclick = (e) => {
        e.stopPropagation();
        if (card.dataset.user === '1') {
          if (window.TPImport) TPImport.openTP(card.dataset.id);
        } else {
          window.open(card.dataset.url, '_blank', 'noopener');
        }
      };
      const dist = card.querySelector('.card-distribute');
      if (dist) dist.onclick = (e) => {
        e.stopPropagation();
        if (window.DistributeModal && DistributeModal.open) {
          /* On préselectionne le TP en mémorisant son id */
          window._distributePreselectTP = dist.dataset.id;
          DistributeModal.open();
        }
      };
      const expo = card.querySelector('.card-export');
      if (expo) expo.onclick = (e) => {
        e.stopPropagation();
        if (window.TPImport) TPImport.exportTP(card.dataset.id);
      };
      const del = card.querySelector('.card-del');
      if (del) del.onclick = (e) => {
        e.stopPropagation();
        if (window.TPImport) TPImport.remove(card.dataset.id);
      };
      /* Clic sur la carte (hors footer) → ouvrir */
      card.onclick = (e) => {
        if (e.target.closest('.biblio-card-actions')) return;
        if (open) open.click();
      };
    });
  }

  function escapeHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function escapeAttr(s) { return escapeHtml(s); }

  function onShown() {
    if (!bib || !bareme) init();
    else refresh();
  }

  ['correspondance-loaded', 'sync-merged'].forEach(ev => {
    document.addEventListener(ev, () => {
      if (document.getElementById('biblio-root')) refresh();
    });
  });

  window.BiblioTP = { init, refresh, onShown, render };
})();
