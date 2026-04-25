# PLAN AUTONOMIE — inerWeb Eval CAP IFCA

> **Lecture obligatoire avant toute action.** Ce fichier est le runbook d'exécution autonome.
> Source de vérité contractuelle : `CDC_inerweb_eval_CAP_IFCA.md` (à la racine).
> Règles permanentes anti-blocage : `CLAUDE.md`.

---

## 0. OBJECTIF FINAL (état attendu en fin de run)

Repo `frigorx/inerweb-cap-ifca-eval` créé, déployé sur GitHub Pages, fonctionnel à `https://frigorx.github.io/inerweb-cap-ifca-eval/`, avec :

- Écran accueil 4 profs (FH/PW/ZN/TM) + saisie URL iCal EcoleDirecte
- Vue agenda fusion 4 iCal par classe avec couleur par prof
- Évaluation des 6 TP TP-050 à TP-055 (EP3 priorité absolue) sur critères NA/ECA/A/M
- Radar / bar graph toggle par élève
- Synchro Google Sheet via collecteur universel (polling 8 s, last-write-wins)
- Buffer offline localStorage avec retry auto
- Bulletin EP3 imprimable A4
- Apps Script étendu avec endpoint `?action=read&module=eval-cap-ifca`
- Extensions EP1 + EP2 (phase 2)
- Export PDF dossier inspection (phase 3)
- `RAPPORT_FINAL.md` rédigé en fin de run

---

## 1. PRINCIPE D'AUTONOMIE — IMPÉRATIF

**Tu (Claude Code) ne demandes JAMAIS de confirmation à l'utilisateur. Aucune question, aucun "voulez-vous", aucun prompt interactif.**

- Si tu hésites entre 2 options → choisis la plus simple/standard, logue ta décision dans `JOURNAL.md` (clé `DECISION:`), continue.
- Si une commande échoue : retente max 3 fois avec corrections. Si toujours KO → skip, log `BLOQUÉ_phase_X.Y: <raison>` dans `JOURNAL.md`, passe à la sous-tâche suivante.
- Tu commits + push après chaque sous-tâche cochée. Format : `phase-N.M: <titre court>`.
- Tu écris dans `JOURNAL.md` à chaque action significative : `[YYYY-MM-DD HH:MM] action — résultat`.
- Si rate limit (Anthropic, Google, GitHub) : sleep 60 s puis retry. Pas d'arrêt.
- Si contexte > 70 % : lance `/compact` puis continue.
- Tu NE T'ARRÊTES QUE quand toutes les phases sont cochées OU que tu as épuisé toutes les sous-tâches (cochées ou bloquées-loguées).
- À la toute fin : tu écris `RAPPORT_FINAL.md` avec phases OK / partielles / échec + actions humaines requises.

**Hiérarchie de priorité si manque de temps :**
1. Phase 1 EP3 jusqu'à 1.10 (livraison lundi 27/04 = critique)
2. Phase 4 (clôture, rapport final) — toujours produire le rapport
3. Phase 2 EP1 + EP2 (semaine 28/04)
4. Phase 3 inspection (V1.2)

---

## 2. PRÉREQUIS (PHASE 0 — vérification ~5 min)

### 2.1 Comptes / outils requis
- [ ] `git --version` OK
- [ ] `gh auth status` → utilisateur **frigorx**, sinon `gh auth login` (skip si pas interactif → log BLOQUÉ + continuer en local)
- [ ] `clasp login --status` → compte **inerweb.fh@gmail.com** (skip si pas interactif → log BLOQUÉ + continuer sans modif Apps Script)
- [ ] `node --version` OK (>= 18)
- [ ] `python --version` OK (pour serveur de test local)

### 2.2 Source de données
Vérifier la présence de :
```
C:/Users/henni/OneDrive/Bureau/25 26/vrac fiep 3/Package_EP3_extracted/
  ├── inerweb_eval/public/index.html
  ├── INTEGRATION_inerweb/catalogue_additions_revisions_EP3.json
  ├── INTEGRATION_inerweb/mappings_additions_revisions_EP3.json
  ├── S1_27-04-2026/ ... S3_11-05-2026/
  └── Carte_progression_CAP_IFCA_fin_annee.html
```
Si introuvable → log `BLOQUÉ_phase_0.2` + générer une base de zéro à partir des specs §5 du CDC.

