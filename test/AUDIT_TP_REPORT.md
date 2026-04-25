# Audit TP — point de vue élève CAP IFCA + 2 propositions par TP

**Date** : 2026-04-25
**Cible** : élèves CAP IFCA en grande difficulté (lecture limitée à 3 lignes alignées, DYS, TDAH, allophones)
**Périmètre** : TP-050 → TP-055 (révisions EP3). **TP-056 intouché** par consigne.

---

## A. POINTS FORTS DES TP ACTUELS

✅ Progression pédagogique cohérente (S1→S2→S3 : Manipulation puis Mesures)
✅ Mappings critères → compétences existent (`mappings_ep3.json` bien fait)
✅ Critères techniques pertinents (couples P/T, 2 procédés étanchéité, etc.)
✅ TP-056 tournant bien pensé (autonomie + 5 visas STOP)
✅ Annexes officielles intégrées (C-1 plaque F-Gaz, C-2 fiche MES, C-3 bon)

---

## B. POINTS FAIBLES depuis la perspective élève

### 1. Densité textuelle excessive
Les `description` JSON font 3-5 phrases collées (40-80 mots) → un élève qui ne lit que 3 lignes décroche dès la 2e ligne. Aucune segmentation visuelle. Pas de pictogrammes.

### 2. Vocabulaire technique non glossé
« Pump-down », « bypass », « débrasage », « TeqCO₂ », « VAT 3 points », « cyclage » → utilisés sans explication. L'élève qui ne connaît pas ces mots est largué d'emblée.

### 3. Aucune *boucle* de récupération
Si l'élève rate une étape (ex : confusion RANGE/DIFF au TP-051), il n'y a pas de mini-atelier de remédiation. Soit il bloque toute la séance, soit le prof improvise.

### 4. Pas de hiérarchisation pour élèves différents
Tous les TP sont dimensionnés sur 240 min uniformément. Un élève fragile a besoin de 320 min. Un élève prêt EP3 finit en 150 min. Pas de version courte/longue formalisée.

### 5. Critères d'évaluation tous au niveau 5 (Maîtrisé)
Pour un premier TP de séquence, exiger d'emblée le niveau Maîtrise est démotivant. Aucune progression du niveau attendu (TP-050 niveau 4, TP-052 niveau 5, par exemple).

### 6. Aide « si je bloque » absente du TP papier
L'élève qui décroche n'a aucun « gilet de sauvetage » sous les yeux. Il doit oser appeler le prof, ce qui ne se produit pas chez les profils anxieux.

### 7. Pas de défi bonus pour l'élève qui finit en avance
Pas de prolongement → l'élève s'agite, dérange les autres.

### 8. TP-054 surchargé en formules
4 formules SC/SR + I + U + table P/T en 240 min → cognitivement saturé pour un élève fragile en calcul. Besoin d'un découpage micro.

### 9. TP-055 : rapport TeqCO₂ sans rappel formule
La formule `Charge × GWP / 1000` n'est pas écrite dans le TP — l'élève doit la connaître par cœur. Risque d'échec sans aide.

### 10. Pas de check sécurité visible et permanent
Les EPI sont mentionnés en intro mais pas rappelés à chaque étape. Les élèves les retirent au cours du TP.

---

## C. SOLUTION LIVRÉE — `eleve/` + `data/eleve_guidance_ep3.json`

### Architecture
- **2 versions par TP** (TP-050 → TP-055) :
  - **V1 ultra-guidée** : 6 à 10 micro-étapes, 1 action = 1 carte, aide repliable à chaque étape, pictogrammes
  - **V2 consolidée** : 3 à 5 étapes plus larges, mode chrono examen, défi maîtrise
- **7 ateliers de secours** : ATELIER-S1 (table P/T), S2 (étanchéité), E1 (schéma électrique pressostat), MES (gestuelle sondes), CALC (formules SC/SR), DOC (rédaction), FGAZ (plaque F-Gaz)
- **Viewer web ultra-simple** : `eleve/index.html` (3 écrans, charte stricte Calibri 14pt min, max 3 lignes par bloc)
- **Mode imprimable A4** : `@media print` chaque étape break-inside:avoid
- **Progression visible** : barre verte qui se remplit, taux % live
- **TP-056 PRÉSERVÉ** : déjà autonome avec ses 5 visas STOP, on n'y touche pas

