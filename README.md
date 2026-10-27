# ⚔️ Run Quest

PWA Angular qui transforme la course à pied en quête : XP et niveaux, boss hebdomadaires, conquête de la carte en hexagones
et voyage de Cul-de-Sac à la Montagne du Destin avec des boss sur la route.

- Import des courses en GPX (ex. export WorkoutDoors depuis l'Apple Watch) ou suivi GPS en direct (écran allumé)
- Données stockées localement sur l'appareil (IndexedDB), sauvegarde/restauration en JSON
- Fonctionne hors ligne une fois installée

## Développement

Nécessite Node.js ≥ 24.15 (ou 22.22.3+).

```bash
npm install
npm run dev        # http://localhost:4200
npm run build      # dist/run-quest/browser
```

Un GPX de test est disponible dans `exemples/`.

## Déploiement

Chaque push sur `main` publie l'appli sur GitHub Pages (`.github/workflows/deploy.yml`).
Sur iPhone : ouvrir l'URL dans Safari → Partager → « Sur l'écran d'accueil ».