### 2.3 Endpoints externes (à tester avant phase 1.5)
- Apps Script : `https://script.google.com/macros/s/AKfycbz5Bkn1tacs98bJezjnnYt38Yuy6QiHh7qWuEk1KRxS4UMIjl0yFOA0FVakLwCAJhZ5/exec`
  → doit retourner `{"status":"ok","service":"inerWeb Collecteur Universel v2.0"}`

### 2.4 Bootstrap
```powershell
$WORK = "C:/Users/henni/dev/inerweb-cap-ifca-eval"
New-Item -ItemType Directory -Force -Path $WORK | Out-Null
Set-Location $WORK
git init -b main
git checkout -b dev
```

Créer immédiatement :
- `.gitignore` : `node_modules/`, `*.log`, `correspondance_eleves.json`, `.env`, `.clasp.json`, `apps-script/.clasp.json`
- `JOURNAL.md` (vide avec en-tête date)
- `README.md` (1 paragraphe minimal)

**Critère validation phase 0** : `git status` clean, `JOURNAL.md` créé, prérequis tous loggués (OK ou BLOQUÉ).

---

## 3. PHASE 1 — V1 EP3 (livraison lundi 27/04) ⚡ PRIORITÉ ABSOLUE

### 1.1 — Création du repo distant (~5 min)
- [ ] `gh repo create frigorx/inerweb-cap-ifca-eval --public --source=. --description "Évaluation CAP IFCA EP1/EP2/EP3 — outil partagé 4 profs LP Jacques Raynaud"`
- [ ] Si "already exists" → `git remote add origin https://github.com/frigorx/inerweb-cap-ifca-eval.git`
- [ ] `git push -u origin dev`
- [ ] Activer GitHub Pages :
  ```powershell
  gh api -X POST "repos/frigorx/inerweb-cap-ifca-eval/pages" -f "source[branch]=main" -f "source[path]=/" 2>$null
  if ($LASTEXITCODE -ne 0) {
    gh api -X PATCH "repos/frigorx/inerweb-cap-ifca-eval/pages" -f "source[branch]=main" -f "source[path]=/"
  }
  ```
- [ ] **Critère** : `gh repo view frigorx/inerweb-cap-ifca-eval --json url` répond OK.

### 1.2 — Récupération de la base (~5 min)
- [ ] Copier les fichiers utiles depuis `Package_EP3_extracted/` :
  - `inerweb_eval/public/index.html` → `_source/index_original.html` (référence, pas la version finale)
  - `catalogue_additions_revisions_EP3.json` → `data/tp_ep3.json`
  - `mappings_additions_revisions_EP3.json` → `data/mappings_ep3.json`
  - `Carte_progression_CAP_IFCA_fin_annee.csv` → `data/carte_progression.csv` (si présent)
- [ ] Ne PAS commit `S1_*/` ni `S3_*/` (volumineux, accessibles ailleurs).
- [ ] Créer arborescence cible :
  ```
  /
  ├── index.html
  ├── css/style.css
  ├── js/main.js
  ├── js/auth.js
  ├── js/ical-parser.js
  ├── js/eval-engine.js
  ├── js/radar.js
  ├── js/inerweb-results.js
  ├── js/store.js
  ├── data/tp_ep3.json
  ├── data/mappings_ep3.json
  ├── data/eleves_pseudo.json   (E01..E24, sans nom réel)
  ├── _source/                   (références, gitignored optionnellement)
  ├── PLAN.md
  ├── CLAUDE.md
  ├── JOURNAL.md
  └── README.md
  ```

### 1.3 — Adaptation index.html mode statique (~30 min)
- [ ] Retirer tous les appels `/api/*` du HTML d'origine.
- [ ] Brancher `inerweb-results.js` configuré avec :
  ```js
  const COLLECTEUR_URL = "https://script.google.com/macros/s/AKfycbz5Bkn1tacs98bJezjnnYt38Yuy6QiHh7qWuEk1KRxS4UMIjl0yFOA0FVakLwCAJhZ5/exec";
  const MODULE_KEY = "eval-cap-ifca";
  ```