### Règles UX appliquées
| Règle | Mise en œuvre |
|---|---|
| Calibri 14pt minimum | corps 16pt, action 18pt, titre étape 22pt |
| Max 3 lignes alignées | chaque texte bloc = 3 lignes max ; après → nouvelle carte |
| 1 action = 1 carte | chaque étape encadrée, fond blanc, séparée |
| Pictogramme + texte | pictogramme 36pt à chaque étape |
| Aide à chaque étape | `<details>` repliable, dépliable d'un clic |
| Couleurs sémantiques | vert = vas-y, orange = aide, rouge = STOP, bleu = info |
| Vocabulaire glossé | « VAT = Vérification d'Absence de Tension », « SC = Surchauffe », etc. |
| Filet de secours | chaque TP propose 1 atelier de rattrapage si blocage |
| Défi bonus | chaque V1 et V2 a un mini-challenge si fini en avance |
| STOP prof obligatoire | bandeau rouge + visa explicite à chaque point critique |

### Statistiques

- **45 étapes** ultra-guidées (V1) au total
- **25 étapes** consolidées (V2) au total
- **7 ateliers de secours** activables au besoin
- **6 TP** couverts (TP-050 à TP-055)
- **TP-056 intouché** ✓

---

## D. EXEMPLE DÉTAILLÉ — TP-051 V1 (remplacement pressostat)

| # | Carte | Action (1 phrase) | Aide si bloqué |
|---|---|---|---|
| 1 | 🛡️ Je sécurise tout | EPI + VAT + circuit hors pression | « pourquoi 1 bar et pas 0 ? » |
| 2 | 📸 Je prends une PHOTO du câblage | Photo AVANT débrancher quoi que ce soit | « pas de honte à en prendre 5 » |
| 3 | 🔩 Je dépose l'ancien | Dévisse, joint à jeter, filet inspecté | « si filet abîmé → je n'avance pas » |
| 4 | ✨ Je monte le neuf | Joint NEUF + quart de tour | « si je force, je foire le filet » |
| 5 | 🔌 Je rebranche selon la photo | Test traction sur chaque cosse | (fluide) |
| 6 | 🧪 Azote 3 bar + étanchéité | 2 procédés obligatoires | (fluide) |
| 7 | 🎚️ Réglage Cut-in 2,5 / Cut-out 0,5 / Diff 2 | 2 cycles répétables ± 0,1 bar | « RANGE = Cut-out, DIFF = différentiel — c'est le piège » |

→ **Si bloqué** : ATELIER-E1 (lecture schéma électrique pressostat sur planche d'essai).
→ **Si fini en avance** : dérégler de 0,5 bar et observer ce que ça change.

---

## E. RECOMMANDATIONS POUR FRANCK

1. **Tester en classe S1 lundi 27/04** — proposer V1 aux 6-8 élèves les plus fragiles (E15, E18, E22… selon ta connaissance), V2 aux 4 prêts pour EP3.
2. **Activer les ateliers de secours** dès qu'un élève bloque > 10 min sur une étape. Plutôt qu'attendre la fin du TP.
3. **Inviter les élèves à imprimer leur fiche** avant la séance (CTRL+P depuis l'espace élève) → support papier + main au clavier de la machine.
4. **Compléter les pictogrammes par des PHOTOS RÉELLES** au fur et à mesure (un manifold, une pince ampèremétrique, une plaque F-Gaz). Photo > illustration générique.
5. **Faire évaluer la V1 vs V2 par les élèves** en fin de séance S1. 5 questions oui/non → ajustements pour S2 04/05.
6. **TP de secours = 30 min max**. Plus long → c'est un nouveau TP, pas une remédiation. Les compétences validées par un atelier secours doivent être notées dans le sheet (avec mention).

---

## F. ÉVOLUTIONS POSSIBLES V2 (post 27/04)

- Vidéo de 30 s par étape critique (gestuelle sonde, brasure, pump-down)
- Mode « lecture audio » (text-to-speech) pour étape sélectionnée → accessibilité allophones / faibles lecteurs
- Quiz auto-correctif en fin de chaque V1 (5 questions QCM) avant de passer au TP suivant
- Suivi temporel : chronomètre par étape → alerte si l'élève dépasse
- Photos réelles incrustées dans le JSON (champ `photo_url`)
- Génération automatique du livret PDF complet par élève (toutes ses fiches V1 imprimées en début de séquence)
