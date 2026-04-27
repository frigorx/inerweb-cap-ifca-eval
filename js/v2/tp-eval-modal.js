/* tp-eval-modal.js — modale d'évaluation FORMATIVE d'un TP
   Modes :
     open(tpId, pseudo)             → 1 élève × 1 TP (rapide)
     openBatch(tpId, [pseudos])     → mode batch : naviguer entre élèves
*/

(function() {
  'use strict';

  let bib = null;
  let bareme = null;
  let mode = 'single';      /* 'single' ou 'batch' */
  let batchList = [];
  let batchIndex = 0;
  let currentTpId = null;
  let currentPseudo = null;
  let currentDraft = null;

  async function ensureLoaded() {
    if (!bib && window.Affectations) bib = await Affectations.biblio();
    if (!bareme && window.CCF) bareme = await CCF.load('ep3'); /* pour libellés compétences */
  }

  async function open(tpId, pseudo) {
    await ensureLoaded();
    mode = 'single';
    batchList = [pseudo];
    batchIndex = 0;
    currentTpId = tpId;
    render();
  }

  async function openBatch(tpId, pseudos) {
    await ensureLoaded();
    if (!pseudos || pseudos.length === 0) return;
    mode = 'batch';
    batchList = pseudos.slice();
    batchIndex = 0;
    currentTpId = tpId;
    render();
  }

  function render() {
    closeIfOpen();
    currentPseudo = batchList[batchIndex];
    if (!currentPseudo) return close();

    const tpMeta = (bib && bib.tps.find(t => t.id === currentTpId)) || { id: currentTpId, titre: '?', comp: [] };
    const corrOk = window.Correspondance && Correspondance.available();
    const realName = corrOk ? Correspondance.label(currentPseudo) : currentPseudo;
    const display = realName === currentPseudo ? currentPseudo : `${realName} (${currentPseudo})`;
    const compsList = (tpMeta.comp || []);

    /* Charger draft existant ou nouveau */
    const stored = TPEval.get(currentPseudo, currentTpId);
    currentDraft = {
      comp: Object.assign({}, stored ? stored.comp : {}),
      commentaire: stored ? (stored.commentaire || '') : '',
      date: stored ? stored.date : new Date().toISOString().slice(0, 10)
    };

    const overlay = document.createElement('div');
    overlay.id = 'tpeval-overlay';
    overlay.className = 'tpeval-overlay';
    overlay.innerHTML = `
      <div class="tpeval-card">
        <header>
          <div class="tpeval-hdr-left">
            <span class="tpeval-tp-id">${escapeHtml(tpMeta.id)}</span>
            <h2>${escapeHtml(tpMeta.titre)}</h2>
          </div>
          ${mode === 'batch' ? `
            <div class="tpeval-batch-progress">
              Élève ${batchIndex + 1} / ${batchList.length}
            </div>
          ` : ''}
          <button class="btn-x" id="tpeval-close" title="Fermer">×</button>
        </header>

        <div class="tpeval-eleve">
          <span class="tpeval-eleve-pic">👤</span>
          <strong>${escapeHtml(display)}</strong>
          ${stored ? `<span class="tpeval-tag-existing">✏ déjà évalué</span>` : ''}
        </div>

        <div class="tpeval-body">
          <h3>Compétences mobilisées par ce TP</h3>
          ${compsList.length === 0 ? `<p class="tpeval-empty">⚠ Pas de compétences mappées pour ce TP. Ajoute-les dans data/tp_biblio.json.</p>` :
            compsList.map(c => renderCompRow(c)).join('')}

          <h3>Commentaire libre <span class="tpeval-opt">(optionnel)</span></h3>
          <textarea id="tpeval-commentaire" rows="2" placeholder="Observation, encouragement, point à retravailler...">${escapeHtml(currentDraft.commentaire)}</textarea>

          <div class="tpeval-meta">
            <label>📅 Date de l'évaluation
              <input type="date" id="tpeval-date" value="${currentDraft.date}" />
            </label>
          </div>
        </div>

        <footer class="tpeval-footer">
          ${mode === 'batch' ? `
            <button class="btn small ghost" id="tpeval-prev" ${batchIndex === 0 ? 'disabled' : ''}>← Précédent</button>
          ` : `
            <button class="btn small ghost" id="tpeval-cancel">Annuler</button>
          `}
          <span id="tpeval-summary">${renderSummary()}</span>
          <button class="btn orange" id="tpeval-save">
            ${mode === 'batch' && batchIndex < batchList.length - 1 ? '💾 Enregistrer + Suivant →' : '💾 Enregistrer + Fermer'}
          </button>
        </footer>
      </div>
    `;
    document.body.appendChild(overlay);

    /* Listeners */
    document.getElementById('tpeval-close').onclick = close;
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

    overlay.querySelectorAll('.tpeval-niv-btn').forEach(b => {
      b.onclick = () => {
        const c = b.dataset.comp;
        const lvl = b.dataset.niveau;
        if (currentDraft.comp[c] === lvl) {
          delete currentDraft.comp[c];
        } else {
          currentDraft.comp[c] = lvl;
        }
        markCompBtns();
        document.getElementById('tpeval-summary').innerHTML = renderSummary();
      };
    });

    document.getElementById('tpeval-commentaire').oninput = (e) => {
      currentDraft.commentaire = e.target.value;
    };
    document.getElementById('tpeval-date').onchange = (e) => {
      currentDraft.date = e.target.value;
    };

    document.getElementById('tpeval-save').onclick = () => {
      saveCurrent();
      if (mode === 'batch' && batchIndex < batchList.length - 1) {
        batchIndex++;
        render(); /* re-render pour l'élève suivant */
      } else {
        window.toast && window.toast(`✅ Évaluation enregistrée${mode === 'batch' ? ' (' + batchList.length + ' élèves)' : ''}`, 'success');
        close();
        /* Refresh écrans */
        if (window.ClasseOverview && ClasseOverview.render) ClasseOverview.render();
        if (window.Calendrier && Calendrier.render) Calendrier.render();
      }
    };

    if (mode === 'batch') {
      const prev = document.getElementById('tpeval-prev');
      if (prev) prev.onclick = () => {
        saveCurrent(false);
        if (batchIndex > 0) { batchIndex--; render(); }
      };
    } else {
      const cancel = document.getElementById('tpeval-cancel');
      if (cancel) cancel.onclick = close;
    }

    markCompBtns();
  }

  function renderCompRow(c) {
    const label = (bareme && bareme.competences && bareme.competences[c]) || c;
    return `
      <div class="tpeval-comp-row" data-comp="${c}">
        <div class="tpeval-comp-info">
          <span class="tpeval-comp-id">${c}</span>
          <span class="tpeval-comp-label">${escapeHtml(label)}</span>
        </div>
        <div class="tpeval-niv-row">
          ${TPEval.NIVEAUX.map(n => `
            <button class="tpeval-niv-btn" data-comp="${c}" data-niveau="${n.code}" style="--col:${n.couleur}" title="${n.label}">${n.code}</button>
          `).join('')}
        </div>
      </div>
    `;
  }

  function markCompBtns() {
    document.querySelectorAll('.tpeval-niv-btn').forEach(b => {
      const c = b.dataset.comp;
      const lvl = b.dataset.niveau;
      b.classList.toggle('selected', currentDraft.comp[c] === lvl);
    });
  }

  function renderSummary() {
    const cnt = Object.keys(currentDraft.comp).length;
    return `<strong>${cnt}</strong> compétence${cnt > 1 ? 's' : ''} notée${cnt > 1 ? 's' : ''}`;
  }

  function saveCurrent(toast) {
    if (!currentPseudo || !currentTpId) return;
    if (Object.keys(currentDraft.comp).length === 0 && !currentDraft.commentaire) {
      /* Rien saisi → ne rien sauvegarder pour ne pas créer de doublon vide */
      return;
    }
    TPEval.set(currentPseudo, currentTpId, {
      comp: currentDraft.comp,
      commentaire: currentDraft.commentaire,
      date: currentDraft.date
    });
  }

  function closeIfOpen() {
    const o = document.getElementById('tpeval-overlay');
    if (o) o.remove();
  }
  function close() { closeIfOpen(); }

  function escapeHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  window.TPEvalModal = { open, openBatch };
})();
