# Captures d'écran — à faire à la main

Le sujet exige des **captures d'écran** : un copier-coller de terminal ne compte pas.
Les sorties texte de toutes les commandes lancées pendant l'audit sont dans `preuves/` :
elles servent de référence pour savoir ce que chaque capture doit montrer.

Dépose les images dans ce dossier, avec exactement les noms ci-dessous.

---

## 0. Préparer les deux états

L'état **avant** se capture dans un clone séparé du dépôt d'origine. N'utilise surtout pas
ton dépôt de rendu : dans la version d'origine, l'architecte a `bash: "*": allow` et
`/ship` fait un `git push` sans demander. Un clone du dépôt du prof ne peut pas pousser.

```bash
# AVANT : dépôt d'origine, intact
git clone https://github.com/0xaitox/ai-tools-repo-malade ~/tp2-avant
cd ~/tp2-avant && npm install

# APRÈS : ce dépôt, réparé
cd ~/Tp2-optimisation-IA && npm install      # active aussi le hook pre-commit
```

Dans les deux cas, lance OpenCode depuis la racine du dépôt (`opencode`), dans une
**session neuve**. L'agent par défaut est `architect`.

## 1. La tâche de référence (exercice 1) — avant et après

Prompt à coller **tel quel**, sans aider ni reformuler :

```
Ajoute un endpoint GET /rooms/:id/availability?date=YYYY-MM-DD qui renvoie les créneaux libres d'une salle sur la journée demandée, avec ses tests.
```

Pendant que la chaîne travaille, observe et note :

| Point à observer | Ce qui est attendu AVANT (dépôt malade) | Ce qui est attendu APRÈS |
|---|---|---|
| Qui travaille | `architect` fait le travail lui-même (lecture, `edit`, `bash`), ou délègue à `general` | `architect` délègue : finder/explorer → planner → dev → reviewer (→ tester) |
| Qui ne travaille jamais | `planner` (mode primary, absent de l'outil `task`), `tester` (absent du tableau de l'équipe) | tous joignables ; `planner` écrit `.opencode/plans/<slug>.md` |
| Ce que renvoie `finder` | une réponse en prose **sans aucun appel à read/glob/grep** (tous ses outils sont refusés) | une liste `def:/use: chemin:ligne` après des appels à grep/read |
| Qui écrit quoi | l'architecte et/ou le reviewer modifient le code ; dev peut lancer d'autres dev | seul `dev` modifie `src/` et `test/` ; le reviewer ne fait que rendre un verdict |
| Les tests écrits | si l'agent suit `vitest.config.ts`, il nomme le fichier `*.spec.ts` ; s'il copie `bookings.test.ts`, son test **n'est jamais exécuté** | `*.spec.ts`, exécutés, couverture ≥ 90 % |
| Ce qui échoue en silence | le bloc « checks post-écriture » dit vert alors que 2 bugs existent (tests cachés) ; une délégation qui échoue n'est pas signalée ; AGENTS.md fait lancer `npm test` (script absent) | `npm run check` rouge si quelque chose casse ; le hook pre-commit bloque |
| Fin de tâche | « done » sans preuve ; essaie `npm test` / `npm run build` (absents) | l'architecte lance `npm run check` et montre le code de sortie |

À la fin de la tâche, dans un terminal :

```bash
git status && git diff --stat
ls .opencode/plans/
npm run test:unit            # AVANT ; APRÈS : npm run check
```

## 2. Liste des captures

### Avant (dans `~/tp2-avant`)

