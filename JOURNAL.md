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
[2026-04-26 19:30] Retour Franck → "tu as fait à TA sauce sans utiliser mes vrais TP"
[2026-04-26 19:30] DECISION: option B + bonus → servir les 6 HTML originaux tels quels + ZIP source téléchargeable
[2026-04-26 19:35] Copié 8 fichiers HTML (6 TP officiels S1/S2/S3 + 2 historiques S1) dans eleve/tp-officiels/
[2026-04-26 19:35] Copié Package_EP3_CAP_IFCA_final.zip (287 Ko) téléchargeable
[2026-04-26 19:40] eleve/tp-officiels/index.html : page d'accueil avec consulter+télécharger pour chaque TP + ZIP global
[2026-04-26 19:42] eleve/index.html : nouveau MENU à 3 grands boutons (Officiels en orange / Package ZIP / Adaptation DYS expé en vert dashed)
[2026-04-26 19:43] adaptation-dys.html dégradée au statut expérimental avec avertissement IA en haut
[2026-04-26 19:44] Lien depuis app prof : 2 boutons distincts "📚 TP officiels" (orange) et "🎓 Espace élève" (vert)
[2026-04-26 20:30] Liste réelle 24 élèves CAP IFCA reçue de Franck (à garder LOCAL)
[2026-04-26 20:30] data/correspondance_eleves.json créé EN LOCAL UNIQUEMENT, gitignored (4 règles : correspondance_eleves.json + data/correspondance_*.json + local/ + *.private.* + *-prive.*)
[2026-04-26 20:30] git check-ignore confirme : correspondance_eleves.json bloqué par règle ligne 7
[2026-04-26 20:30] eleves_pseudo.json mis à jour avec les 24 vrais pseudos format "1re lettre nom + prénom complet"
[2026-04-26 20:30] ⚠ Pseudonymisation FAIBLE (prénom en clair dans le pseudo) — choix prof Franck assumé
[2026-04-26 20:30] store.js : Correspondance.load() / .label() / .available() — chargement silencieux du fichier optionnel
[2026-04-26 20:30] dashboard.js + eval-engine.js + radar.js + bulletin.js + tp-tournant.js : affichage "Prénom NOM" en surimpression côté prof seulement
[2026-04-26 20:30] tp-tournant.js : statut par élève (pas-commencé / en cours / terminé) + bouton "passer au suivant" + grille planning rotation 24 élèves cliquable
[2026-04-26 20:30] dashboard.js : carte TP-056 sur écran Aujourd'hui (qui est en autonomie maintenant + 3 stats)
[2026-04-26 20:30] main.js : bandeau "🔒 Correspondance locale chargée" affiché en haut quand le fichier local est trouvé
[2026-04-26 21:00] Pseudonymisation FORTE activée — triple identité par élève :
  (1) idCloud M01..M24 = ce qui part au Sheet (neutre)
  (2) pseudo MFrédéric = ce que voit le prof (lisible)
  (3) Prénom NOM = surimpression côté prof, jamais en cloud
[2026-04-26 21:00] store.js : Correspondance.toIdCloud() / toPseudo() / label() — traduction bidirectionnelle
[2026-04-26 21:00] inerweb-results.js : write traduit pseudo→idCloud avant POST · read traduit idCloud→pseudo en cache local
[2026-04-26 21:00] Cache local conservé en pseudo (vues affichent immédiatement les noms)
[2026-04-26 21:00] Bandeau écran principal : "🔒 Pseudonymisation forte active" (vert) si correspondance chargée
[2026-04-26 21:00] Onglet ⚙ Config : section RGPD explicite avec exemple "Tu vois MFrédéric — Frédéric MENDY · Sheet contient M14"
[2026-04-26 21:00] Test bout-en-bout : POST M14 → Sheet → READ M14, aucune fuite "Frédéric" ni "MENDY" dans le payload distant
[2026-04-26 21:00] Transparent pour le prof : 0 changement dans son utilisation, juste un bandeau vert qui rassure
[2026-04-26 21:30] Retour Franck → "j'ai pas vu mes élèves" → cause : correspondance LOCALE absente du serveur GitHub Pages (fichier gitignored)
[2026-04-26 21:30] Solution UPLOAD : input file dans Config pour importer le fichier dans localStorage du navigateur (chaque prof importe une fois par poste)
[2026-04-26 21:30] store.js : Correspondance.importFromJson() + .clear() — gestion via localStorage (clé correspondance.local) en priorité 1, fichier serveur en priorité 2
[2026-04-26 21:30] main.js : handler upload + bouton retirer
[2026-04-26 21:30] Config : section avec input file + bouton "Retirer du poste" + texte explicatif "reste UNIQUEMENT sur ce navigateur"
[2026-04-26 21:30] MODE_EMPLOI.html créé : 9 sections (446 lignes) → première fois 3 min · 9 écrans · évaluer pas-à-pas · TP-056 tournant · radar/bulletin · TP officiels · RGPD · dépannage · URLs · imprimable A4
[2026-04-26 21:30] Boutons header app prof : 📖 Mode d'emploi (bleu) + 📚 TP officiels (orange) + 🎓 Espace élève (vert)
[2026-04-26 21:30] Lien "Première fois ? Lire le mode d'emploi (3 min)" sur l'écran de connexion
