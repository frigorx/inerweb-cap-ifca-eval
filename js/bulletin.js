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
    document.getElementById('btn-pdf-bulletin').onclick = exportPDF;
    document.getElementById('btn-pdf-tous').onclick = exportAllPDF;
    document.getElementById('btn-refresh-bulletin').onclick = render;
    render();
  }

  function exportPDF() {
    if (typeof html2pdf === 'undefined') { toast('html2pdf non chargé', 'error'); return; }
    const pseudo = document.getElementById('bulletin-eleve').value;
    const el = document.getElementById('bulletin-content');
    const opt = {
      margin: 12,
      filename: `bulletin_EP3_${pseudo}_${new Date().toISOString().slice(0,10)}.pdf`,
      image: { type: 'jpeg', quality: 0.96 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(el).save();
    toast(`PDF ${pseudo} en téléchargement…`, 'success');
  }

  async function exportAllPDF() {
    if (typeof html2pdf === 'undefined') { toast('html2pdf non chargé', 'error'); return; }
    if (!confirm(`Générer ${_eleves.eleves.length} PDF (un par élève) ? L'opération peut prendre ~1 min.`)) return;
    const sel = document.getElementById('bulletin-eleve');
    for (const e of _eleves.eleves) {
      sel.value = e.pseudo;
      render();
      await new Promise(r => setTimeout(r, 350));
      const opt = {
        margin: 12,
        filename: `bulletin_EP3_${e.pseudo}.pdf`,
        image: { type: 'jpeg', quality: 0.92 },
        html2canvas: { scale: 1.5, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      await html2pdf().set(opt).from(document.getElementById('bulletin-content')).save();
    }
    toast(`✓ ${_eleves.eleves.length} PDF générés`, 'success');
  }

  function fillSelect() {
    const sel = document.getElementById('bulletin-eleve');
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

  function render() {
    if (!_comps) return;
    const pseudo = document.getElementById('bulletin-eleve').value;
    if (!pseudo) return;
    const eleve = _eleves.eleves.find(e => e.pseudo === pseudo);

    /* === Source de vérité : TPEval (évals formatives) + CCF (saisie EP3 finale) === */
    const evals = window.TPEval ? TPEval.byEleve(pseudo) : [];
    const evalsByTp = {};
    evals.forEach(e => { evalsByTp[e.tpId] = e; });
    /* Mapping niveau TPEval (EC) → libellé référentiel (ECA) */
    const mapNiv = n => n === 'EC' ? 'ECA' : (n || '');

    const wrap = document.getElementById('bulletin-content');
    const tps = _tps.filter(t => t.id !== 'TP-056');
    const codes = _comps.axes_radar_ep3;

    /* Helpers locaux */
    function dateTp(tpId) {
      const ev = evalsByTp[tpId];
      if (!ev) return '';
      return ev.date || (ev.updatedAt ? ev.updatedAt.slice(0, 10) : '');
    }
    function niveauCell(tpId, code) {
      const ev = evalsByTp[tpId];
      if (!ev || !ev.comp) return '';
      const lvl = mapNiv(ev.comp[code]);
      return lvl === 'NE' ? '' : lvl;
    }
    function syntheseCode(code) {
      const order = ['NA', 'ECA', 'A', 'M'];
      let max = '';
      tps.forEach(tp => {
        const n = niveauCell(tp.id, code);
        if (n && order.indexOf(n) > order.indexOf(max)) max = n;
      });
      return max;
    }
    function frDateCourt(iso) {
      if (!iso) return '';
      const [y, m, d] = iso.split('-');
      return d && m && y ? `${d}/${m}` : '';
    }

    /* Stats : nb TP évalués + plage de dates */
    const tpsEvalues = tps.filter(t => evalsByTp[t.id]).length;
    const dates = tps.map(t => dateTp(t.id)).filter(Boolean).sort();
    const plage = dates.length > 0
      ? `du ${frDateCourt(dates[0])} au ${frDateCourt(dates[dates.length - 1])}`
      : 'aucune évaluation enregistrée';

    /* Build matrix */
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

      <h4 style="margin-bottom:4px;">Positionnement par compétence × TP</h4>
      <div style="font-size:10pt;color:var(--text-soft);margin-bottom:8px;">${tpsEvalues}/${tps.length} TP évalués · ${plage}</div>
      <div class="bulletin-grid" style="grid-template-columns:90px repeat(${tps.length}, 1fr) 80px;">
        <div class="head">Compétence</div>
        ${tps.map(t => {
          const dt = dateTp(t.id);
          return `<div class="head" title="${t.titre || ''}">${t.id.replace('TP-','')}${dt ? `<div style="font-size:8pt;font-weight:normal;color:#bcd0e6;">${frDateCourt(dt)}</div>` : ''}</div>`;
        }).join('')}
        <div class="head">Synthèse</div>
        ${codes.map(code => {
          const c = _comps.competences.find(x => x.code === code);
          const cells = tps.map(tp => {
            const n = niveauCell(tp.id, code);
            return `<div class="${n ? 'niveau-' + n : ''}">${n || '—'}</div>`;
          }).join('');
          const max = syntheseCode(code);
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
            ${tps.map(t => {
              const ev = evalsByTp[t.id];
              return ev && ev.commentaire ? `<div>· <strong>${t.id}</strong> (${frDateCourt(dateTp(t.id))}) : ${escapeHtml(ev.commentaire)}</div>` : '';
            }).join('') || '<em style="color:var(--text-soft)">Aucun commentaire</em>'}
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
      const map = { NA: 0, EC: 1, ECA: 1, A: 2, M: 3 };
      const data = codes.map(code => {
        const vals = [];
        tps.forEach(tp => {
          const ev = evalsByTp[tp.id];
          if (!ev || !ev.comp) return;
          const lvl = ev.comp[code];
          if (!lvl || lvl === 'NE') return;
          if (map[lvl] !== undefined) vals.push(map[lvl]);
        });
        if (!vals.length) return 0;
        return vals.reduce((a, b) => a + b, 0) / vals.length;
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
