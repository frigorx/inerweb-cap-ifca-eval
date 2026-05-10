/* notes-jour.js — Vue "Notes du jour"
   Sélecteur de date + classe → liste de toutes les évals TPEval de ce jour,
   groupées par TP, avec export CSV / impression / copie presse-papier.
   Indépendant de l'agenda : marche pour N'IMPORTE QUELLE date où des évals
   ont été saisies (pas seulement les séances de révisions EP3).
*/

(function() {
  'use strict';

  let elevesData = null;
  let bib = null;
  let compsDict = null;
  let datesDispo = []; /* Liste des dates qui ont des évals, triée DESC */
  let monthOffset = 0; /* 0 = mois courant, -1 = précédent, +1 = suivant */

  async function ensureLoaded() {
    if (!elevesData) elevesData = await Catalog.load('eleves_pseudo.json');
    if (!bib && window.Affectations) bib = await Affectations.biblio();
    if (!compsDict) {
      compsDict = {};
      for (const ep of ['ep1', 'ep2', 'ep3']) {
        const j = await Catalog.load(`competences_${ep}.json`);
        (j && j.competences || []).forEach(c => { compsDict[c.code] = c; });
      }
    }
    if (window.Correspondance && Correspondance.load) await Correspondance.load();
  }

  /** Retrouve toutes les évals saisies à une date donnée (filtre éventuel par classe). */
  function evalsForDate(dateIso, classeFilter) {
    if (!window.TPEval) return [];
    const all = TPEval.list();
    const elevesByPseudo = {};
    if (elevesData && elevesData.eleves) {
      elevesData.eleves.forEach(e => { elevesByPseudo[e.pseudo] = e; });
    }
    return all.filter(e => {
      const d = e.date || (e.updatedAt ? e.updatedAt.slice(0, 10) : '');
      if (d !== dateIso) return false;
      if (!classeFilter || classeFilter === '__all__') return true;
      const ele = elevesByPseudo[e.pseudo];
      return ele && ele.classe === classeFilter;
    });
  }

  /** Liste des dates ayant au moins une éval, triée DESC. */
  function listDatesAvecEvals() {
    if (!window.TPEval) return [];
    const set = new Set();
    TPEval.list().forEach(e => {
      const d = e.date || (e.updatedAt ? e.updatedAt.slice(0, 10) : '');
      if (d) set.add(d);
    });
    return Array.from(set).sort().reverse();
  }

  function groupByTp(evals) {
    const m = {};
    evals.forEach(e => {
      (m[e.tpId] = m[e.tpId] || []).push(e);
    });
    return Object.keys(m).sort().map(tpId => ({ tpId, evals: m[tpId] }));
  }

  async function init() {
    await ensureLoaded();
    render();
  }

  function onShown() {
    if (!elevesData) init();
    else render();
  }

  function render() {
    const root = document.getElementById('notes-jour-root');
    if (!root) return;

    datesDispo = listDatesAvecEvals();
    const today = new Date().toISOString().slice(0, 10);
    const currentDate = (window._notesJourDate || (datesDispo[0] || today));
    const currentClasse = (window._notesJourClasse || '__all__');

    /* Liste des classes connues */
    const classes = elevesData && elevesData.classes
      ? Object.keys(elevesData.classes).map(k => k.replace(/_/g, ' '))
      : [];

    const evals = evalsForDate(currentDate, currentClasse);
    const groupes = groupByTp(evals);

    /* Diagnostic : combien d'évals dans le navigateur */
    const allEvals = window.TPEval ? TPEval.list() : [];
    const allDates = new Set();
    const allTps = new Set();
    const allElevesEval = new Set();
    allEvals.forEach(e => {
      const d = e.date || (e.updatedAt ? e.updatedAt.slice(0, 10) : '');
      if (d) allDates.add(d);
      if (e.tpId) allTps.add(e.tpId);
      if (e.pseudo) allElevesEval.add(e.pseudo);
    });

    root.innerHTML = `
      <div class="card">
        <h2 style="margin-top:0;">📝 Notes du jour <span style="font-size:11pt;color:var(--text-soft);font-weight:normal;">— retrouve toutes les évaluations enregistrées par jour, prêtes à reporter dans EcoleDirecte</span></h2>

        <div class="nj-diag">
          <div class="nj-diag-stats">
            <span class="nj-diag-stat">📊 <strong>${allEvals.length}</strong> évaluation${allEvals.length>1?'s':''} dans ce navigateur</span>
            <span class="nj-diag-stat">📅 <strong>${allDates.size}</strong> date${allDates.size>1?'s':''} concernée${allDates.size>1?'s':''}</span>
            <span class="nj-diag-stat">📚 <strong>${allTps.size}</strong> TP différent${allTps.size>1?'s':''}</span>
            <span class="nj-diag-stat">👥 <strong>${allElevesEval.size}</strong> élève${allElevesEval.size>1?'s':''}</span>
          </div>
          <div class="nj-diag-actions">
            <button class="btn small" id="nj-force-sync" title="Forcer la lecture du Google Sheet">🔄 Re-synchroniser depuis le Sheet</button>
            <a class="btn small ghost" href="https://docs.google.com/spreadsheets/d/16T1T3yL6M49OhJUQS1SmFHwW7Bywp7m2kSXDiXdmItk/edit" target="_blank" rel="noopener" title="Source de vérité — toutes les évals y sont">📊 Ouvrir le Google Sheet</a>
          </div>
          ${allEvals.length === 0 ? `
            <div class="nj-diag-warn">
              <strong>⚠ Aucune éval dans ce navigateur.</strong>
              Si tu sais que tu as déjà saisi des évals (sur ce poste ou un autre),
              clique sur <strong>« 🔄 Re-synchroniser depuis le Sheet »</strong> ci-dessus.
              <strong>Tes données ne sont jamais perdues</strong> : elles sont dans le Sheet.
            </div>
          ` : `
            <details class="nj-diag-details">
              <summary>Voir la liste détaillée des dates avec évals (pour diagnostic)</summary>
              <div class="nj-diag-dates">
                ${Array.from(allDates).sort().reverse().map(d => {
                  const n = allEvals.filter(e => (e.date || (e.updatedAt && e.updatedAt.slice(0,10))) === d).length;
                  return `<button class="nj-diag-date-btn" data-date="${d}">${frDate(d)} <span>(${n})</span></button>`;
                }).join('')}
              </div>
            </details>
          `}
        </div>

        ${renderMonthCalendar(currentDate)}

        <div class="nj-toolbar">
          <div class="nj-field">
            <label for="nj-date">📅 Aller à la date</label>
            <input type="date" id="nj-date" value="${currentDate}" max="${today}">
          </div>
          <div class="nj-field">
            <label for="nj-classe">👥 Classe</label>
            <select id="nj-classe">
              <option value="__all__">Toutes les classes</option>
              ${classes.map(c => `<option value="${escapeHtml(c)}" ${c === currentClasse ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
            </select>
          </div>
          <div class="nj-actions">
            <button class="btn small" id="nj-csv" ${groupes.length === 0 ? 'disabled' : ''}>📥 CSV</button>
            <button class="btn small ghost" id="nj-print" ${groupes.length === 0 ? 'disabled' : ''}>🖨 Imprimer</button>
          </div>
        </div>

        ${renderResults(currentDate, currentClasse, groupes)}
      </div>
    `;

    /* Câblage diagnostic */
    const forceSyncBtn = document.getElementById('nj-force-sync');
    if (forceSyncBtn) forceSyncBtn.onclick = async () => {
      forceSyncBtn.disabled = true;
      forceSyncBtn.textContent = '🔄 Synchronisation…';
      try {
        if (window.Sync && Sync.pullNow) await Sync.pullNow();
        render();
      } catch (e) {
        console.error('[notes-jour] sync failed', e);
        alert('Erreur lors de la sync. Vérifie ta connexion et l\'Apps Script.');
      }
      forceSyncBtn.disabled = false;
    };
    root.querySelectorAll('.nj-diag-date-btn').forEach(b => {
      b.onclick = () => {
        const v = b.dataset.date;
        window._notesJourDate = v;
        adjustMonthOffsetToDate(v);
        render();
      };
    });

    /* Câblage */
    document.getElementById('nj-date').onchange = (e) => {
      window._notesJourDate = e.target.value;
      monthOffset = 0; /* recentre sur le mois choisi */
      adjustMonthOffsetToDate(e.target.value);
      render();
    };
    document.getElementById('nj-classe').onchange = (e) => {
      window._notesJourClasse = e.target.value;
      render();
    };
    /* Navigation mois précédent / suivant */
    const prevBtn = root.querySelector('.nj-cal-prev');
    const nextBtn = root.querySelector('.nj-cal-next');
    if (prevBtn) prevBtn.onclick = () => { monthOffset--; render(); };
    if (nextBtn) nextBtn.onclick = () => { monthOffset++; render(); };
    /* Clic case calendrier */
    root.querySelectorAll('.nj-cell.has-evals').forEach(c => {
      c.onclick = () => {
        window._notesJourDate = c.dataset.date;
        render();
      };
    });
    const csvBtn = document.getElementById('nj-csv');
    if (csvBtn) csvBtn.onclick = () => exportCsv(currentDate, currentClasse, groupes);
    const printBtn = document.getElementById('nj-print');
    if (printBtn) printBtn.onclick = () => printDay(currentDate, currentClasse, groupes);
  }

  /** Ajuste monthOffset pour que le mois affiché contienne la date passée. */
  function adjustMonthOffsetToDate(iso) {
    if (!iso) return;
    const target = new Date(iso + 'T00:00:00');
    const today = new Date();
    monthOffset = (target.getFullYear() - today.getFullYear()) * 12 + (target.getMonth() - today.getMonth());
  }

  /** Mini-calendrier mensuel : grille 7 colonnes × N lignes,
      cases avec n évals + badges TP, cliquables. */
  function renderMonthCalendar(currentDateIso) {
    const base = new Date();
    base.setDate(1);
    base.setMonth(base.getMonth() + monthOffset);
    const year = base.getFullYear();
    const month = base.getMonth(); /* 0-11 */
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const nbDays = lastDay.getDate();
    /* Convertir Sun=0 → Lun=0 */
    let startCol = (firstDay.getDay() + 6) % 7;

    const moisNoms = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
    const today = new Date().toISOString().slice(0, 10);

    /* Indexe les évals par date pour ce mois */
    const monthEvals = {}; /* { '2026-05-04': {n: 12, tps: Set} } */
    if (window.TPEval) {
      TPEval.list().forEach(e => {
        const d = e.date || (e.updatedAt ? e.updatedAt.slice(0, 10) : '');
        if (!d) return;
        const [y, m] = d.split('-').map(Number);
        if (y !== year || m !== month + 1) return;
        if (!monthEvals[d]) monthEvals[d] = { n: 0, tps: new Set() };
        monthEvals[d].n++;
        monthEvals[d].tps.add(e.tpId);
      });
    }

    /* Grille */
    const cells = [];
    for (let i = 0; i < startCol; i++) cells.push('<div class="nj-cell empty"></div>');
    for (let d = 1; d <= nbDays; d++) {
      const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const info = monthEvals[iso];
      const isToday = iso === today;
      const isCurrent = iso === currentDateIso;
      const cls = ['nj-cell'];
      if (info) cls.push('has-evals');
      else cls.push('no-evals');
      if (isToday) cls.push('is-today');
      if (isCurrent) cls.push('is-current');

      const tpBadges = info
        ? Array.from(info.tps).slice(0, 3).map(t => `<span class="nj-cell-tp">${t.replace(/^TP-/, '')}</span>`).join('') +
          (info.tps.size > 3 ? `<span class="nj-cell-tp">+${info.tps.size - 3}</span>` : '')
        : '';
      const count = info ? `<span class="nj-cell-count">${info.n}</span>` : '';

      cells.push(`
        <div class="${cls.join(' ')}" data-date="${iso}" ${info ? `title="${info.n} éval(s) · ${Array.from(info.tps).join(', ')}"` : ''}>
          <div class="nj-cell-num">${d}</div>
          ${count}
          <div class="nj-cell-tps">${tpBadges}</div>
        </div>`);
    }

    return `
      <div class="nj-cal">
        <div class="nj-cal-head">
          <button class="btn small ghost nj-cal-prev" title="Mois précédent">◀</button>
          <strong>${moisNoms[month]} ${year}</strong>
          <button class="btn small ghost nj-cal-next" title="Mois suivant">▶</button>
        </div>
        <div class="nj-cal-grid">
          <div class="nj-cal-day-name">Lun</div>
          <div class="nj-cal-day-name">Mar</div>
          <div class="nj-cal-day-name">Mer</div>
          <div class="nj-cal-day-name">Jeu</div>
          <div class="nj-cal-day-name">Ven</div>
          <div class="nj-cal-day-name">Sam</div>
          <div class="nj-cal-day-name">Dim</div>
          ${cells.join('')}
        </div>
        <div class="nj-cal-legend">
          <span class="nj-legend-item"><span class="nj-swatch sw-eval"></span> Jour avec évals (clic pour ouvrir)</span>
          <span class="nj-legend-item"><span class="nj-swatch sw-today"></span> Aujourd'hui</span>
          <span class="nj-legend-item"><span class="nj-swatch sw-current"></span> Jour sélectionné</span>
        </div>
      </div>
    `;
  }

  function renderResults(dateIso, classe, groupes) {
    if (groupes.length === 0) {
      return `
        <div class="nj-empty">
          <div class="nj-empty-big">Aucune évaluation enregistrée</div>
          <div class="nj-empty-sub">pour le ${frDate(dateIso)}${classe !== '__all__' ? ' · ' + escapeHtml(classe) : ''}.</div>
          <div class="nj-empty-help">Si tu as bien évalué ce jour-là, vérifie que la sync a bien tiré les données du Sheet (clic sur le badge 🟢 en bas à droite).</div>
        </div>
      `;
    }

    const corrOk = window.Correspondance && Correspondance.available();
    const niveaux = (window.TPEval && TPEval.NIVEAUX) || [];
    const findNiv = code => niveaux.find(n => n.code === code) || { label: code, couleur: '#888' };
    const totalEvals = groupes.reduce((acc, g) => acc + g.evals.length, 0);

    const blocs = groupes.map(g => {
      const meta = (bib && bib.tps.find(t => t.id === g.tpId)) || null;
      const titre = meta ? meta.titre : '';
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
      <div class="ev-section" style="margin-top:14px;">
        <div class="ev-head">
          <h4>📜 ${totalEvals} évaluation${totalEvals>1?'s':''} le ${frDate(dateIso)} <span class="ev-date-pill">${groupes.length} TP</span></h4>
        </div>
        <p class="ev-help">Niveaux : <strong style="color:#c53030">NA</strong> non acquis · <strong style="color:#dd6b20">EC</strong> en cours · <strong style="color:#38a169">A</strong> acquis · <strong style="color:#1b3a63">M</strong> maîtrisé. À reporter dans le module Compétences d'EcoleDirecte.</p>
        ${blocs}
      </div>
    `;
  }

  function exportCsv(dateIso, classe, groupes) {
    if (groupes.length === 0) return;
    const corrOk = window.Correspondance && Correspondance.available();
    const sep = ';';
    const head = ['Date', 'Classe', 'TP', 'TitreTP', 'Pseudo', 'Nom réel', 'Compétence', 'Libellé', 'Niveau', 'Évaluateur', 'Commentaire'];
    const lines = [head.join(sep)];
    const elevesByPseudo = {};
    if (elevesData && elevesData.eleves) {
      elevesData.eleves.forEach(e => { elevesByPseudo[e.pseudo] = e; });
    }
    groupes.forEach(g => {
      const meta = (bib && bib.tps.find(t => t.id === g.tpId)) || null;
      const tpTitre = meta ? meta.titre : '';
      g.evals.forEach(e => {
        const realName = corrOk ? Correspondance.label(e.pseudo) : '';
        const com = (e.commentaire || '').replace(/\r?\n/g, ' ');
        const ele = elevesByPseudo[e.pseudo];
        const cls = ele ? ele.classe : '';
        Object.keys(e.comp || {}).forEach(c => {
          const lvl = e.comp[c];
          if (!lvl || lvl === 'NE') return;
          const lib = (compsDict && compsDict[c]) ? compsDict[c].libelle : '';
          const niv = (window.TPEval && TPEval.NIVEAUX || []).find(n => n.code === lvl);
          const nivLabel = niv ? `${lvl} - ${niv.label}` : lvl;
          const row = [dateIso, cls, g.tpId, tpTitre, e.pseudo, realName, c, lib, nivLabel, e.evaluateur || '', com]
            .map(v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`).join(sep);
          lines.push(row);
        });
      });
    });
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const suffixe = (classe && classe !== '__all__') ? '_' + classe.replace(/\s+/g, '') : '';
    a.download = `notes_${dateIso}${suffixe}.csv`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 100);
    window.toast && window.toast(`📥 CSV exporté pour le ${frDate(dateIso)}`, 'success');
  }

  function printDay(dateIso, classe, groupes) {
    if (groupes.length === 0) return;
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
    const sousTitre = classe && classe !== '__all__' ? ` · ${classe}` : '';
    w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8">
      <title>Notes du ${dateIso}</title>
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
      <h1>Notes du ${frDate(dateIso)}${sousTitre}</h1>
      <div class="meta">LP Privé Jacques Raynaud — Campus ÉQUATIO · Évaluations formatives à reporter dans EcoleDirecte (Compétences)</div>
      ${blocs}
      <div class="legend">Niveaux : <strong>NA</strong> non acquis · <strong>EC</strong> en cours · <strong>A</strong> acquis · <strong>M</strong> maîtrisé.</div>
      <script>window.onload = () => setTimeout(() => window.print(), 200);<\/script>
      </body></html>`);
    w.document.close();
  }

  /* Utils */
  function frDate(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return d && m && y ? `${d}/${m}/${y}` : iso;
  }
  function escapeHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* Refresh auto si sync ramène de nouvelles évals */
  document.addEventListener('sync-merged', () => {
    if (document.getElementById('notes-jour-root') && elevesData) render();
  });

  window.NotesJour = { init, onShown, render };
})();
