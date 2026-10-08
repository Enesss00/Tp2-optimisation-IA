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
- **Version texte** : les transcriptions complètes des runs de la tâche sont dans
  `preuves/60` à `65` (lisibles sans les images).

## Tâche de référence

| Fichier | Ce qu'il montre |
|---|---|
| `avant-04-tache-architecte-seul.png` | **Aucune délégation** : l'architecte lit et écrit tout lui-même (`edit`, `write`). Le bloc « checks post-écriture » est vert alors que 2 bugs existent, parce qu'il ne lance que 2 fichiers de tests sur 4. |
| `avant-05-tache-npm-test-absent.png` | Il suit AGENTS.md et lance `npm test` : `Missing script: "test"`. Son test, d'abord nommé `*.test.ts`, n'aurait jamais tourné : il le renomme après avoir lu `vitest.config.ts`. |
| `avant-06-tache-test-aligne-sur-le-bug.png` | Il voit que `overlaps` bloque les créneaux bout à bout (« due to `<=` »), **modifie l'attente de son test** pour qu'il passe avec le bug (22 → 20 créneaux) et conclut « Done! ». Le bug est maintenant verrouillé par un test. Pas de plan, pas de relecture, pas de tester. |
| `apres-04-tache-delegation.png` | Run complet depuis une session neuve, sur le dépôt réparé : l'architecte lit, puis **délègue toute la boucle** : `Planner Agent` → `Dev Agent` ×4 → `npm run check` (68 tests verts) → `Tester Agent` → `Reviewer Agent`. Son `npm start &` est **refusé** par ses permissions (lancer l'app, c'est le rôle de tester). Le message final cite le verdict du reviewer : « NOTHING FOUND ». |
| `apres-05-tache-plan.png` | Le plan écrit par `planner` dans `.opencode/plans/rooms-availability.md`. |
| `apres-06-tache-resultat.png` | Vérification à la main du travail livré : `npm run check` vert (68 tests, 99 %), créneaux libres corrects autour de la réservation 09:00-11:00 (le 11h est libre), 400 sans date, 404 pour une salle inconnue. **Mais** le 30 février est accepté (200) et les créneaux se terminent à `T24:00:00Z` : un bug que le reviewer (« NOTHING FOUND ») et le tester n'ont pas vu. La chaîne marche ; ses verdicts restent des affirmations à vérifier. |

> Un premier run « après » (avant le commit `7b3ec97`) avait délégué à planner et dev mais
> sauté reviewer et tester. C'est ce constat qui a mené à rendre l'étape Verify obligatoire
> dans le prompt de l'architecte.

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

## Rejouer la tâche de référence (protocole)

```bash
# AVANT : clone du dépôt d'origine. Ne pas utiliser le dépôt de rendu :
# l'ancien /ship fait un git push sans demander.
git clone https://github.com/0xaitox/ai-tools-repo-malade ~/tp2-avant
cd ~/tp2-avant && npm install && opencode

# APRÈS : ce dépôt
cd ~/Tp2-optimisation-IA && npm install && opencode
```

Dans chaque cas : une session neuve, l'agent par défaut (`architect`), et le prompt ci-dessus
collé tel quel, sans aide.

Points à observer :
- qui travaille et qui ne travaille jamais (cartes `task` : Planner, Dev, Tester,
  Reviewer) ;
- qui écrit quoi : avant, l'architecte édite lui-même ; après, seul `dev` modifie le code ;
- ce qui échoue en silence : le bloc « checks post-écriture », `npm test` (absent avant),
  un test aligné sur un bug ;
- la présence d'un plan dans `.opencode/plans/` ;
- à la fin : `git status`, `npm run check` (après) ou `npm run test:unit` (avant), et une
  vérification à la main avec `curl` (voir `preuves/65`).
