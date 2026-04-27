/* calendrier.js — Calendrier interactif (porte d'entrée v2.0)
   Vue : grille semaines × créneaux. Clic sur une séance → fiche séance avec :
     - rappel de l'objectif et du TP suggéré
     - liste élèves de la classe (cochés par défaut, possibilité de décocher absents)
     - bouton "📤 Distribuer ce TP aux N élèves présents"
     - traçabilité dateExecution + seanceId dans Affectations
   Vue historique élève (timeline) accessible depuis chaque carte.
*/

(function() {
  'use strict';

  let agenda = null;
  let bib = null;
  let elevesList = null;
  let selectedSeance = null;

  async function init() {
    if (!agenda) agenda = await Catalog.load('agenda_classe.json');
    if (!bib) bib = await (window.Affectations ? Affectations.biblio() : Promise.resolve(null));
    if (!elevesList) {
      const j = await Catalog.load('eleves_pseudo.json');
      elevesList = (j && j.eleves) || [];
    }
    if (window.Correspondance && Correspondance.load) await Correspondance.load();
    render();
  }

  /* ================================================== */
  /*               RENDU CALENDRIER                     */
  /* ================================================== */
  function render() {
    const root = document.getElementById('calendrier-root');
    if (!root) return;
    if (!agenda) { root.innerHTML = '<p>Chargement de l\'agenda…</p>'; return; }

    /* Regrouper par semaine */
    const semaines = groupBySemaine(agenda.seances);
    const today = new Date().toISOString().slice(0, 10);

    root.innerHTML = `
      <div class="cal-header">
        <h3>📅 ${agenda.session} · ${agenda.classe}</h3>
        <div class="cal-legend">
          <span class="cal-legend-item passe">passé</span>
          <span class="cal-legend-item today">aujourd'hui</span>
          <span class="cal-legend-item futur">à venir</span>
          <span class="cal-legend-item ccf">CCF</span>
        </div>
      </div>
      <div class="cal-grid">
        ${Object.keys(semaines).map(weekKey => renderSemaine(weekKey, semaines[weekKey], today)).join('')}
      </div>
      <div class="cal-detail" id="cal-detail" hidden></div>
    `;

    root.querySelectorAll('.cal-seance').forEach(el => {
      el.onclick = () => openSeance(el.dataset.seanceId);
    });
  }

  function groupBySemaine(seances) {
    const out = {};
    seances.forEach(s => {
      const wk = s.id.split('-')[0]; /* S1, S2, S3, S4, S5 */
      (out[wk] = out[wk] || []).push(s);
    });
    return out;
  }

  function renderSemaine(weekKey, seances, today) {
    const dt = seances[0] ? seances[0].date : '';
    const dateFR = dt ? frDate(dt) : '';
    const isCcf = seances.some(s => s.type && s.type.startsWith('ccf'));
    return `
      <section class="cal-sem ${isCcf ? 'sem-ccf' : ''}">
        <header class="cal-sem-hdr">
          <span class="cal-sem-label">${weekKey}</span>
          <span class="cal-sem-date">${dateFR}</span>
        </header>
        <div class="cal-sem-body">
          ${seances.map(s => renderSeance(s, today)).join('')}
        </div>
      </section>
    `;
  }

  function renderSeance(s, today) {
    const isToday = s.date === today;
    const isPast  = s.date < today;
    const isCcf = s.type && s.type.startsWith('ccf');
    const cls = ['cal-seance'];
    if (isCcf) cls.push('seance-ccf');
    if (isToday) cls.push('today');
    else if (isPast) cls.push('passe');
    else cls.push('futur');

    const tpsBadges = (s.tps || []).map(id => `<span class="cal-tp-badge">${id}</span>`).join('');
    const distribCount = countDistributions(s.id);
    const distribTag = distribCount > 0
      ? `<span class="cal-distrib">📤 ${distribCount} distribué${distribCount>1?'s':''}</span>` : '';

    return `
      <div class="${cls.join(' ')}" data-seance-id="${s.id}">
        <div class="cal-seance-creneau">${creneauLabel(s.creneau)}</div>
        <div class="cal-seance-titre">${escapeHtml(s.objectif)}</div>
        <div class="cal-seance-meta">
          ${tpsBadges}
          ${s.salle ? `<span class="cal-salle">📍 ${s.salle}</span>` : ''}
          ${distribTag}
        </div>
      </div>
    `;
  }

  function creneauLabel(code) {
    const c = (agenda.creneaux_type || []).find(x => x.code === code);
    return c ? c.libelle : code;
  }

  function countDistributions(seanceId) {
    if (!window.Affectations) return 0;
    return Affectations.list().filter(a => a.seanceId === seanceId).length;
  }

  /* ================================================== */
  /*               FICHE SÉANCE (clic)                  */
  /* ================================================== */
  function openSeance(seanceId) {
    const s = agenda.seances.find(x => x.id === seanceId);
    if (!s) return;
    selectedSeance = s;
    const detail = document.getElementById('cal-detail');
    if (!detail) return;
    detail.hidden = false;

    const corrOk = window.Correspondance && Correspondance.available();
    const today = new Date().toISOString().slice(0, 10);
    const isToday = s.date === today;
    const isCcf = s.type && s.type.startsWith('ccf');

    /* Liste TP suggérés */
    const tpsCards = (s.tps || []).map(id => {
      const meta = (bib && bib.tps.find(t => t.id === id)) || null;
      if (!meta) return `<div class="seance-tp"><strong>${id}</strong> (introuvable)</div>`;
      return `
        <a class="seance-tp" href="${meta.url}" target="_blank" rel="noopener">
          <span class="seance-tp-id">${meta.id}</span>
          <span class="seance-tp-tit">${escapeHtml(meta.titre)}</span>
          <span class="seance-tp-meta">${escapeHtml(meta.duree)}</span>
        </a>
      `;
    }).join('');

    /* Liste élèves cochables */
    const elevesRows = elevesList.map(e => {
      const realName = corrOk ? Correspondance.label(e.pseudo) : e.pseudo;
      const display = realName === e.pseudo ? e.pseudo : `${realName}`;
      const sub = realName !== e.pseudo ? e.pseudo : '';
      return `
        <label class="seance-eleve">
          <input type="checkbox" name="seance-eleve" value="${e.pseudo}" checked />
          <span class="seance-eleve-name">${escapeHtml(display)}</span>
          ${sub ? `<span class="seance-eleve-sub">${escapeHtml(sub)}</span>` : ''}
        </label>
      `;
    }).join('');

    detail.innerHTML = `
      <div class="seance-card">
        <header class="seance-hdr ${isCcf ? 'is-ccf' : ''}">
          <div>
            <span class="seance-jour">${s.jour}</span>
            <span class="seance-date">${frDate(s.date)}</span>
            <span class="seance-creneau">${creneauLabel(s.creneau)}</span>
            ${isToday ? '<span class="seance-tag-today">AUJOURD\'HUI</span>' : ''}
            ${isCcf ? '<span class="seance-tag-ccf">CCF</span>' : ''}
          </div>
          <button class="btn-x" id="seance-close" title="Fermer">×</button>
        </header>
        <h3 class="seance-objectif">${escapeHtml(s.objectif)}</h3>
        ${s.salle ? `<p class="seance-salle">📍 ${s.salle}</p>` : ''}

        ${(s.tps && s.tps.length > 0) ? `
          <h4>📚 TP de cette séance</h4>
          <div class="seance-tps">${tpsCards}</div>
        ` : ''}

        ${(s.tps && s.tps.length > 0) ? `
          <h4>👥 Élèves présents (cochés par défaut) <span id="seance-eleves-count">${elevesList.length} sélectionnés</span></h4>
          <div class="seance-eleves-actions">
            <button class="btn small ghost" id="seance-all">☑ Tous présents</button>
            <button class="btn small ghost" id="seance-none">☐ Tous absents</button>
          </div>
          <div class="seance-eleves-grid">${elevesRows}</div>

          <div class="seance-actions-bar">
            <span id="seance-summary">Distribuer aux élèves présents (date d'exécution = ${frDate(s.date)})</span>
            <button class="btn orange big" id="seance-distribute">📤 Distribuer le(s) TP de la séance</button>
          </div>
        ` : `<p class="seance-no-tp">Pas de TP à distribuer pour cette séance (épreuve type ${isCcf ? 'CCF' : ''}).${isCcf ? ' Utilise le pôle ✅ Évaluer pour saisir les notes le jour J.' : ''}</p>`}
      </div>
    `;

    document.getElementById('seance-close').onclick = closeSeance;
    const allBtn = document.getElementById('seance-all');
    const noneBtn = document.getElementById('seance-none');
    if (allBtn) allBtn.onclick = () => toggleAll(true);
    if (noneBtn) noneBtn.onclick = () => toggleAll(false);

    detail.querySelectorAll('input[name="seance-eleve"]').forEach(cb => {
      cb.addEventListener('change', refreshSeanceCount);
    });

    const distBtn = document.getElementById('seance-distribute');
    if (distBtn) distBtn.onclick = doDistribute;

    /* Scroll into view */
    setTimeout(() => detail.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  function toggleAll(val) {
    document.querySelectorAll('input[name="seance-eleve"]').forEach(c => c.checked = val);
    refreshSeanceCount();
  }

  function refreshSeanceCount() {
    const cnt = document.querySelectorAll('input[name="seance-eleve"]:checked').length;
    const lab = document.getElementById('seance-eleves-count');
    if (lab) lab.textContent = `${cnt} sélectionné${cnt>1?'s':''}`;
    const sum = document.getElementById('seance-summary');
    if (sum && selectedSeance) {
      sum.innerHTML = `Distribuer ${(selectedSeance.tps || []).map(t => `<strong>${t}</strong>`).join(' + ')} à <strong>${cnt}</strong> élève${cnt>1?'s':''} (date d'exécution = ${frDate(selectedSeance.date)})`;
    }
  }

  function doDistribute() {
    if (!selectedSeance) return;
    const eleves = Array.from(document.querySelectorAll('input[name="seance-eleve"]:checked')).map(c => c.value);
    if (eleves.length === 0) return alert('Coche au moins un élève.');
    const tps = selectedSeance.tps || [];
    if (tps.length === 0) return;
    const prof = Store.get('prof.current') || '';
    let total = 0;
    tps.forEach(tpId => {
      Affectations.distribute(eleves, tpId, prof, {
        dateExecution: selectedSeance.date,
        seanceId: selectedSeance.id
      });
      total += eleves.length;
    });
    window.toast && window.toast(`✅ ${tps.join(' + ')} distribué(s) à ${eleves.length} élève${eleves.length>1?'s':''} pour le ${frDate(selectedSeance.date)}`, 'success');
    /* Refresh la grille pour montrer le nouveau compteur */
    render();
    /* Et la vue d'ensemble si elle existe */
    if (window.ClasseOverview && ClasseOverview.render) ClasseOverview.render();
  }

  function closeSeance() {
    selectedSeance = null;
    const d = document.getElementById('cal-detail');
    if (d) { d.hidden = true; d.innerHTML = ''; }
  }

  /* ================================================== */
  /*               UTILS                                */
  /* ================================================== */
  function frDate(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  function escapeHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function onShown() {
    if (!agenda) init();
    else render();
  }

  document.addEventListener('correspondance-loaded', () => {
    if (agenda && document.getElementById('calendrier-root')) render();
  });

  window.Calendrier = { init, onShown, render };
})();
