# Cahier des charges — inerWeb Eval CAP IFCA (EP1 / EP2 / EP3)

**Version** : 1.0
**Date** : 2026-04-24
**Auteur** : F. Henninot — LP Privé Jacques Raynaud, Campus ÉQUATIO Marseille
**Échéance livraison V1** : lundi 27/04/2026 (test grandeur nature S1 révisions EP3)
**Statut** : à démarrer (peut repartir d'un nouveau chat)

---

## 1. Contexte

Outil d'évaluation et de suivi de positionnement compétences pour les **CAP IFCA 1 et 2**, utilisable simultanément par **4 enseignants** sur leurs propres postes.

Période ciblée : **4 dernières semaines de l'année scolaire 2025-2026** (S1 27/04 → fin juin), priorité immédiate sur les **révisions EP3** (3 séances : S1 27/04, S2 04/05, S3 11/05).

L'outil doit aussi servir aux élèves qui doivent **repasser EP1 ou EP2** : les 3 épreuves doivent rester gérables.

## 2. Objectifs

- Donner aux 4 profs une **vue partagée temps réel** des évaluations
- Suivre l'**évolution du positionnement compétences** par élève sur les 3 épreuves (EP1, EP2, EP3)
- Permettre à chaque prof d'**importer son iCal EcoleDirecte** pour voir « qui fait quoi quand »
- Filtrer la vue par classe (CAP IFCA 1, CAP IFCA 2, autres si étendu)
- Préparer la **présentation aux inspecteurs** (radar/toile d'araignée par élève et par épreuve)
- Tester rapidement plusieurs outils inerWeb en conditions réelles avant l'inspection / fin d'année

## 3. Périmètre

### Inclus V1 (lundi 27/04)
- Connexion 4 profs (FH, PW, ZN, TM) avec pseudo/initiales
- Saisie URL iCal personnel par prof → vue agenda fusion par classe
- Pseudonymisation élèves (E01 → E24) → conformité RGPD
- Évaluation critère par critère sur les **6 TP révisions EP3** (TP-050 à TP-055)
- Stockage centralisé Google Sheet via collecteur universel
- Polling 8 s pour synchro temps réel entre les 4 profs
- Radar (toile d'araignée) compétences EP3 par élève
- Bar graph optionnel (toggle radar/bar)
- Bulletin EP3 imprimable par élève
- Cache localStorage uniquement comme **buffer offline** (jamais source de vérité)

### Inclus V1.x (semaine du 28/04)
- Extension EP1 et EP2 : grilles d'évaluation, mappings compétences, radars
- Vue « élèves en redoublement EP » → focus sur les épreuves à repasser
- Tableau de bord classe : distribution notes, alertes élèves à risque
- Export PDF dossier complet par élève (3 épreuves + radar consolidé)

### Hors périmètre
- Pas de données nominatives en cloud → **pseudonymisation obligatoire** (table de correspondance gardée en local USB côté prof maître)
- Pas de Node.js / pas de mode local → **GitHub Pages + Google Sheet uniquement**
- Pas de remplacement d'EcoleDirecte (cahier de texte reste sur ED)

## 4. Architecture technique

### Frontend — GitHub Pages
- **Repo** : `frigorx/inerweb-cap-ifca-eval`
- **URL** : `https://frigorx.github.io/inerweb-cap-ifca-eval/`
- 100% statique : HTML + CSS + JS vanilla (pas de framework lourd)
- Lib `ical.js` (CDN) pour parser les iCal EcoleDirecte
- Polling toutes les 8 s vers Apps Script pour rafraîchir
- Pas de service worker pour V1 (à voir en V2 pour mode offline complet)

### Backend — Google Sheet + Apps Script (collecteur universel)
- **Sheet** : `16T1T3yL6M49OhJUQS1SmFHwW7Bywp7m2kSXDiXdmItk`
- **Apps Script** : `1Dbt89zZu2Q84td_PurpvWiq26zx3FYGUUyDkuy3_ySQhuARMM76DFf5o`
- **URL exec** : `https://script.google.com/macros/s/AKfycbz5Bkn1tacs98bJezjnnYt38Yuy6QiHh7qWuEk1KRxS4UMIjl0yFOA0FVakLwCAJhZ5/exec`
- **Statut** : `{"status":"ok","service":"inerWeb Collecteur Universel v2.0"}` (vérifié 2026-04-24)
- **À ajouter** : endpoint `GET ?action=read&module=eval-cap-ifca` pour la lecture des évaluations existantes
- **Structure colonnes Sheet** : Date | Module | Pseudo (E01…E24) | Classe | Prof (FH/PW/ZN/TM) | Épreuve (EP1/EP2/EP3) | TP | Note/20 | Score% | Détail | Temps | C1.1…C5.x (niveaux NA/ECA/A/M) | Commentaire

### Pseudonymisation
- **Codes élèves** : `E01` → `E24` (CAP IFCA 1) puis suite pour CAP IFCA 2
- **Table correspondance** : fichier local `correspondance_eleves.json` gardé sur **USB côté prof maître** uniquement, jamais commit, jamais cloud
- **Affichage prof** : possibilité de saisir un alias court côté UI (pas envoyé au Sheet)

### Connexion prof + iCal
- Écran d'accueil → choix `FH | PW | ZN | TM`
- Champ « URL iCal EcoleDirecte » (collé une fois, mémorisé localStorage)
- Parsing côté client de l'iCal → événements pro filtrés par mots-clés (CAP IFCA, CAP, IFCA, FROID, CVC…)
- **Vue agenda fusion** : 4 iCal merge → timeline par classe avec couleur par prof
- Affichage : « Lun 27/04 8h-12h — CAP IFCA 1 — TP1A — FH + PW »

## 5. Modèle compétences (multi-épreuves)

Source : `data/formations.json` v6.0 (filière CAP IFCA, déjà documenté dans `kb_referentiels_froid_cvc.md`)

### EP1 — Préparation d'intervention
Compétences mobilisées : C1.1, C1.2, C1.3, C1.4, C1.5

### EP2 — Réalisation d'une intervention
Compétences mobilisées : C2.1, C2.2, C3.1 → C3.7

### EP3 — Mise en service / maintenance
Compétences mobilisées : C4.1, C4.2, C4.3, C4.5, C4.6, C4.7, C5.1
+ secondaires : C1.3 (doc), C2.2 (sécu), C3.7 (remplacement composant)

### Niveaux d'évaluation
4 niveaux unifiés : **NA** (Non acquis) · **ECA** (En cours d'acquisition) · **A** (Acquis) · **M** (Maîtrisé)

### Visualisations
- **Radar / toile d'araignée** : 1 par épreuve + 1 consolidé sur les 3 EP → **format préféré inspecteurs**
- **Bar graph** : toggle alternatif sur la même page (préférence prof)
- **Évolution temporelle** : ligne d'évolution du score par compétence sur les évaluations successives

## 6. Source de données initiale

Package fourni par cowork le 2026-04-24 :
- **Archive** : `C:/Users/henni/OneDrive/Bureau/25 26/vrac fiep 3/Package_EP3_CAP_IFCA_final.zip`
- **Extrait** : `C:/Users/henni/OneDrive/Bureau/25 26/vrac fiep 3/Package_EP3_extracted/`

Contenu utile :
- `inerweb_eval/public/index.html` (60 Ko) → **base à adapter en mode statique GitHub Pages**
- `INTEGRATION_inerweb/catalogue_additions_revisions_EP3.json` → 6 TP TP-050 à TP-055
- `INTEGRATION_inerweb/mappings_additions_revisions_EP3.json` → mappings EP3 Situation A
- `S1_27-04-2026/` à `S3_11-05-2026/` → 6 TP HTML imprimables
- `Fiches_Whart/` → 9 fiches enseignement DG-A et DG-B
- `Carte_progression_CAP_IFCA_fin_annee.html` + .csv

## 7. Plan de livraison

### Phase 1 — V1 EP3 livrable lundi 27/04
1. Créer repo `frigorx/inerweb-cap-ifca-eval` + activer Pages
2. Adapter `public/index.html` du package : retirer appels `/api/*`, brancher `inerweb-results.js` du collecteur universel
3. Étendre Apps Script avec endpoint `GET read` (lecture des évaluations)
4. Implémenter écran accueil 4 profs + saisie iCal
5. Implémenter vue radar EP3 + bar graph toggle
6. Charger les 6 TP TP-050 à TP-055 + critères depuis JSON intégration
7. Tester avec 2 profs en simultané (FH + PW) avant le week-end
8. Push final + URL diffusée aux 4 profs dimanche soir

### Phase 2 — V1.1 EP1 + EP2 (semaine du 28/04 au 02/05)
1. Importer mappings EP1 et EP2 depuis `formations.json`
2. Ajouter grilles d'évaluation pour les TP EP1/EP2 (à créer/adapter)
3. Vue « élèves redoublants EP » (filtre rapide)
4. Radar consolidé 3 épreuves

### Phase 3 — V1.2 dossier inspection
1. Export PDF dossier complet par élève
2. Tableau de bord classe finalisé
3. Documentation prof + tutoriel rapide vidéo si possible

## 8. Conformité RGPD

Règle inerWeb : « **local-only**, jamais de cloud pour données élèves » — voir `feedback-rgpd-inerweb.md`

**Application ici** : la pseudonymisation E01→E24 retire toute donnée nominative du Google Sheet. La table de correspondance E0x → vrai nom reste en local sur USB côté prof maître. Aucune photo, aucun nom, aucune date de naissance stockés en cloud.

**Mention obligatoire** sur l'écran d'accueil :
> « Établissement privé — LP Jacques Raynaud · ÉQUATIO · Outil pédagogique interne · données pseudonymisées »

## 9. Charte graphique appliquée

Voir `CLAUDE.md` (instructions globales) :
- Police : Calibri 14pt minimum, Trebuchet MS bold pour titres
- Couleurs : bleu `#1b3a63` + orange `#ff6b35`
- Fond clair uniquement, jamais dark mode
- Logo : flocon ❄ + « inerWeb » + cartouche orange « Édu » + « par F. Henninot »
- Maximum 3 niveaux de hiérarchie visuelle, 3 clics max pour toute action

## 10. Comptes / déploiement

- **GitHub** : `frigorx`
- **Google projet** : `inerweb.fh@gmail.com`
- **Déploiement** : GitHub Pages (auto sur push branche `main`)
- **Branches** : `main` (production) + `dev` (test grandeur nature préparation)

## 11. Risques & points de vigilance

| Risque | Mitigation |
|---|---|
| Apps Script saturation requêtes (quota Google) | Polling 8 s + cache 5 s côté client → ~7-8 req/min/prof × 4 profs = OK quota |
| Conflit d'écriture 2 profs sur même évaluation | Last-write-wins + timestamp + prof loggué dans cellule |
| Perte connexion classe | Cache localStorage offline + retry auto via `inerwebRetryAll()` |
| iCal EcoleDirecte change de format | Parsing tolérant (try/catch) + message d'erreur propre |
| Radar surchargé si 30+ compétences | Vue radar par épreuve (max ~7-8 axes), pas tout fusionné par défaut |
| TP-050 à 055 conflit avec numérotation v7.8.5 actuelle | Vérifier avant fusion ; sinon décaler à TP-100+ |

## 12. Pour repartir d'un nouveau chat

Tout est dans ce fichier. Étapes pour reprendre :
1. Lire ce CDC
2. Lire `MEMORY.md` du dossier mémoire (`C:/Users/henni/.claude/projects/C--Users-henni/memory/`)
3. Vérifier état de l'archive : `C:/Users/henni/OneDrive/Bureau/25 26/vrac fiep 3/Package_EP3_extracted/`
4. Vérifier état du repo `frigorx/inerweb-cap-ifca-eval` (peut ne pas exister encore)
5. Reprendre le **Plan de livraison §7 Phase 1** étape par étape

## 13. Annexes

### A. Liste des 6 TP révisions EP3
| ID | Titre court | Séance |
|---|---|---|
| TP-050 | Pose manifold + tirage au vide + fuite | Lun 27/04 |
| TP-051 | Remplacement + réglage pressostat BP | Lun 04/05 |
| TP-052 | Dépose + étanchéité + bon intervention | Lun 11/05 |
| TP-053 | Mesures T° pures (6 points + ΔT) | Lun 27/04 |
| TP-054 | Mesures P/T + SC/SR + Fiche MES | Lun 04/05 |
| TP-055 | Incondensables + TeqCO₂ + Plaque FGaz | Lun 11/05 |

### B. Liste des 9 fiches Whart (séances DG-A / DG-B)
S1 Mar 28/04 DG-A · S1 Jeu 30/04 DG-B · S2 Mar 05/05 DG-A · S2 Jeu 07/05 DG-B · S3 Mar 12/05 DG-A · S4 Mar 19/05 DG-A · S4 Jeu 21/05 DG-B · S5 Mar 26/05 DG-A · S5 Jeu 28/05 DG-B

### C. Initiales profs
- **FH** : F. Henninot (référent, prof maître)
- **PW** : Pascal Whart (atelier)
- **ZN** : (à confirmer)
- **TM** : (à confirmer)

### D. Liens utiles
- Sheet : https://docs.google.com/spreadsheets/d/16T1T3yL6M49OhJUQS1SmFHwW7Bywp7m2kSXDiXdmItk
- Apps Script éditeur : https://script.google.com/d/1Dbt89zZu2Q84td_PurpvWiq26zx3FYGUUyDkuy3_ySQhuARMM76DFf5o/edit
- Snippet collecteur : https://github.com/frigorx/inerweb-frigolo/blob/main/inerweb-results.js
