/* radar.js — visualisation radar / bar par élève sur compétences EP3 */

(function() {
  'use strict';

  let _chart = null;
  let _comps = null;
  let _eleves = null;

  async function init() {
    const co = await Catalog.load('competences_ep3.json');
    const el = await Catalog.load('eleves_pseudo.json');
    if (!co || !el) return;
    _comps = co;
    _eleves = el;
    fillEleveSelector('radar-eleve');
    document.getElementById('radar-eleve').onchange = render;
    document.getElementById('radar-type').onchange = render;
    document.getElementById('btn-refresh-radar').onclick = render;
    inerwebResults.onUpdate(() => { if (document.getElementById('view-radar').classList.contains('visible')) render(); });
  }

  function fillEleveSelector(id) {
    const sel = document.getElementById(id);
    sel.innerHTML = '';
    _eleves.eleves.forEach(e => {
      const o = document.createElement('option');
      o.value = e.pseudo;
      const nom = window.Correspondance ? Correspondance.label(e.pseudo) : e.pseudo;
      const labelNom = (window.Correspondance && Correspondance.available() && nom !== e.pseudo) ? ` — ${nom}` : '';
      o.textContent = `${e.pseudo}${labelNom} (${e.classe})`;
      sel.appendChild(o);
    });
  }

  function computeScores(pseudo) {
    const axes = _comps.axes_radar_ep3;
    const all = inerwebResults.getAllRows();
    const my = all.filter(r => r.Pseudo === pseudo && r.Epreuve === 'EP3');
    const score = {};
    axes.forEach(c => {
      const rows = my.filter(r => r.Code === c);
      if (rows.length === 0) { score[c] = 0; return; }
      const map = { NA: 0, ECA: 1, A: 2, M: 3 };
      const vals = rows.map(r => map[r.Niveau]).filter(v => v !== undefined);
      score[c] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    });
    return { axes, score };
  }

  function render() {
    if (!_comps) return;
    const pseudo = document.getElementById('radar-eleve').value;
    const type = document.getElementById('radar-type').value;
    const { axes, score } = computeScores(pseudo);

    const canvas = document.getElementById('radar-canvas');
    if (_chart) { _chart.destroy(); _chart = null; }
    if (typeof Chart === 'undefined') return;

    const data = {
      labels: axes.map(c => {
        const co = _comps.competences.find(x => x.code === c);
        return co ? `${c} ${co.libelle.split('(')[0].slice(0, 18)}` : c;
      }),
      datasets: [{
        label: `${pseudo} — EP3`,
        data: axes.map(c => score[c]),
        backgroundColor: type === 'radar' ? 'rgba(255,107,53,0.25)' : 'rgba(27,58,99,0.7)',
        borderColor: '#ff6b35',
        borderWidth: 2,
        pointBackgroundColor: '#1b3a63',
        pointRadius: 5
      }]
    };

    const opts = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { font: { family: 'Trebuchet MS', size: 14 }, color: '#1b3a63' } },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const v = ctx.parsed.r ?? ctx.parsed.y ?? ctx.parsed;
              const labels = ['NA', 'ECA', 'A', 'M'];
              const idx = Math.round(v);
              return `${ctx.dataset.label} : ${v.toFixed(2)} (${labels[idx] || '—'})`;
            }
          }
        }
      },
      scales: type === 'radar'
        ? { r: { min: 0, max: 3, ticks: { stepSize: 1, callback: (v) => ['NA','ECA','A','M'][v] || '' }, pointLabels: { font: { family: 'Calibri', size: 13 } } } }
        : { y: { min: 0, max: 3, ticks: { stepSize: 1, callback: (v) => ['NA','ECA','A','M'][v] || '' } } }
    };

    _chart = new Chart(canvas, { type, data, options: opts });
  }

  window.Radar = { init, render };

})();
