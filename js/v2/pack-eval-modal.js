/* pack-eval-modal.js — modale d'évaluation numérique pour un pack de séance.
   Le prof saisit niveaux par item du barème intégré au pack.
   Sauvegarde :
   - localStorage clé `packeval.{packId}.{pseudo}` (saisie complète)
   - Push Sheet via inerwebResults (Module: PACK-EVAL)
   - Alimente TPEval automatiquement sur la compétence comp_alimente du pack
   - Note finale sur 20 (réglée selon total_max)
*/

(function() {
  'use strict';

  let pack = null;
  let elevesList = null;
  let currentPseudo = null;
  let saisie = {};

  const NIVEAUX = [
    { code: 'NA', label: 'Non acquis',         couleur: '#c53030', idx: 0 },
    { code: 'EC', label: 'En cours',           couleur: '#dd6b20', idx: 1 },
    { code: 'A',  label: 'Acquis',             couleur: '#38a169', idx: 2 },
    { code: 'PA', label: 'Parfaitement acquis', couleur: '#1b3a63', idx: 3 }
  ];

  async function open(p) {
    pack = p;
    if (!elevesList) {
      const j = await Catalog.load('eleves_pseudo.json');
      elevesList = (j && j.eleves) || [];
    }
    if (window.Correspondance && Correspondance.load) await Correspondance.load();
    currentPseudo = null;
    saisie = {};
    render();
  }

  function render() {
    closeIfOpen();
    if (!pack) return;
    const corrOk = window.Correspondance && Correspondance.available();
    const eleveOpts = elevesList.map(e => {
      const real = corrOk ? Correspondance.label(e.pseudo) : e.pseudo;
      return `<option value="${e.pseudo}">${escapeHtml(real === e.pseudo ? e.pseudo : real + ' (' + e.pseudo + ')')}</option>`;
    }).join('');

    const overlay = document.createElement('div');
    overlay.id = 'packeval-overlay';
    overlay.className = 'packeval-overlay';
    overlay.innerHTML = `
      <div class="packeval-card">
        <header style="background:linear-gradient(135deg,${pack.couleur} 0%, ${pack.couleur}dd 100%);">
          <span class="packeval-ico">${pack.icone || '✍'}</span>
          <div>
            <h2>${escapeHtml(pack.titre)}</h2>
            <p>Évaluation numérique · ${pack.evaluation_numerique.items.length} questions · /${pack.evaluation_numerique.total_max} pts</p>
          </div>
          <button class="btn-x" id="packeval-close">×</button>
        </header>

        <div class="packeval-pick">
          <label>Élève évalué</label>
          <select id="packeval-eleve">
            <option value="">— Choisir un élève —</option>
            ${eleveOpts}
          </select>
        </div>

        <div class="packeval-noteband" id="packeval-noteband">
          <span class="big" id="packeval-note">—</span><span class="sur">/ 20</span>
          <span class="brut" id="packeval-brut">— pts bruts / ${pack.evaluation_numerique.total_max}</span>
        </div>

        <div class="packeval-grille" id="packeval-grille">
          <p class="packeval-pick-msg">↑ Choisis un élève pour démarrer la saisie.</p>
        </div>

        <footer class="packeval-footer">
          <button class="btn small ghost" id="packeval-reset">↺ Effacer</button>
          <span id="packeval-status"></span>
          <button class="btn orange" id="packeval-save">💾 Enregistrer</button>
        </footer>
      </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById('packeval-close').onclick = closeIfOpen;
    overlay.addEventListener('click', e => { if (e.target === overlay) closeIfOpen(); });

    document.getElementById('packeval-eleve').onchange = (e) => switchEleve(e.target.value);
    document.getElementById('packeval-reset').onclick = resetSaisie;
    document.getElementById('packeval-save').onclick = save;
  }

  function switchEleve(pseudo) {
    currentPseudo = pseudo || null;
    saisie = {};
    if (currentPseudo) {
      const stored = Store.get(`packeval.${pack.id}.${currentPseudo}`);
      if (stored && stored.saisie) saisie = stored.saisie;
    }
    renderGrille();
    refreshNote();
  }

  function renderGrille() {
    const root = document.getElementById('packeval-grille');
    if (!root) return;
    if (!currentPseudo) {
      root.innerHTML = '<p class="packeval-pick-msg">↑ Choisis un élève pour démarrer la saisie.</p>';
      return;
    }
    root.innerHTML = pack.evaluation_numerique.items.map(it => `
      <div class="packeval-item">
        <div class="packeval-item-info">
          <span class="packeval-item-id">${escapeHtml(it.id)}</span>
          <span class="packeval-item-titre">${escapeHtml(it.intitule)}</span>
          <span class="packeval-item-max">/${it.max}</span>
        </div>
        <div class="packeval-niv-row">
          ${NIVEAUX.map((n, i) => `
            <button class="packeval-niv-btn ${saisie[it.id] === n.code ? 'selected' : ''}"
                    data-item="${it.id}" data-niv="${n.code}" data-pts="${it.niveaux[i]}"
                    style="--c:${n.couleur}"
                    title="${n.label} — ${it.niveaux[i]} pts">
              ${n.code}<small>${it.niveaux[i]}</small>
            </button>
          `).join('')}
        </div>
      </div>
    `).join('');

    root.querySelectorAll('.packeval-niv-btn').forEach(b => {
      b.onclick = () => {
        const id = b.dataset.item;
        const niv = b.dataset.niv;
        if (saisie[id] === niv) delete saisie[id];
        else saisie[id] = niv;
        renderGrille();
        refreshNote();
      };
    });
  }

  function compute() {
    const items = pack.evaluation_numerique.items;
    let totalBrut = 0;
    items.forEach(it => {
      const niv = saisie[it.id];
      if (!niv) return;
      const idx = NIVEAUX.findIndex(n => n.code === niv);
      if (idx < 0) return;
      totalBrut += it.niveaux[idx] || 0;
    });
    const max = pack.evaluation_numerique.total_max;
    const note20 = max > 0 ? (totalBrut / max) * 20 : 0;
    return { totalBrut, note20: Math.round(note20 * 10) / 10, items };
  }

  function refreshNote() {
    const r = compute();
    const valEl = document.getElementById('packeval-note');
    const brutEl = document.getElementById('packeval-brut');
    if (valEl) valEl.textContent = Object.keys(saisie).length > 0 ? r.note20.toFixed(1).replace('.', ',') : '—';
    if (brutEl) brutEl.textContent = `${r.totalBrut} pts bruts / ${pack.evaluation_numerique.total_max}`;
    /* Couleur selon note */
    if (valEl) {
      valEl.style.color = '#fff';
      const noteband = document.getElementById('packeval-noteband');
      if (noteband) {
        if (Object.keys(saisie).length === 0) noteband.style.background = '#888';
        else if (r.note20 < 10) noteband.style.background = '#c53030';
        else if (r.note20 < 14) noteband.style.background = '#dd6b20';
        else noteband.style.background = '#38a169';
      }
    }
  }

  function save() {
    if (!currentPseudo) { alert('Choisis un élève.'); return; }
    if (Object.keys(saisie).length === 0) { alert('Coche au moins un niveau.'); return; }
    const r = compute();
    const prof = Store.get('prof.current') || '';
    const payload = {
      packId: pack.id,
      pseudo: currentPseudo,
      saisie,
      totalBrut: r.totalBrut,
      note20: r.note20,
      evaluateur: prof,
      updatedAt: new Date().toISOString()
    };
    Store.set(`packeval.${pack.id}.${currentPseudo}`, payload);

    /* Push Sheet */
    if (window.inerwebResults) {
      inerwebResults.write({
        Module: 'PACK-EVAL',
        Pseudo: currentPseudo,
        TpId: pack.id,
        SaisieJSON: JSON.stringify(saisie),
        Note20: r.note20,
        TotalBrut: r.totalBrut,
        Evaluateur: prof,
        UpdatedAt: payload.updatedAt
      }).catch(() => {});
    }

    /* Alimente TPEval sur la compétence ciblée → radar formatif mis à jour */
    if (pack.evaluation_numerique.comp_alimente && window.TPEval) {
      const code = r.note20 < 5 ? 'NA' : r.note20 < 10 ? 'EC' : r.note20 < 15 ? 'A' : 'M';
      const compMap = {};
      compMap[pack.evaluation_numerique.comp_alimente] = code;
      TPEval.set(currentPseudo, pack.id, {
        comp: compMap,
        commentaire: `Auto depuis pack ${pack.id} — note ${r.note20.toFixed(1).replace('.', ',')}/20`,
        date: new Date().toISOString().slice(0, 10),
        evaluateur: prof
      });
    }

    if (window.toast) toast(`✅ ${currentPseudo} : ${r.note20.toFixed(1).replace('.', ',')}/20 enregistré`, 'success');
    setTimeout(closeIfOpen, 600);
    if (window.ClasseOverview && ClasseOverview.render) ClasseOverview.render();
  }

  function resetSaisie() {
    if (!currentPseudo) return;
    if (!confirm('Effacer cette évaluation ?')) return;
    saisie = {};
    Store.remove(`packeval.${pack.id}.${currentPseudo}`);
    renderGrille();
    refreshNote();
  }

  function closeIfOpen() {
    const o = document.getElementById('packeval-overlay');
    if (o) o.remove();
  }

  function escapeHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  window.PackEvalModal = { open };
})();