| Fichier | Commande / action | Ce qu'elle doit montrer |
|---|---|---|
| `avant-01-agents.png` | `opencode agent list` | `planner (primary)` alors que le README annonce 6 subagents |
| `avant-02-finder-sans-outils.png` | `opencode debug agent finder` (faire défiler jusqu'à `"tools"`) | `"read": false, "glob": false, "grep": false` : finder ne peut rien lire |
| `avant-03-mcp.png` | `opencode mcp list` | salles-db failed (502), slack failed, sentry needs authentication |
| `avant-04-tache-delegation.png` | la tâche de référence dans OpenCode | qui l'architecte appelle, ou le fait qu'il édite lui-même |
| `avant-05-tache-finder.png` | ouvrir la session enfant de `finder` si elle est appelée | réponse sans aucun appel d'outil de lecture |
| `avant-06-tache-fin.png` | message final + `git status` | ce qui a été produit, les fichiers écrits et par qui |
| `avant-07-tests-verts.png` | `npm run test:unit` | « 5 passed, 4 skipped », seulement 2 fichiers sur 4 |
| `avant-08-tests-caches.png` | `npx vitest run test/bookings.test.ts test/price.test.ts --config /dev/null` | 2 échecs : `'5020'` au lieu de 70, `409` au lieu de 201 |
| `avant-09-bugs-api.png` | `npm start` puis les deux `curl` de `preuves/06-bugs-api-reelle.txt` | `"price":"5020"` et un 409 sur un créneau bout à bout |
| `avant-10-lint-aveugle.png` | ajouter `var y = eval("1"); if (y == null) { debugger; }` à `src/app.ts`, puis `npm run lint ; echo $?` (annuler ensuite) | exit 0 : aucune règle active |
| `avant-11-commit-accepte.png` | créer un test rouge, `git add` + `git commit` | le commit passe : aucun hook Git actif |
| `avant-12-ci.png` | `cat .github/workflows/ci.yml` (ou l'onglet Actions sur GitHub) | seulement `npm run lint`, tests commentés |
| `avant-13-couverture.png` | `npm i -D @vitest/coverage-v8@2.1.9 && npx vitest run --coverage --coverage.include='src/**'` | 21 % de lignes couvertes, routes à 0 % |
| `avant-14-ship.png` | `cat .opencode/command/ship.md` | `git add -A`, `git push`, « ne relance pas les checks » |

### Après (dans `~/Tp2-optimisation-IA`)

| Fichier | Commande / action | Ce qu'elle doit montrer |
|---|---|---|
| `apres-01-agents.png` | `opencode agent list` | architect seul primary, 6 subagents dont planner |
| `apres-02-finder-outils.png` | `opencode debug agent finder` | `"read": true, "glob": true, "grep": true` |
| `apres-03-mcp.png` | `opencode mcp list` | salles-db et github `disabled`, plus aucun échec |
| `apres-04-tache-delegation.png` | la même tâche, session neuve | la suite des délégations finder/explorer → planner → dev → reviewer (→ tester) |
| `apres-05-tache-plan.png` | `cat .opencode/plans/*.md` après le passage du planner | le plan écrit sur disque |
| `apres-06-tache-fin.png` | message final + `npm run check` | l'endpoint, ses tests `*.spec.ts`, check vert (ou rouge **signalé**) |
| `apres-07-check.png` | `npm run check` | typecheck + lint + 51 tests + couverture ≈ 98,8 % |
| `apres-08-mutation.png` | `npm run test:mutation` | score ≈ 92 % (4,4 % avant) |
| `apres-09-lint.png` | même faute que `avant-10`, puis `npm run lint` | 7 erreurs, exit 1 |
| `apres-10-commit-refuse.png` | même test rouge que `avant-11`, `git commit` | « husky - pre-commit script failed », commit refusé |
| `apres-11-api.png` | `npm start` + les `curl` de `preuves/06` et un `curl` avec `"startsAt":"1"` | prix `70` (nombre), 201 sur le créneau bout à bout, 400 sur la date `"1"` |
| `apres-12-ci.png` | l'onglet Actions sur GitHub après ton push | job vert : typecheck, lint, test, test:mutation |
| `apres-13-git-log.png` | `git log --oneline` | un commit par problème |

> Raccourci utile : dans le TUI d'OpenCode, quand un subagent est lancé, sa session
> enfant est accessible depuis la carte de l'outil `task`. C'est là qu'on voit si
> `finder` a réellement lu quelque chose.
