# 📘 Documentation enseignant — inerWeb Eval CAP IFCA

> Tutoriel pas-à-pas pour utiliser l'outil partagé d'évaluation EP1/EP2/EP3.
> URL : https://frigorx.github.io/inerweb-cap-ifca-eval/

---

## 1. Première connexion

1. Ouvrir l'URL dans Chrome ou Edge (recommandé).
2. Choisir votre identifiant : **FH**, **PW**, **ZN** ou **TM**.
3. Coller votre URL iCal EcoleDirecte (optionnel mais conseillé).
   - Sur EcoleDirecte : *Mon agenda > Exporter > Lien iCal*.
4. Cliquer **Continuer →**.

À chaque réouverture, le profil est mémorisé en local (localStorage). Bouton ↻ en haut à droite pour changer de prof.

---

## 2. Saisir une évaluation

### Ouvrir l'onglet ✍ Évaluation
1. **Choisir l'épreuve** : EP1, EP2 ou EP3 (par défaut EP3 — révisions priorité actuelle).
2. **Choisir la classe** : CAP IFCA 1 (E01→E12) ou CAP IFCA 2 (E13→E24).
3. **Sélectionner le TP** dans la grille (ex : TP-050 — Pose manifold).

### Évaluer chaque élève sur chaque compétence
- Pour chaque compétence du TP, une ligne par élève.
- Cliquer sur le niveau atteint : **NA** (Non acquis) · **ECA** (En cours) · **A** (Acquis) · **M** (Maîtrisé).
- Cliquer une seconde fois sur le même niveau pour le désélectionner.
- Le brouillon est sauvegardé automatiquement (localStorage).

### Enregistrer
- Bouton **💾 Enregistrer** : envoie toutes les évaluations vers le Google Sheet.
- Indicateur de synchro en bas à droite :
  - 🟢 **Sync** : tout est OK
  - 🟡 **Buffer (N)** : connexion perdue, N évaluations en attente, renvoi auto toutes les 30 s
  - 🔴 **Erreur** : problème de communication

---

## 3. TP tournant TP-056 (récupération + remplacement déshydrateur)

Onglet 🔁 **TP-056 tournant** — utilisé en autonomie élève pendant que les autres font TP-050 à 055.

### Côté élève (autonomie)
1. Choisir l'élève en cours dans la liste déroulante.
2. Avancer phase par phase (P0 → P5) en cochant les critères de chaque phase.
3. Une phase est verrouillée tant que la précédente n'est pas terminée et que ses visas prof obligatoires ne sont pas apposés.

### Côté prof (visas STOP)
- 5 points STOP intermédiaires :
  - **V1** : tirage au vide validé (fin P3)
  - **V2** : quantité fluide récupérée (fin P3)
  - **V3** : avant brasure (P4)
  - **V4** : brasures vérifiées (fin P4)
  - **V5** : étanchéité + recharge finale (fin P5)
- Bouton **Apposer visa prof** → saisir vos initiales pour confirmer.
- La note /20 se met à jour automatiquement (5 phases pondérées + bonus visas).

### Enregistrer
- Bouton **💾 Enregistrer la session** : pousse la note + une ligne par compétence couverte vers le Sheet.

---

## 4. Visualiser le radar / bar graph

Onglet 🎯 **Radar**.
1. Choisir l'élève.
2. Choisir le type : **Radar (toile)** ou **Bar graph**.
3. Cliquer **↻ Actualiser** si besoin.

Le radar affiche les 8 axes de l'EP3 (C2.2, C4.1 → C4.7, C5.1) avec la moyenne des évaluations enregistrées. Échelle : NA=0, ECA=1, A=2, M=3.

---

## 5. Bulletin imprimable

Onglet 🖨 **Bulletin**.
1. Choisir l'élève.
2. Vérifier le contenu (matrice compétences × TP + radar mini + commentaires).
3. **🖨 Imprimer** : ouvre la fenêtre d'impression (CSS @media print activé, format A4 portrait).
4. **📄 PDF** : génère un PDF directement (via html2pdf).
5. **📦 PDF tous** : génère un PDF par élève (24 fichiers en ~1 min).

---

## 6. Agenda partagé 4 profs

Onglet 📅 **Agenda**.

- Si vous avez saisi une URL iCal lors de la connexion (ou via ⚙ Config), l'agenda affiche vos événements **CAP / IFCA / FROID / CVC / MFER** filtrés.
- En théorie, fusion des 4 iCal des profs, mais EcoleDirecte peut bloquer le fetch direct (CORS).
- Si l'agenda est vide alors qu'une URL est saisie : c'est probablement le blocage CORS — alternative à venir en V1.1 (coller le contenu .ics).

---

## 7. ⚙ Config

- **Mon URL iCal EcoleDirecte** : modifier ou re-saisir.
- **Apps Script** : URL de l'endpoint de synchronisation (lecture seule).
- **Buffer offline** : voir les évaluations en attente d'envoi, forcer un renvoi, ou vider (perdre).

---

## 8. RGPD — Pseudonymisation obligatoire

- Les élèves sont identifiés uniquement par leur **pseudo E01 → E24**.
- **Aucun nom, prénom, photo, date de naissance** n'est envoyé au cloud.
- La table de correspondance E0x → vrai élève reste **localement sur USB** côté prof maître (FH).
- Mention sur l'écran d'accueil et le bulletin : *« Établissement privé — LP Jacques Raynaud · ÉQUATIO · Outil pédagogique interne · données pseudonymisées »*

---

## 9. Dépannage rapide

| Problème | Solution |
|---|---|
| Badge sync 🔴 | Recharger la page (F5). Vérifier que le réseau fonctionne. |
| Évaluations non enregistrées (buffer 🟡) | Bouton **↻ Renvoyer maintenant** dans ⚙ Config. Ou attendre le retry auto (30 s). |
| Radar vide | Vérifier qu'au moins une évaluation a été enregistrée pour cet élève. Cliquer ↻ Actualiser. |
| Agenda vide | Saisir l'URL iCal dans ⚙ Config. Si déjà saisie → CORS EcoleDirecte (voir §6). |
| Apps Script timeout | Attendre 60 s puis recharger. Quota Google reset toutes les minutes. |
| Bulletin imprimé tronqué | Marges du navigateur trop larges → `Plus de paramètres > Marges = Aucune` dans la fenêtre d'impression. |

---

## 10. Pour aller plus loin

- **Enrichir les TP EP1/EP2** : éditer `data/tp_ep1.json` et `data/tp_ep2.json` (placeholders en V1.0). Ajouter les opérations et critères réels par TP.
- **Confirmer initiales ZN et TM** : modifier `js/store.js` ligne `PROFS = [...]`.
- **Suivi multi-classes** : les classes sont dans `data/eleves_pseudo.json`. Étendre si besoin (CAP IFCA 3, etc.).

---

✅ Tout problème non résolu : voir `RAPPORT_FINAL.md` ou contacter F. Henninot.
