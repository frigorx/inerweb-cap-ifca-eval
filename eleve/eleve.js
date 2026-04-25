/* eleve.js — viewer guidance ultra-simple
   Rendu d'un TP × version (V1/V2) avec progression + checklist + impression A4 */

(function() {
  'use strict';

  let GUIDE = null;
  let _currentTP = null;
  let _currentVersion = null;
  const STORAGE_PREFIX = 'eleve.tp.';

  // === Boot ===
  fetch('../data/eleve_guidance_ep3.json?v=' + Date.now())
    .then(r => r.json())
    .then(d => { GUIDE = d; renderTPGrid(); })
    .catch(e => alert('Erreur chargement données : ' + e));

  function $(id) { return document.getElementById(id); }
  function show(id) {
    ['screen-select', 'screen-version', 'screen-fiche'].forEach(s => $(s).hidden = (s !== id));
  }

  // === Écran 1 : grille des TP ===
  function renderTPGrid() {
    const grid = $('tp-grid');
    grid.innerHTML = '';
    Object.keys(GUIDE.tps).forEach(tpId => {
      const tp = GUIDE.tps[tpId];
      const card = document.createElement('div');
      card.className = 'tp-choice';
      card.innerHTML = `
        <div class="id">${tpId}</div>
        <div class="titre">${tp.titre}</div>
        <div class="meta">⏱ ${Math.round(tp.duree_min/60)}h · ${tp.competences_visees.length} compétences</div>`;
      card.onclick = () => selectTP(tpId);
      grid.appendChild(card);
    });
  }

  function selectTP(tpId) {
    _currentTP = tpId;
    const tp = GUIDE.tps[tpId];
    $('version-tp-titre').textContent = `${tpId} — ${tp.titre}`;
    show('screen-version');
  }

  // === Écran 2 : choix V1 / V2 ===
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.version-bar button');
    if (btn) selectVersion(btn.dataset.v);
  });
  document.addEventListener('DOMContentLoaded', () => {
    $('back-to-select').onclick = () => show('screen-select');
    $('back-from-fiche').onclick = () => show('screen-version');
  });

  function selectVersion(v) {
    _currentVersion = v;
    renderFiche();
    show('screen-fiche');
  }

  // === Écran 3 : fiche détaillée ===
  function renderFiche() {
    const tp = GUIDE.tps[_currentTP];
    const ver = tp[_currentVersion];
    if (!ver) { alert('Version non trouvée'); return; }

    $('fiche-titre').textContent = `${_currentTP} — ${tp.titre}`;
    $('fiche-version-label').textContent = ver.label;
    $('fiche-mission').innerHTML = `<strong>🎯 MA MISSION :</strong> ${escapeHtml(tp.mission)}`;

    // État sauvegardé
    const stateKey = STORAGE_PREFIX + _currentTP + '.' + _currentVersion;
    const state = JSON.parse(localStorage.getItem(stateKey) || '{}');

    // Étapes
    const cont = $('etapes-container');
    cont.innerHTML = '';
    ver.etapes.forEach((etape, idx) => {
      const checks = state[etape.num]?.checks || etape.checklist.map(() => false);
      const div = document.createElement('div');
      div.className = 'etape' + (checks.every(Boolean) ? ' done' : '');
      div.dataset.num = etape.num;

      const checklistHTML = etape.checklist.map((c, i) => `
        <li class="${checks[i] ? 'done' : ''}">
          <input type="checkbox" data-i="${i}" ${checks[i] ? 'checked' : ''} />
          <span>${escapeHtml(c)}</span>
        </li>`).join('');

      const aideHTML = etape.aide ? `
        <details class="aide">
          <summary>j'ai besoin d'aide</summary>
          <div class="aide-content">${escapeHtml(etape.aide)}</div>
        </details>` : '';

      const stopHTML = etape.stop_prof ? `
        <div class="stop-prof">
          STOP — ${escapeHtml(etape.stop_label || 'Le prof doit valider avant de continuer')}
        </div>` : '';

      const dureeHTML = etape.duree ? `<span style="font-size:14pt;color:var(--text-soft);float:right;">⏱ ~${etape.duree} min</span>` : '';

      div.innerHTML = `
        <div>
          <span class="etape-num">${etape.num}</span>
          <span class="etape-titre"><span class="etape-picto">${etape.picto || '📌'}</span>${escapeHtml(etape.titre)}</span>
          ${dureeHTML}
        </div>
        <div class="etape-action">${escapeHtml(etape.action)}</div>
        <ul class="checklist">${checklistHTML}</ul>
        ${aideHTML}
        ${stopHTML}`;

      cont.appendChild(div);
    });

    // Délégation : checkbox
    cont.onchange = (e) => {
      if (e.target.type !== 'checkbox') return;
      const etape = e.target.closest('.etape');
      const num = parseInt(etape.dataset.num, 10);
      const i = parseInt(e.target.dataset.i, 10);
      state[num] = state[num] || { checks: ver.etapes.find(x => x.num === num).checklist.map(() => false) };
      state[num].checks[i] = e.target.checked;
      localStorage.setItem(stateKey, JSON.stringify(state));
      e.target.parentElement.classList.toggle('done', e.target.checked);
      etape.classList.toggle('done', state[num].checks.every(Boolean));
      updateProgress();
    };

    // Défi
    if (ver.defi) {
      $('defi-container').innerHTML = `
        <div class="defi">
          <h3>Défi bonus</h3>
          <p style="font-size:16pt;line-height:1.5;">${escapeHtml(ver.defi)}</p>
        </div>`;
    } else {
      $('defi-container').innerHTML = '';
    }

    // Secours
    if (ver.secours_lien) {
      const ids = ver.secours_lien.match(/ATELIER-[A-Z0-9]+/g) || [];
      const items = ids.map(id => GUIDE.secours[id]).filter(Boolean);
      if (items.length) {
        $('secours-container').innerHTML = `
          <div class="secours">
            <h3>Atelier de secours si tu bloques</h3>
            ${items.map(s => `
              <div style="margin-top:10px;font-size:16pt;">
                <strong style="color:var(--rouge);">${escapeHtml(s.titre)}</strong> — ${s.duree} min<br/>
                <em>Objectif :</em> ${escapeHtml(s.objectif)}
                <ul style="margin:6px 0;padding-left:24px;">${s.etapes.map(e => `<li style="margin:4px 0;">${escapeHtml(e)}</li>`).join('')}</ul>
              </div>`).join('')}
          </div>`;
      } else {
        $('secours-container').innerHTML = '';
      }
    } else {
      $('secours-container').innerHTML = '';
    }

    updateProgress();

    function updateProgress() {
      const total = ver.etapes.reduce((s, e) => s + e.checklist.length, 0);
      const done = ver.etapes.reduce((s, e) => {
        const c = state[e.num]?.checks || [];
        return s + c.filter(Boolean).length;
      }, 0);
      const pct = total ? Math.round(done / total * 100) : 0;
      const fill = $('fill');
      fill.style.width = pct + '%';
      fill.textContent = pct >= 5 ? `${pct}%` : '';
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

})();
