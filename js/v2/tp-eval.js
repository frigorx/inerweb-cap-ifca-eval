/* tp-eval.js — évaluation FORMATIVE par TP × élève × compétence
   Ce module sert à noter pendant les TP de révision (différent du CCF EP3 final).
   Échelle : NA / EC / A / M (matrise) — la même que la grille progression v1.x.

   API :
     TPEval.set(pseudo, tpId, fields) → enregistre saisie
     TPEval.get(pseudo, tpId)         → retrouve saisie
     TPEval.byEleve(pseudo)           → toutes les évals d'un élève
     TPEval.byTP(tpId)                → toutes les évals d'un TP
     TPEval.synthese(pseudo)          → niveau moyen par compétence (toutes évals confondues)
*/

(function() {
  'use strict';

  const PREFIX = 'tpeval.';
  const NIVEAUX = [
    { code: 'NE',  label: 'Non évalué', score: null, couleur: '#888'    },
    { code: 'NA',  label: 'Non acquis', score: 0,    couleur: '#c53030' },
    { code: 'EC',  label: 'En cours',   score: 1,    couleur: '#dd6b20' },
    { code: 'A',   label: 'Acquis',     score: 2,    couleur: '#38a169' },
    { code: 'M',   label: 'Maîtrisé',   score: 3,    couleur: '#1b3a63' }
  ];

  function key(pseudo, tpId) { return `${PREFIX}${tpId}.${pseudo}`; }

  function set(pseudo, tpId, data) {
    const cur = get(pseudo, tpId) || {};
    const merged = Object.assign({
      pseudo, tpId,
      comp: {},          /* { "C4.7": "A", "C3.7": "EC", ... } */
      commentaire: '',
      date: null,        /* date d'évaluation */
      evaluateur: Store.get('prof.current') || ''
    }, cur, data, { updatedAt: new Date().toISOString() });
    Store.set(key(pseudo, tpId), merged);
    /* Marque automatiquement l'affectation comme "fait" si pas déjà validé */
    if (window.Affectations) {
      const a = Affectations.get(pseudo, tpId);
      if (a && a.statut !== 'valide') {
        Affectations.set(pseudo, tpId, { statut: 'fait' });
      } else if (!a) {
        /* Pas de distribution préalable — on crée l'affectation à la volée */
        Affectations.set(pseudo, tpId, { statut: 'fait', dateExecution: (data.date || new Date().toISOString().slice(0, 10)) });
      }
    }
    return merged;
  }

  function get(pseudo, tpId) { return Store.get(key(pseudo, tpId)); }

  function remove(pseudo, tpId) { Store.remove(key(pseudo, tpId)); }

  function list() {
    const out = [];
    const fullPrefix = 'inerweb.cap-ifca.' + PREFIX;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(fullPrefix)) {
        try { out.push(JSON.parse(localStorage.getItem(k))); } catch (e) {}
      }
    }
    return out;
  }
  function byEleve(pseudo) { return list().filter(e => e.pseudo === pseudo); }
  function byTP(tpId) { return list().filter(e => e.tpId === tpId); }

  /** Synthèse niveau par compétence pour un élève (toutes évals TP confondues).
   *  Retourne { "C4.7": {moyenne: 2.5, count: 3, dernier: "M"}, ... } */
  function synthese(pseudo) {
    const evals = byEleve(pseudo);
    const acc = {};
    evals.forEach(e => {
      Object.keys(e.comp || {}).forEach(c => {
        const lvl = NIVEAUX.find(n => n.code === e.comp[c]);
        if (!lvl) return;
        /* NE n'entre pas dans la moyenne (score null) mais reste comme "dernier" */
        const ts = new Date(e.updatedAt || 0).getTime();
        if (!acc[c]) acc[c] = { somme: 0, count: 0, dernier: null, dernierTs: 0 };
        if (lvl.score != null) {
          acc[c].somme += lvl.score;
          acc[c].count++;
        }
        if (ts > acc[c].dernierTs) { acc[c].dernier = e.comp[c]; acc[c].dernierTs = ts; }
      });
    });
    const out = {};
    Object.keys(acc).forEach(c => {
      out[c] = {
        moyenne: acc[c].count > 0 ? acc[c].somme / acc[c].count : null,
        count: acc[c].count,
        dernier: acc[c].dernier
      };
    });
    return out;
  }

  window.TPEval = { set, get, remove, list, byEleve, byTP, synthese, NIVEAUX };
})();