- [ ] Écran d'accueil :
  - 4 boutons radio prof : FH / PW / ZN / TM
  - Champ texte "URL iCal EcoleDirecte (optionnel)"
  - Bouton "Continuer" → stocke en `localStorage` clés `inerweb.prof.current`, `inerweb.ical.url.{prof}`
- [ ] Charte graphique stricte :
  - Police titres : Trebuchet MS bold
  - Police corps : Calibri 14pt min
  - Bleu primaire `#1b3a63`, orange `#ff6b35`
  - Fond clair uniquement (jamais dark)
  - Logo : flocon ❄ + "inerWeb" + cartouche orange "Édu" + "par F. Henninot"
- [ ] Mention RGPD obligatoire en bas de page :
  > « Établissement privé — LP Jacques Raynaud · ÉQUATIO · Outil pédagogique interne · données pseudonymisées »
- [ ] **Critère** : ouvrir `index.html` localement → écran prof s'affiche, sélection persiste après reload.

### 1.4 — Vue agenda fusion 4 profs (~30 min)
- [ ] Charger `ical.js` depuis CDN : `https://unpkg.com/ical.js@1.5.0/build/ical.min.js`
- [ ] Au démarrage : pour chaque prof avec iCal en localStorage → fetch + parse côté client.
- [ ] Filtre événements par mots-clés : `["CAP", "IFCA", "FROID", "CVC", "MFER"]` (case-insensitive).
- [ ] Timeline classe : `Lun 27/04 8h-12h — CAP IFCA 1 — TP1A — FH + PW`
- [ ] Couleurs profs (palette fixe) :
  - FH = `#1b3a63` (bleu)
  - PW = `#ff6b35` (orange)
  - ZN = `#2d8659` (vert)
  - TM = `#6b3a8a` (violet)
- [ ] Si pas d'iCal renseigné → afficher message d'invitation "Collez l'URL de votre iCal ED (Mon agenda > Exporter)".
- [ ] **Critère** : créer `data/test_ical.ics` minimal avec 2 events CAP IFCA → la timeline les affiche.

### 1.5 — Moteur d'évaluation EP3 (~45 min)
- [ ] Charger `data/tp_ep3.json` (6 TP TP-050 à TP-055).
- [ ] Charger `data/mappings_ep3.json` (compétences C4.1, C4.2, C4.3, C4.5, C4.6, C4.7, C5.1).
- [ ] Pour chaque TP sélectionné :
  - Liste élèves E01 → E24 (depuis `eleves_pseudo.json` à créer si absent)
  - Pour chaque élève : pour chaque critère du TP → boutons NA / ECA / A / M
  - Champ commentaire libre (textarea)
- [ ] Bouton "Enregistrer" → POST vers Apps Script avec payload :
  ```json
  {
    "action": "write",
    "module": "eval-cap-ifca",
    "row": {
      "Date": "2026-04-27T08:30",
      "Module": "eval-cap-ifca",
      "Pseudo": "E01",
      "Classe": "CAP IFCA 1",
      "Prof": "FH",
      "Epreuve": "EP3",
      "TP": "TP-050",
      "Note20": null,
      "Score%": null,
      "Detail": "...",
      "Temps": null,
      "C4.1": "A", "C4.2": "ECA",
      "Commentaire": "..."
    }
  }
  ```
- [ ] **Polling 8 s** : GET `?action=read&module=eval-cap-ifca` → si nouvelle ligne d'un autre prof, refresh UI + toast notification.
- [ ] **Last-write-wins** : timestamp ISO local + prof loggué → si même cellule (Pseudo + TP + Critère) écrite par 2 profs en < 30 s, garder le plus récent.
- [ ] **Buffer offline** : si fetch échoue → push dans `localStorage["inerweb.eval.buffer"]` (array). Fonction `inerwebRetryAll()` lancée toutes les 30 s.
- [ ] Indicateur visuel synchro : 🟢 sync / 🟡 buffer en attente (N items) / 🔴 erreur.
- [ ] **Critère** : enregistrer une éval test → ligne apparaît dans Sheet (vérifiable via curl read endpoint).

