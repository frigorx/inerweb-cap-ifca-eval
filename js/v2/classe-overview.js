/* classe-overview.js — vue d'ensemble de la classe : 24 cartes élèves
   Une carte par élève avec : nom, note CCF /20, mini-barres par bloc, alerte couleur.
   Cliquable → bascule sur l'écran CCF avec cet élève pré-sélectionné. */

(function() {
  'use strict';

  let bareme = null;
  let elevesList = null;
  let biblio = null;

  async function init() {
    bareme = await CCF.load('ep3');
    if (window.Correspondance && Correspondance.load) await Correspondance.load();
    /* Source unique : eleves_pseudo.json (24 vrais pseudos CAP IFCA 2) */
    const j = await Catalog.load('eleves_pseudo.json');
    elevesList = (j && j.eleves) || [];
    /* Catalogue TP pour affichage du TP en cours sur chaque carte */
    if (window.Affectations && Affectations.biblio) biblio = await Affectations.biblio();
    render();
  }

  function eleves() {
    /* Si Correspondance déverrouillée, on renvoie les vrais noms */
    const corrOk = window.Correspondance && Correspondance.available();
    return elevesList.map(e => {
      const pseudo = e.pseudo;
      const realName = corrOk ? Correspondance.label(pseudo) : pseudo;
      const anonyme = realName === pseudo;
      return {
        idCloud: pseudo,           /* clé pour CCF.get/save (pseudo = idCloud côté local) */
        pseudo: pseudo,
        label: anonyme ? pseudo : realName,
        sublabel: anonyme ? '' : pseudo,
        anonyme,
        classe: e.classe || ''
      };
    });
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

    /* Stats distribution TP */
    const allAffect = (window.Affectations && Affectations.list()) || [];
    const tpEnCours = allAffect.filter(a => a.statut === 'encours' || a.statut === 'todo').length;

    root.innerHTML = `
      <div class="overview-stats">
        <div class="stat-card">
          <div class="stat-lab">Élèves classe</div>
          <div class="stat-big">${list.length}</div>
        </div>
        <div class="stat-card">
          <div class="stat-lab">TP distribués</div>
          <div class="stat-big">${tpEnCours}</div>
          <div class="stat-sur">en cours</div>
        </div>
        <div class="stat-card">
          <div class="stat-lab">CCF EP3 saisis</div>
          <div class="stat-big">${evalues} / ${list.length}</div>
        </div>
        <div class="stat-card">
          <div class="stat-lab">Moyenne CCF</div>
          <div class="stat-big" style="color:${noteColor(moyenne)}">${moyenne != null ? moyenne.toFixed(1).replace('.', ',') : '—'}</div>
          <div class="stat-sur">/ 20</div>
        </div>
      </div>

      <div class="overview-actions">
        <button class="btn orange big" id="btn-distribute-tp">📤 Distribuer un TP</button>
        <button class="btn secondary" id="btn-mail-classe" title="Envoyer le bilan complet de la classe à ton mail (pseudonymisé)">📧 Envoyer bilan classe par mail</button>
        <button class="btn secondary" id="btn-export-csv" title="Télécharger un CSV pour import École Directe (anonymisé)">📥 Export CSV (École Directe)</button>
        ${list.some(e => e.anonyme) ? `
          <button class="btn secondary" id="ov-unlock">🔓 Voir les vrais noms</button>` : ''}
      </div>

      <h3 class="overview-h3">📋 Vue d'ensemble — ${list.length} élèves de la classe</h3>
      <div class="eleves-grid">
        ${list.map(e => renderCard(e)).join('')}
      </div>
    `;

    /* Mini-radar : clic = ouvre la grande toile (Radar formatif par défaut) */
    root.querySelectorAll('.eleve-card-radar').forEach(zone => {
      zone.onclick = (e) => {
        e.stopPropagation();
        const pseudo = zone.dataset.pseudo;
        if (window.CCFRadar && CCFRadar.openWithEleve) {
          CCFRadar.openWithEleve(pseudo);
        } else if (window.RadarFormatif && RadarFormatif.openWithEleve) {
          RadarFormatif.openWithEleve(pseudo);
        }
      };
    });

    /* Bouton historique 📜 — ouvre la timeline */
    root.querySelectorAll('.eleve-history-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const pseudo = btn.dataset.pseudo;
        if (window.TimelineEleve && TimelineEleve.open) TimelineEleve.open(pseudo);
      };
    });

    /* Click handlers : carte → bascule CCF avec élève pré-sélectionné.
       Clic simple sur badge TP → cycle de statut (todo→encours→fait→validé→todo...)
       Double-clic sur badge TP → ouvre la modale d'évaluation formative */
    root.querySelectorAll('.eleve-tp-badge').forEach(badge => {
      badge.onclick = (e) => {
        e.stopPropagation();
        const pseudo = badge.dataset.pseudo;
        const tpId = badge.dataset.tpid;
        const cur = Affectations.get(pseudo, tpId);
        if (!cur) return;
        const cycle = ['todo', 'encours', 'fait', 'valide'];
        const idx = cycle.indexOf(cur.statut);
        const next = cycle[(idx + 1) % cycle.length];
        Affectations.set(pseudo, tpId, { statut: next });
        const meta = Affectations.statutMeta(next);
        window.toast && window.toast(`${meta.icone} ${tpId} : ${meta.label}`, 'success');
        render();
      };
      badge.ondblclick = (e) => {
        e.stopPropagation();
        const pseudo = badge.dataset.pseudo;
        const tpId = badge.dataset.tpid;
        if (window.TPEvalModal) TPEvalModal.open(tpId, pseudo);
      };
    });

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

    const btnDist = document.getElementById('btn-distribute-tp');
    if (btnDist) btnDist.onclick = () => {
      if (window.DistributeModal && DistributeModal.open) DistributeModal.open();
    };

    const btnMail = document.getElementById('btn-mail-classe');
    if (btnMail) btnMail.onclick = () => window.CCFExport && CCFExport.mailBilanClasse();

    const btnCsv = document.getElementById('btn-export-csv');
    if (btnCsv) btnCsv.onclick = () => window.CCFExport && CCFExport.exportCSV();
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

    /* Mini-radar SVG : niveau moyen par compétence (formatif + CCF mergés) */
    const miniRadar = renderMiniRadar(e.pseudo);

    /* Affectations TP en cours pour cet élève */
    const affects = (window.Affectations && Affectations.byEleve(e.pseudo)) || [];
    const tpsHtml = affects.length === 0 ? '' : `
      <div class="eleve-tps">
        ${affects.map(a => {
          const meta = window.Affectations.tpMeta(a.tpId);
          const sm = window.Affectations.statutMeta(a.statut);
          const tit = meta ? meta.titre : '';
          const dateStr = a.dateExecution ? a.dateExecution.split('-').reverse().join('/') : '';
          /* Indicateur si le TP a déjà été noté formativement */
          const hasEval = window.TPEval && TPEval.get(e.pseudo, a.tpId);
          const evalIcon = hasEval ? '✍' : '';
          return `<span class="eleve-tp-badge" data-pseudo="${escapeHtml(e.pseudo)}" data-tpid="${a.tpId}" style="border-color:${sm.couleur}" title="${escapeHtml(tit)} — ${sm.label}${dateStr ? ' · '+dateStr : ''}${hasEval ? ' · ✍ noté' : ''}\nClic = changer statut · double-clic = évaluer">
            ${sm.icone} <strong>${a.tpId}</strong>${evalIcon ? `<span class="eleve-tp-evaltag">${evalIcon}</span>` : ''}
          </span>`;
        }).join('')}
      </div>
    `;

    return `
      <div class="eleve-card ${evalue ? 'evalue' : 'pending'}" data-id="${e.idCloud}" title="Cliquer pour saisir / modifier la CCF EP3 — clic sur 📜 pour l'historique · clic sur le mini-radar pour la grande toile">
        <header class="eleve-card-hdr">
          <span class="eleve-id">${escapeHtml(e.pseudo)}</span>
          ${statusTag}
          <button class="eleve-history-btn" data-pseudo="${escapeHtml(e.pseudo)}" title="Voir l'historique de cet élève">📜</button>
        </header>
        <div class="eleve-name">${escapeHtml(e.label)}</div>
        ${e.sublabel ? `<div class="eleve-sublabel">${escapeHtml(e.sublabel)}</div>` : ''}
        <div class="eleve-card-body">
          <div class="eleve-card-radar" data-pseudo="${escapeHtml(e.pseudo)}" title="Cliquer = ouvre la grande toile d'araignée">
            ${miniRadar}
          </div>
          <div class="eleve-card-info">
            ${tpsHtml}
            <div class="eleve-progress">
              <span class="lab">Tâches CCF notées</span>
              <span class="val">${tachesFaites} / ${tachesTot}</span>
            </div>
            <div class="eleve-blocs">${blocsBars}</div>
          </div>
        </div>
      </div>
    `;
  }

  /** Mini-radar SVG (~110×110) — niveau moyen par compétence.
   *  Mélange CCF (sommatif) + TPEval (formatif) si l'un est manquant.
   *  Utilise uniquement SVG vectoriel pour rester léger (24 cards × Chart.js serait lourd). */
  function renderMiniRadar(pseudo) {
    if (!bareme) return '<div class="mini-empty">…</div>';
    const compsKeys = Object.keys(bareme.competences);
    const N = compsKeys.length;
    if (N < 3) return '';

    /* Récupération niveau par compétence — moyenne pondérée formatif + CCF */
    const compStored = window.CCF ? CCF.get('ep3', pseudo) : null;
    const ccfRes = compStored && compStored.saisie ? CCF.compute(bareme, compStored.saisie) : null;
    const tpSynth = window.TPEval ? TPEval.synthese(pseudo) : {};

    let hasAny = false;
    const niveaux = compsKeys.map(c => {
      const ccfV = ccfRes && ccfRes.niveauMoyenParComp[c] != null ? ccfRes.niveauMoyenParComp[c] : null;
      const fmV = tpSynth[c] && tpSynth[c].moyenne != null ? tpSynth[c].moyenne : null;
      let v = null;
      if (ccfV != null && fmV != null) v = (ccfV + fmV) / 2;
      else if (ccfV != null) v = ccfV;
      else if (fmV != null) v = fmV;
      if (v != null) hasAny = true;
      return v;
    });

    const size = 110;
    const cx = size / 2;
    const cy = size / 2;
    const R = size * 0.42; /* rayon max = niveau 3 */

    /* Polygones de fond (3 niveaux concentriques) */
    const bgRings = [1, 2, 3].map(level => {
      const pts = compsKeys.map((_, i) => {
        const angle = (Math.PI * 2 * i / N) - Math.PI / 2;
        const r = R * (level / 3);
        return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r];
      });
      const d = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ') + 'Z';
      return `<path d="${d}" fill="none" stroke="#e0e4ea" stroke-width="0.8" />`;
    }).join('');

    /* Axes */
    const axes = compsKeys.map((_, i) => {
      const angle = (Math.PI * 2 * i / N) - Math.PI / 2;
      const x = cx + Math.cos(angle) * R;
      const y = cy + Math.sin(angle) * R;
      return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#e0e4ea" stroke-width="0.6" />`;
    }).join('');

    /* Polygone des niveaux de l'élève (vert dégradé) */
    let dataPath = '';
    let dots = '';
    if (hasAny) {
      const pts = niveaux.map((v, i) => {
        const angle = (Math.PI * 2 * i / N) - Math.PI / 2;
        const r = v != null ? R * (v / 3) : 0;
        return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r];
      });
      dataPath = `<path d="${pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')}Z"
                       fill="rgba(56,161,105,0.35)" stroke="#38a169" stroke-width="1.6" />`;
      dots = pts.map((p, i) => niveaux[i] != null
        ? `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="2" fill="#1b3a63" />`
        : ''
      ).join('');
    }

    /* Labels compétences (très petits) */
    const labels = compsKeys.map((c, i) => {
      const angle = (Math.PI * 2 * i / N) - Math.PI / 2;
      const lr = R + 8;
      const x = cx + Math.cos(angle) * lr;
      const y = cy + Math.sin(angle) * lr + 2;
      const short = c.replace('C', '');
      return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="7" text-anchor="middle" fill="#888" font-family="Trebuchet MS">${short}</text>`;
    }).join('');

    return `
      <svg class="mini-radar" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        ${bgRings}
        ${axes}
        ${dataPath}
        ${dots}
        ${labels}
      </svg>
      ${!hasAny ? '<div class="mini-radar-empty">vide</div>' : ''}
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

  /* Refresh auto quand les vrais noms arrivent OU quand un autre prof a poussé sur la Sheet */
  ['correspondance-loaded', 'sync-merged'].forEach(ev => {
    document.addEventListener(ev, () => {
      if (bareme && document.getElementById('classe-overview-root')) render();
    });
  });

  window.ClasseOverview = { init, onShown, render };
})();
