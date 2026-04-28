/* radars-extra.js — 2 radars supplémentaires :
   - RadarFormatif : 1 élève, niveau moyen par compétence sur les évals TP (TPEval)
   - RadarClasse   : 1 toile classe entière (CCF ou Formatif), moyenne des 24 élèves
*/

(function() {
  'use strict';

  let bareme = null;
  let elevesList = null;
  let chartFormatif = null;
  let chartClasse = null;
  /* Mémoire de la sélection courante pour ne PAS perdre l'élève au re-render
     (event sync-merged ou polling 8s) */
  let selectedFormatifEleve = null;
  let selectedClasseSrc = 'ccf';

  async function ensureLoaded() {
    if (!bareme && window.CCF) bareme = await CCF.load('ep3');
    if (!elevesList) {
      const j = await Catalog.load('eleves_pseudo.json');
      elevesList = (j && j.eleves) || [];
    }
    if (window.Correspondance && Correspondance.load) await Correspondance.load();
  }

  /* ============================================================ */
  /*           RADAR FORMATIF (par élève — TPEval)                */
  /* ============================================================ */
  async function initFormatif() {
    await ensureLoaded();
    const root = document.getElementById('radar-formatif-root');
    if (!root) return;

    const corrOk = window.Correspondance && Correspondance.available();
    const opts = elevesList.map(e => {
      const realName = corrOk ? Correspondance.label(e.pseudo) : e.pseudo;
      return { id: e.pseudo, label: realName === e.pseudo ? e.pseudo : `${realName} (${e.pseudo})` };
    });

    root.innerHTML = `
      <div class="radarx-header">
        <div>
          <label>Élève</label>
          <select id="radar-formatif-eleve">
            <option value="">— Choisir un élève —</option>
            ${opts.map(o => `<option value="${o.id}">${escapeHtml(o.label)}</option>`).join('')}
          </select>
        </div>
        <div class="radarx-info">
          <div class="lab">TP évalués</div>
          <div class="big" id="radar-formatif-count">—</div>
        </div>
        <div class="radarx-info">
          <div class="lab">Compétences vues</div>
          <div class="big" id="radar-formatif-comps">—</div>
        </div>
      </div>
      <div class="radarx-canvas-wrap">
        <canvas id="radar-formatif-canvas"></canvas>
      </div>
      <div class="radarx-legend" id="radar-formatif-legend"></div>
    `;
    const sel = document.getElementById('radar-formatif-eleve');
    sel.onchange = (e) => {
      selectedFormatifEleve = e.target.value || null;
      updateFormatif(selectedFormatifEleve);
    };
    /* Restaure la sélection si elle était active avant le re-render */
    if (selectedFormatifEleve) {
      sel.value = selectedFormatifEleve;
      updateFormatif(selectedFormatifEleve);
    }
  }

  function updateFormatif(pseudo) {
    const canvas = document.getElementById('radar-formatif-canvas');
    if (!canvas) return;
    if (!pseudo) {
      if (chartFormatif) { chartFormatif.destroy(); chartFormatif = null; }
      document.getElementById('radar-formatif-count').textContent = '—';
      document.getElementById('radar-formatif-comps').textContent = '—';
      document.getElementById('radar-formatif-legend').innerHTML = '';
      return;
    }
    const synth = window.TPEval ? TPEval.synthese(pseudo) : {};
    const evals = window.TPEval ? TPEval.byEleve(pseudo) : [];

    document.getElementById('radar-formatif-count').textContent = evals.length;
    document.getElementById('radar-formatif-comps').textContent = Object.keys(synth).length;

    /* 1 axe par compétence du barème CCF (10 axes) */
    const compsKeys = Object.keys(bareme.competences);
    const data = compsKeys.map(c => synth[c] && synth[c].moyenne != null ? synth[c].moyenne : 0);

    if (chartFormatif) chartFormatif.destroy();
    chartFormatif = new Chart(canvas.getContext('2d'), {
      type: 'radar',
      data: {
        labels: compsKeys,
        datasets: [{
          label: 'Niveau moyen formatif (TP)',
          data,
          backgroundColor: 'rgba(56, 161, 105, 0.18)',
          borderColor: '#38a169',
          borderWidth: 2,
          pointBackgroundColor: '#1b3a63',
          pointRadius: 4
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: {
          r: {
            min: 0, max: 3,
            ticks: { stepSize: 1, callback: (v) => ['NA','EC','A','M'][v] || v, backdropColor: 'rgba(255,255,255,0.7)' },
            pointLabels: { font: { size: 13, weight: 'bold' } }
          }
        },
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const c = compsKeys[ctx.dataIndex];
                const s = synth[c];
                if (!s || s.count === 0) return `${c} : non évalué`;
                const code = ['NA','EC','A','M'][Math.round(s.moyenne)] || '—';
                return `${c} : ${s.moyenne.toFixed(2)} (${code}) sur ${s.count} TP`;
              }
            }
          }
        }
      }
    });

    /* Légende détaillée */
    const legend = document.getElementById('radar-formatif-legend');
    legend.innerHTML = compsKeys.map(c => {
      const s = synth[c];
      const m = s && s.moyenne != null ? s.moyenne : null;
      const code = m == null ? '—' : ['NA','EC','A','M'][Math.round(m)];
      const cls = m == null ? '' : ['lvl-na','lvl-ec','lvl-a','lvl-pa'][Math.round(m)];
      const cnt = s ? s.count : 0;
      return `<div class="legend-item ${cls}"><strong>${c}</strong> ${escapeHtml(bareme.competences[c])} <span class="lvl-tag">${code}${cnt ? ` (${cnt} TP)` : ''}</span></div>`;
    }).join('');
  }

  /* ============================================================ */
  /*           RADAR DE CLASSE (24 élèves agrégés)                */
  /* ============================================================ */
  async function initClasse() {
    await ensureLoaded();
    const root = document.getElementById('radar-classe-root');
    if (!root) return;

    root.innerHTML = `
      <div class="radarx-header">
        <div class="radarx-toggle">
          <label>Source</label>
          <button class="btn small toggle-btn active" id="rcl-src-ccf"   data-src="ccf">CCF EP3 (sommatif)</button>
          <button class="btn small toggle-btn"        id="rcl-src-form" data-src="formatif">Formatif (TP)</button>
        </div>
        <div class="radarx-info">
          <div class="lab">Élèves agrégés</div>
          <div class="big" id="rcl-count">—</div>
          <div class="sur" id="rcl-sur">/ 24</div>
        </div>
        <div class="radarx-info">
          <div class="lab">Note moyenne</div>
          <div class="big" id="rcl-moy">—</div>
          <div class="sur">CCF / 20</div>
        </div>
      </div>
      <div class="radarx-canvas-wrap">
        <canvas id="radar-classe-canvas"></canvas>
      </div>
      <div class="radarx-classe-detail" id="radar-classe-detail"></div>
    `;
    /* Toggle CCF / Formatif — mémorise la source choisie */
    document.querySelectorAll('#radar-classe-root .toggle-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.src === selectedClasseSrc);
      b.onclick = () => {
        document.querySelectorAll('#radar-classe-root .toggle-btn').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        selectedClasseSrc = b.dataset.src;
        updateClasse(selectedClasseSrc);
      };
    });
    updateClasse(selectedClasseSrc);
  }

  function updateClasse(source) {
    const canvas = document.getElementById('radar-classe-canvas');
    if (!canvas) return;
    const compsKeys = Object.keys(bareme.competences);

    /* Pour chaque compétence : agrégat des niveaux moyens des élèves */
    const compStats = {}; /* { C4.7: { sum, count, byLevel: {NA:..,EC:..,A:..,M/PA:..} } } */
    compsKeys.forEach(c => compStats[c] = { sum: 0, count: 0, byLevel: { 0: 0, 1: 0, 2: 0, 3: 0 } });

    let elevesAvecData = 0;
    let totalNote = 0;
    let countNote = 0;
    let sourceLab = 'CCF EP3 (sommatif)';

    elevesList.forEach(e => {
      const pseudo = e.pseudo;
      let elevePart = false;

      if (source === 'ccf') {
        sourceLab = 'CCF EP3 (sommatif)';
        const stored = window.CCF ? CCF.get('ep3', pseudo) : null;
        if (!stored || !stored.saisie || Object.keys(stored.saisie).length === 0) return;
        const r = CCF.compute(bareme, stored.saisie);
        Object.keys(r.niveauMoyenParComp || {}).forEach(c => {
          const v = r.niveauMoyenParComp[c];
          if (v == null) return;
          compStats[c].sum += v;
          compStats[c].count++;
          compStats[c].byLevel[Math.round(v)]++;
        });
        if (r.note20 != null) { totalNote += r.note20; countNote++; }
        elevePart = true;
      } else {
        sourceLab = 'Formatif (TP)';
        const synth = window.TPEval ? TPEval.synthese(pseudo) : {};
        if (Object.keys(synth).length === 0) return;
        Object.keys(synth).forEach(c => {
          const v = synth[c].moyenne;
          if (v == null) return;
          compStats[c].sum += v;
          compStats[c].count++;
          compStats[c].byLevel[Math.round(v)]++;
        });
        elevePart = true;
      }
      if (elevePart) elevesAvecData++;
    });

    /* Moyennes classe par compétence */
    const data = compsKeys.map(c => {
      const s = compStats[c];
      return s.count > 0 ? s.sum / s.count : 0;
    });

    document.getElementById('rcl-count').textContent = elevesAvecData;
    const moy = countNote > 0 ? (totalNote / countNote) : null;
    const moyEl = document.getElementById('rcl-moy');
    const sur = document.getElementById('rcl-sur');
    if (source === 'ccf') {
      moyEl.textContent = moy != null ? moy.toFixed(1).replace('.', ',') : '—';
      moyEl.style.color = moy == null ? '#888' : moy < 10 ? '#c53030' : moy < 14 ? '#dd6b20' : '#38a169';
      if (sur) sur.textContent = '/ 20 (CCF)';
    } else {
      moyEl.textContent = '—';
      moyEl.style.color = '#888';
      if (sur) sur.textContent = '(formatif sans note)';
    }

    /* Render radar */
    if (chartClasse) chartClasse.destroy();
    chartClasse = new Chart(canvas.getContext('2d'), {
      type: 'radar',
      data: {
        labels: compsKeys,
        datasets: [{
          label: `Moyenne classe — ${sourceLab}`,
          data,
          backgroundColor: 'rgba(255, 107, 53, 0.18)',
          borderColor: '#ff6b35',
          borderWidth: 3,
          pointBackgroundColor: '#1b3a63',
          pointRadius: 5
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: {
          r: {
            min: 0, max: 3,
            ticks: {
              stepSize: 1,
              callback: (v) => source === 'ccf' ? (['NA','EC','A','PA'][v] || v) : (['NA','EC','A','M'][v] || v),
              backdropColor: 'rgba(255,255,255,0.7)'
            },
            pointLabels: { font: { size: 13, weight: 'bold' } }
          }
        },
        plugins: { legend: { position: 'bottom' } }
      }
    });

    /* Détail dispersion par compétence */
    const detail = document.getElementById('radar-classe-detail');
    detail.innerHTML = `
      <h4>Dispersion par compétence (combien d'élèves à chaque niveau)</h4>
      <table class="radarx-disp-table">
        <thead><tr><th>Comp.</th><th>Libellé</th><th class="lvl-na">NA</th><th class="lvl-ec">EC</th><th class="lvl-a">A</th><th class="lvl-pa">${source === 'ccf' ? 'PA' : 'M'}</th><th>Moy.</th></tr></thead>
        <tbody>
          ${compsKeys.map(c => {
            const s = compStats[c];
            const m = s.count > 0 ? s.sum / s.count : null;
            const moyenneTxt = m == null ? '—' : m.toFixed(2);
            return `<tr>
              <td><strong>${c}</strong></td>
              <td>${escapeHtml(bareme.competences[c])}</td>
              <td class="num lvl-na">${s.byLevel[0]}</td>
              <td class="num lvl-ec">${s.byLevel[1]}</td>
              <td class="num lvl-a">${s.byLevel[2]}</td>
              <td class="num lvl-pa">${s.byLevel[3]}</td>
              <td class="num"><strong>${moyenneTxt}</strong></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    `;
  }

  function escapeHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function onShownFormatif() {
    if (!bareme) initFormatif();
    else { initFormatif(); }
  }
  function onShownClasse() {
    if (!bareme) initClasse();
    else { initClasse(); }
  }

  ['correspondance-loaded', 'sync-merged'].forEach(ev => {
    document.addEventListener(ev, () => {
      if (document.getElementById('radar-formatif-eleve')) initFormatif();
      if (document.getElementById('radar-classe-canvas')) initClasse();
    });
  });

  /** Ouvre le radar formatif avec un élève pré-sélectionné — appelé par les mini-radars. */
  function openWithEleveFormatif(pseudo) {
    selectedFormatifEleve = pseudo;
    if (window.Layout && Layout.switchPole) {
      Layout.switchPole('evaluer');
      setTimeout(() => {
        const sub = document.getElementById('sub-tabs');
        const btn = sub && sub.querySelector('button[data-view="radar-formatif"]');
        if (btn) btn.click();
      }, 100);
    }
  }

  window.RadarFormatif = { init: initFormatif, onShown: onShownFormatif, openWithEleve: openWithEleveFormatif };
  window.RadarClasse   = { init: initClasse,   onShown: onShownClasse };
})();
