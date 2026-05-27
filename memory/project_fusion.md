---
name: project-fusion
description: Plan de fusion des deux apps BipBoup (Low Tier + High Tier) en plateforme unifiée
metadata:
  type: project
---

Fusion des apps BipBoup en 6 phases. Phase 1 terminée.

**Why:** Créer une plateforme cohérente avec login, scores, classement et admin.

**How to apply:** Continuer phases 2-6 dans l'ordre. Valider avec l'utilisateur à chaque phase.

## Stockage
- localStorage / IndexedDB (abstrait dans `shared/storage.js` — migration DB : remplacer uniquement ce module)
- Clé préfixe : `bipboup_`

## Comptes
- Admin : username `admin`, password `admin`
- Joueurs : inscription libre, 3 vies
- Script exemple donné à l'inscription (fonctionne sur map `default`)

## Scoring
- 10 maps testées en background
- Score = % maps réussies
- Classements séparés Low / High + onglet global (à faire Phase 5)

## Phases
- [x] Phase 1 — Menu + architecture + session guard
- [ ] Phase 2 — Système utilisateur complet (vies en jeu, level progression)
- [ ] Phase 3 — Persistence maps & scripts dans les sous-apps
- [ ] Phase 4 — Refactor Low Tier (cases, blocs par niveau, drift fix, tutos)
- [ ] Phase 5 — Score background + classement
- [ ] Phase 6 — Intégration High Tier complète + admin panel

## Fichiers clés créés (Phase 1)
- `index.html` — entrée plateforme (login/register/menu)
- `shared/storage.js` — couche stockage abstraite
- `shared/auth.js` — authentification
- `shared/shared.css` — styles plateforme
- `shared/menu.js` — logique menu

## Modifications (Phase 1)
- `Tuto low tier/index.html` — garde session + barre plateforme + badge user
- `Tuto high tier/index.html` — garde session + bouton ← Plateforme + badge user
- `Tuto high tier/css/style.css` — style `.tb-platform-btn`
