/* audit.mjs — vérifie cohérence JSON métier + signale incomplétudes TP */
import { readFileSync } from 'fs';
import { resolve } from 'path';

const DATA = resolve(process.cwd(), '../data');
const load = (f) => JSON.parse(readFileSync(resolve(DATA, f), 'utf-8'));

const reports = { errors: [], warnings: [], info: [] };
const ok = (m) => reports.info.push(m);
const warn = (m) => reports.warnings.push(m);
const err = (m) => reports.errors.push(m);

// 1. Charger tous les fichiers
const files = {
  tpEP3: load('tp_ep3.json'),
  tpEP1: load('tp_ep1.json'),
  tpEP2: load('tp_ep2.json'),
  mEP3: load('mappings_ep3.json'),
  mEP1: load('mappings_ep1.json'),
  mEP2: load('mappings_ep2.json'),
  cEP3: load('competences_ep3.json'),
  cEP1: load('competences_ep1.json'),
  cEP2: load('competences_ep2.json'),
  eleves: load('eleves_pseudo.json')
};
ok('10 fichiers JSON chargés sans erreur de parse');

// 2. Cohérence : chaque TP référence des compétences existantes
function checkEP(epLabel, tpFile, mapFile, compFile) {
  const tps = tpFile.tps;
  const mappings = mapFile.mappings;
  const codes = new Set(compFile.competences.map(c => c.code));

  tps.forEach(tp => {
    // a. compétences référencées dans le TP existent
    (tp.competences || []).forEach(c => {
      if (!codes.has(c)) err(`[${epLabel} ${tp.id}] compétence ${c} n'existe pas dans competences_${epLabel.toLowerCase()}.json`);
    });
    // b. TP a un mapping
    const m = mappings.find(x => x.tpId === tp.id);
    if (!m) warn(`[${epLabel} ${tp.id}] aucun mapping (critères absents)`);
    else {
      // c. mapping référence des compétences cohérentes
      m.competences?.forEach(c => {
        if (!codes.has(c.code)) err(`[${epLabel} ${tp.id}] mapping référence ${c.code} qui n'existe pas`);
        if (!tp.competences?.includes(c.code)) warn(`[${epLabel} ${tp.id}] mapping ${c.code} pas listé dans tp.competences[]`);
      });
      // d. signaler critères vides ou trop courts
      m.competences?.forEach(c => {
        if (!c.criteres || c.criteres.length === 0) warn(`[${epLabel} ${tp.id}/${c.code}] critères vides`);
        else if (c.criteres.length < 2) warn(`[${epLabel} ${tp.id}/${c.code}] seulement ${c.criteres.length} critère(s) — minimal`);
      });
    }
    // e. TP sans opérations
    if (!tp.operations || tp.operations.length === 0) warn(`[${epLabel} ${tp.id}] aucune opération listée`);
    // f. TP sans seance (EP3 only)
    if (epLabel === 'EP3' && tp.id !== 'TP-056' && !tp.seance) warn(`[${epLabel} ${tp.id}] champ 'seance' manquant`);
    // g. TP placeholder reconnaissable (version)
    if (tpFile._meta?.version?.includes('placeholder')) {
      ok(`[${epLabel} ${tp.id}] flag placeholder — à enrichir par le prof`);
    }
    // h. TP-056 : vérifier visas et phases
    if (tp.id === 'TP-056') {
      const phaseIds = new Set(tp.phases?.map(p => p.id));
      tp.visasProfObligatoires?.forEach(v => {
        if (!phaseIds.has(v.phase)) err(`[TP-056 ${v.id}] phase ${v.phase} référencée n'existe pas`);
      });
      const sumDuree = tp.phases?.reduce((s, p) => s + (p.duree || 0), 0);
      if (sumDuree && Math.abs(sumDuree - tp.duree) > 5) warn(`[TP-056] somme durée phases (${sumDuree}) ≠ tp.duree (${tp.duree})`);
      // bareme cohérent
      if (tp.baremePhases) {
        const sum = Object.values(tp.baremePhases).reduce((a, b) => a + b, 0);
        if (sum !== tp.noteSur) warn(`[TP-056] somme barèmePhases (${sum}) ≠ noteSur (${tp.noteSur})`);
      }
    }
  });
}

checkEP('EP3', files.tpEP3, files.mEP3, files.cEP3);
checkEP('EP1', files.tpEP1, files.mEP1, files.cEP1);
checkEP('EP2', files.tpEP2, files.mEP2, files.cEP2);

// 3. Élèves : couverture classes
const classes = files.eleves.classes;
const eleves = files.eleves.eleves;
ok(`Classes : ${Object.keys(classes).length} (${Object.keys(classes).join(', ')})`);
ok(`Élèves : ${eleves.length} pseudonymes E01..E${eleves.length.toString().padStart(2,'0')}`);
const orphelins = eleves.filter(e => !Object.values(classes).flat().includes(e.pseudo));
if (orphelins.length) err(`${orphelins.length} élève(s) sans classe`);

// 4. Couverture compétences EP3 par TP
const codesEP3 = new Set(files.cEP3.competences.map(c => c.code));
const codesCouvertsEP3 = new Set();
files.tpEP3.tps.forEach(tp => (tp.competences || []).forEach(c => codesCouvertsEP3.add(c)));
const nonCouvertes = [...codesEP3].filter(c => !codesCouvertsEP3.has(c));
if (nonCouvertes.length) warn(`Compétences EP3 NON couvertes par aucun TP : ${nonCouvertes.join(', ')}`);
else ok(`Toutes les compétences EP3 sont couvertes par au moins un TP`);

// 5. Charge / progression
const totalTPEP3 = files.tpEP3.tps.length;
const totalDureeEP3 = files.tpEP3.tps.reduce((s, tp) => s + (tp.duree || 0), 0);
ok(`EP3 : ${totalTPEP3} TP, ${totalDureeEP3} min total (${(totalDureeEP3/60).toFixed(1)} h)`);

// 6. Render report
console.log('=== AUDIT inerWeb Eval CAP IFCA ===\n');
console.log(`✅ ${reports.info.length} OK`);
console.log(`⚠️  ${reports.warnings.length} warning(s)`);
console.log(`❌ ${reports.errors.length} erreur(s)\n`);

if (reports.errors.length) {
  console.log('--- ERREURS ---');
  reports.errors.forEach(m => console.log('  ❌', m));
  console.log('');
}
if (reports.warnings.length) {
  console.log('--- WARNINGS ---');
  reports.warnings.forEach(m => console.log('  ⚠️ ', m));
  console.log('');
}
console.log('--- INFOS ---');
reports.info.forEach(m => console.log('  ✓', m));

process.exit(reports.errors.length > 0 ? 1 : 0);