### 1.6 — Visualisation radar + bar toggle (~30 min)
- [ ] Charger Chart.js depuis CDN : `https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js`
- [ ] Onglet "Visualisation" → sélecteur élève (E01 → E24) + sélecteur épreuve (EP3 par défaut).
- [ ] Radar : axes = compétences EP3 (C4.1, C4.2, C4.3, C4.5, C4.6, C4.7, C5.1).
- [ ] Échelle 0-3 : NA=0, ECA=1, A=2, M=3.
- [ ] Pour chaque axe : moyenne des évals enregistrées sur cette compétence.
- [ ] Toggle radar/bar : un bouton bascule entre `type: 'radar'` et `type: 'bar'` (même dataset).
- [ ] **Critère** : insérer 3 évals E01 dans Sheet (manuellement ou via UI) → radar s'affiche avec des valeurs cohérentes.

### 1.7 — Bulletin EP3 imprimable (~20 min)
- [ ] Vue "Bulletin élève" : sélecteur élève → rendu A4 portrait.
- [ ] Layout :
  - En-tête : logo inerWeb Édu + nom CAP IFCA + classe + date édition + mention RGPD
  - Tableau compétences EP3 (lignes) × TP (colonnes), valeurs NA/ECA/A/M en couleur
  - Radar miniature (Chart.js, 200×200)
  - Section "Commentaires consolidés" : tous les commentaires concaténés
  - Pied de page : « Établissement privé — LP Jacques Raynaud · ÉQUATIO »
- [ ] CSS `@media print` : masquer nav + boutons, A4 strict (`@page { size: A4; margin: 1.5cm }`).
- [ ] Bouton "Imprimer" → `window.print()`.
- [ ] **Critère** : Ctrl+P depuis cette vue → preview A4 lisible.

### 1.8 — Extension Apps Script endpoint read (~20 min)
- [ ] `mkdir apps-script && cd apps-script`
- [ ] `clasp clone 1Dbt89zZu2Q84td_PurpvWiq26zx3FYGUUyDkuy3_ySQhuARMM76DFf5o`
- [ ] Si erreur clasp → log BLOQUÉ + écrire le code à coller manuellement dans `apps-script/CODE_A_COLLER.gs` + flagger dans RAPPORT_FINAL `ACTION_HUMAIN_REQUISE`.
- [ ] Modifier `Code.gs` ou `doGet.gs`, ajouter le branchement :
  ```javascript
  function doGet(e) {
    if (e.parameter && e.parameter.action === 'read' && e.parameter.module === 'eval-cap-ifca') {
      return readEvalCapIfca(e);
    }
    return ContentService.createTextOutput(JSON.stringify({status:'ok', service:'inerWeb Collecteur Universel v2.0'}))
      .setMimeType(ContentService.MimeType.JSON);
  }

  function readEvalCapIfca(e) {
    const SHEET_ID = '16T1T3yL6M49OhJUQS1SmFHwW7Bywp7m2kSXDiXdmItk';
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('eval-cap-ifca')
                  || SpreadsheetApp.openById(SHEET_ID).getActiveSheet();
    const data = sheet.getDataRange().getValues();
    const since = e.parameter.since ? new Date(e.parameter.since) : null;
    const filtered = since ? data.filter((row, i) => i === 0 || (row[0] && new Date(row[0]) > since)) : data;
    return ContentService.createTextOutput(JSON.stringify({status:'ok', count: filtered.length - 1, data: filtered}))
      .setMimeType(ContentService.MimeType.JSON);
  }
  ```
- [ ] `clasp push`
- [ ] Tenter redéploiement : `clasp deploy --description "v3 read endpoint"` → si fail, log ACTION_HUMAIN_REQUISE.
- [ ] **Critère** : `curl "https://script.google.com/.../exec?action=read&module=eval-cap-ifca"` retourne JSON valide avec champ `data`.

