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
