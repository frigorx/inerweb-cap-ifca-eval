/* affectations.js — distribution multi-élèves d'un TP
   Modèle : affectation = (eleve_pseudo, tp_id) → { statut, distribuePar, distribueLe, note }
   Stockage : Store, clé "affect.{tp_id}.{pseudo}".
   API :
     Affectations.list()         → toutes les affectations actives
     Affectations.byEleve(p)     → liste des TP de cet élève
     Affectations.byTP(tpId)     → liste des élèves sur ce TP
     Affectations.set(p, tpId, fields)
     Affectations.remove(p, tpId)
     Affectations.distribute(eleves[], tpId)  → batch
*/

(function() {
  'use strict';

  const PREFIX = 'affect.';
  let _bibCache = null;

  async function biblio() {
    if (!_bibCache) {
      const j = await Catalog.load('tp_biblio.json');
      _bibCache = j || { tps: [], statuts: [] };
    }
    return _bibCache;
  }

  function key(pseudo, tpId) {
    return `${PREFIX}${tpId}.${pseudo}`;
  }

  function get(pseudo, tpId) {
    return Store.get(key(pseudo, tpId));
  }

  function set(pseudo, tpId, fields) {
    const cur = get(pseudo, tpId) || {};
    const merged = Object.assign({
      pseudo, tpId,
      statut: 'todo',
      distribueLe: new Date().toISOString(),
      dateExecution: null,        /* date où l'élève FAIT effectivement le TP */
      seanceId: null,              /* lien vers la séance du calendrier (si distribué depuis là) */
      distribuePar: Store.get('prof.current') || ''
    }, cur, fields, { updatedAt: new Date().toISOString() });
    Store.set(key(pseudo, tpId), merged);
    /* Push Sheet pour sync 4 profs */
    if (window.Sync && Sync.pushAffect) Sync.pushAffect(pseudo, tpId, merged).catch(() => {});
    return merged;
  }

  function remove(pseudo, tpId) {
    Store.remove(key(pseudo, tpId));
  }

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

  function byEleve(pseudo) { return list().filter(a => a.pseudo === pseudo); }
  function byTP(tpId) { return list().filter(a => a.tpId === tpId); }

  function distribute(eleves, tpId, prof, opts) {
    opts = opts || {};
    const now = new Date().toISOString();
    const res = [];
    eleves.forEach(p => {
      res.push(set(p, tpId, {
        statut: 'encours',
        distribueLe: now,
        dateExecution: opts.dateExecution || now.slice(0, 10),
        seanceId: opts.seanceId || null,
        distribuePar: prof || (Store.get('prof.current') || '')
      }));
    });
    return res;
  }

  function statutMeta(code) {
    if (!_bibCache) return { code, label: code, couleur: '#888', icone: '•' };
    return (_bibCache.statuts || []).find(s => s.code === code) || { code, label: code, couleur: '#888', icone: '•' };
  }

  function tpMeta(tpId) {
    if (!_bibCache) return null;
    return (_bibCache.tps || []).find(t => t.id === tpId) || null;
  }

  window.Affectations = { biblio, list, byEleve, byTP, get, set, remove, distribute, statutMeta, tpMeta };
})();
