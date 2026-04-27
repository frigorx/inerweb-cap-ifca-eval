/* distribute-modal.js — modale de distribution d'un TP à plusieurs élèves
   Ouverte par le bouton "📤 Distribuer un TP" de la vue d'ensemble.
   3 étapes sur 1 écran : 1) choix TP · 2) cocher élèves · 3) distribuer */

(function() {
  'use strict';

  let elevesList = null;

  async function open() {
    const bib = await Affectations.biblio();
    if (!elevesList) {
      const j = await Catalog.load('eleves_pseudo.json');
      elevesList = (j && j.eleves) || [];
    }
    if (window.Correspondance && Correspondance.load) await Correspondance.load();
    render(bib);
  }

  function render(bib) {
    closeIfOpen();
    const corrOk = window.Correspondance && Correspondance.available();
    const tpsOptions = bib.tps.map(t => `
      <label class="dist-tp-row" data-tp="${t.id}">
        <input type="radio" name="dist-tp" value="${t.id}" />
        <span class="dist-tp-id">${t.id}</span>
        <span class="dist-tp-tit">${escapeHtml(t.titre)}</span>
        <span class="dist-tp-meta">${t.semaine} · ${t.date} · ${escapeHtml(t.duree)}</span>
      </label>
    `).join('');

    const elevesRows = elevesList.map(e => {
      const realName = corrOk ? Correspondance.label(e.pseudo) : e.pseudo;
      const display = realName === e.pseudo ? e.pseudo : `${realName}`;
      const sub = realName !== e.pseudo ? e.pseudo : '';
      return `
        <label class="dist-eleve-row">
          <input type="checkbox" name="dist-eleve" value="${e.pseudo}" />
          <span class="dist-eleve-name">${escapeHtml(display)}</span>
          ${sub ? `<span class="dist-eleve-sub">${escapeHtml(sub)}</span>` : ''}
        </label>
      `;
    }).join('');

    const overlay = document.createElement('div');
    overlay.id = 'dist-overlay';
    overlay.className = 'dist-overlay';
    overlay.innerHTML = `
      <div class="dist-modal">
        <header>
          <h2>📤 Distribuer un TP</h2>
          <button class="btn-x" id="dist-close" title="Fermer">×</button>
        </header>

        <section class="dist-step">
          <h3>① Choisir le TP à distribuer</h3>
          <div class="dist-tp-list">${tpsOptions}</div>
        </section>

        <section class="dist-step">
          <h3>② Choisir les élèves <span id="dist-eleves-count">0 sélectionné(s)</span></h3>
          <div class="dist-eleves-actions">
            <button class="btn small ghost" id="dist-all">☑ Tous</button>
            <button class="btn small ghost" id="dist-none">☐ Aucun</button>
          </div>
          <div class="dist-eleves-grid">${elevesRows}</div>
        </section>

        <footer class="dist-footer">
          <span id="dist-summary">Sélectionne un TP et au moins un élève.</span>
          <button class="btn orange" id="dist-go" disabled>📤 Distribuer</button>
        </footer>
      </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById('dist-close').onclick = closeIfOpen;
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeIfOpen(); });

    document.getElementById('dist-all').onclick = () => {
      overlay.querySelectorAll('input[name="dist-eleve"]').forEach(c => c.checked = true);
      refreshSummary();
    };
    document.getElementById('dist-none').onclick = () => {
      overlay.querySelectorAll('input[name="dist-eleve"]').forEach(c => c.checked = false);
      refreshSummary();
    };
    overlay.querySelectorAll('input[name="dist-tp"], input[name="dist-eleve"]').forEach(i => {
      i.addEventListener('change', refreshSummary);
    });

    document.getElementById('dist-go').onclick = () => {
      const tpId = (overlay.querySelector('input[name="dist-tp"]:checked') || {}).value;
      const sel = Array.from(overlay.querySelectorAll('input[name="dist-eleve"]:checked')).map(c => c.value);
      if (!tpId || sel.length === 0) return;
      const prof = Store.get('prof.current') || '';
      Affectations.distribute(sel, tpId, prof);
      window.toast && window.toast(`✅ TP ${tpId} distribué à ${sel.length} élève${sel.length>1?'s':''}`, 'success');
      closeIfOpen();
      /* Refresh la vue d'ensemble */
      if (window.ClasseOverview && ClasseOverview.onShown) ClasseOverview.onShown();
    };
  }

  function refreshSummary() {
    const overlay = document.getElementById('dist-overlay');
    if (!overlay) return;
    const tp = overlay.querySelector('input[name="dist-tp"]:checked');
    const eleves = overlay.querySelectorAll('input[name="dist-eleve"]:checked');
    const cnt = eleves.length;
    const elCnt = document.getElementById('dist-eleves-count');
    if (elCnt) elCnt.textContent = `${cnt} sélectionné${cnt>1?'s':''}`;
    const sum = document.getElementById('dist-summary');
    const btn = document.getElementById('dist-go');
    if (tp && cnt > 0) {
      const tpId = tp.value;
      sum.innerHTML = `Distribuer <strong>${tpId}</strong> à <strong>${cnt}</strong> élève${cnt>1?'s':''}`;
      btn.disabled = false;
    } else {
      sum.textContent = !tp ? 'Choisis un TP.' : 'Coche au moins un élève.';
      btn.disabled = true;
    }
  }

  function closeIfOpen() {
    const el = document.getElementById('dist-overlay');
    if (el) el.remove();
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  window.DistributeModal = { open };
})();
