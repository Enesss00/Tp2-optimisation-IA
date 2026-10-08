# salles-api

API interne de reservation de salles.

> **Rendu TP2 « le repo malade »** : le diagnostic complet est dans
> [`DIAGNOSTIC.md`](DIAGNOSTIC.md) (22 problemes demontres et corriges, un commit par
> probleme). Les captures avant/apres sont dans [`captures/`](captures/README.md), et les
> sorties de toutes les commandes de preuve dans [`preuves/`](preuves/).

```bash
npm install
npm start          # http://localhost:3000
npm run check      # typecheck + lint + tests (aussi lance par le hook pre-commit et la CI)
```

## Endpoints

| Methode | Route | Role |
|---|---|---|
| GET | `/health` | sonde de vie |
| GET | `/rooms` | catalogue des salles |
| GET | `/rooms/:id` | une salle et ses reservations |
| GET | `/bookings?roomId=` | les reservations |
| POST | `/bookings` | creer une reservation |
| DELETE | `/bookings/:id` | annuler une reservation |

Exemple :

```bash
curl -s localhost:3000/rooms | jq
curl -s -X POST localhost:3000/bookings \
  -H 'content-type: application/json' \
  -d '{"roomId":"salle-a","who":"moi","people":4,
       "startsAt":"2026-11-02T09:00:00Z","endsAt":"2026-11-02T11:00:00Z"}' | jq
```

## Outillage agent

Le depot embarque une chaine d'agents OpenCode (`.opencode/`) : un agent principal
`architect` et six subagents specialises (finder, explorer, planner, dev, reviewer,
tester). `opencode agent list` les liste.

## Etat du projet

L'equipe qui a monte ce service est partie. Le service tourne en production depuis
huit mois. La chaine d'agents a ete installee en juin et personne ne l'a revue depuis.
