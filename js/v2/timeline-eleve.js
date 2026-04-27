/* timeline-eleve.js — modale historique d'un élève
   Liste chronologique : TP distribués/faits + CCF saisi + dates */

(function() {
  'use strict';

  let agenda = null;
  let bib = null;

  async function ensureLoaded() {
    if (!agenda) agenda = await Catalog.load('agenda_classe.json');
    if (!bib && window.Affectations) bib = await Affectations.biblio();
  }

  async function open(pseudo) {
    await ensureLoaded();
    if (window.Correspondance && Correspondance.load) await Correspondance.load();
    const corrOk = window.Correspondance && Correspondance.available();
    const realName = corrOk ? Correspondance.label(pseudo) : pseudo;
    const display = realName === pseudo ? pseudo : `${realName} (${pseudo})`;

    /* Affectations triées par date d'exécution */
    const affects = (window.Affectations ? Affectations.byEleve(pseudo) : []).slice();
    affects.sort((a, b) => (a.dateExecution || '').localeCompare(b.dateExecution || ''));

    /* CCF EP3 */
    const ccfStored = window.CCF ? CCF.get('ep3', pseudo) : null;
    let ccfLine = '';
    if (ccfStored && Object.keys(ccfStored.saisie || {}).length > 0) {
      const bareme = window._ccfBaremeCache;
      let noteStr = '—';
      let count = Object.keys(ccfStored.saisie).length;
      if (bareme) {
        const r = CCF.compute(bareme, ccfStored.saisie);
        noteStr = r.note20.toFixed(1).replace('.', ',');
      }
      const dt = ccfStored.updatedAt ? new Date(ccfStored.updatedAt).toLocaleDateString('fr-FR') : '';
      ccfLine = `
        <div class="tl-row tl-ccf">
          <div class="tl-date">${dt}</div>
          <div class="tl-bullet" style="background:#1b3a63">📝</div>
          <div class="tl-content">
            <strong>CCF EP3</strong> — note <strong style="color:${noteStr === '—' ? '#888' : '#1b3a63'}">${noteStr}/20</strong> · ${count} tâche${count>1?'s':''} notée${count>1?'s':''}
          </div>
        </div>`;
    }

    /* Séances futures où l'élève va faire un TP (pas encore distribué) */
    const today = new Date().toISOString().slice(0, 10);
    const aVenir = (agenda ? agenda.seances : []).filter(s => s.date >= today && (s.tps || []).length > 0);
    const tpsAvenir = aVenir.flatMap(s => (s.tps || []).map(tp => ({
      seanceId: s.id, date: s.date, jour: s.jour, tpId: tp, objectif: s.objectif
    }))).filter(item => !affects.some(a => a.tpId === item.tpId));

    /* Render */
    const overlay = document.createElement('div');
    overlay.id = 'tl-overlay';
    overlay.className = 'tl-overlay';
    overlay.innerHTML = `
      <div class="tl-card">
        <header>
          <h2>📜 Historique de ${escapeHtml(display)}</h2>
          <button class="btn-x" id="tl-close" title="Fermer">×</button>
        </header>

        <div class="tl-body">
          <h3 class="tl-section-title">📥 TP distribués <span class="tl-count">${affects.length}</span></h3>
          ${affects.length === 0 ? '<p class="tl-empty">Aucun TP distribué pour cet élève pour l\'instant.</p>' :
            affects.map(a => renderAffect(a)).join('')}

          ${ccfLine ? `<h3 class="tl-section-title">📝 CCF EP3</h3>${ccfLine}` : ''}

          ${tpsAvenir.length > 0 ? `
            <h3 class="tl-section-title">🔮 TP prévus à venir <span class="tl-count">${tpsAvenir.length}</span></h3>
            ${tpsAvenir.map(t => `
              <div class="tl-row tl-future">
                <div class="tl-date">${frDate(t.date)}<br><span class="tl-jour">${t.jour}</span></div>
                <div class="tl-bullet" style="background:#c5cbd6">🔮</div>
                <div class="tl-content">
                  <strong>${t.tpId}</strong> — ${escapeHtml(t.objectif)}
                  <div class="tl-sub">Sera distribué via la fiche séance du calendrier</div>
                </div>
              </div>
            `).join('')}
          ` : ''}
        </div>

        <footer class="tl-footer">
          <button class="btn small ghost" id="tl-close-foot">Fermer</button>
          <button class="btn orange" id="tl-go-ccf">📝 Aller au CCF de cet élève</button>
        </footer>
      </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById('tl-close').onclick = close;
    document.getElementById('tl-close-foot').onclick = close;
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

    /* Boutons ✍ Noter / ✏ Modifier sur chaque TP */
    overlay.querySelectorAll('.tl-eval-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const p = btn.dataset.pseudo;
        const tp = btn.dataset.tpid;
        if (window.TPEvalModal) {
          close();
          TPEvalModal.open(tp, p);
        }
      };
    });
    document.getElementById('tl-go-ccf').onclick = () => {
      close();
      if (window.Layout && Layout.switchPole) {
        Layout.switchPole('evaluer');
        setTimeout(() => {
          const sub = document.getElementById('sub-tabs');
          const ccfBtn = sub && sub.querySelector('button[data-view="ccf"]');
          if (ccfBtn) ccfBtn.click();
          setTimeout(() => {
            const sel = document.getElementById('ccf-eleve');
            if (sel) { sel.value = pseudo; sel.dispatchEvent(new Event('change')); }
          }, 250);
        }, 100);
      }
    };
  }

  function renderAffect(a) {
    const sm = window.Affectations.statutMeta(a.statut);
    const meta = window.Affectations.tpMeta(a.tpId);
    const dt = a.dateExecution || (a.distribueLe ? a.distribueLe.slice(0, 10) : '');
    const tit = meta ? meta.titre : '';
    /* Évaluation formative existante ? */
    const ev = window.TPEval ? TPEval.get(a.pseudo, a.tpId) : null;
    let evHtml = '';
    if (ev && ev.comp) {
      const niveaux = Object.entries(ev.comp).map(([c, lvl]) => {
        const meta2 = TPEval.NIVEAUX.find(n => n.code === lvl);
        return `<span class="tl-niv" style="background:${meta2 ? meta2.couleur : '#888'}">${c}: ${lvl}</span>`;
      }).join(' ');
      evHtml = `<div class="tl-eval">✍ Noté · ${niveaux}${ev.commentaire ? ` · <em>"${escapeHtml(ev.commentaire)}"</em>` : ''}</div>`;
    }
    const evBtn = `<button class="tl-eval-btn" data-pseudo="${escapeHtml(a.pseudo)}" data-tpid="${a.tpId}" title="${ev ? 'Modifier' : 'Noter'} l'évaluation formative">${ev ? '✏ Modifier' : '✍ Noter'}</button>`;

    return `
      <div class="tl-row tl-affect">
        <div class="tl-date">${frDate(dt)}</div>
        <div class="tl-bullet" style="background:${sm.couleur}">${sm.icone}</div>
        <div class="tl-content">
          <strong>${a.tpId}</strong> — ${escapeHtml(tit)} ${evBtn}
          <div class="tl-sub">Statut : <strong style="color:${sm.couleur}">${sm.label}</strong>${a.distribuePar ? ' · distribué par ' + a.distribuePar : ''}</div>
          ${evHtml}
        </div>
      </div>
    `;
  }

  function close() {
    const o = document.getElementById('tl-overlay');
    if (o) o.remove();
  }

  function frDate(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return d && m && y ? `${d}/${m}/${y}` : iso;
  }
  function escapeHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  window.TimelineEleve = { open };
})();
