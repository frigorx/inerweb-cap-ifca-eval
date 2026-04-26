# JOURNAL — inerWeb Eval CAP IFCA

> Journal d'exécution autonome — 1 ligne par action significative
> Format : `[YYYY-MM-DD HH:MM] action — résultat`

## 2026-04-25 — session autonome 8h

[2026-04-25 18:00] Lecture PLAN + CDC — OK
[2026-04-25 18:00] Phase 0 prérequis — git/gh/node/python/clasp OK, gh auth frigorx OK, CDC trouvé, Package_EP3_extracted OK, endpoint collecteur OK
[2026-04-25 18:00] Bootstrap workspace `C:/Users/henni/dev/inerweb-cap-ifca-eval` — créé, `git init -b main` puis `checkout -b dev`
[2026-04-25 19:00] Phase 1.1 → repo distant créé + dev pushé + Pages activée — OK
[2026-04-25 19:00] Phase 1.2 → arbo + sources copiées + TP-056 ajouté + élèves E01..E24 — OK
[2026-04-25 19:30] Phase 1.3-1.7 → V1 EP3 complète : index.html SPA + CSS charte + 8 modules JS — OK
[2026-04-25 20:00] Phase 1.8 → Apps Script v3 avec routing eval-cap-ifca, redéployé sur AKfycbz5Bk... @7
[2026-04-25 20:00] Smoke curl Apps Script : write+read cycle OK (1 ligne test E13/C4.1=A acceptée et relue)
[2026-04-25 20:05] Phase 1.9 → http.server 8089 : tous les assets HTTP 200 (HTML/CSS/9 JS/4 JSON/smoke)
[2026-04-25 20:05] Phase 1.9 → node --check : 9 fichiers JS sans erreur de syntaxe
[2026-04-25 20:05] Phase 1.9 → JSON valide : tp_ep3 + mappings_ep3 + eleves_pseudo + competences_ep3
[2026-04-25 20:05] DECISION: smoke test 2-iframes documenté dans test/smoke.html — test final UI à valider par Franck (Claude ne peut pas piloter un navigateur en autonomie)
[2026-04-25 20:30] Phase 1.10 → merge dev→main + tag v1.0.0 + push — Pages built en ~30s, HTTP 200, titre OK
[2026-04-25 20:35] Phase 4 → RAPPORT_FINAL.md initial pushé sur main
[2026-04-25 20:40] Phase 2 → EP1 (5 comp) + EP2 (9 comp) + 9 TP placeholders + sélecteur épreuve dans UI — commit 071e578
[2026-04-25 20:45] Phase 3 → html2pdf + 2 boutons PDF (unitaire+all) + DOCUMENTATION_PROF.md (10 sections) — commit 8f6e0c7
[2026-04-25 20:50] merge final dev→main + tags v1.1.0 + v1.2.0 poussés
[2026-04-25 20:50] RAPPORT_FINAL.md mis à jour — toutes phases complétées
[2026-04-25 21:30] Audit TP côté élève → 10 points faibles identifiés (densité texte, jargon, absence boucle remédiation, etc.)
[2026-04-25 21:30] Solution livrée → eleve/ + data/eleve_guidance_ep3.json (49 Ko)
[2026-04-25 21:30] 2 versions par TP : V1 ultra-guidée (45 étapes total) + V2 consolidée (25 étapes total)
[2026-04-25 21:30] 7 ateliers de secours (S1, S2, E1, MES, CALC, DOC, FGAZ) — boucle complète
[2026-04-25 21:30] TP-056 PRÉSERVÉ ✓ (consigne explicite Franck)
[2026-04-25 21:30] CSS anti-DYS strict (Calibri 14pt min, max 3 lignes par bloc, picto+texte)
[2026-04-25 21:30] Lien "Espace élève" ajouté depuis l'app prof
[2026-04-25 21:30] AUDIT_TP_REPORT.md rédigé : points forts/faibles + 6 recommandations + 6 évolutions V2
[2026-04-26 09:00] Retour Franck → 5 corrections : (1) éval pivotée, (2) carte progression interactive, (3) qui-fait-quoi instinctif, (4) iCal cassé, (5) imprimable papier
[2026-04-26 09:30] Inspiration "Le Mur" (HAL/le-mur.html) — 8 onglets type tableau de bord prof
[2026-04-26 09:45] eval-engine.js → grille pivotée 1 ligne/élève × N colonnes compétences + note auto + légende repliable
[2026-04-26 10:00] dashboard.js → 3 nouvelles vues : Aujourd'hui (qui-fait-quoi-maintenant) + Carte progression (semaines × élèves × TP) + Élèves (cartes individuelles avec alertes)
[2026-04-26 10:15] iCal → fallback "coller le contenu .ics" en Config (contourne CORS EcoleDirecte)
[2026-04-26 10:25] eleve/livret.html → générateur livret papier A4 par TP (V1+V2+ateliers) avec page de garde + cases nom/date manuscrites
[2026-04-26 10:30] index.html : nouvel ordre onglets (Aujourd'hui → Progression → Élèves → ...) — vue de pilotage en premier