### 1.9 — Test grandeur nature local (~15 min)
- [ ] Lancer serveur local : `python -m http.server 8080` (en background PowerShell : `Start-Job { python -m http.server 8080 }`)
- [ ] Test smoke automatique via fichier `test/smoke.html` (généré) qui :
  - Ouvre 2 iframes ciblant `localhost:8080` (simule 2 profs)
  - Iframe 1 = prof FH → enregistre éval E01 sur TP-050 critère C4.1 = "A"
  - Wait 12 s
  - Iframe 2 = prof PW → vérifie via DOM que l'éval apparaît
- [ ] Si test KO → log les erreurs précises dans `JOURNAL.md` section `BUGS_PHASE_1_9`.
- [ ] **Critère** : test smoke PASSED ou bugs listés.

### 1.10 — Merge dev → main + déploiement (~5 min)
- [ ] Si phase 1.9 PASSED → `git checkout main && git merge dev --no-ff -m "release: v1.0.0 EP3 livraison 27/04" && git push`
- [ ] Sinon → rester sur `dev`, log `PHASE1_INCOMPLETE` dans JOURNAL + commits dev poussés.
- [ ] `git tag v1.0.0 && git push --tags`
- [ ] Attendre 60 s puis vérifier déploiement : `Invoke-WebRequest https://frigorx.github.io/inerweb-cap-ifca-eval/ -UseBasicParsing`
- [ ] **Critère** : URL répond 200 et HTML contient le titre "inerWeb Eval CAP IFCA".

---

## 4. PHASE 2 — V1.1 EP1 + EP2 (semaine du 28/04)

### 2.1 — Mappings EP1 + EP2
- [ ] Extraire de `formations.json` (chercher dans `_source/` ou `data/` des projets inerWeb existants — sinon créer à partir des specs CDC §5).
- [ ] EP1 : C1.1, C1.2, C1.3, C1.4, C1.5 → `data/mappings_ep1.json`
- [ ] EP2 : C2.1, C2.2, C3.1 à C3.7 → `data/mappings_ep2.json`
- [ ] Si pas de TP EP1/EP2 fournis → générer 3 TP placeholders par épreuve avec critères standards (à enrichir par le prof) : `data/tp_ep1.json`, `data/tp_ep2.json`.

### 2.2 — Sélecteur épreuve
- [ ] Ajouter onglets EP1 / EP2 / EP3 dans la vue éval.
- [ ] Charger dynamiquement `tp_{epreuve}.json` et `mappings_{epreuve}.json`.

### 2.3 — Radar consolidé 3 épreuves
- [ ] Vue élève : 3 mini-radars (EP1, EP2, EP3) côte à côte + 1 grand radar consolidé (axes = top 7 compétences sur les 3 EP, valeur = moyenne pondérée).

### 2.4 — Vue redoublants EP
- [ ] Filtre rapide en haut de page : "Redoublants EP1" / "EP2" / "EP3".
- [ ] Liste élèves dont le score moyen sur l'EP est < seuil ECA (= 1/3).
- [ ] Indicateur visuel : pastille rouge sur la carte élève.

### 2.5 — Tag + déploiement v1.1
- [ ] `git tag v1.1.0 && git push --tags`
- [ ] Vérification URL.

---

## 5. PHASE 3 — V1.2 dossier inspection

### 3.1 — Export PDF dossier complet par élève
- [ ] CDN : `https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js`
- [ ] 1 PDF par élève contenant : page de garde + 3 pages épreuve + page radar consolidé + page commentaires.
- [ ] Bouton "Exporter dossier complet" sur la vue élève.
- [ ] Bouton "Exporter tous les élèves" → ZIP via JSZip (CDN).

### 3.2 — Tableau de bord classe
- [ ] Vue classe : histogramme distribution notes EP3 + heatmap compétences acquises/non acquises (élèves en lignes, compétences en colonnes, couleur selon NA/ECA/A/M).
- [ ] Alerte automatique : élèves avec ≥3 NA sur compétences clés EP3 → liste rouge.

