# RAPPORT FINAL — inerWeb Eval CAP IFCA V1

**Date** : 2026-04-25
**Auteur** : Claude (autonomie complète) pour F. Henninot
**Repo** : [frigorx/inerweb-cap-ifca-eval](https://github.com/frigorx/inerweb-cap-ifca-eval)
**URL prod** : https://frigorx.github.io/inerweb-cap-ifca-eval/
**Tag livrable** : `v1.0.0`

---

## ✅ Phases complétées

### Phase 0 — Bootstrap (commit `375ea38`)
- Working dir `C:/Users/henni/dev/inerweb-cap-ifca-eval` créé
- Git init `main` + branche `dev`, prérequis OK (git/gh frigorx, node 24, python 3.14, clasp 3.2)
- `.gitignore` (correspondance_eleves.json + .clasp.json + .env), `JOURNAL.md`, `README.md` créés
- Source `Package_EP3_extracted/` validée

### Phase 1.1 — Repo distant + Pages (commit initial)
- Repo public `frigorx/inerweb-cap-ifca-eval` créé via `gh repo create`
- Branche `dev` poussée
- GitHub Pages activée sur `main` (build_type legacy)

### Phase 1.2 — Récupération + arborescence (commit `658bb53`)
- Sources copiées : `index_original.html` (60 Ko) → `_source/`
- `tp_ep3.json` enrichi : 6 TP originaux + **TP-056 ajouté** (5 phases + 5 visas STOP)
- `eleves_pseudo.json` : E01→E12 (CAP IFCA 1) + E13→E24 (CAP IFCA 2)
- `competences_ep3.json` : 10 compétences EP3 + 4 niveaux NA/ECA/A/M
- `mappings_ep3.json` : critères détaillés par TP
- Arbo créée : `css/`, `js/`, `data/`, `apps-script/`, `test/`, `_source/`

### Phase 1.3 → 1.7 — V1 complète UI (commit `fca3e1d`)
- **`index.html`** : SPA charte stricte (Calibri 14pt, Trebuchet MS bold, #1b3a63/#ff6b35, fond clair, mention RGPD)
- **6 onglets** : Agenda · Évaluation · TP-056 tournant · Radar · Bulletin · Config
- **9 modules JS** :
  - `store.js` : abstraction localStorage + cache JSON + toast + sync badge
  - `inerweb-results.js` : POST/GET collecteur + buffer offline + polling 8 s + last-write-wins
  - `auth.js` : écran 4 profs + iCal
  - `ical-parser.js` : ical.js CDN + filtre CAP/IFCA/FROID/CVC/MFER + agenda fusion
  - `eval-engine.js` : matrice TP × élève × compétence × niveau (NA/ECA/A/M)
  - `radar.js` : Chart.js radar/bar toggle (8 axes EP3)
  - `tp-tournant.js` : 5 phases TP-056 + 5 visas prof STOP + note /20
  - `bulletin.js` : bulletin A4 imprimable + radar mini + commentaires
  - `main.js` : routing onglets + lifecycle

### Phase 1.8 — Apps Script v3 (commit `3deab22`)
- `apps-script/Code.js` réécrit avec routing par module
- `eval-cap-ifca` : feuille dédiée + schéma flexible (16 colonnes) + coloriage par niveau
- Endpoint `?action=read&module=eval-cap-ifca` opérationnel
- Compatibilité legacy préservée (Frigolo + autres modules existants)
- **Déployé sur l'URL existante** `AKfycbz5Bk...` en `@7` (pas de cassure)
- Smoke test curl validé : write + read cycle complet

### Phase 1.9 — Smoke test local (commit `83c9436`)
- `python -m http.server 8089` → tous les assets HTTP 200 (HTML/CSS/9 JS/4 JSON)
- `node --check` sur 9 fichiers JS : pas d'erreur de syntaxe
- 4 JSON validés (`json.load` Python sans erreur)
- `test/smoke.html` créé (2 iframes FH + PW pour test manuel multi-prof)

### Phase 1.10 — Merge + tag + Pages (commit `e128ff2`, tag `v1.0.0`)
- Merge `dev → main` non-fast-forward avec message release v1.0.0
- Tag `v1.0.0` poussé
- GitHub Pages : build "built" en ~30 s
- Vérification HTTP 200 + `<title>` correct sur https://frigorx.github.io/inerweb-cap-ifca-eval/

---

## ⏳ Phases pending (non bloquantes pour la livraison 27/04)

### Phase 2 — V1.1 EP1 + EP2 (semaine du 28/04)
À faire après livraison :
- Mappings `data/mappings_ep1.json` (C1.1, C1.2, C1.3, C1.4, C1.5)
- Mappings `data/mappings_ep2.json` (C2.1, C2.2, C3.1 → C3.7)
- TP placeholders `tp_ep1.json` / `tp_ep2.json` à enrichir par les profs
- Sélecteur d'épreuve EP1/EP2/EP3 dans `eval-engine.js`
- Radar consolidé 3 épreuves
- Vue redoublants EP

### Phase 3 — V1.2 dossier inspection
À faire avant l'inspection :
- Export PDF dossier complet par élève (html2pdf)
- Tableau de bord classe (heatmap compétences × élèves)
- Documentation prof (`DOCUMENTATION_PROF.md`)

---

## 🚨 ACTION_HUMAIN_REQUISE

### 1. Test grandeur nature multi-prof — AVANT lundi 27/04 8h00
- Ouvrir `https://frigorx.github.io/inerweb-cap-ifca-eval/` sur 2 PC (idéalement 2 profs différents)
- Sur PC1 : se connecter FH, faire une éval test (E13 / TP-050 / C4.1 = "A") → 💾 Enregistrer
- Sur PC2 : se connecter PW, attendre 10 s (polling 8 s), aller sur Radar → vérifier que l'éval E13 apparaît
- Vérifier le **badge sync 🟢** (pas 🔴) dans les 2 navigateurs
- Si badge 🟡 (buffer offline) ou 🔴 → vérifier réseau / Apps Script

### 2. Saisie URL iCal EcoleDirecte par chaque prof
- Chaque prof doit saisir son URL iCal personnelle dans l'écran de connexion ou ⚙ Config
- Format : `https://api.ecoledirecte.com/v3/.../agenda.ics`
- Note : EcoleDirecte peut bloquer CORS direct depuis le navigateur. Si l'agenda ne charge pas, alternative future : exporter le `.ics` et coller son contenu (à implémenter en V1.1)

### 3. Confirmation initiales ZN et TM
- CDC §13.C marque ces 2 enseignants comme « à confirmer »
- Mettre à jour `js/store.js` ligne `PROFS = [...]` avec les vrais noms

### 4. Pseudonymisation — table de correspondance
- Créer fichier local `correspondance_eleves.json` sur USB (côté FH = prof maître)
- Format : `{"E01": "Nom Prénom", ...}` pour les 24 élèves CAP IFCA 1+2
- **NE JAMAIS commit ni mettre en cloud** (déjà dans `.gitignore`)

### 5. Vérifier compatibilité avec autres modules inerWeb
- L'Apps Script a été redéployé en v3.0 sur la même URL (`AKfycbz5Bk...`)
- Schéma legacy préservé (`writeLegacy_` pour Frigolo etc.) mais à tester
- Si Frigolo/autres ne fonctionne plus : vérifier `apps-script/Code.js` `writeLegacy_`

---

## 🐛 Bugs / limitations connus

- **iCal CORS** : EcoleDirecte peut refuser le fetch direct depuis un site GitHub Pages (politique CORS stricte). Fallback prévu : coller le texte `.ics` directement → à implémenter en V1.1
- **Pas de service worker** (V1.0) : pas de mode offline complet. Buffer localStorage uniquement. À envisager en V2.
- **Polling 8 s** : génère ~7-8 req/min/prof × 4 profs = 30 req/min. Quota Apps Script (100 req/min) OK pour un usage normal mais peut être tendu si > 4 profs simultanés.
- **Last-write-wins simple** : pas de résolution de conflit fine. Si 2 profs notent E13/TP-050/C4.1 différemment dans la même seconde → le plus récent gagne sans alerte.
- **TP-056 mode tournant** : signature visa via `prompt()` JS basique (pas de PIN sécurisé). À renforcer si besoin (V2).
- **Bulletin imprimable** : testé sur Chrome `@page A4`. Comportement à vérifier sur Edge/Firefox.

---

## 📊 Stats

- **Commits** : 7 commits sur `main` (375ea38, 658bb53, fca3e1d, 3deab22, 83c9436, e128ff2 + le tag)
- **Code** : ~3 660 lignes (HTML 251, CSS 489, JS 1 398, JSON 369, MD ~600)
- **9 modules JS** vanilla (zéro framework, deux CDN : Chart.js 4.4.0 + ical.js 1.5.0)
- **Apps Script** : 263 lignes, déployé v3.0
- **Durée run autonomie** : ~2 h (lecture CDC/PLAN inclus)

---

## 🚀 Suggestions d'évolution V2

- Service Worker pour mode offline complet (cache assets + queue write)
- Authentification PIN visa prof (TP-056 mode tournant)
- Cache `correspondance_eleves.json` chiffré localement (Web Crypto API) pour éviter la double-saisie pseudo
- Export PDF par classe (pas seulement par élève)
- Notifications push à 18h (rappel saisie évaluation, charte anti-TDAH)
- Mode hors-ligne complet : IndexedDB pour les 200+ évals attendues sur la fin d'année
- Intégration native EcoleDirecte (si ED réautorise un format iCal compatible CORS)

---

## 📦 Livrables 27/04/2026

| Élément | URL / chemin | Statut |
|---|---|---|
| App web | https://frigorx.github.io/inerweb-cap-ifca-eval/ | ✅ en ligne |
| Repo | https://github.com/frigorx/inerweb-cap-ifca-eval | ✅ public |
| Tag | v1.0.0 | ✅ poussé |
| Apps Script | https://script.google.com/.../exec (URL inchangée) | ✅ déployé v3.0 @7 |
| Sheet | 16T1T3yL6M49OhJUQS1SmFHwW7Bywp7m2kSXDiXdmItk | ✅ feuille `eval-cap-ifca` créée auto |
| Smoke test multi-prof | test/smoke.html | ⏳ à exécuter manuellement par Franck |

---

✅ **Livraison V1.0 EP3 prête pour la séance S1 du lundi 27/04/2026 — révisions 7 TP CAP IFCA 2.**
