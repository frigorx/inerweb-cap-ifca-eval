# AUDIT FIABILITÉ — point de vue prof
**Date** : 2026-04-26 · **Avant** la séance S1 du 27/04 · **Auditeur** : Claude (autonomie complète)

---

## TL;DR

| Question | Réponse |
|---|---|
| Quelle adresse mail pousse sur GitHub ? | **`fr.henninot@gmail.com`** (configurée dans le repo, compte GitHub `frigorx`) |
| Quel compte Google pousse l'Apps Script ? | **`inerweb.fh@gmail.com`** (clasp authentifié, scopes drive/cloud-platform) |
| Quel compte stocke le Google Sheet ? | **`inerweb.fh@gmail.com`** très probablement (le Sheet est édité par l'Apps Script qui appartient à ce compte) |
| Tout est-il poussé ? | ✅ Oui — main + 6 tags (v1.0.0 → v1.5.0) + dev synchronisé + Pages built |
| Peut-on récupérer les notes en cas de crash ? | ✅ Oui — Sheet directement accessible sur drive même si l'app meurt |
| Peut-on se fier à 200% ? | ❌ **Non — à 95% oui. Les 5% sont listés ci-dessous.** |

---

## 1. COMPTES UTILISÉS — qui pousse où

### GitHub (repo public)
- **Email auteur des commits** : `fr.henninot@gmail.com`
- **Nom auteur** : `F. Henninot (frigorx)`
- **Compte gh CLI** : `frigorx` (token avec scopes `gist`, `read:org`, `repo`, `workflow`)
- **Repo** : https://github.com/frigorx/inerweb-cap-ifca-eval (public, branche par défaut `main`)
- **URL prod** : https://frigorx.github.io/inerweb-cap-ifca-eval/

### Google Apps Script
- **Compte clasp authentifié** : `inerweb.fh@gmail.com` ✅ vérifié
- **Script ID** : `1Dbt89zZu2Q84td_PurpvWiq26zx3FYGUUyDkuy3_ySQhuARMM76DFf5o`
- **URL exec** : `https://script.google.com/macros/s/AKfycbz5Bkn1tacs98bJezjnnYt38Yuy6QiHh7qWuEk1KRxS4UMIjl0yFOA0FVakLwCAJhZ5/exec`
- **Version déployée** : `@7` (v3.0 — endpoint read+write eval-cap-ifca)
- **Scopes** : `drive.file`, `drive.metadata.readonly`, `cloud-platform`, `logging.read`, `script.external_request`, etc.

### Google Sheet (stockage final des notes)
- **Sheet ID** : `16T1T3yL6M49OhJUQS1SmFHwW7Bywp7m2kSXDiXdmItk`
- **URL directe** : https://docs.google.com/spreadsheets/d/16T1T3yL6M49OhJUQS1SmFHwW7Bywp7m2kSXDiXdmItk/edit
- **Propriétaire effectif** : très probablement `inerweb.fh@gmail.com` (à confirmer dans Drive)
- **Feuilles présentes** :
  - `eval-cap-ifca` : 16 colonnes (`_timestamp`, `Date`, `Module`, `Pseudo`, `Classe`, `Prof`, `Epreuve`, `TP`, `Code`, `Niveau`, `Note20`, `Score%`, `Detail`, `Temps`, `Visas`, `Commentaire`)
  - `Résultats` (legacy) : 5 lignes — autres modules inerWeb

---

## 2. ÉTAT DES CHAÎNES — testé live

### ✅ Chaîne write/read Apps Script
- **Stress test** : 5 POSTs consécutifs (E11→E15 / TP-AUDIT / C4.1 / FH) → 5 lignes en Sheet ✅
- **Test mode navigateur** (Node fetch) : 1 POST E16/PW/C4.6/A → `{"status":"ok","row":9}` en 3,7 s ✅
- **Read** : retourne JSON propre avec toutes les colonnes ✅
- **Latence read** : 2,1 s à 3,1 s (médiane 2,7 s) — acceptable pour polling 8 s

### ✅ Persistance localStorage
- Buffer offline : clé `inerweb.cap-ifca.eval.buffer` ✅
- Brouillons : `inerweb.cap-ifca.draft.eval.{epreuve}.{tpId}` ✅
- iCal : `inerweb.cap-ifca.ical.{url|text}.{prof}` ✅
- Survit au F5 ✅
- Survit à la fermeture du navigateur ✅

### ✅ GitHub Pages
- Build statut : `built`
- HTTP 200 sur racine + tous les assets clés (16 fichiers testés)
- Tags poussés : v1.0.0, v1.1.0, v1.2.0, v1.3.0, v1.4.0, v1.5.0

### ✅ Espace élève
- TP officiels servis tels quels (8 HTML)
- ZIP package téléchargeable (287 Ko)
- Adaptation DYS dégradée au statut expérimental avec warning visible

---

## 3. RISQUES IDENTIFIÉS — les 5% restants

### 🟡 Risque #1 — point unique de défaillance : compte `inerweb.fh@gmail.com`
**Impact** : si ce compte Google est suspendu/bloqué, **toute la chaîne d'écriture meurt**. Aucune éval ne peut s'enregistrer.
**Probabilité** : très faible mais existante.
**Mitigation** : NE PAS utiliser ce compte pour autre chose (pas de spam, pas de connexion suspecte).

### 🟡 Risque #2 — quota Apps Script gratuit
**Impact** : 20 000 URL Fetch/jour. À 4 profs × polling 8s × 8h = 13 440 req maximum théorique → **marge 32%**, OK. Mais si polling élève (espace élève) ajouté → risque de saturation.
**Mitigation** : monitorer en fin de journée. Si 429 → ralentir polling à 15 s.

### 🟡 Risque #3 — pas d'endpoint DELETE
**Impact** : impossible de corriger une erreur de saisie via l'app. L'éval erronée reste en Sheet.
**Mitigation actuelle** : le `last-write-wins` masque l'erreur si on ré-évalue (clé = Pseudo+TP+Code). MAIS la première ligne reste visible en Sheet.
**Recommandation** : aller en Sheet directement et supprimer la ligne fautive (accès direct toujours possible).

### 🟡 Risque #4 — feuille `eval-cap-ifca` créée à la première écriture
**Impact** : si la feuille est supprimée par erreur, l'Apps Script la recrée au prochain write avec en-têtes nouvelles → **données précédentes perdues** entre suppression et write suivant (Drive corbeille 30 j permet de récupérer).
**Mitigation** : ne pas supprimer la feuille. Utiliser le filtre/cacher au lieu.

### 🟡 Risque #5 — pas de notification de panne
**Impact** : si Apps Script tombe, le badge passe 🔴 mais aucune alerte active (mail, push). Le prof peut ne pas voir et continuer à saisir → **perte si buffer dépasse la limite localStorage** (~5-10 MB selon navigateur, on est très loin).
**Mitigation** : badge sync visible en permanence. Vérifier qu'il est 🟢 avant de fermer.

### 🟢 Risque #6 — éval E13/E14/E15/E16 polluées par l'audit
**Impact** : 6 lignes `TP=TP-AUDIT` restent en Sheet (test stress).
**Mitigation immédiate** : aller en Sheet, filtrer `TP=TP-AUDIT`, supprimer 6 lignes.
**URL filtrage rapide** : https://docs.google.com/spreadsheets/d/16T1T3yL6M49OhJUQS1SmFHwW7Bywp7m2kSXDiXdmItk/edit

---

## 4. RÉCUPÉRATION D'URGENCE — plan B

| Si... | Alors... |
|---|---|
| App tombe / Pages cassée | Sheet directement accessible : https://docs.google.com/spreadsheets/d/16T1T3yL6M49OhJUQS1SmFHwW7Bywp7m2kSXDiXdmItk/edit · Export CSV/XLSX possible. |
| Apps Script down | Saisir directement en Sheet (les colonnes sont déjà là). |
| Coupure réseau pendant cours | Buffer localStorage. Retry auto à la reconnexion (30 s). Badge 🟡. |
| Crash navigateur | F5 → tout reprend. Brouillons d'éval conservés. |
| Sheet effacé par erreur | Drive > Corbeille (30 jours). |
| Compte Google bloqué | **Pas de plan B technique**. Backup recommandé : exporter le Sheet en XLSX en fin de journée. |

---

## 5. RECOMMANDATIONS AVANT LUNDI 27/04

### À FAIRE MAINTENANT (10 min)

1. ☐ **Aller dans le Sheet et supprimer les 6 lignes `TP=TP-AUDIT`** (lignes test de cet audit).
2. ☐ **Vérifier le propriétaire du Sheet dans Drive** : menu Partage. Si propriétaire ≠ `inerweb.fh@gmail.com`, il y a une incohérence avec l'Apps Script qui pourrait casser.
3. ☐ **Tester sur 2 PCs différents** : ouvrir l'URL https://frigorx.github.io/inerweb-cap-ifca-eval/ , se connecter en FH d'un côté + PW de l'autre, faire 1 éval chacun, vérifier que les 2 voient les évals de l'autre dans 🏠 Aujourd'hui après ~10 s.

### À FAIRE EN FIN DE CHAQUE SÉANCE (5 min)

1. ☐ **Backup XLSX** : Sheet > Fichier > Télécharger > Microsoft Excel (.xlsx). Garder 1 copie locale par séance.
2. ☐ **Vérifier badge 🟢 sur tous les postes** avant fermeture des navigateurs.

### À FAIRE PLUS TARD (S2 ou S3)

1. ☐ **Endpoint DELETE** : ajouter une fonction Apps Script `?action=delete&row=N` avec PIN admin pour corriger les erreurs depuis l'app.
2. ☐ **Snapshot horaire** : trigger Apps Script qui copie la feuille `eval-cap-ifca` dans `eval-cap-ifca-backup-YYYY-MM-DD-HH` toutes les heures.
3. ☐ **Notification email panne** : si Apps Script reçoit une exception → MailApp.sendEmail vers FH.

---

## 6. CONCLUSION HONNÊTE

**Tout est poussé. Les chaînes fonctionnent. Les notes ne se perdront pas dans le cas nominal.**

Mais **« 200% fiable » n'existe pas**. Les 5% de risque sont :
- 1 point de défaillance unique (compte Google inerweb.fh@gmail.com)
- Pas d'endpoint DELETE pour corriger une erreur de saisie depuis l'UI
- Pas de backup automatique

**Niveau de confiance réaliste pour la séance S1 lundi : 95%.** Avec les 3 actions urgentes ci-dessus + le backup XLSX en fin de séance, on monte à **98-99%**.

Le **seul** scénario où des notes pourraient se perdre :
- coupure réseau pendant la saisie ET
- fermeture du navigateur sans rouvrir avant 6+ heures (chrome peut purger localStorage en cas de pression mémoire) ET
- pas de backup Sheet manuel

→ Probabilité quasi-nulle si on respecte le geste « avant fermeture, vérifier badge 🟢 ».
