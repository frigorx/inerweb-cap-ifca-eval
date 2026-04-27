/* dashboard.js — vue Aujourd'hui + Carte progression + Élèves
   Inspiration "Le Mur" (HAL) : qui a fait quoi quand. */

(function() {
  'use strict';

  let _eleves = null;
  let _tps = null;
  let _comps = null;

  async function init() {
    _eleves = await Catalog.load('eleves_pseudo.json');
    const cat = await Catalog.load('tp_ep3.json');
    _comps = await Catalog.load('competences_ep3.json');
    if (!_eleves || !cat || !_comps) return;
    _tps = cat.tps;

    document.getElementById('today-date').textContent = new Date().toLocaleDateString('fr-FR', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
    });

    /* v2.0 : certains boutons ont été retirés du HTML (view-eleves remplacée par
       classe-overview). On rend tous ces handlers optionnels pour éviter les
       erreurs "Cannot set properties of null". */
    const safeOn = (id, evt, fn) => { const el = document.getElementById(id); if (el) el[evt] = fn; };
    safeOn('btn-refresh-progression', 'onclick', renderProgression);
    safeOn('btn-print-progression',   'onclick', () => {
      if (window.Layout && Layout.switchPole) Layout.switchPole('carte');
      else if (window.App && App.show) App.show('progression');
      setTimeout(() => window.print(), 200);
    });
    safeOn('btn-refresh-eleves', 'onclick', renderEleves);
    safeOn('eleves-classe',      'onchange', renderEleves);
    safeOn('eleves-tri',         'onchange', renderEleves);

    inerwebResults.onUpdate(() => {
      const view = document.querySelector('section.view.visible')?.id;
      if (view === 'view-aujourdhui') renderAujourdhui();
      else if (view === 'view-progression') renderProgression();
      else if (view === 'view-eleves') renderEleves();
    });

    renderAujourdhui();
  }

  // ========== AUJOURD'HUI ==========
  function renderAujourdhui() {
    const all = inerwebResults.getAllRows();
    const now = new Date();
    const dayMs = 86400000;
    const since24h = new Date(now - dayMs);
    const since7j = new Date(now - 7 * dayMs);

    const last24 = all.filter(r => new Date(r._timestamp || r.Date || 0) >= since24h);
    const lastWeek = all.filter(r => new Date(r._timestamp || r.Date || 0) >= since7j);
    const elevesEvalues = new Set(lastWeek.map(r => r.Pseudo));
    const compsCouvertes = new Set(lastWeek.map(r => r.Code).filter(c => c && c !== 'NOTE'));

    document.getElementById('stat-eval-24h').textContent = last24.length;
    document.getElementById('stat-eleves-semaine').textContent = `${elevesEvalues.size}/${_eleves.eleves.length}`;
    document.getElementById('stat-comp-couvertes').textContent = `${compsCouvertes.size}/${_comps.axes_radar_ep3.length}`;

    // État TP-056 tournant
    renderTournantSummary();

    // Actions du jour selon date
    const actions = computeActionsDuJour(now);
    document.getElementById('aujourdhui-actions').innerHTML = actions.map(a => `
      <div style="display:flex;gap:14px;align-items:flex-start;padding:10px 12px;background:${a.urgent?'#fff5ef':'var(--bg-alt)'};border-left:4px solid ${a.urgent?'var(--orange)':'var(--bleu)'};border-radius:6px;margin-bottom:8px;">
        <div style="font-size:22pt;">${a.icon}</div>
        <div style="flex:1;">
          <strong style="color:${a.urgent?'var(--orange)':'var(--bleu)'};font-size:14pt;">${escapeHtml(a.titre)}</strong>
          <div style="font-size:12pt;color:var(--text-soft);margin-top:2px;">${escapeHtml(a.detail)}</div>
        </div>
        ${a.cta ? `<button class="btn small orange" onclick="App.show('${a.cta}')">${escapeHtml(a.ctaLabel)} →</button>` : ''}
      </div>`).join('') || '<p style="color:var(--text-soft);">Aucune action particulière aujourd\'hui.</p>';

    // Activité récente — 8 dernières lignes
    const recents = all
      .filter(r => r.Code && r.Niveau)
      .slice()
      .sort((a, b) => new Date(b._timestamp || b.Date || 0) - new Date(a._timestamp || a.Date || 0))
      .slice(0, 8);
    document.getElementById('aujourdhui-activite').innerHTML = recents.length === 0
      ? '<em style="color:var(--text-soft);">Aucune évaluation enregistrée pour le moment. Va sur ✍ Évaluation pour commencer.</em>'
      : `<table style="width:100%;border-collapse:collapse;">
          <thead><tr style="background:var(--bleu);color:#fff;">
            <th style="padding:6px 8px;text-align:left;">Quand</th>
            <th style="padding:6px 8px;text-align:left;">Prof</th>
            <th style="padding:6px 8px;text-align:left;">Élève</th>
            <th style="padding:6px 8px;text-align:left;">TP</th>
            <th style="padding:6px 8px;text-align:left;">Compétence</th>
            <th style="padding:6px 8px;text-align:center;">Niveau</th>
          </tr></thead>
          <tbody>
            ${recents.map(r => {
              const d = new Date(r._timestamp || r.Date || 0);
              const prof = PROFS.find(p => p.code === r.Prof);
              const niv = NIVEAUX.find(n => n.code === r.Niveau);
              return `<tr style="border-bottom:1px solid var(--border);">
                <td style="padding:6px 8px;font-size:11pt;color:var(--text-soft);">${formatRelative(d)}</td>
                <td style="padding:6px 8px;"><span style="background:${prof?.couleur||'#777'};color:#fff;padding:2px 8px;border-radius:10px;font-size:10pt;font-weight:700;">${r.Prof||'?'}</span></td>
                <td style="padding:6px 8px;font-weight:700;color:var(--bleu);" title="${escapeHtml(Correspondance.label(r.Pseudo||''))}">${r.Pseudo||''}${Correspondance.available() ? `<br/><small style="font-size:10pt;font-weight:normal;color:var(--text-soft);">${escapeHtml(Correspondance.label(r.Pseudo||''))}</small>` : ''}</td>
                <td style="padding:6px 8px;">${r.TP||''}</td>
                <td style="padding:6px 8px;">${r.Code||''}</td>
                <td style="padding:6px 8px;text-align:center;"><span style="background:${niv?.couleur||'#777'};color:#fff;padding:2px 10px;border-radius:4px;font-weight:700;">${r.Niveau||''}</span></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>`;
  }

  function computeActionsDuJour(now) {
    const actions = [];
    const buf = inerwebResults.bufferCount();
    if (buf > 0) actions.push({
      icon: '⏳', urgent: true,
      titre: `${buf} évaluation(s) en buffer offline`,
      detail: 'Connexion perdue à un moment — évaluations à renvoyer.',
      cta: 'config', ctaLabel: 'Renvoyer'
    });
    // Selon jour de la semaine
    const dow = now.getDay(); // 0=dim, 1=lun, ...
    const dateStr = now.toISOString().slice(0, 10);
    const seances = {
      '2026-04-27': { id: 'S1', tps: ['TP-050', 'TP-053', 'TP-056'], label: 'Séance S1 — Manipulation + Mesures' },
      '2026-05-04': { id: 'S2', tps: ['TP-051', 'TP-054', 'TP-056'], label: 'Séance S2 — Pressostat + Calculs' },
      '2026-05-11': { id: 'S3', tps: ['TP-052', 'TP-055', 'TP-056'], label: 'Séance S3 — Conclusion + F-Gaz' }
    };
    if (seances[dateStr]) {
      const s = seances[dateStr];
      actions.push({
        icon: '🎯', urgent: true,
        titre: `Aujourd'hui : ${s.label}`,
        detail: `TP du jour : ${s.tps.join(' · ')}. Évaluer chaque élève sur les compétences travaillées.`,
        cta: 'eval', ctaLabel: 'Saisir éval'
      });
    } else if (dow === 1) {
      // Lundi générique
      actions.push({
        icon: '📅', urgent: false,
        titre: 'Lundi — séance atelier prévue',
        detail: 'Vérifier la carte de progression et l\'agenda.',
        cta: 'progression', ctaLabel: 'Voir progression'
      });
    }
    actions.push({
      icon: '🎓', urgent: false,
      titre: 'Espace élève en ligne',
      detail: 'Tes élèves peuvent consulter les fiches guidance V1/V2 sur eleve/.',
      cta: null
    });
    return actions;
  }

  function formatRelative(d) {
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return 'à l\'instant';
    if (diff < 3600) return `${Math.floor(diff/60)} min`;
    if (diff < 86400) return `${Math.floor(diff/3600)} h`;
    if (diff < 7*86400) return `${Math.floor(diff/86400)} j`;
    return d.toLocaleDateString('fr-FR');
  }

  // ========== CARTE PROGRESSION ==========
  function renderProgression() {
    const wrap = document.getElementById('progression-content');
    const all = inerwebResults.getAllRows();
    const seances = [
      { id: 'S1', date: '2026-04-27', label: 'S1 — Lundi 27/04' },
      { id: 'S2', date: '2026-05-04', label: 'S2 — Lundi 04/05' },
      { id: 'S3', date: '2026-05-11', label: 'S3 — Lundi 11/05' }
    ];
    const tpsParSeance = {
      'S1': ['TP-050', 'TP-053'],
      'S2': ['TP-051', 'TP-054'],
      'S3': ['TP-052', 'TP-055']
    };

    const elevesC2 = _eleves.eleves.filter(e => e.classe === 'CAP IFCA 2');

    const html = `
      <h3 style="margin-top:0;">CAP IFCA 2 — révisions EP3</h3>
      <div style="overflow-x:auto;">
      <table style="border-collapse:separate;border-spacing:2px;font-size:12pt;">
        <thead>
          <tr>
            <th style="padding:8px;background:var(--bleu);color:#fff;border-radius:4px;text-align:left;min-width:80px;">Élève</th>
            ${seances.map(s => `
              <th colspan="2" style="padding:8px;background:var(--orange);color:#fff;border-radius:4px;text-align:center;">${s.label}</th>
            `).join('')}
            <th style="padding:8px;background:var(--bleu);color:#fff;border-radius:4px;text-align:center;min-width:80px;">% global</th>
          </tr>
          <tr>
            <th style="padding:4px;background:var(--bleu);color:#fff;font-size:10pt;">Pseudo</th>
            ${seances.map(s => tpsParSeance[s.id].map(tp => `
              <th style="padding:4px;background:var(--bleu-clair);color:#fff;font-size:10pt;min-width:80px;">${tp.replace('TP-','')}</th>
            `).join('')).join('')}
            <th style="padding:4px;background:var(--bleu);color:#fff;font-size:10pt;">Score</th>
          </tr>
        </thead>
        <tbody>
          ${elevesC2.map(e => {
            const cellsHtml = seances.flatMap(s => tpsParSeance[s.id].map(tp => {
              const evals = all.filter(r => r.Pseudo === e.pseudo && r.TP === tp && r.Code && r.Niveau);
              return progressCell(evals);
            })).join('');
            // Score global
            const allMine = all.filter(r => r.Pseudo === e.pseudo && r.Code && r.Niveau);
            const map = { NA: 0, ECA: 7, A: 14, M: 18 };
            const moy = allMine.length ? allMine.reduce((s, r) => s + (map[r.Niveau] || 0), 0) / allMine.length : null;
            const moyHtml = moy === null
              ? '<td style="padding:6px;background:#eee;text-align:center;color:var(--text-soft);">—</td>'
              : `<td style="padding:6px;background:${moy>=12?'#c6f6d5':moy>=8?'#feebc8':'#fed7d7'};text-align:center;font-weight:700;font-size:14pt;color:${moy>=12?'var(--vert)':moy>=8?'var(--jaune)':'var(--rouge)'};">${moy.toFixed(1)}</td>`;
            return `<tr><td style="padding:6px;background:var(--bg-alt);font-weight:700;color:var(--bleu);font-family:'Trebuchet MS',sans-serif;">${e.pseudo}</td>${cellsHtml}${moyHtml}</tr>`;
          }).join('')}
        </tbody>
      </table>
      </div>
      <div style="margin-top:14px;padding:10px;background:var(--bg-alt);border-radius:6px;font-size:12pt;display:flex;gap:14px;flex-wrap:wrap;">
        <strong>Légende :</strong>
        <span><span style="display:inline-block;width:18px;height:14px;background:#c6f6d5;border:1px solid #999;vertical-align:middle;"></span> A/M majoritaire (acquis)</span>
        <span><span style="display:inline-block;width:18px;height:14px;background:#feebc8;border:1px solid #999;vertical-align:middle;"></span> ECA (en cours)</span>
        <span><span style="display:inline-block;width:18px;height:14px;background:#fed7d7;border:1px solid #999;vertical-align:middle;"></span> NA (non acquis)</span>
        <span><span style="display:inline-block;width:18px;height:14px;background:#eee;border:1px solid #999;vertical-align:middle;"></span> Pas évalué</span>
      </div>`;
    wrap.innerHTML = html;
  }

  function progressCell(evals) {
    if (evals.length === 0) return '<td style="padding:6px;background:#eee;text-align:center;color:var(--text-soft);">—</td>';
    const counts = { NA: 0, ECA: 0, A: 0, M: 0 };
    evals.forEach(e => { if (counts[e.Niveau] !== undefined) counts[e.Niveau]++; });
    const total = evals.length;
    const dominant = Object.keys(counts).reduce((a, b) => counts[a] >= counts[b] ? a : b);
    const colors = { NA: '#fed7d7', ECA: '#feebc8', A: '#c6f6d5', M: '#bee3f8' };
    const txtColors = { NA: '#c53030', ECA: '#dd6b20', A: '#38a169', M: '#1b3a63' };
    return `<td style="padding:6px;background:${colors[dominant]};text-align:center;font-weight:700;color:${txtColors[dominant]};" title="${evals.length} éval(s) — NA:${counts.NA} ECA:${counts.ECA} A:${counts.A} M:${counts.M}">${dominant}<br/><small style="font-size:9pt;font-weight:normal;">${total} éval</small></td>`;
  }

  // ========== ÉLÈVES ==========
  function renderEleves() {
    const cls = document.getElementById('eleves-classe').value;
    const tri = document.getElementById('eleves-tri').value;
    const all = inerwebResults.getAllRows();

    let list = _eleves.eleves.filter(e => cls === 'all' || e.classe === cls);

    const map = { NA: 0, ECA: 7, A: 14, M: 18 };
    const enrich = list.map(e => {
      const mine = all.filter(r => r.Pseudo === e.pseudo && r.Code && r.Niveau);
      const moy = mine.length ? mine.reduce((s, r) => s + (map[r.Niveau] || 0), 0) / mine.length : null;
      const naCount = mine.filter(r => r.Niveau === 'NA').length;
      const tpsFaits = new Set(mine.map(r => r.TP)).size;
      const dernierTP = mine.length ? mine[mine.length - 1].TP : null;
      return { ...e, moy, naCount, tpsFaits, dernierTP, totalEval: mine.length };
    });

    if (tri === 'score') enrich.sort((a, b) => (b.moy ?? -1) - (a.moy ?? -1));
    else if (tri === 'alerte') enrich.sort((a, b) => b.naCount - a.naCount || (a.moy ?? 99) - (b.moy ?? 99));
    // sinon pseudo : déjà trié

    const wrap = document.getElementById('eleves-cards');
    wrap.innerHTML = `<div class="grid-cols-3">${enrich.map(e => {
      const alert = e.naCount >= 3 ? 'border:3px solid var(--rouge);' : (e.naCount >= 1 ? 'border-left:6px solid var(--jaune);' : 'border-left:6px solid var(--vert);');
      const moyTxt = e.moy === null ? '—' : e.moy.toFixed(1) + '/20';
      const moyColor = e.moy === null ? 'var(--text-soft)' : (e.moy >= 12 ? 'var(--vert)' : (e.moy >= 8 ? 'var(--jaune)' : 'var(--rouge)'));
      const nomReel = Correspondance.label(e.pseudo);
      const showNom = Correspondance.available() && nomReel !== e.pseudo;
      return `<div style="background:#fff;${alert}border-radius:8px;padding:14px;box-shadow:var(--shadow);">
        <div style="display:flex;justify-content:space-between;align-items:start;">
          <div>
            <div style="font-family:'Trebuchet MS',sans-serif;font-weight:700;font-size:18pt;color:var(--bleu);">${e.pseudo}</div>
            ${showNom ? `<div style="font-size:13pt;font-weight:700;color:var(--orange);">${escapeHtml(nomReel)}</div>` : ''}
            <div style="font-size:11pt;color:var(--text-soft);">${e.classe}</div>
          </div>
          <div style="font-family:'Trebuchet MS',sans-serif;font-size:24pt;font-weight:700;color:${moyColor};">${moyTxt}</div>
        </div>
        <div style="margin-top:8px;display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:11pt;">
          <div>📋 ${e.totalEval} éval</div>
          <div>🎯 ${e.tpsFaits}/6 TP</div>
          <div>${e.naCount > 0 ? `<span style="color:var(--rouge);">⚠️ ${e.naCount} NA</span>` : '✅ Pas d\'alerte'}</div>
          <div>${e.dernierTP ? `📍 ${e.dernierTP}` : '—'}</div>
        </div>
        <div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap;">
          <button class="btn small secondary" onclick="App.showRadar('${e.pseudo}')">🎯 Radar</button>
          <button class="btn small ghost" onclick="App.showBulletin('${e.pseudo}')">🖨 Bulletin</button>
        </div>
      </div>`;
    }).join('')}</div>`;
  }

  function renderTournantSummary() {
    const el = document.getElementById('aujourdhui-tournant');
    if (!el || !_eleves) return;
    const counts = { 'pas-commence': [], 'en-cours': [], 'termine': [] };
    _eleves.eleves.forEach(e => {
      const s = Store.get(`tournant.statut.${e.pseudo}`, 'pas-commence');
      counts[s].push(e.pseudo);
    });
    const enCours = counts['en-cours'].map(p => {
      const nom = window.Correspondance ? Correspondance.label(p) : p;
      return `<strong style="color:var(--orange);">${nom}</strong>`;
    }).join(', ') || '<em style="color:var(--text-soft);">personne en autonomie</em>';
    el.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:10px;">
        <div style="background:#eee;padding:10px;border-radius:6px;text-align:center;"><div style="font-size:24pt;">⏳</div><strong>${counts['pas-commence'].length}</strong> à passer</div>
        <div style="background:#fff8e1;padding:10px;border-radius:6px;text-align:center;border:2px solid var(--jaune);"><div style="font-size:24pt;">🔄</div><strong>${counts['en-cours'].length}</strong> en cours</div>
        <div style="background:#e8f5e9;padding:10px;border-radius:6px;text-align:center;"><div style="font-size:24pt;">✅</div><strong>${counts['termine'].length}</strong> terminés</div>
      </div>
      <p style="font-size:13pt;">En autonomie atelier maintenant : ${enCours}</p>
      <button class="btn small orange" onclick="App.show('tournant')">🔁 Aller au TP-056 →</button>
    `;
  }

  function escapeHtml(s) {
    return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  window.Dashboard = { init, renderAujourdhui, renderProgression, renderEleves };

})();
