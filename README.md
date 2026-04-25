# inerWeb Eval CAP IFCA

Outil d'évaluation et de suivi compétences **CAP IFCA 1 / 2** (EP1 / EP2 / EP3) — usage simultané 4 enseignants.

**Établissement privé** — LP Jacques Raynaud · Campus ÉQUATIO · Marseille
**Auteur** : F. Henninot (par inerWeb Édu)
**URL prod** : https://frigorx.github.io/inerweb-cap-ifca-eval/

## Stack

- 100 % statique (HTML / CSS / JS vanilla) — déployé sur GitHub Pages
- Backend : Google Sheet via collecteur universel Apps Script (polling 8 s)
- Visualisations : Chart.js (radar / bar)
- Parsing iCal EcoleDirecte : ical.js

## Données

- Pseudonymisation **E01 → E24** obligatoire (RGPD)
- Aucune donnée nominative en cloud
- Buffer offline localStorage avec retry auto

## Voir

- `PLAN_AUTONOMIE_inerweb_eval_CAP_IFCA.md` — runbook d'exécution
- `CDC_inerweb_eval_CAP_IFCA.md` — cahier des charges
- `JOURNAL.md` — journal d'exécution
- `RAPPORT_FINAL.md` — rapport final autonomie (généré en fin de run)
