/* tp-tournant.js — TP-056 autonomie élève + 5 visas prof STOP */

(function() {
  'use strict';

  let _tp = null;
  let _eleves = null;
  let _state = null; // { pseudo, phases:{P0:{checks:[],done:false}}, visas:{V1:{prof,ts}} }
  let _activePhase = null;

  async function init() {
    const cat = await Catalog.load('tp_ep3.json');
    const el = await Catalog.load('eleves_pseudo.json');
    if (!cat || !el) return;
    _tp = cat.tps.find(t => t.id === 'TP-056');
    _eleves = el;
    fillEleveSelector();
    document.getElementById('tournant-eleve').onchange = () => { loadState(); renderRotation(); };
    document.getElementById('btn-save-tournant').onclick = save;
    const btnSuivant = document.getElementById('btn-tournant-suivant');
    if (btnSuivant) btnSuivant.onclick = passerAuSuivant;
    const selStatut = document.getElementById('tournant-statut');
    if (selStatut) selStatut.onchange = (ev) => {
      if (!_state) return;
      setStatut(_state.pseudo, ev.target.value);
      fillEleveSelector();
      renderRotation();
    };
    renderRotation();
    loadState();
    /* Refresh quand les vrais noms arrivent après déchiffrement bandeau */
    document.addEventListener('correspondance-loaded', () => {
      if (_eleves) { fillEleveSelector(); renderRotation(); }
    });
  }

  function fillEleveSelector() {
    const sel = document.getElementById('tournant-eleve');
    sel.innerHTML = '';
    _eleves.eleves.forEach(e => {
      const o = document.createElement('option');
      o.value = e.pseudo;
      const nom = window.Correspondance ? Correspondance.label(e.pseudo) : e.pseudo;
      const labelNom = (window.Correspondance && Correspondance.available() && nom !== e.pseudo) ? ` — ${nom}` : '';
      const statut = Store.get(`tournant.statut.${e.pseudo}`, 'pas-commence');
      const icon = statut === 'termine' ? '✅' : statut === 'en-cours' ? '🔄' : '⏳';
      o.textContent = `${icon} ${e.pseudo}${labelNom}`;
      sel.appendChild(o);
    });
  }

  function getStatut(pseudo) {
    return Store.get(`tournant.statut.${pseudo}`, 'pas-commence');
  }
  function setStatut(pseudo, statut) {
    Store.set(`tournant.statut.${pseudo}`, statut);
  }

  function renderRotation() {
    const grid = document.getElementById('tournant-rotation-grid');
    if (!grid) return;
    const counts = { 'pas-commence': 0, 'en-cours': 0, 'termine': 0 };
    grid.innerHTML = _eleves.eleves.map(e => {
      const st = getStatut(e.pseudo);
      counts[st]++;
      const nom = window.Correspondance ? Correspondance.label(e.pseudo) : e.pseudo;
      const showNom = window.Correspondance && Correspondance.available() && nom !== e.pseudo;
      const colors = {
        'pas-commence': { bg: '#eee', border: '#aaa', text: '#666', icon: '⏳' },
        'en-cours':     { bg: '#fff8e1', border: '#fbc02d', text: '#c08600', icon: '🔄' },
        'termine':      { bg: '#e8f5e9', border: '#38a169', text: '#1b5e20', icon: '✅' }
      };
      const c = colors[st];
      return `<div style="background:${c.bg};border:2px solid ${c.border};padding:8px;border-radius:6px;cursor:pointer;text-align:center;" onclick="document.getElementById('tournant-eleve').value='${e.pseudo}';document.getElementById('tournant-eleve').dispatchEvent(new Event('change'));">
        <div style="font-size:18pt;">${c.icon}</div>
        <div style="font-weight:700;color:${c.text};font-size:12pt;">${e.pseudo}</div>
        ${showNom ? `<div style="font-size:10pt;color:${c.text};">${nom}</div>` : ''}
      </div>`;
    }).join('');
    const info = document.getElementById('tournant-rotation-info');
    if (info) info.textContent = `${counts['termine']} terminé · ${counts['en-cours']} en cours · ${counts['pas-commence']} à passer`;
  }

  function passerAuSuivant() {
    if (!_state) return;
    setStatut(_state.pseudo, 'termine');
    // Trouver le prochain "pas-commence" ou "en-cours"
    const idx = _eleves.eleves.findIndex(e => e.pseudo === _state.pseudo);
    let next = null;
    for (let i = 1; i <= _eleves.eleves.length; i++) {
      const candidat = _eleves.eleves[(idx + i) % _eleves.eleves.length];
      if (getStatut(candidat.pseudo) !== 'termine') { next = candidat; break; }
    }
    if (next) {
      setStatut(next.pseudo, 'en-cours');
      document.getElementById('tournant-eleve').value = next.pseudo;
      const nomReel = window.Correspondance ? Correspondance.label(next.pseudo) : next.pseudo;
      toast(`Suivant : ${nomReel}`, 'success');
      loadState();
    } else {
      toast('Tous les élèves ont terminé le TP-056 🎉', 'success');
    }
    fillEleveSelector();
    renderRotation();
  }

  function stateKey(pseudo) { return `tournant.${pseudo}`; }

  function defaultState(pseudo) {
    const s = { pseudo, started: new Date().toISOString(), phases: {}, visas: {} };
    _tp.phases.forEach(p => { s.phases[p.id] = { checks: p.criteres.map(() => false), done: false }; });
    _tp.visasProfObligatoires.forEach(v => { s.visas[v.id] = { signe: false }; });
    return s;
  }

  function loadState() {
    const pseudo = document.getElementById('tournant-eleve').value;
    if (!pseudo) return;
    _state = Store.get(stateKey(pseudo)) || defaultState(pseudo);
    const selStatut = document.getElementById('tournant-statut');
    if (selStatut) selStatut.value = getStatut(pseudo);
    renderProgress();
    if (_activePhase) selectPhase(_activePhase);
    else if (_tp.phases.length) selectPhase(_tp.phases[0].id);
    updateNote();
  }

  function renderProgress() {
    const wrap = document.getElementById('phase-progress');
    wrap.innerHTML = '';
    _tp.phases.forEach((p, i) => {
      const ph = _state.phases[p.id];
      const prevDone = i === 0 ? true : _state.phases[_tp.phases[i-1].id].done;
      const requiredVisaPrev = i === 0 ? true : _tp.visasProfObligatoires
        .filter(v => v.phase === _tp.phases[i-1].id)
        .every(v => _state.visas[v.id].signe);
      const locked = !(prevDone && requiredVisaPrev);

      const div = document.createElement('div');
      div.className = 'phase-step ' + (ph.done ? 'done' : (p.id === _activePhase ? 'current' : (locked ? 'locked' : '')));
      div.innerHTML = `<div style="font-size:11pt;">${p.id}</div><div>${p.titre}</div><div style="font-size:10pt;font-weight:normal;">${p.duree} min</div>`;
      div.onclick = () => { if (!locked) selectPhase(p.id); };
      div.title = locked ? 'Phase précédente non validée ou visa prof manquant' : '';
      wrap.appendChild(div);
    });
  }

  function selectPhase(id) {
    _activePhase = id;
    const p = _tp.phases.find(x => x.id === id);
    const ph = _state.phases[id];
    document.getElementById('phase-detail-card').hidden = false;
    document.getElementById('phase-detail-title').textContent = `${p.id} — ${p.titre} (${p.duree} min)`;
    document.getElementById('phase-detail-meta').textContent = `Compétences : ${p.competences.join(' · ')}`;

    const cl = document.getElementById('phase-checklist');
    cl.innerHTML = p.criteres.map((c, i) => `
      <label style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);font-weight:normal;">
        <input type="checkbox" data-i="${i}" ${ph.checks[i] ? 'checked' : ''} style="width:20px;height:20px;" />
        <span>${c}</span>
      </label>`).join('');
    cl.onclick = (e) => {
      if (e.target.tagName !== 'INPUT') return;
      const i = parseInt(e.target.dataset.i, 10);
      ph.checks[i] = e.target.checked;
      ph.done = ph.checks.every(Boolean);
      Store.set(stateKey(_state.pseudo), _state);
      renderProgress();
      updateNote();
    };

    // Visas pour cette phase
    const visasWrap = document.getElementById('phase-visas');
    const visas = _tp.visasProfObligatoires.filter(v => v.phase === id);
    visasWrap.innerHTML = visas.length ? '<h4 style="margin-top:12px;">Visas prof STOP</h4>' : '';
    visas.forEach(v => {
      const cur = _state.visas[v.id];
      const div = document.createElement('div');
      div.className = 'visa-prof' + (cur.signe ? ' signe' : '');
      div.innerHTML = `
        <div><strong>${v.id}</strong> · ${v.label}</div>
        <div>
          ${cur.signe
            ? `<span style="color:var(--vert);">✓ ${cur.prof} · ${new Date(cur.ts).toLocaleString('fr-FR')}</span>`
            : `<button class="btn small orange" data-visa="${v.id}">Apposer visa prof</button>`}
        </div>`;
      div.querySelector('button')?.addEventListener('click', () => signVisa(v.id));
      visasWrap.appendChild(div);
    });
  }

  function signVisa(visaId) {
    const profCode = Store.get('prof.current');
    if (!profCode) { toast('Pas de prof connecté', 'error'); return; }
    const code = prompt(`Saisir vos initiales (${profCode}) ou un code court pour confirmer le visa :`);
    if (!code) return;
    if (code.toUpperCase() !== profCode.toUpperCase() && code.length < 2) {
      toast('Code invalide', 'error'); return;
    }
    _state.visas[visaId] = { signe: true, prof: profCode, ts: new Date().toISOString() };
    Store.set(stateKey(_state.pseudo), _state);
    selectPhase(_activePhase);
    renderProgress();
    updateNote();
    toast(`Visa ${visaId} apposé`, 'success');
  }

  function calculateNote() {
    if (!_state) return 0;
    let total = 0;
    Object.keys(_tp.baremePhases).forEach(pid => {
      const ph = _state.phases[pid];
      if (!ph) return;
      const ratio = ph.checks.length ? ph.checks.filter(Boolean).length / ph.checks.length : 0;
      total += ratio * _tp.baremePhases[pid];
    });
    // Bonus / malus visas (toutes obligatoires comptent +1 par visa, max 5)
    const visasOk = Object.values(_state.visas).filter(v => v.signe).length;
    total = total + (visasOk - _tp.visasProfObligatoires.length); // -N si aucun, 0 si tous
    return Math.max(0, Math.min(_tp.noteSur, total));
  }

  function updateNote() {
    document.getElementById('tournant-note').value = calculateNote().toFixed(1) + ' / 20';
  }

  async function save() {
    if (!_state) return;
    const profCode = Store.get('prof.current');
    if (!profCode) { toast('Pas de prof connecté', 'error'); return; }
    const note = calculateNote();
    const status = document.getElementById('tournant-save-status');

    // Une ligne globale TP-056 + une ligne par compétence évaluée
    const date = new Date().toISOString();
    const eleve = _eleves.eleves.find(e => e.pseudo === _state.pseudo);
    const rows = [];

    // Ligne note globale
    rows.push({
      Date: date,
      Module: 'eval-cap-ifca',
      Pseudo: _state.pseudo,
      Classe: eleve?.classe || '',
      Prof: profCode,
      Epreuve: 'EP3',
      TP: 'TP-056',
      Code: 'NOTE',
      Niveau: '',
      Note20: note.toFixed(1),
      Detail: `Phases ${Object.keys(_state.phases).filter(p=>_state.phases[p].done).join(',')}`,
      Visas: Object.keys(_state.visas).filter(v=>_state.visas[v].signe).join(',')
    });

    // Lignes par compétence (heuristique : phase done = niveau A si visa OK, sinon ECA)
    const compsHit = new Set();
    _tp.phases.forEach(p => {
      if (!_state.phases[p.id].done) return;
      p.competences.forEach(c => compsHit.add(c));
    });
    compsHit.forEach(code => {
      // Niveau : M si toutes phases done + tous visas, A sinon
      const allDone = _tp.phases.every(p => _state.phases[p.id].done);
      const allVisas = Object.values(_state.visas).every(v => v.signe);
      const niveau = (allDone && allVisas) ? 'M' : 'A';
      rows.push({
        Date: date,
        Module: 'eval-cap-ifca',
        Pseudo: _state.pseudo,
        Classe: eleve?.classe || '',
        Prof: profCode,
        Epreuve: 'EP3',
        TP: 'TP-056',
        Code: code,
        Niveau: niveau
      });
    });

    status.textContent = 'Envoi…';
    let ok = 0, buf = 0;
    for (const r of rows) {
      const res = await inerwebResults.write(r);
      if (res.ok) ok++; else if (res.buffered) buf++;
    }
    if (buf > 0) status.innerHTML = `✓ ${ok} envoyé(s), ⏳ ${buf} en buffer.`;
    else status.textContent = `✓ ${ok} ligne(s) sauvegardée(s) — note ${note.toFixed(1)}/20.`;
    toast(`TP-056 ${_state.pseudo} : ${note.toFixed(1)}/20`, 'success');
  }

  window.Tournant = { init };

})();
