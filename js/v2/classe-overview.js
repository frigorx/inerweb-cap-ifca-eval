/* classe-overview.js — vue d'ensemble de la classe : 24 cartes élèves
   Une carte par élève avec : nom, note CCF /20, mini-barres par bloc, alerte couleur.
   Cliquable → bascule sur l'écran CCF avec cet élève pré-sélectionné. */

(function() {
  'use strict';

  let bareme = null;

  async function init() {
    bareme = await CCF.load('ep3');
    if (window.Correspondance && Correspondance.load) await Correspondance.load();
    render();
  }

  function eleves() {
    const out = [];
    for (let i = 1; i <= 24; i++) {
      const id = 'E' + String(i).padStart(2, '0');
      const lab = (window.Correspondance && Correspondance.available()) ? Correspondance.label(id) : id;
      out.push({ idCloud: id, label: lab !== id ? lab : id, anonyme: lab === id });
    }
    return out;
  }

  function noteColor(n) {
    if (n == null) return '#bbb';
    if (n < 10)  return '#c53030';
    if (n < 14)  return '#dd6b20';
    return '#38a169';
  }

  function render() {
    const root = document.getElementById('classe-overview-root');
    if (!root) return;
    if (!bareme) { root.innerHTML = '<p class="ccf-empty">Chargement…</p>'; return; }

    const list = eleves();
    const totTaches = bareme.blocs.reduce((s, b) => s + b.taches.length, 0);

    /* Stats globales classe */
    const allEvals = CCF.allEvals('ep3');
    const evalues = allEvals.length;
    const moyenne = evalues > 0
      ? (allEvals.reduce((s, e) => s + CCF.compute(bareme, e.saisie).note20, 0) / evalues)
      : null;

    root.innerHTML = `
      <div class="overview-stats">
        <div class="stat-card">
          <div class="stat-lab">Élèves classe</div>
          <div class="stat-big">${list.length}</div>
        </div>
        <div class="stat-card">
          <div class="stat-lab">CCF EP3 saisis</div>
          <div class="stat-big">${evalues} / ${list.length}</div>
        </div>
        <div class="stat-card">
          <div class="stat-lab">Moyenne classe</div>
          <div class="stat-big" style="color:${noteColor(moyenne)}">${moyenne != null ? moyenne.toFixed(1).replace('.', ',') : '—'}</div>
          <div class="stat-sur">/ 20</div>
        </div>
        <div class="stat-card">
          <div class="stat-lab">Tâches au barème</div>
          <div class="stat-big">${totTaches}</div>
          <div class="stat-sur">EP3 24/25</div>
        </div>
      </div>

      ${list.some(e => e.anonyme) ? `
      <div class="overview-rgpd-warn">
        🔓 <strong>Mode pseudonymes actif</strong> — tu vois les codes M01..M24.
        <button class="btn small orange" id="ov-unlock">🔓 Saisir le mot de passe pour voir les vrais noms</button>
      </div>` : ''}

      <h3 class="overview-h3">📋 Vue d'ensemble — ${list.length} élèves de la classe</h3>
      <div class="eleves-grid">
        ${list.map(e => renderCard(e)).join('')}
      </div>
    `;

    /* Click handlers : carte → bascule CCF avec élève pré-sélectionné */
    root.querySelectorAll('.eleve-card').forEach(card => {
      card.onclick = () => {
        const id = card.dataset.id;
        if (window.Layout && Layout.switchPole) {
          Layout.switchPole('evaluer');
          /* attendre le rendu et activer le sous-onglet CCF + sélectionner l'élève */
          setTimeout(() => {
            const sub = document.getElementById('sub-tabs');
            const ccfBtn = sub && sub.querySelector('button[data-view="ccf"]');
            if (ccfBtn) ccfBtn.click();
            setTimeout(() => {
              const sel = document.getElementById('ccf-eleve');
              if (sel) {
                sel.value = id;
                sel.dispatchEvent(new Event('change'));
              }
            }, 250);
          }, 100);
        }
      };
    });

    const ovUnlock = document.getElementById('ov-unlock');
    if (ovUnlock) ovUnlock.onclick = promptUnlock;
  }

  function renderCard(e) {
    const stored = CCF.get('ep3', e.idCloud);
    const saisie = (stored && stored.saisie) || {};
    const r = CCF.compute(bareme, saisie);
    const tachesFaites = Object.keys(saisie).length;
    const tachesTot = bareme.blocs.reduce((s, b) => s + b.taches.length, 0);
    const evalue = tachesFaites > 0;
    const note = evalue ? r.note20 : null;
    const col = noteColor(note);

    const blocsBars = bareme.blocs.map(b => {
      const pts = r.pointsParBloc[b.code] || 0;
      const pct = Math.round((pts / b.max) * 100);
      return `
        <div class="bloc-bar" title="Bloc ${b.code} — ${b.label} : ${pts}/${b.max} pts">
          <span class="bloc-bar-lab" style="color:${b.couleur}">${b.code}</span>
          <span class="bloc-bar-track"><span class="bloc-bar-fill" style="width:${pct}%;background:${b.couleur}"></span></span>
          <span class="bloc-bar-val">${pts}/${b.max}</span>
        </div>`;
    }).join('');

    const statusTag = evalue
      ? `<span class="card-status done" style="background:${col}">${note.toFixed(1).replace('.', ',')} / 20</span>`
      : `<span class="card-status todo">à évaluer</span>`;

    return `
      <div class="eleve-card ${evalue ? 'evalue' : 'pending'}" data-id="${e.idCloud}" title="Cliquer pour saisir / modifier la CCF EP3">
        <header class="eleve-card-hdr">
          <span class="eleve-id">${e.idCloud}</span>
          ${statusTag}
        </header>
        <div class="eleve-name">${escapeHtml(e.label)}</div>
        <div class="eleve-progress">
          <span class="lab">Tâches notées</span>
          <span class="val">${tachesFaites} / ${tachesTot}</span>
        </div>
        <div class="eleve-blocs">${blocsBars}</div>
      </div>
    `;
  }

  function promptUnlock() {
    const pwd = prompt('Mot de passe pédagogique pour déverrouiller les noms :');
    if (!pwd) return;
    Correspondance.unlock(pwd).then(() => {
      window.toast && window.toast('✅ 24 élèves déchiffrés', 'success');
      render(); /* rerender avec les vrais noms */
      /* refresh les autres écrans qui affichent des noms */
      if (window.CCFUI && CCFUI.onShown) CCFUI.onShown();
      if (window.CCFRadar && CCFRadar.onShown) CCFRadar.onShown();
      /* refresh bandeau */
      const status = document.getElementById('prof-banner-status');
      if (status) status.textContent = '🔒 Profil OK · 🔒 24 élèves déchiffrés';
    }).catch(e => {
      window.toast && window.toast('❌ Mot de passe incorrect', 'error');
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function onShown() {
    if (!bareme) init();
    else render();
  }

  window.ClasseOverview = { init, onShown, render };
})();
