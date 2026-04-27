/* ccf-engine.js — moteur CCF EP3 (et futurs EP1/EP2)
   Lit data/ccf_ep3_bareme.json et expose :
   - CCF.load(epreuve)        → charge barème
   - CCF.compute(saisie)      → totalise points par bloc, par compétence, et note /20
   - CCF.save/get(idCloud)    → persistance locale (clé idCloud anonyme)
   - CCF.allEvals()           → toutes les saisies stockées (pour radar/bilan)
   La saisie côté prof passe par js/v2/ccf-ui.js. */

(function() {
  'use strict';

  const _baremeCache = {};
  const SK = (epreuve, idCloud) => `ccf.${epreuve.toLowerCase()}.${idCloud}`;

  async function load(epreuve = 'ep3') {
    const file = `ccf_${epreuve.toLowerCase()}_bareme.json`;
    if (_baremeCache[file]) return _baremeCache[file];
    const j = await Catalog.load(file);
    if (j) _baremeCache[file] = j;
    return j;
  }

  /** Calcule {pointsParBloc, totalBrut, note20, pointsParComp, niveauMoyenParComp} pour une saisie.
   *  saisie = { "0.1": "PA", "0.2": "A", "A-1": "EC", ... } */
  function compute(bareme, saisie) {
    saisie = saisie || {};
    const niveauIndex = (code) => {
      const n = bareme.niveaux.findIndex(x => x.code === code);
      return n < 0 ? null : n;
    };
    const pointsParBloc = {};
    const pointsParComp = {};       /* somme des points obtenus */
    const maxParComp    = {};       /* somme des max possibles */
    const niveauxParComp = {};      /* liste des indices niveau pour moyenne */
    let totalBrut = 0;
    let totalMax  = 0;

    bareme.blocs.forEach(bloc => {
      let pBloc = 0;
      bloc.taches.forEach(t => {
        totalMax += t.max;
        maxParComp[t.comp] = (maxParComp[t.comp] || 0) + t.max;
        const codeNiv = saisie[t.id];
        if (codeNiv) {
          const idx = niveauIndex(codeNiv);
          if (idx != null) {
            const pts = t.niveaux[idx];
            pBloc += pts;
            totalBrut += pts;
            pointsParComp[t.comp] = (pointsParComp[t.comp] || 0) + pts;
            (niveauxParComp[t.comp] = niveauxParComp[t.comp] || []).push(idx);
          }
        }
      });
      pointsParBloc[bloc.code] = pBloc;
    });

    /* Note finale : (total brut / diviseur) × ramene_sur, plafonné au ramene_sur */
    const div = bareme.diviseur_note_finale || bareme.total_max || 280;
    const sur = bareme.ramene_sur || 20;
    const note20 = Math.min(sur, (totalBrut / div) * sur);

    /* Niveau moyen par compétence (0..3) — pour radar */
    const niveauMoyenParComp = {};
    Object.keys(niveauxParComp).forEach(c => {
      const arr = niveauxParComp[c];
      niveauMoyenParComp[c] = arr.reduce((a,b)=>a+b,0) / arr.length;
    });

    return {
      pointsParBloc,
      pointsParComp,
      maxParComp,
      niveauMoyenParComp,
      totalBrut,
      totalMax,
      note20: Math.round(note20 * 10) / 10
    };
  }

  /** Persiste la saisie d'un élève (clé idCloud anonyme). */
  function save(epreuve, idCloud, saisie, signataire) {
    if (!idCloud) return false;
    const payload = {
      idCloud,
      saisie,
      signataire: signataire || (Store.get('prof.current') || ''),
      updatedAt: new Date().toISOString()
    };
    Store.set(SK(epreuve, idCloud), payload);
    return true;
  }

  function get(epreuve, idCloud) {
    if (!idCloud) return null;
    return Store.get(SK(epreuve, idCloud));
  }

  function remove(epreuve, idCloud) {
    Store.remove(SK(epreuve, idCloud));
  }

  /** Liste toutes les saisies d'une épreuve (scan localStorage). */
  function allEvals(epreuve) {
    const prefix = 'inerweb.cap-ifca.' + SK(epreuve, '');
    const out = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) {
        try { out.push(JSON.parse(localStorage.getItem(k))); } catch (e) {}
      }
    }
    return out;
  }

  window.CCF = { load, compute, save, get, remove, allEvals };
})();
