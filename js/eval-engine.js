/* eval-engine.js — moteur d'évaluation EP1/EP2/EP3 (TP × élève × compétence × niveau) */

(function() {
  'use strict';

  let _epreuve = 'EP3';
  let _tps = null;
  let _mappings = null;
  let _eleves = null;
  let _comps = null;
  let _selectedTP = null;
  let _draft = {};

  const FILES = {
    EP1: { tp: 'tp_ep1.json',  map: 'mappings_ep1.json',  comp: 'competences_ep1.json'  },
    EP2: { tp: 'tp_ep2.json',  map: 'mappings_ep2.json',  comp: 'competences_ep2.json'  },
    EP3: { tp: 'tp_ep3.json',  map: 'mappings_ep3.json',  comp: 'competences_ep3.json'  }
  };

  async function init() {
    _eleves = await Catalog.load('eleves_pseudo.json');
    if (!_eleves) return;
    await loadEpreuve('EP3');
    setDateNow();
    document.getElementById('eval-classe').onchange = renderTPList;
    document.getElementById('eval-epreuve').onchange = (e) => loadEpreuve(e.target.value);
    document.getElementById('btn-save-eval').onclick = saveEval;
    document.getElementById('btn-clear-eval').onclick = clearDraft;
  }

  async function loadEpreuve(ep) {
    _epreuve = ep;
    const f = FILES[ep];
    if (!f) return;
    const cat = await Catalog.load(f.tp);
    const map = await Catalog.load(f.map);
    const co  = await Catalog.load(f.comp);
    if (!cat || !map || !co) return;
    _tps = cat.tps;
    _mappings = map.mappings;
    _comps = co.competences;
    _selectedTP = null;
    document.getElementById('eval-grid-card').hidden = true;
    document.getElementById('eval-heading').textContent =
      ep === 'EP1' ? '✍ Évaluation EP1 — Préparation d\'intervention'
      : ep === 'EP2' ? '✍ Évaluation EP2 — Réalisation d\'intervention'
      : '✍ Évaluation EP3 — Mise en service / maintenance';
    renderTPList();
  }

  function setDateNow() {
    const d = new Date();
    document.getElementById('eval-date').value = d.toISOString().slice(0, 16).replace('T', ' ');
  }

  function renderTPList() {
    const wrap = document.getElementById('tp-list');
    wrap.innerHTML = '';
    _tps.forEach(tp => {
      if (tp.id === 'TP-056') return; // tournant a son propre onglet
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
    document.getElementById('eval-tp-meta').textContent = `Épreuve ${_epreuve} · ${_selectedTP.competences.length} compétences évaluées · niveau attendu fin CAP : Maîtrisé (M)`;

    _draft = Store.get(`draft.eval.${_epreuve}.${_selectedTP.id}`, {}) || {};

    const classe = document.getElementById('eval-classe').value;
    const eleves = _eleves.eleves.filter(e => e.classe === classe);
    const codes = _selectedTP.competences;
    const mapping = _mappings.find(m => m.tpId === _selectedTP.id);

    const wrap = document.getElementById('eval-grid-content');
    wrap.innerHTML = '';

    // Légende compétences (1 ligne expliquant chaque code, replié par défaut)
    const legend = document.createElement('details');
    legend.className = 'comp-legend card';
    legend.style.cssText = 'background:var(--bg-alt);padding:12px;margin-bottom:14px;';
    legend.innerHTML = `
      <summary style="cursor:pointer;font-weight:700;color:var(--bleu);font-size:13pt;">📖 Détail des ${codes.length} compétences (cliquer pour déplier)</summary>
      <table style="margin-top:10px;width:100%;border-collapse:collapse;font-size:12pt;">
        <thead><tr style="background:var(--bleu);color:#fff;"><th style="padding:6px 8px;text-align:left;">Code</th><th style="padding:6px 8px;text-align:left;">Libellé</th><th style="padding:6px 8px;text-align:left;">Critères clés</th></tr></thead>
        <tbody>
          ${codes.map(code => {
            const c = _comps.find(x => x.code === code);
            const m = mapping?.competences?.find(x => x.code === code);
            return `<tr style="border-bottom:1px solid var(--border);">
              <td style="padding:6px 8px;"><span class="competence-code">${code}</span></td>
              <td style="padding:6px 8px;">${c ? escapeHtml(c.libelle) : ''}</td>
              <td style="padding:6px 8px;font-size:11pt;color:var(--text-soft);">${m?.criteres?.slice(0,2).map(escapeHtml).join(' · ') || '—'}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>`;
    wrap.appendChild(legend);

    // Grille pivotée : 1 ligne par élève × N colonnes (1 par compétence) × 4 niveaux par cellule
    const table = document.createElement('table');
    table.className = 'eval-pivot';
    table.style.cssText = 'width:100%;border-collapse:separate;border-spacing:2px;font-size:12pt;';

    const headerRow = document.createElement('tr');
    headerRow.innerHTML = `<th style="background:var(--bleu);color:#fff;padding:8px;text-align:left;border-radius:4px;min-width:80px;">Élève</th>` +
      codes.map(code => {
        const c = _comps.find(x => x.code === code);
        return `<th style="background:var(--bleu);color:#fff;padding:8px;text-align:center;border-radius:4px;min-width:140px;" title="${c ? escapeHtml(c.libelle) : ''}">${code}</th>`;
      }).join('') +
      `<th style="background:var(--orange);color:#fff;padding:8px;text-align:center;border-radius:4px;min-width:90px;">Note auto</th>`;
    table.appendChild(headerRow);

    eleves.forEach(e => {
      const tr = document.createElement('tr');
      // Cellule pseudo + nom réel en surimpression si correspondance dispo
      const nomReel = window.Correspondance ? Correspondance.label(e.pseudo) : e.pseudo;
      const showNom = window.Correspondance && Correspondance.available() && nomReel !== e.pseudo;
      tr.innerHTML = `<td style="padding:8px;background:var(--bg-alt);font-family:'Trebuchet MS',sans-serif;font-weight:700;color:var(--bleu);font-size:13pt;">${e.pseudo}${showNom ? `<br/><span style="font-size:10pt;font-weight:normal;color:var(--orange);">${nomReel}</span>` : ''}</td>`;
      // 1 cellule par compétence avec 4 mini-boutons NA/ECA/A/M alignés horizontalement
      codes.forEach(code => {
        const cur = _draft[e.pseudo]?.[code] || null;
        const td = document.createElement('td');
        td.style.cssText = 'padding:3px;background:#fff;border:1px solid var(--border);';
        td.innerHTML = `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:2px;">
          ${NIVEAUX.map(n => `<button class="eval-niveau ${n.code} ${cur === n.code ? 'selected' : ''}" data-pseudo="${e.pseudo}" data-code="${code}" data-niveau="${n.code}" title="${n.label}" style="padding:6px 0;font-size:10pt;border-radius:4px;border:2px solid var(--border);cursor:pointer;font-weight:700;">${n.code}</button>`).join('')}
        </div>`;
        tr.appendChild(td);
      });
      // Note auto (moyenne sur les compétences renseignées, /20)
      const noteTd = document.createElement('td');
      noteTd.style.cssText = 'padding:6px;background:#fff5ef;text-align:center;font-weight:700;color:var(--orange);font-size:14pt;';
      noteTd.id = `note-${e.pseudo}`;
      noteTd.textContent = computeNote(e.pseudo, codes);
      tr.appendChild(noteTd);
      table.appendChild(tr);
    });
    wrap.appendChild(table);

    // Légende niveaux + actions rapides
    const helper = document.createElement('div');
    helper.style.cssText = 'margin-top:14px;padding:12px;background:var(--bg-alt);border-radius:6px;font-size:12pt;display:flex;gap:16px;flex-wrap:wrap;align-items:center;';
    helper.innerHTML = `
      <strong>Niveaux :</strong>
      <span style="background:var(--rouge);color:#fff;padding:3px 10px;border-radius:4px;font-weight:700;">NA</span> Non acquis
      <span style="background:var(--jaune);color:#fff;padding:3px 10px;border-radius:4px;font-weight:700;">ECA</span> En cours
      <span style="background:var(--vert);color:#fff;padding:3px 10px;border-radius:4px;font-weight:700;">A</span> Acquis
      <span style="background:var(--bleu);color:#fff;padding:3px 10px;border-radius:4px;font-weight:700;">M</span> Maîtrisé
      <span style="margin-left:auto;color:var(--text-soft);">Astuce : 1 clic = sélectionne · 2e clic = annule</span>`;
    wrap.appendChild(helper);

    wrap.onclick = (ev) => {
      const t = ev.target.closest('button.eval-niveau');
      if (!t) return;
      const ps = t.dataset.pseudo;
      const code = t.dataset.code;
      const niveau = t.dataset.niveau;
      _draft[ps] ||= {};
      if (_draft[ps][code] === niveau) {
        delete _draft[ps][code];
        t.classList.remove('selected');
      } else {
        _draft[ps][code] = niveau;
        t.parentElement.querySelectorAll(`button.eval-niveau[data-pseudo="${ps}"][data-code="${code}"]`).forEach(x => x.classList.remove('selected'));
        t.classList.add('selected');
      }
      Store.set(`draft.eval.${_epreuve}.${_selectedTP.id}`, _draft);
      // refresh note
      const noteEl = document.getElementById(`note-${ps}`);
      if (noteEl) noteEl.textContent = computeNote(ps, codes);
    };
  }

  function computeNote(pseudo, codes) {
    const map = { NA: 0, ECA: 7, A: 14, M: 18 };
    const niveaux = _draft[pseudo] || {};
    const vals = codes.map(c => niveaux[c]).filter(Boolean);
    if (vals.length === 0) return '—';
    const moy = vals.reduce((s, n) => s + map[n], 0) / vals.length;
    return moy.toFixed(1) + '/20';
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
          Epreuve: _epreuve,
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
      status.innerHTML = `✓ ${ok} envoyé(s), ⏳ <strong>${buffered}</strong> en buffer offline.`;
      toast(`${buffered} éval(s) en buffer offline`, 'info');
    } else {
      status.textContent = `✓ ${ok} évaluation(s) envoyée(s).`;
      toast(`${ok} évaluation(s) sauvegardée(s)`, 'success');
    }
    Store.remove(`draft.eval.${_epreuve}.${_selectedTP.id}`);
    _draft = {};
    renderEvalGrid();
  }

  function clearDraft() {
    if (!_selectedTP) return;
    if (!confirm(`Effacer le brouillon de ${_selectedTP.id} (${_epreuve}) ?`)) return;
    Store.remove(`draft.eval.${_epreuve}.${_selectedTP.id}`);
    _draft = {};
    renderEvalGrid();
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  window.Eval = { init, selectTP, loadEpreuve };

})();
