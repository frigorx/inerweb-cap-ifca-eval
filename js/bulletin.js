/* bulletin.js — bulletin EP3 imprimable A4 */

(function() {
  'use strict';

  let _comps = null;
  let _eleves = null;
  let _tps = null;
  let _miniChart = null;

  async function init() {
    _comps = await Catalog.load('competences_ep3.json');
    _eleves = await Catalog.load('eleves_pseudo.json');
    const cat = await Catalog.load('tp_ep3.json');
    if (!_comps || !_eleves || !cat) return;
    _tps = cat.tps;
    fillSelect();
    document.getElementById('bulletin-eleve').onchange = render;
    document.getElementById('btn-print-bulletin').onclick = () => window.print();
    document.getElementById('btn-refresh-bulletin').onclick = render;
    render();
  }

  function fillSelect() {
    const sel = document.getElementById('bulletin-eleve');
    sel.innerHTML = '';
    _eleves.eleves.forEach(e => {
      const o = document.createElement('option');
      o.value = e.pseudo;
      o.textContent = `${e.pseudo} (${e.classe})`;
      sel.appendChild(o);
    });
  }

  function render() {
    if (!_comps) return;
    const pseudo = document.getElementById('bulletin-eleve').value;
    if (!pseudo) return;
    const eleve = _eleves.eleves.find(e => e.pseudo === pseudo);
    const all = inerwebResults.getAllRows();
    const my = all.filter(r => r.Pseudo === pseudo && r.Epreuve === 'EP3');

    const wrap = document.getElementById('bulletin-content');
    const tps = _tps.filter(t => t.id !== 'TP-056');
    const codes = _comps.axes_radar_ep3;

    // Build matrix
    const html = `
      <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid var(--bleu);padding-bottom:12px;margin-bottom:20px;">
        <div>
          <div style="font-family:'Trebuchet MS',sans-serif;font-weight:700;font-size:18pt;color:var(--bleu);">❄ inerWeb <span style="background:#ff6b35;color:#fff;padding:2px 8px;border-radius:4px;font-size:13pt;">Édu</span></div>
          <div style="font-size:11pt;color:var(--text-soft);">par F. Henninot</div>
        </div>
        <div style="text-align:right;">
          <div style="font-family:'Trebuchet MS';font-weight:700;font-size:14pt;color:var(--bleu);">Bulletin EP3 — Mise en service</div>
          <div style="font-size:11pt;">Émis le ${new Date().toLocaleDateString('fr-FR')}</div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">
        <div>
          <h3 style="margin:0;">Élève : ${pseudo}</h3>
          <div style="font-size:12pt;color:var(--text-soft);">${eleve?.classe || ''} · CAP IFCA · 2nde année</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:11pt;font-style:italic;color:var(--text-soft);">Établissement privé · LP Jacques Raynaud · ÉQUATIO</div>
        </div>
      </div>

      <h4 style="margin-bottom:8px;">Positionnement par compétence × TP</h4>
      <div class="bulletin-grid" style="grid-template-columns:90px repeat(${tps.length}, 1fr) 80px;">
        <div class="head">Compétence</div>
        ${tps.map(t => `<div class="head">${t.id.replace('TP-','')}</div>`).join('')}
        <div class="head">Synthèse</div>
        ${codes.map(code => {
          const c = _comps.competences.find(x => x.code === code);
          const cells = tps.map(tp => {
            const r = my.find(x => x.TP === tp.id && x.Code === code);
            const n = r?.Niveau || '';
            return `<div class="${n ? 'niveau-' + n : ''}">${n || '—'}</div>`;
          }).join('');
          // Synthèse = max niveau atteint
          const niveaux = my.filter(r => r.Code === code).map(r => r.Niveau);
          const order = ['NA','ECA','A','M'];
          const max = niveaux.reduce((acc, n) => order.indexOf(n) > order.indexOf(acc) ? n : acc, '');
          return `
            <div style="font-weight:700;text-align:left;padding-left:8px;background:var(--bg-alt);" title="${c?.libelle || ''}">${code}</div>
            ${cells}
            <div class="${max ? 'niveau-' + max : ''}">${max || '—'}</div>`;
        }).join('')}
      </div>

      <div style="margin-top:24px;display:grid;grid-template-columns:240px 1fr;gap:16px;">
        <div>
          <h4 style="margin-bottom:6px;">Radar EP3</h4>
          <canvas id="bulletin-mini" width="240" height="240"></canvas>
        </div>
        <div>
          <h4 style="margin-bottom:6px;">Légende</h4>
          <div style="font-size:11pt;line-height:1.8;">
            <span class="niveau-NA" style="padding:2px 8px;">NA</span> Non acquis &nbsp;
            <span class="niveau-ECA" style="padding:2px 8px;">ECA</span> En cours &nbsp;
            <span class="niveau-A" style="padding:2px 8px;">A</span> Acquis &nbsp;
            <span class="niveau-M" style="padding:2px 8px;">M</span> Maîtrisé
          </div>
          <h4 style="margin-top:14px;margin-bottom:6px;">Commentaires</h4>
          <div style="font-size:11pt;border:1px solid var(--border);padding:8px;border-radius:4px;min-height:80px;background:var(--bg-alt);">
            ${my.filter(r => r.Commentaire).map(r => `<div>· <strong>${r.TP}</strong> : ${escapeHtml(r.Commentaire)}</div>`).join('') || '<em style="color:var(--text-soft)">Aucun commentaire</em>'}
          </div>
        </div>
      </div>

      <div style="margin-top:30px;padding-top:12px;border-top:2px solid var(--bleu);font-size:10pt;color:var(--text-soft);text-align:center;">
        Établissement privé — LP Jacques Raynaud · ÉQUATIO · Outil pédagogique interne · données pseudonymisées (RGPD)
      </div>`;

    wrap.innerHTML = html;

    // Mini radar
    setTimeout(() => {
      const cv = document.getElementById('bulletin-mini');
      if (!cv || typeof Chart === 'undefined') return;
      if (_miniChart) _miniChart.destroy();
      const map = { NA: 0, ECA: 1, A: 2, M: 3 };
      const data = codes.map(code => {
        const rows = my.filter(r => r.Code === code);
        if (!rows.length) return 0;
        const vals = rows.map(r => map[r.Niveau]).filter(v => v !== undefined);
        return vals.reduce((a, b) => a + b, 0) / vals.length || 0;
      });
      _miniChart = new Chart(cv, {
        type: 'radar',
        data: {
          labels: codes,
          datasets: [{
            label: pseudo,
            data,
            backgroundColor: 'rgba(255,107,53,0.25)',
            borderColor: '#ff6b35',
            borderWidth: 2,
            pointBackgroundColor: '#1b3a63'
          }]
        },
        options: {
          responsive: false,
          plugins: { legend: { display: false } },
          scales: { r: { min: 0, max: 3, ticks: { stepSize: 1, display: false } } }
        }
      });
    }, 50);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  window.Bulletin = { init, render };

})();