### 3.3 — Documentation
- [ ] `DOCUMENTATION_PROF.md` à la racine : tutoriel pas-à-pas (connexion, saisie iCal, évaluation, lecture radar, impression bulletin, export PDF).
- [ ] Captures d'écran si possible (skip si pas dispo en autonomie).

### 3.4 — Tag + déploiement v1.2
- [ ] `git tag v1.2.0 && git push --tags`

---

## 6. PHASE 4 — Clôture (toujours exécutée)

- [ ] Écrire `RAPPORT_FINAL.md` à la racine, contenant :
  - **Phases complétées** (avec liens commits et tags)
  - **Phases partielles** (avec sous-tâches OK et bloquées)
  - **Phases échouées** (avec raison)
  - **URL finale** déployée
  - **Bugs connus** (extraits de JOURNAL.md)
  - **ACTION_HUMAIN_REQUISE** : liste des tâches qui requièrent que Franck ou un humain agisse :
    - Redéploiement Apps Script depuis l'UI Google si clasp a échoué
    - Ajout des URL iCal réelles des 4 profs
    - Confirmation des initiales ZN et TM (CDC §13.C marqué "à confirmer")
    - Validation pseudonymisation E01 → E24 mappée aux vrais élèves (table USB locale)
  - **Suggestions d'évolution** (V2 : service worker offline complet, mode déconnecté total, intégration ED native si jamais réautorisée).
- [ ] Commit final : `git add RAPPORT_FINAL.md JOURNAL.md && git commit -m "docs: rapport final autonomie" && git push`
- [ ] Affichage console final : "✅ AUTONOMIE TERMINÉE — Voir RAPPORT_FINAL.md"

---

## 7. ANTI-BLOCAGE — Décisions par défaut (à appliquer sans hésiter)

| Hésitation | Choix par défaut |
|---|---|
| Bibliothèque graphique | **Chart.js 4.4.0** via cdn.jsdelivr.net |
| Parser iCal | **ical.js 1.5.0** via unpkg |
| Polling | **8 secondes strict** |
| Format date affichage | **DD/MM/YYYY HH:mm** (FR) |
| Codes élèves manquants | **E01 à E24** par défaut |
| Initiales ZN / TM (à confirmer CDC §13) | Les utiliser tels quels comme placeholders fonctionnels |
| Apps Script clasp KO | Continuer SANS endpoint read, écrire `CODE_A_COLLER.gs` + flagger ACTION_HUMAIN |
| Package_EP3_extracted introuvable | Créer index.html minimal de zéro à partir des specs CDC §5 |
| Pas d'iCal renseigné par un prof | Afficher invitation, ne pas bloquer |
| TP EP1/EP2 non fournis | Générer placeholders + flagger pour enrichissement |
| Conflit numérotation TP-050..055 avec v7.8.5 | Vérifier `_source/`, sinon décaler à TP-100..105 (log la décision) |
| Test smoke échec partiel | Continuer phases suivantes, log les bugs |
| Rate limit GitHub | Sleep 60 s, retry, max 5 fois |
| Rate limit Google | Sleep 90 s, retry, max 5 fois |
| Erreur réseau ponctuelle | Retry 3 fois avec backoff 5/15/30 s |

---

## 8. PRINCIPE GÉNÉRAL

> **Mieux vaut un V1 livré à 80 % utilisable lundi, que un V1 à 100 % jamais terminé.**
> En cas de doute : choisis l'option qui livre quelque chose de testable, logue ta décision, continue.
> Le silence n'est pas une option : tu agis ou tu logues une décision/blocage. Toujours.

---

## 9. ANNEXE — Reprise depuis nouveau chat

Si une nouvelle session Claude Code démarre :
1. Lire `PLAN.md` (ce fichier)
2. Lire `CLAUDE.md` (règles permanentes)
3. Lire `JOURNAL.md` pour reprendre où la session précédente s'est arrêtée
4. Identifier la dernière phase cochée → reprendre à la phase suivante
5. Si `RAPPORT_FINAL.md` existe → projet terminé, ne rien refaire sauf demande explicite.
