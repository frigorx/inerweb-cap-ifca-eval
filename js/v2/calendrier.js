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
  let compsDict = null; /* { "C4.7": {libelle, famille}, ... } toutes épreuves confondues */

  async function init() {
    if (!agenda) agenda = await Catalog.load('agenda_classe.json');
    if (!bib) bib = await (window.Affectations ? Affectations.biblio() : Promise.resolve(null));
    if (!elevesList) {
      const j = await Catalog.load('eleves_pseudo.json');
      elevesList = (j && j.eleves) || [];
    }
    if (!compsDict) {
      compsDict = {};
      for (const ep of ['ep1', 'ep2', 'ep3']) {
        try {
          const j = await Catalog.load(`competences_${ep}.json`);
          (j && j.competences || []).forEach(c => { compsDict[c.code] = c; });
        } catch (e) { /* fichier absent : on ignore */ }
      }
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

    /* Mini-dashboard : stats globales en haut du calendrier */
    const stats = computeStats(today);

    /* Toggle : afficher uniquement les TP distribués */
    const showOnlyDistribued = window.Store && Store.get('cal.onlyDistribued') ? true : false;

    root.innerHTML = `
      <div class="cal-toggles">
        <label class="cal-toggle">
          <input type="checkbox" id="cal-only-distrib" ${showOnlyDistribued ? 'checked' : ''}>
          <span>🧹 Afficher uniquement les TP distribués</span>
          <span class="cal-toggle-help" title="Masque les TP qui n'ont été distribués à aucun élève dans la séance. Réversible, ne modifie pas l'agenda.">ⓘ</span>
        </label>
      </div>

      <div class="cal-mini-stats">
        <div class="cal-stat">
          <div class="cal-stat-big">${stats.distribCetteSemaine}</div>
          <div class="cal-stat-lab">TP distribués<br>cette semaine</div>
        </div>
        <div class="cal-stat">
          <div class="cal-stat-big">${stats.ccfSaisis} / ${stats.totalEleves}</div>
          <div class="cal-stat-lab">CCF EP3<br>saisis</div>
        </div>
        <div class="cal-stat">
          <div class="cal-stat-big" style="color:${stats.couleurMoy}">${stats.moyenne != null ? stats.moyenne.toFixed(1).replace('.', ',') : '—'}</div>
          <div class="cal-stat-lab">Moyenne CCF<br>/ 20</div>
        </div>
        <div class="cal-stat">
          <div class="cal-stat-big">${stats.prochainSeanceJ}</div>
          <div class="cal-stat-lab">${stats.prochainSeanceLabel}</div>
        </div>
      </div>

      ${renderTodayBanner(today)}

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

    /* Câblage toggle "uniquement distribués" */
    const togBtn = document.getElementById('cal-only-distrib');
    if (togBtn) togBtn.onchange = (e) => {
      if (window.Store) Store.set('cal.onlyDistribued', e.target.checked ? 1 : 0);
      render();
    };

    root.querySelectorAll('.cal-seance').forEach(el => {
      el.onclick = () => openSeance(el.dataset.seanceId);
    });
    /* Boutons "AUJOURD'HUI" en haut → ouvrent la fiche séance */
    root.querySelectorAll('.auj-seance').forEach(el => {
      el.onclick = () => openSeance(el.dataset.seanceId);
    });
  }

  function renderTodayBanner(today) {
    const seancesAuj = (agenda.seances || []).filter(s => s.date === today);
    if (seancesAuj.length === 0) {
      const prochaines = (agenda.seances || []).filter(s => s.date > today).sort((a,b) => a.date.localeCompare(b.date));
      const next = prochaines[0];
      const dateNow = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
      if (!next) {
        return `<div class="cal-today-banner empty"><span class="big">${dateNow}</span><span class="sub">Pas de séance prévue.</span></div>`;
      }
      const diff = Math.round((new Date(next.date) - new Date(today)) / (24 * 3600 * 1000));
      return `<div class="cal-today-banner empty"><span class="big">${dateNow}</span><span class="sub">Pas de séance aujourd'hui · prochaine dans ${diff} jour${diff>1?'s':''} (${next.jour} ${frDate(next.date)} — ${(next.tps || []).join(' + ') || 'CCF'})</span></div>`;
    }
    const dateNow = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    const isCcf = seancesAuj.some(s => s.type && s.type.startsWith('ccf'));
    const cls = isCcf ? 'is-ccf' : 'is-tp';
    return `
      <div class="cal-today-banner ${cls}">
        <div class="big">🎯 AUJOURD'HUI · ${dateNow}</div>
        <div class="seances-auj">
          ${seancesAuj.map(s => `
            <button class="auj-seance" data-seance-id="${s.id}" type="button">
              <span class="auj-creneau">${creneauLabel(s.creneau)}</span>
              <span class="auj-titre">${escapeHtml(s.objectif)}</span>
              <span class="auj-tps">${(s.tps || []).map(t => `<span class="auj-tp">${t}</span>`).join('') || '<em>CCF</em>'}</span>
            </button>
          `).join('')}
        </div>
      </div>
    `;
  }

  function computeStats(today) {
    const totalEleves = elevesList ? elevesList.length : 0;
    /* Cette semaine = distribuéLe sur les 7 derniers jours */
    const semaineMs = 7 * 24 * 3600 * 1000;
    const since = Date.now() - semaineMs;
    const allAffect = window.Affectations ? Affectations.list() : [];
    const distribCetteSemaine = allAffect.filter(a => {
      const t = a.distribueLe ? new Date(a.distribueLe).getTime() : 0;
      return t >= since;
    }).length;

    /* CCF saisis = au moins 1 tâche cochée */
    let ccfSaisis = 0;
    let sumNotes = 0;
    let countNotes = 0;
    let bareme = null;
    if (window.CCF && elevesList) {
      try { bareme = window._ccfBaremeCache || null; } catch (e) {}
      elevesList.forEach(e => {
        const stored = CCF.get('ep3', e.pseudo);
        if (stored && stored.saisie && Object.keys(stored.saisie).length > 0) {
          ccfSaisis++;
          if (bareme) {
            const r = CCF.compute(bareme, stored.saisie);
            sumNotes += r.note20;
            countNotes++;
          }
        }
      });
    }
    const moyenne = countNotes > 0 ? sumNotes / countNotes : null;
    const couleurMoy = moyenne == null ? '#1b3a63' : (moyenne < 10 ? '#c53030' : moyenne < 14 ? '#dd6b20' : '#38a169');

    /* Prochaine séance (aujourd'hui ou plus tard) */
    const prochaines = (agenda.seances || []).filter(s => s.date >= today).sort((a,b) => a.date.localeCompare(b.date));
    let prochainSeanceJ = '—';
    let prochainSeanceLabel = 'Aucune séance';
    if (prochaines.length > 0) {
      const p = prochaines[0];
      const diff = Math.round((new Date(p.date) - new Date(today)) / (24 * 3600 * 1000));
      if (diff === 0) {
        prochainSeanceJ = 'AUJ';
        prochainSeanceLabel = `${p.jour}<br>${(p.tps || []).join(' + ') || (p.type === 'ccf-officiel' ? 'CCF officiel' : 'CCF blanc')}`;
      } else if (diff === 1) {
        prochainSeanceJ = 'J+1';
        prochainSeanceLabel = `Demain<br>${(p.tps || []).join(' + ') || 'CCF'}`;
      } else {
        prochainSeanceJ = `J+${diff}`;
        prochainSeanceLabel = `${p.jour} ${frDate(p.date)}<br>${(p.tps || []).join(' + ') || 'CCF'}`;
      }
    }

    /* Pré-charge le bareme la prochaine fois — async safe ici */
    if (!window._ccfBaremeCache && window.CCF) {
      CCF.load('ep3').then(b => { window._ccfBaremeCache = b; });
    }

    return { totalEleves, distribCetteSemaine, ccfSaisis, moyenne, couleurMoy, prochainSeanceJ, prochainSeanceLabel };
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

    const onlyDistrib = window.Store && Store.get('cal.onlyDistribued') ? true : false;
    const visibleTps = filterTpsForSeance(s, onlyDistrib);
    const tpsBadges = visibleTps.map(id => {
      const wasDistrib = window.Affectations && Affectations.list().some(a => a.seanceId === s.id && a.tpId === id);
      return `<span class="cal-tp-badge ${wasDistrib ? 'is-distrib' : ''}" title="${wasDistrib ? 'Distribué' : 'Non distribué'}">${id}${wasDistrib ? ' ✅' : ''}</span>`;
    }).join('');
    const hiddenCount = (s.tps || []).length - visibleTps.length;
    const hiddenTag = hiddenCount > 0 ? `<span class="cal-tp-hidden" title="${hiddenCount} TP masqué(s) par le filtre">+${hiddenCount} masqué${hiddenCount>1?'s':''}</span>` : '';
    const distribCount = countDistributions(s.id);
    const distribTag = distribCount > 0
      ? `<span class="cal-distrib">📤 ${distribCount} distribué${distribCount>1?'s':''}</span>` : '';

    return `
      <div class="${cls.join(' ')}" data-seance-id="${s.id}">
        <div class="cal-seance-creneau">${creneauLabel(s.creneau)}</div>
        <div class="cal-seance-titre">${escapeHtml(s.objectif)}</div>
        <div class="cal-seance-meta">
          ${tpsBadges}
          ${hiddenTag}
          ${s.salle ? `<span class="cal-salle">📍 ${s.salle}</span>` : ''}
          ${distribTag}
        </div>
      </div>
    `;
  }

  /** Retourne la liste filtrée des TP d'une séance selon le toggle "uniquement distribués". */
  function filterTpsForSeance(s, onlyDistrib) {
    const all = s.tps || [];
    if (!onlyDistrib || !window.Affectations) return all;
    const affects = Affectations.list();
    return all.filter(tpId => affects.some(a => a.seanceId === s.id && a.tpId === tpId));
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

    /* Liste TP suggérés (filtrée selon toggle) */
    const onlyDistrib = window.Store && Store.get('cal.onlyDistribued') ? true : false;
    const tpsVisibles = filterTpsForSeance(s, onlyDistrib);
    const tpsCards = tpsVisibles.map(id => {
      const meta = (bib && bib.tps.find(t => t.id === id)) || null;
      const wasDistrib = window.Affectations && Affectations.list().some(a => a.seanceId === s.id && a.tpId === id);
      const nbEvals = window.TPEval ? TPEval.byTP(id).length : 0;
      const evalsBtn = nbEvals > 0
        ? `<button class="seance-tp-evals" data-tpid="${id}" title="Voir le tableau des évaluations enregistrées pour ce TP">📜 Évaluations (${nbEvals})</button>`
        : `<button class="seance-tp-evals is-empty" data-tpid="${id}" title="Aucune évaluation enregistrée pour ce TP" disabled>📜 Aucune évaluation</button>`;
      const distribTag = wasDistrib ? '<span class="seance-tp-distrib">✅ distribué</span>' : '';
      if (!meta) {
        return `<div class="seance-tp"><strong>${id}</strong> (introuvable) ${evalsBtn}</div>`;
      }
      return `
        <div class="seance-tp-row">
          <a class="seance-tp" href="${meta.url}" target="_blank" rel="noopener">
            <span class="seance-tp-id">${meta.id}</span>
            <span class="seance-tp-tit">${escapeHtml(meta.titre)}</span>
            <span class="seance-tp-meta">${escapeHtml(meta.duree)}</span>
            ${distribTag}
          </a>
          ${evalsBtn}
        </div>
      `;
    }).join('');
    const tpsHiddenInfo = (s.tps || []).length > tpsVisibles.length
      ? `<p class="seance-tps-hidden">🧹 ${(s.tps || []).length - tpsVisibles.length} TP masqué(s) par le filtre « uniquement distribués »</p>`
      : '';

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
          ${tpsHiddenInfo}
        ` : ''}

        ${renderEvalsSection(s)}

        ${(s.tps && s.tps.length > 0) ? `
          <h4>👥 Élèves présents (cochés par défaut) <span id="seance-eleves-count">${elevesList.length} sélectionnés</span></h4>
          <div class="seance-eleves-actions">
            <button class="btn small ghost" id="seance-all">☑ Tous présents</button>
            <button class="btn small ghost" id="seance-none">☐ Tous absents</button>
          </div>
          <div class="seance-eleves-grid">${elevesRows}</div>

          <div class="seance-actions-bar">
            <span id="seance-summary">Distribuer aux élèves présents (date d'exécution = ${frDate(s.date)})</span>
            <button class="btn orange big" id="seance-distribute">📤 Distribuer</button>
            <button class="btn big" id="seance-evaluer" style="background:#38a169;color:#fff;border:0;">✍ Évaluer maintenant</button>
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

    /* Bouton ✍ Évaluer maintenant — ouvre la modale en mode batch
       sur les élèves présents, pour le 1er TP de la séance (ou le seul) */
    const evalBtn = document.getElementById('seance-evaluer');
    if (evalBtn) evalBtn.onclick = () => {
      const eleves = Array.from(document.querySelectorAll('input[name="seance-eleve"]:checked')).map(c => c.value);
      if (eleves.length === 0) { alert('Coche au moins un élève à évaluer.'); return; }
      const tps = selectedSeance.tps || [];
      if (tps.length === 0) { alert('Pas de TP attaché à cette séance.'); return; }
      /* Si plusieurs TP : on demande lequel évaluer */
      let tpId = tps[0];
      if (tps.length > 1) {
        const choix = prompt(`Quel TP veux-tu évaluer ?\n${tps.map((t, i) => `${i+1}. ${t}`).join('\n')}\n\nTape le numéro (1-${tps.length}) :`, '1');
        const idx = parseInt(choix, 10) - 1;
        if (isNaN(idx) || idx < 0 || idx >= tps.length) return;
        tpId = tps[idx];
      }
      window.TPEvalModal && TPEvalModal.openBatch(tpId, eleves);
    };

    /* Boutons export évaluations passées */
    const csvBtn = document.getElementById('seance-evals-csv');
    if (csvBtn) csvBtn.onclick = () => exportEvalsCsv(s);
    const printBtn = document.getElementById('seance-evals-print');
    if (printBtn) printBtn.onclick = () => printEvalsSeance(s);

    /* Bouton "Voir évaluations" sur chaque TP de la séance */
    detail.querySelectorAll('.seance-tp-evals').forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const tpId = btn.dataset.tpid;
        if (tpId) openEvalsForTp(tpId);
      };
    });

    /* Scroll into view */
    setTimeout(() => detail.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  /* ================================================== */
  /*    ÉVALUATIONS ENREGISTRÉES (séance passée)        */
  /* ================================================== */

  /** Récupère toutes les évals TPEval rattachées à cette séance (date = s.date, tpId ∈ s.tps).
   *  Retourne [{tpId, evals: [...]}] uniquement pour les TP qui ont au moins 1 éval. */
  function collectEvalsSeance(s) {
    if (!window.TPEval) return [];
    const tps = s.tps || [];
    const out = [];
    tps.forEach(tpId => {
      const list = TPEval.byTP(tpId).filter(e => {
        const d = e.date || (e.updatedAt ? e.updatedAt.slice(0, 10) : '');
        return d === s.date;
      });
      if (list.length > 0) out.push({ tpId, evals: list });
    });
    return out;
  }

  function renderEvalsSection(s) {
    const groupes = collectEvalsSeance(s);
    if (groupes.length === 0) return '';
    const corrOk = window.Correspondance && Correspondance.available();
    const niveaux = (window.TPEval && TPEval.NIVEAUX) || [];
    const findNiv = code => niveaux.find(n => n.code === code) || { label: code, couleur: '#888' };

    const blocs = groupes.map(g => {
      const meta = (bib && bib.tps.find(t => t.id === g.tpId)) || null;
      const titre = meta ? meta.titre : '';
      /* Toutes les compétences évaluées dans ce TP (union sur tous les élèves) */
      const codes = Array.from(new Set(g.evals.flatMap(e => Object.keys(e.comp || {})))).sort();
      const ths = codes.map(c => {
        const lib = (compsDict && compsDict[c]) ? compsDict[c].libelle : '';
        return `<th title="${escapeHtml(lib)}">${c}</th>`;
      }).join('');
      const rows = g.evals.slice().sort((a, b) => (a.pseudo || '').localeCompare(b.pseudo || '')).map(e => {
        const realName = corrOk ? Correspondance.label(e.pseudo) : e.pseudo;
        const cells = codes.map(c => {
          const lvl = e.comp && e.comp[c];
          if (!lvl || lvl === 'NE') return '<td class="ev-niv ev-niv-none">—</td>';
          const m = findNiv(lvl);
          return `<td class="ev-niv" style="background:${m.couleur};color:#fff;font-weight:bold;">${lvl}</td>`;
        }).join('');
        const com = e.commentaire ? `<div class="ev-com">${escapeHtml(e.commentaire)}</div>` : '';
        return `
          <tr>
            <td class="ev-pseudo">${escapeHtml(e.pseudo)}</td>
            <td class="ev-name">${escapeHtml(realName !== e.pseudo ? realName : '')}${com}</td>
            ${cells}
            <td class="ev-prof">${escapeHtml(e.evaluateur || '')}</td>
          </tr>`;
      }).join('');

      return `
        <div class="ev-bloc">
          <h5 class="ev-bloc-tit"><span class="ev-bloc-id">${g.tpId}</span> ${escapeHtml(titre)} <span class="ev-bloc-count">${g.evals.length} élève${g.evals.length>1?'s':''}</span></h5>
          <div class="ev-table-wrap">
            <table class="ev-table">
              <thead><tr><th>Pseudo</th><th>Nom</th>${ths}<th>Évaluateur</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </div>`;
    }).join('');

    return `
      <div class="ev-section">
        <div class="ev-head">
          <h4>📜 Évaluations enregistrées <span class="ev-date-pill">${frDate(s.date)}</span></h4>
          <div class="ev-actions">
            <button class="btn small" id="seance-evals-csv">📥 Exporter CSV</button>
            <button class="btn small ghost" id="seance-evals-print">🖨 Imprimer</button>
          </div>
        </div>
        <p class="ev-help">Niveaux : <strong style="color:#c53030">NA</strong> non acquis · <strong style="color:#dd6b20">EC</strong> en cours · <strong style="color:#38a169">A</strong> acquis · <strong style="color:#1b3a63">M</strong> maîtrisé. À reporter dans le module Compétences d'EcoleDirecte.</p>
        ${blocs}
      </div>
    `;
  }

  function exportEvalsCsv(s) {
    const groupes = collectEvalsSeance(s);
    if (groupes.length === 0) { alert('Pas d\'évaluation enregistrée pour cette séance.'); return; }
    const corrOk = window.Correspondance && Correspondance.available();
    const sep = ';';
    const head = ['Date', 'Séance', 'TP', 'Pseudo', 'Nom réel', 'Compétence', 'Libellé', 'Niveau', 'Évaluateur', 'Commentaire'];
    const lines = [head.join(sep)];
    groupes.forEach(g => {
      const meta = (bib && bib.tps.find(t => t.id === g.tpId)) || null;
      const tpTitre = meta ? meta.titre : '';
      g.evals.forEach(e => {
        const realName = corrOk ? Correspondance.label(e.pseudo) : '';
        const com = (e.commentaire || '').replace(/\r?\n/g, ' ').replace(/"/g, '""');
        Object.keys(e.comp || {}).forEach(c => {
          const lvl = e.comp[c];
          if (!lvl || lvl === 'NE') return;
          const lib = (compsDict && compsDict[c]) ? compsDict[c].libelle : '';
          const niv = (window.TPEval && TPEval.NIVEAUX || []).find(n => n.code === lvl);
          const nivLabel = niv ? `${lvl} - ${niv.label}` : lvl;
          const row = [s.date, s.id, `${g.tpId} ${tpTitre}`, e.pseudo, realName,
                       c, lib, nivLabel, e.evaluateur || '', com]
            .map(v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`).join(sep);
          lines.push(row);
        });
      });
    });
    /* BOM UTF-8 pour Excel */
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `evals_${s.date}_${s.id}.csv`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 100);
    window.toast && window.toast(`📥 CSV exporté pour le ${frDate(s.date)}`, 'success');
  }

  /** Modale : toutes les évaluations enregistrées pour un TP donné (toutes dates).
   *  Ouverte depuis le bouton "📜 Évaluations" à côté de chaque TP dans la fiche séance. */
  function openEvalsForTp(tpId) {
    if (!window.TPEval) return;
    const evals = TPEval.byTP(tpId);
    const meta = (bib && bib.tps.find(t => t.id === tpId)) || null;
    const titre = meta ? meta.titre : '';
    const corrOk = window.Correspondance && Correspondance.available();
    const niveaux = (window.TPEval && TPEval.NIVEAUX) || [];
    const findNiv = code => niveaux.find(n => n.code === code) || { label: code, couleur: '#888' };

    /* Group par date DESC */
    const byDate = {};
    evals.forEach(e => {
      const d = e.date || (e.updatedAt ? e.updatedAt.slice(0, 10) : 'inconnu');
      (byDate[d] = byDate[d] || []).push(e);
    });
    const dates = Object.keys(byDate).sort().reverse();

    const blocs = dates.length === 0
      ? `<div class="ev-empty"><p>Aucune évaluation enregistrée pour ce TP.</p></div>`
      : dates.map(d => {
        const list = byDate[d];
        const codes = Array.from(new Set(list.flatMap(e => Object.keys(e.comp || {})))).sort();
        const ths = codes.map(c => {
          const lib = (compsDict && compsDict[c]) ? compsDict[c].libelle : '';
          return `<th title="${escapeHtml(lib)}">${c}</th>`;
        }).join('');
        const rows = list.slice().sort((a, b) => (a.pseudo || '').localeCompare(b.pseudo || '')).map(e => {
          const realName = corrOk ? Correspondance.label(e.pseudo) : e.pseudo;
          const cells = codes.map(c => {
            const lvl = e.comp && e.comp[c];
            if (!lvl || lvl === 'NE') return '<td class="ev-niv ev-niv-none">—</td>';
            const m = findNiv(lvl);
            return `<td class="ev-niv" style="background:${m.couleur};color:#fff;font-weight:bold;">${lvl}</td>`;
          }).join('');
          const com = e.commentaire ? `<div class="ev-com">${escapeHtml(e.commentaire)}</div>` : '';
          return `<tr><td class="ev-pseudo">${escapeHtml(e.pseudo)}</td><td class="ev-name">${escapeHtml(realName !== e.pseudo ? realName : '')}${com}</td>${cells}<td class="ev-prof">${escapeHtml(e.evaluateur || '')}</td></tr>`;
        }).join('');
        return `
          <div class="ev-bloc">
            <h5 class="ev-bloc-tit"><span class="ev-bloc-id">${frDate(d)}</span> <span class="ev-bloc-count">${list.length} élève${list.length>1?'s':''}</span></h5>
            <div class="ev-table-wrap">
              <table class="ev-table">
                <thead><tr><th>Pseudo</th><th>Nom</th>${ths}<th>Évaluateur</th></tr></thead>
                <tbody>${rows}</tbody>
              </table>
            </div>
          </div>`;
      }).join('');

    const totalEvals = evals.length;
    const overlay = document.createElement('div');
    overlay.id = 'tpevals-overlay';
    overlay.className = 'tl-overlay';
    overlay.innerHTML = `
      <div class="tl-card" style="max-width:1100px;">
        <header>
          <h2>📜 Évaluations — <strong>${tpId}</strong> ${escapeHtml(titre)}</h2>
          <button class="btn-x" id="tpevals-close" title="Fermer">×</button>
        </header>
        <div class="tl-body">
          ${totalEvals > 0 ? `
            <div class="ev-head">
              <h4>${totalEvals} évaluation${totalEvals>1?'s':''} sur ${dates.length} date${dates.length>1?'s':''}</h4>
              <div class="ev-actions">
                <button class="btn small" id="tpevals-csv">📥 Exporter CSV</button>
                <button class="btn small ghost" id="tpevals-print">🖨 Imprimer</button>
              </div>
            </div>
            <p class="ev-help">Niveaux : <strong style="color:#c53030">NA</strong> · <strong style="color:#dd6b20">EC</strong> · <strong style="color:#38a169">A</strong> · <strong style="color:#1b3a63">M</strong>. À reporter dans le module Compétences d'EcoleDirecte.</p>
          ` : ''}
          ${blocs}
        </div>
        <footer class="tl-footer">
          <button class="btn small ghost" id="tpevals-close-foot">Fermer</button>
        </footer>
      </div>
    `;
    document.body.appendChild(overlay);

    const close = () => { const o = document.getElementById('tpevals-overlay'); if (o) o.remove(); };
    document.getElementById('tpevals-close').onclick = close;
    document.getElementById('tpevals-close-foot').onclick = close;
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    const c = document.getElementById('tpevals-csv');
    if (c) c.onclick = () => exportEvalsTpCsv(tpId, evals, titre);
    const p = document.getElementById('tpevals-print');
    if (p) p.onclick = () => printEvalsTp(tpId, evals, titre);
  }

  function exportEvalsTpCsv(tpId, evals, titre) {
    const corrOk = window.Correspondance && Correspondance.available();
    const sep = ';';
    const head = ['Date', 'TP', 'TitreTP', 'Pseudo', 'Nom réel', 'Compétence', 'Libellé', 'Niveau', 'Évaluateur', 'Commentaire'];
    const lines = [head.join(sep)];
    evals.forEach(e => {
      const d = e.date || (e.updatedAt ? e.updatedAt.slice(0, 10) : '');
      const realName = corrOk ? Correspondance.label(e.pseudo) : '';
      const com = (e.commentaire || '').replace(/\r?\n/g, ' ');
      Object.keys(e.comp || {}).forEach(c => {
        const lvl = e.comp[c];
        if (!lvl || lvl === 'NE') return;
        const lib = (compsDict && compsDict[c]) ? compsDict[c].libelle : '';
        const niv = (window.TPEval && TPEval.NIVEAUX || []).find(n => n.code === lvl);
        const nivLabel = niv ? `${lvl} - ${niv.label}` : lvl;
        const row = [d, tpId, titre, e.pseudo, realName, c, lib, nivLabel, e.evaluateur || '', com]
          .map(v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`).join(sep);
        lines.push(row);
      });
    });
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `evals_${tpId}.csv`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 100);
    window.toast && window.toast(`📥 CSV exporté pour ${tpId}`, 'success');
  }

  function printEvalsTp(tpId, evals, titre) {
    const corrOk = window.Correspondance && Correspondance.available();
    const niveaux = (window.TPEval && TPEval.NIVEAUX) || [];
    const findNiv = code => niveaux.find(n => n.code === code) || { label: code, couleur: '#888' };
    const byDate = {};
    evals.forEach(e => {
      const d = e.date || (e.updatedAt ? e.updatedAt.slice(0, 10) : 'inconnu');
      (byDate[d] = byDate[d] || []).push(e);
    });
    const dates = Object.keys(byDate).sort().reverse();
    const blocs = dates.map(d => {
      const list = byDate[d];
      const codes = Array.from(new Set(list.flatMap(e => Object.keys(e.comp || {})))).sort();
      const ths = codes.map(c => {
        const lib = (compsDict && compsDict[c]) ? compsDict[c].libelle : '';
        return `<th><div class="ph-code">${c}</div><div class="ph-lib">${escapeHtml(lib)}</div></th>`;
      }).join('');
      const rows = list.slice().sort((a, b) => (a.pseudo || '').localeCompare(b.pseudo || '')).map(e => {
        const realName = corrOk ? Correspondance.label(e.pseudo) : e.pseudo;
        const cells = codes.map(c => {
          const lvl = e.comp && e.comp[c];
          if (!lvl || lvl === 'NE') return '<td>—</td>';
          const m = findNiv(lvl);
          return `<td style="background:${m.couleur};color:#fff;font-weight:bold;text-align:center;">${lvl}</td>`;
        }).join('');
        return `<tr><td>${escapeHtml(e.pseudo)}</td><td>${escapeHtml(realName !== e.pseudo ? realName : '')}</td>${cells}<td>${escapeHtml(e.evaluateur || '')}</td></tr>`;
      }).join('');
      return `<h3>${frDate(d)}</h3><table class="ph-table"><thead><tr><th>Pseudo</th><th>Nom</th>${ths}<th>Éval.</th></tr></thead><tbody>${rows}</tbody></table>`;
    }).join('');
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) { alert('Le navigateur a bloqué l\'ouverture de la fenêtre d\'impression.'); return; }
    w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8">
      <title>Évaluations ${tpId}</title>
      <style>
        body { font-family: Calibri, Arial, sans-serif; font-size: 14pt; color: #000; line-height: 1.5; padding: 20px; }
        h1 { color: #1b3a63; font-family: 'Trebuchet MS', sans-serif; font-size: 18pt; margin: 0 0 6px; }
        h3 { color: #1b3a63; font-family: 'Trebuchet MS', sans-serif; font-size: 14pt; margin: 18px 0 6px; }
        .meta { color: #666; font-size: 11pt; margin-bottom: 14px; }
        .ph-table { border-collapse: collapse; width: 100%; font-size: 11pt; page-break-inside: avoid; }
        .ph-table th, .ph-table td { border: 1px solid #999; padding: 4px 6px; vertical-align: middle; }
        .ph-table th { background: #1b3a63; color: #fff; font-weight: bold; }
        .ph-code { font-weight: bold; }
        .ph-lib { font-weight: normal; font-size: 9pt; }
        @media print { @page { size: A4 landscape; margin: 1cm; } }
      </style></head><body>
      <h1>${tpId} — ${escapeHtml(titre)}</h1>
      <div class="meta">${evals.length} évaluation(s) sur ${dates.length} date(s) · LP Privé Jacques Raynaud — Campus ÉQUATIO</div>
      ${blocs}
      <script>window.onload = () => setTimeout(() => window.print(), 200);<\/script>
      </body></html>`);
    w.document.close();
  }

  function printEvalsSeance(s) {
    const groupes = collectEvalsSeance(s);
    if (groupes.length === 0) { alert('Pas d\'évaluation enregistrée pour cette séance.'); return; }
    const corrOk = window.Correspondance && Correspondance.available();
    const niveaux = (window.TPEval && TPEval.NIVEAUX) || [];
    const findNiv = code => niveaux.find(n => n.code === code) || { label: code, couleur: '#888' };

    const blocs = groupes.map(g => {
      const meta = (bib && bib.tps.find(t => t.id === g.tpId)) || null;
      const titre = meta ? meta.titre : '';
      const codes = Array.from(new Set(g.evals.flatMap(e => Object.keys(e.comp || {})))).sort();
      const ths = codes.map(c => {
        const lib = (compsDict && compsDict[c]) ? compsDict[c].libelle : '';
        return `<th><div class="ph-code">${c}</div><div class="ph-lib">${escapeHtml(lib)}</div></th>`;
      }).join('');
      const rows = g.evals.slice().sort((a, b) => (a.pseudo || '').localeCompare(b.pseudo || '')).map(e => {
        const realName = corrOk ? Correspondance.label(e.pseudo) : e.pseudo;
        const cells = codes.map(c => {
          const lvl = e.comp && e.comp[c];
          if (!lvl || lvl === 'NE') return '<td>—</td>';
          const m = findNiv(lvl);
          return `<td style="background:${m.couleur};color:#fff;font-weight:bold;text-align:center;">${lvl}</td>`;
        }).join('');
        return `<tr><td>${escapeHtml(e.pseudo)}</td><td>${escapeHtml(realName !== e.pseudo ? realName : '')}</td>${cells}<td>${escapeHtml(e.evaluateur || '')}</td></tr>`;
      }).join('');
      return `
        <h3>${g.tpId} — ${escapeHtml(titre)}</h3>
        <table class="ph-table"><thead><tr><th>Pseudo</th><th>Nom</th>${ths}<th>Éval.</th></tr></thead><tbody>${rows}</tbody></table>`;
    }).join('');

    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) { alert('Le navigateur a bloqué l\'ouverture de la fenêtre d\'impression.'); return; }
    w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8">
      <title>Évaluations ${s.date} — ${s.id}</title>
      <style>
        body { font-family: Calibri, Arial, sans-serif; font-size: 14pt; color: #000; line-height: 1.5; padding: 20px; }
        h1 { color: #1b3a63; font-family: 'Trebuchet MS', sans-serif; font-size: 18pt; margin: 0 0 6px; }
        h3 { color: #1b3a63; font-family: 'Trebuchet MS', sans-serif; font-size: 14pt; margin: 18px 0 6px; }
        .meta { color: #666; font-size: 11pt; margin-bottom: 14px; }
        .ph-table { border-collapse: collapse; width: 100%; font-size: 11pt; page-break-inside: avoid; }
        .ph-table th, .ph-table td { border: 1px solid #999; padding: 4px 6px; vertical-align: middle; }
        .ph-table th { background: #1b3a63; color: #fff; font-weight: bold; }
        .ph-code { font-weight: bold; }
        .ph-lib { font-weight: normal; font-size: 9pt; }
        .legend { font-size: 10pt; color: #444; margin-top: 12px; }
        @media print { @page { size: A4 landscape; margin: 1cm; } }
      </style></head><body>
      <h1>Évaluations — ${frDate(s.date)} (${s.jour})</h1>
      <div class="meta">${escapeHtml(s.objectif || '')} · ${creneauLabel(s.creneau)} · LP Privé Jacques Raynaud — Campus ÉQUATIO</div>
      ${blocs}
      <div class="legend">Niveaux d'acquisition : <strong>NA</strong> non acquis · <strong>EC</strong> en cours · <strong>A</strong> acquis · <strong>M</strong> maîtrisé. À reporter dans le module Compétences d'EcoleDirecte.</div>
      <script>window.onload = () => setTimeout(() => window.print(), 200);<\/script>
      </body></html>`);
    w.document.close();
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

  ['correspondance-loaded', 'sync-merged'].forEach(ev => {
    document.addEventListener(ev, () => {
      if (agenda && document.getElementById('calendrier-root')) render();
    });
  });

  window.Calendrier = { init, onShown, render };
})();
