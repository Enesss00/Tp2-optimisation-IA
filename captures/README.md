# Captures d'écran — avant / après

## Comment elles ont été produites

- **Captures de terminal.** Chaque commande a été **réellement exécutée**, au moment de
  la capture, dans un pseudo-terminal (`script`) pour garder les couleurs. Sa sortie a
  ensuite été affichée dans un vrai terminal web (xterm.js) et photographiée avec
  Chromium. La ligne d'invite montre la commande lancée. Rien n'est retapé à la main.
- **État AVANT** : un clone neuf du dépôt d'origine
  (`https://github.com/0xaitox/ai-tools-repo-malade`, commit `ab57521`), dans `~/tp2-avant`.
- **État APRÈS** : ce dépôt (`~/Tp2-optimisation-IA`) ; pour la tâche de référence, une
  copie dans `~/tp2-apres`.
- **Tâche de référence sous OpenCode** (1.18.35), lancée depuis une session neuve, sans
  aide ni reformulation :
  > Ajoute un endpoint GET /rooms/:id/availability?date=YYYY-MM-DD qui renvoie les
  > créneaux libres d'une salle sur la journée demandée, avec ses tests.

  Seule différence avec le dépôt : le modèle. `opencode/deepseek-v4-pro` est payant, il a
  été remplacé par `opencode/nemotron-3-ultra-free` dans les deux copies (avant et
  après), et rien d'autre n'a changé. La chaîne d'agents, les permissions, les hooks et
  les MCP sont ceux du dépôt.
- **CI** : capture de la vraie page GitHub Actions du dépôt.

## Tâche de référence

| Fichier | Ce qu'il montre |
|---|---|
| `avant-04-tache-architecte-seul.png` | **Aucune délégation** : l'architecte lit et écrit tout lui-même (`edit`, `write`). Le bloc « checks post-écriture » est vert alors que 2 bugs existent, parce qu'il ne lance que 2 fichiers de tests sur 4. |
| `avant-05-tache-npm-test-absent.png` | Il suit AGENTS.md et lance `npm test` : `Missing script: "test"`. Son test, d'abord nommé `*.test.ts`, n'aurait jamais tourné : il le renomme après avoir lu `vitest.config.ts`. |
| `avant-06-tache-test-aligne-sur-le-bug.png` | Il voit que `overlaps` bloque les créneaux bout à bout (« due to `<=` »), **modifie l'attente de son test** pour qu'il passe avec le bug (22 → 20 créneaux) et conclut « Done! ». Le bug est maintenant verrouillé par un test. Pas de plan, pas de relecture, pas de tester. |
| `apres-04-tache-delegation.png` | L'architecte lit, puis **délègue** : `Planner Agent` écrit le plan, puis `Dev Agent` réalise les étapes une par une. Ce premier run a été coupé par la limite de 15 min de mon environnement, puis repris dans la même session (`--session … "continue"`). |
| `apres-05-tache-plan.png` | Le plan écrit par `planner` dans `.opencode/plans/availability-endpoint.md` : objectifs, hors périmètre, hypothèses, étapes avec « Done when », cas limites, et notamment « booking at slot boundary → half-open intervals ». |
| `apres-06-tache-fin.png` | Fin du run repris. Le **seuil de couverture** attrape du code mort dans la route, et l'architecte **délègue** la simplification à `Dev Agent` au lieu de la faire lui-même. Il tente `npm start &` : **refusé par ses permissions** (règles affichées). Il relance `npm run check` (vert, 98,26 %) avant de conclure. |
| `apres-06b-tache-resultat.png` | Le résultat vérifié à la main : `npm run check` vert (61 tests). Sur l'API réelle, la réservation de 09:00 à 11:00 rend 09h et 10h « PRIS » et 11h « libre » (le bout à bout fonctionne). 30 février → 400, salle inconnue → 404. |

## Briques du harness

| AVANT | APRÈS | Ce que la paire montre |
|---|---|---|
| `avant-01-agents.png` | `apres-01-agents.png` | `planner (primary)`, donc injoignable par `task` → `planner (subagent)` |
| `avant-02-finder-sans-outils.png` | `apres-02-finder-outils.png` | finder : `read/glob/grep: false` (aucun outil) → `true` |
| `avant-03-mcp.png` | `apres-03-mcp.png` | 6 MCP, dont 3 en échec ou en attente → 2 déclarés et désactivés |
| `avant-07-tests-verts.png` | `apres-07-check.png` | « 5 passed, 4 skipped » sur 2 fichiers → `npm run check` : typecheck + lint + 51 tests + couverture 98,8 % |
| `avant-08-tests-caches.png` | (corrigés) | les 2 fichiers `*.test.ts` jamais lancés : 2 échecs (`'5020'`, `409`) |
| `avant-09-bugs-api.png` | `apres-11-api.png` | prix `"5020"`, 409 bout à bout, date `"1"` acceptée à 11 160 € → `70`, 201, 400 |
| `avant-10-lint-aveugle.png` | `apres-09-lint.png` | `any`, `var`, `eval`, `==`, `debugger` : exit 0 → 7 erreurs, exit 1 |
| `avant-11-commit-accepte.png` | `apres-10-commit-refuse.png` | commit d'un test rouge avec une erreur de type : accepté → « husky - pre-commit script failed » |
| `avant-12-ci.png` | `apres-12-ci.png` | CI = `npm run lint` seul, tests commentés → vrai run GitHub Actions vert : typecheck, lint, test, mutation |
| `avant-13-couverture.png` | `apres-07-check.png` | couverture 21 % → 98,8 % |
| `avant-15-mutation.png` | `apres-08-mutation.png` | score de mutation 4,4 % → 92 % |
| `avant-14-ship.png` | — | `/ship` : `git add -A` + `git push` sans checks, architecte `bash "*": allow` |
| — | `apres-13-git-log.png` | un commit par problème |
