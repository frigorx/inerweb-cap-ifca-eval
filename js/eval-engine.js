/* eval-engine.js — moteur d'évaluation EP3 (TP × élève × compétence × niveau) */

(function() {
  'use strict';

  let _tps = null;
  let _mappings = null;
  let _eleves = null;
  let _comps = null;
  let _selectedTP = null;
  let _draft = {}; // brouillon : { pseudo: { code: niveau } }

  async function init() {
    const cat = await Catalog.load('tp_ep3.json');
    const map = await Catalog.load('mappings_ep3.json');
    const el  = await Catalog.load('eleves_pseudo.json');
    const co  = await Catalog.load('competences_ep3.json');
    if (!cat || !map || !el || !co) return;
    _tps = cat.tps;
    _mappings = map.mappings;
    _eleves = el;
    _comps = co.competences;
    renderTPList();
    setDateNow();
    document.getElementById('eval-classe').onchange = renderTPList;
    document.getElementById('btn-save-eval').onclick = saveEval;
    document.getElementById('btn-clear-eval').onclick = clearDraft;
  }

  function setDateNow() {
    const d = new Date();
    const s = d.toISOString().slice(0, 16).replace('T', ' ');
    document.getElementById('eval-date').value = s;
  }

  function renderTPList() {
    const wrap = document.getElementById('tp-list');
    wrap.innerHTML = '';
    _tps.forEach(tp => {
      // tournant TP-056 a son onglet dédié
      if (tp.id === 'TP-056') return;
      const card = document.createElement('div');
      card.className = 'tp-card';
      card.dataset.tpId = tp.id;
      card.innerHTML = `
        <div class="tp-id">${tp.id}</div>
        <div class="tp-titre">${tp.titre}</div>
        <div class="tp-meta">${tp.seance || ''} · ${tp.duree} min · ${tp.theme}</div>`;
      card.onclick = () => selectTP(tp.id);
      wrap.appendChild(card);
    });
  }

  function selectTP(tpId) {
    _selectedTP = _tps.find(t => t.id === tpId);
    document.querySelectorAll('.tp-card').forEach(c => c.classList.toggle('selected', c.dataset.tpId === tpId));
    renderEvalGrid();
  }

  function renderEvalGrid() {
    if (!_selectedTP) return;
    const card = document.getElementById('eval-grid-card');
    card.hidden = false;
    document.getElementById('eval-tp-title').textContent = `${_selectedTP.id} — ${_selectedTP.titre}`;
    document.getElementById('eval-tp-meta').textContent = `Compétences : ${_selectedTP.competences.join(' · ')} — niveau attendu fin CAP : Maîtrisé (M)`;

    // Charger le brouillon en cours
    _draft = Store.get(`draft.eval.${_selectedTP.id}`, {}) || {};

    const classe = document.getElementById('eval-classe').value;
    const eleves = _eleves.eleves.filter(e => e.classe === classe);
    const codes = _selectedTP.competences;
    const mapping = _mappings.find(m => m.tpId === _selectedTP.id);

    const wrap = document.getElementById('eval-grid-content');
    wrap.innerHTML = '';

    codes.forEach(code => {
      const c = _comps.find(x => x.code === code);
      const m = mapping?.competences?.find(x => x.code === code);
      const block = document.createElement('div');
      block.className = 'competence-block';
      block.innerHTML = `
        <h4>
          <span><span class="competence-code">${code}</span> ${c ? c.libelle : ''}</span>
          <span style="font-size:11pt;color:var(--text-soft);">N attendu ${m?.niveauAttendu || '5'}</span>
        </h4>
        ${m?.criteres ? `<details style="font-size:11pt;color:var(--text-soft);margin-bottom:8px;"><summary>Critères (${m.criteres.length})</summary><ul>${m.criteres.map(cr => `<li>${escapeHtml(cr)}</li>`).join('')}</ul></details>` : ''}
        <div class="elv-grid"></div>`;
      const elvGrid = block.querySelector('.elv-grid');

      eleves.forEach(e => {
        const cur = _draft[e.pseudo]?.[code] || null;
        const row = document.createElement('div');
        row.className = 'eval-grid';
        row.innerHTML = `
          <div class="pseudo">${e.pseudo}</div>
          ${NIVEAUX.map(n => `<div class="eval-niveau ${n.code} ${cur === n.code ? 'selected' : ''}" data-pseudo="${e.pseudo}" data-code="${code}" data-niveau="${n.code}" title="${n.label}">${n.code}</div>`).join('')}`;
        elvGrid.appendChild(row);
      });
      wrap.appendChild(block);
    });

    // Délégation : click sur niveau
    wrap.onclick = (ev) => {
      const t = ev.target;
      if (!t.classList.contains('eval-niveau')) return;
      const ps = t.dataset.pseudo;
      const code = t.dataset.code;
      const niveau = t.dataset.niveau;
      _draft[ps] ||= {};
      // toggle : si déjà sélectionné, désélectionne
      if (_draft[ps][code] === niveau) {
        delete _draft[ps][code];
        t.classList.remove('selected');
      } else {
        _draft[ps][code] = niveau;
        // visual
        t.parentElement.querySelectorAll(`.eval-niveau[data-pseudo="${ps}"][data-code="${code}"]`).forEach(x => x.classList.remove('selected'));
        t.classList.add('selected');
      }
      Store.set(`draft.eval.${_selectedTP.id}`, _draft);
    };
  }

  async function saveEval() {
    if (!_selectedTP) return;
    const status = document.getElementById('eval-save-status');
    const profCode = Store.get('prof.current');
    if (!profCode) { status.textContent = 'Pas de prof connecté.'; return; }
    const date = document.getElementById('eval-date').value || new Date().toISOString();
    const classe = document.getElementById('eval-classe').value;

    const rows = [];
    Object.keys(_draft).forEach(pseudo => {
      const niveaux = _draft[pseudo];
      Object.keys(niveaux).forEach(code => {
        rows.push({
          Date: date,
          Module: 'eval-cap-ifca',
          Pseudo: pseudo,
          Classe: classe,
          Prof: profCode,
          Epreuve: 'EP3',
          TP: _selectedTP.id,
          Code: code,
          Niveau: niveaux[code]
        });
      });
    });
    if (rows.length === 0) { status.textContent = 'Rien à enregistrer.'; return; }

    status.textContent = `Envoi de ${rows.length} évaluation(s)…`;
    let ok = 0, buffered = 0;
    for (const r of rows) {
      const res = await inerwebResults.write(r);
      if (res.ok) ok++; else if (res.buffered) buffered++;
    }
    if (buffered > 0) {
      status.innerHTML = `✓ ${ok} envoyé(s), ⏳ <strong>${buffered}</strong> en buffer offline (renvoi auto).`;
      toast(`${buffered} éval(s) en buffer offline`, 'info');
    } else {
      status.textContent = `✓ ${ok} évaluation(s) envoyée(s).`;
      toast(`${ok} évaluation(s) sauvegardée(s)`, 'success');
    }
    // Vider brouillon
    Store.remove(`draft.eval.${_selectedTP.id}`);
    _draft = {};
    renderEvalGrid();
  }

  function clearDraft() {
    if (!_selectedTP) return;
    if (!confirm(`Effacer le brouillon de ${_selectedTP.id} ?`)) return;
    Store.remove(`draft.eval.${_selectedTP.id}`);
    _draft = {};
    renderEvalGrid();
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  window.Eval = { init, selectTP };

})();
