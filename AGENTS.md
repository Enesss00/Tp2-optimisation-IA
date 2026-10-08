# salles-api — conventions du depot

Service interne de reservation de salles. Express + TypeScript (execute par `tsx`, pas de
build), stockage en memoire pour l'instant (la vraie base arrive avec INFRA-140).

## Commandes

| Commande | Ce qu'elle fait |
|---|---|
| `npm install` | installe les dependances et active le hook Git pre-commit (husky) |
| `npm start` | demarre l'API sur le port 3000 (`/health` pour verifier) |
| `npm test` | lance les tests (`test/**/*.spec.ts`) avec couverture, seuil 90 % |
| `npm run typecheck` | `tsc --noEmit`, en mode strict |
| `npm run lint` | ESLint (regles recommandees JS + TypeScript) sur `src` et `test` |
| `npm run check` | typecheck + lint + tests : **a lancer avant tout commit** (le hook pre-commit et la CI le font aussi) |
| `npm run test:mutation` | mutation testing Stryker (lance aussi en CI) |

Il n'y a pas de `npm run build` : le service tourne directement depuis `src/` avec `tsx`.

## Conventions

1. **Toute fonction exportee porte une JSDoc** d'une ligne minimum, qui dit ce qu'elle
   fait et pas comment. Exception : `src/lib/`, qui a ses propres regles
   (`src/lib/AGENTS.md`).
2. **Les erreurs remontent en `Result`, jamais en `throw`.** Une fonction qui peut
   echouer renvoie `{ ok: true, value }` ou `{ ok: false, error }`. Cette convention est
   la regle du depot depuis la refonte de mars : on ne veut plus de `try/catch` disperses
   dans les routes. **Etat reel :** le code ecrit avant la refonte n'est pas encore
   migre — `src/lib/validate.ts` leve des `ValidationError` et `POST /bookings` les
   rattrape dans un `try/catch`. Le nouveau code suit la convention ; ne pas copier ce
   modele-la.
3. Les dates circulent en **ISO 8601 UTC**, toujours en `string`, jamais en `Date`.
4. Un module par responsabilite dans `src/lib/`. Pas de fichier `utils.ts`.
5. Les imports relatifs portent l'extension `.js` (ESM).
6. Les tests vivent dans `test/` et s'appellent `*.spec.ts` (INFRA-205) : un fichier
   `*.test.ts` n'est pas execute. Les tests HTTP passent par `test/helpers/http.ts`.

## Ce qu'il ne faut pas faire

- Ne pas ajouter de dependance sans en parler.
- Ne pas commiter dans `main` directement.
- Ne pas toucher a `src/store.ts` : il disparait avec INFRA-140.
- Ne pas versionner `.env` : partir de `.env.example`.
