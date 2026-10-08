# DIAGNOSTIC — salles-api, « le repo malade »

Dépôt d'origine : `https://github.com/0xaitox/ai-tools-repo-malade` (commit `ab57521`).
L'état initial est figé dans le commit `7afa9bd`, qui ajoute seulement les preuves.
Chaque correctif est un commit séparé, posé par-dessus.

**Méthode.** Chaque problème ci-dessous a été **montré par une commande**, pas déduit d'une
lecture. La commande exacte, sa sortie et son code de retour sont dans
`preuves/NN-*.txt`. Les numéros 00 à 27 correspondent à l'état initial, 30 à 55 aux
vérifications après correctif. Les numéros de ligne renvoient à la version d'origine.

Outils utilisés pour l'audit :
- `opencode` 1.18.35 : `opencode agent list`, `opencode debug agent <nom>` (permissions
  et outils **résolus** par OpenCode), `opencode mcp list`, `opencode serve` pour la
  description réelle de l'outil `task` ;
- des runs réels de la chaîne sur une copie jetable avec un modèle gratuit (le modèle
  configuré, `deepseek-v4-pro`, est payant) ;
- un client MCP pour compter les outils exposés par chaque serveur ;
- vitest et la couverture v8, Stryker (mutation testing), et des fautes injectées
  volontairement puis annulées.

## État initial (étape 0)

| Mesure | Résultat | Preuve |
|---|---|---|
| `npm install`, `npm start`, `GET /health` | OK, `{"ok":true}` HTTP 200 | session, `53` |
| Tests (`npm run test:unit`) | « verts » : 5 passed, 4 skipped. **2 fichiers sur 4** exécutés, 9 tests sur 18 | `01`, `04` |
| Lint (`npm run lint`) | vert, **0 règle active** | `02`, `07` |
| Types (`npm run typecheck`) | vert, mais `@ts-nocheck` masque une erreur | `03`, `08` |
| CI | ne lance que `npm ci` + `npm run lint` | `22` |
| Couverture (`src`) | **21,4 %** des lignes, routes et validation à 0 % | `09` |
| Mutation (Stryker) | **4,4 %** (8 mutants tués sur 182) | `10` |
| `npm test`, `npm run build` (annoncés par AGENTS.md) | `Missing script` | `00` |

## État final

| Mesure | Résultat | Preuve |
|---|---|---|
| `npm start` + `/health` | OK, HTTP 200 | `53` |
| `npm run check` (typecheck strict + lint + tests + couverture) | exit 0, **51 tests passent, 1 ignoré volontairement**, 6 fichiers | `53` |
| Couverture | **98,8 %** lignes, 96,3 % branches (seuil bloquant à 90 %) | `53` |
| Mutation | **92,2 %** (seuil `break` à 70) | `53` |
| Hook pre-commit | actif, bloque un commit rouge | `39` |
| CI | typecheck, lint, tests avec couverture, Stryker | `40` |
| Agents | 1 primary + 6 subagents joignables, droits cohérents avec les rôles | `53` |
| MCP | 0 serveur lancé (2 déclarés et désactivés) | `50` |

---

## Problèmes trouvés et corrigés

### Tests

#### P1 — La moitié des tests n'est jamais exécutée
- **Brique** : tests.
- **Symptôme** : `npm run test:unit` est vert avec 9 tests. `test/bookings.test.ts` et
  `test/price.test.ts` (9 autres tests) ne sont jamais lancés.
- **Cause** : `vitest.config.ts:7` limite la collecte à `test/**/*.spec.ts`. Ce choix
  est voulu (INFRA-205, commenté), mais les deux fichiers `*.test.ts` n'ont jamais été
  renommés.
- **Preuve** : `04` (`vitest list` ne collecte que 2 fichiers). `05` : forcés, ces
  tests révèlent **2 échecs** (P5, P6).
- **Correctif** (`eed6c51`) : renommage en `*.spec.ts`, ce qui respecte la convention
  au lieu d'élargir le glob. Après renommage : 2 rouges (`30`), corrigés par P5 et P6.

#### P2 — Tests désactivés et assertions vides
- **Brique** : tests.
- **Symptôme** : 4 tests en `it.skip`, dont deux ne contiennent que `expect(true).toBe(true)`.
- **Cause** : `test/overlap.spec.ts:27` (cas bout à bout désactivé, justement celui du
  bug P5) et `:38-44` (assertions vides).
- **Preuve** : `04` (grep des `it.skip` et `expect(true)`).
- **Correctif** (`df34cec`) : cas bout à bout réactivé, vraies assertions pour « inclus »
  et « identiques », cas en ordre inverse ajouté. Le skip du test « legacy » est
  **conservé** (voir « Ce que je n'ai pas corrigé »).

#### P3 — Un test qui teste son propre double
- **Brique** : tests (mock qui triche).
- **Symptôme** : on peut vider `findRoom` et `bookingsForRoom` dans `src/store.ts` sans
  qu'aucun test ne passe au rouge.
- **Cause** : `test/store.spec.ts:5-8` définit un `storeDouble` et fait ses assertions
  dessus, pas sur le module.
- **Preuve** : `11` (store saboté → 3/3 verts). Après correctif, `34` : le même sabotage
  fait échouer 2 tests.
- **Correctif** (`dbbd9a7`) : les tests appellent le vrai `store.ts`, sans le modifier
  (AGENTS.md l'interdit).

#### P4 — Couverture 21 %, score de mutation 4,4 %, aucun seuil
- **Brique** : tests (mesure).
- **Symptôme** : aucune route, aucune validation testée. Rien ne mesure la couverture.
- **Preuve** : `09`, `10`.
- **Correctif** (`51c3054`, `9d1ed9e`) : tests HTTP de toutes les routes et de chaque
  règle de validation (helper `test/helpers/http.ts`), couverture v8 avec seuil bloquant
  à 90 %, Stryker branché (`npm run test:mutation`, `stryker.config.json`). Les mutants
  survivants ont révélé 3 trous supplémentaires (dimanche jamais testé, messages 400 et
  409 non vérifiés), qui sont maintenant testés. Résultat : `35`, `36`, `53`.
  Scripts ajoutés : `npm test`, `npm run check`.

### Bugs cachés révélés par le filet réparé

#### P5 — Deux réservations bout à bout sont refusées (409)
- **Brique** : tests (bug que les tests ignorés auraient attrapé).
- **Symptôme** : sur l'API réelle, réserver salle-a de 11:00 à 12:00 après une
  réservation de 09:00 à 11:00 renvoie `409 creneau deja reserve`.
- **Cause** : `src/lib/overlap.ts:11` compare avec `<=`, alors que la JSDoc du même
  fichier décrit des créneaux `[début, fin[`.
- **Preuve** : `06` (curl → 409), `31` (3 tests rouges) puis `32` (verts).
- **Correctif** (`df34cec`) : comparaison stricte `<`.

#### P6 — Le prix du week-end devient une chaîne : `"5020"`
- **Brique** : types (`@ts-nocheck`) + tests.
- **Symptôme** : `POST /bookings` un samedi renvoie `"price":"5020"` (string) au lieu de 70.
- **Cause** : `src/lib/price.ts:5`, `WEEKEND_SURCHARGE = "20"`, donc
  `base + "20"` concatène. `src/lib/price.ts:1`, `// @ts-nocheck`, masquait l'erreur
  TS2322 que `tsc` signale dès qu'on le retire.
- **Preuve** : `06` (curl), `08` (tsc sans `@ts-nocheck` → TS2322), `33` (2 tests
  rouges avant correctif, verts après).
- **Correctif** (`c9ade7d`) : constante numérique, `@ts-nocheck` retiré, test d'API sur le
  prix renvoyé. Le lint interdit désormais `@ts-nocheck` (`38`).

#### P7 — N'importe quelle chaîne passe pour une date
- **Brique** : tests (bug trouvé en relançant le filet sur le code existant, contre la
  règle « dates ISO 8601 UTC » d'AGENTS.md).
- **Symptôme** : `POST /bookings` avec `startsAt:"1"` et `endsAt:"2"` crée une
  réservation du 1er janvier au 1er février 2001, facturée **11 160 €**. Sont aussi
  acceptés : `"2026"`, `"12/25/2026"`, une date sans heure, une heure **sans fuseau**
  (lue dans le fuseau du serveur, donc le créneau et le jour de week-end changent selon
  la machine) et le **30 février** (décalé au 2 mars sans erreur).
- **Cause** : `src/lib/validate.ts:16-22`, `requireDate` ne vérifie que
  `Date.parse(value)` ne renvoie pas NaN.
- **Preuve** : `51` (curl → 201 à 11 160 €, 8 tests rouges), `52` (400, suite verte).
- **Correctif** (`1b212df`) : format ISO 8601 UTC exigé (suffixe `Z`) et dates
  impossibles rejetées. Le style `throw ValidationError` est conservé (voir plus bas).

### Lint et types

#### P8 — Le lint ne vérifie rien
- **Brique** : lint.
- **Symptôme** : une variable inutilisée, un `any`, `==`, `debugger`, `var` et `eval`
  passent avec exit 0.
- **Cause** : `eslint.config.js:12`, `rules: {}`. Le parser TypeScript est branché, mais
  « les règles seront choisies avec l'équipe » ne l'ont jamais été.
  `eslint --print-config` affiche **0 règle**.
- **Preuve** : `07` (faute injectée puis annulée, exit 0) ; `37` (même faute : 7 erreurs,
  exit 1).
- **Correctif** (`672be0b`) : `js.configs.recommended` + `tseslint.configs.recommended`,
  plus `eqeqeq` et `no-eval`. Le code existant passe sans modification.

#### P9 — TypeScript en mode non strict
- **Brique** : types.
- **Symptôme** : un paramètre implicitement `any` ou `null` affecté à un `number` passe.
- **Cause** : `tsconfig.json:8-10` (`strict`, `noImplicitAny`, `strictNullChecks` à
  `false`).
- **Preuve** : `08` (le code actuel compile déjà en strict), `38` (faute injectée :
  exit 2 en strict, exit 0 avec l'ancienne config).
- **Correctif** (`3b688a3`) : `strict: true`. Honnêtement, ce réglage ne cachait pas de
  bug : c'est un durcissement du filet, pas une réparation de code.

### Hooks et Git

#### P10 — Le hook pre-commit n'est pas branché
- **Brique** : hooks (Git).
- **Symptôme** : un commit avec un test rouge et une erreur de type est accepté.
- **Cause** : `.husky/pre-commit` existe, mais husky n'est pas en devDependency, il n'y a
  pas de script `prepare`, `core.hooksPath` est vide, le fichier n'est pas exécutable
  (`-rw-r--r--`), et sa ligne 2 source `.husky/_/husky.sh`, qui n'existe pas.
- **Preuve** : `12` (commit rouge accepté dans une copie jetable) ; `39` (même commit :
  « husky - pre-commit script failed », exit 1).
- **Correctif** (`387b814`) : husky 9, `"prepare": "husky"` (activé à chaque
  `npm install`), hook exécutable qui lance `npm run check`.

#### P11 — Le hook post-écriture perd le détail des erreurs, et son commentaire ment
- **Brique** : hooks (OpenCode).
- **Symptôme** : quand un test casse, l'agent ne voit que « 1 failed », sans
  `FAIL fichier > test` ni `AssertionError`.
- **Cause** : `.opencode/plugin/checks.js:15` ne recopie que `res.stdout`, alors que
  vitest écrit le détail des échecs sur stderr. `scripts/checks.sh:2` dit le script
  « branché dans opencode.json (experimental.hook.file_edited) », une clé qui n'existe
  pas dans `opencode.json` : c'est le plugin qui le lance.
- **Preuve** : `20` (le hook avertit bien, exit 0), `21` (21 lignes de détail perdues
  sur stderr), `42` (le détail est remonté, 0 ligne perdue).
- **Correctif** (`d4d7c6c`) : `2>&1` sur chaque check, commentaire corrigé. Le `exit 0`
  est **conservé** (voir « Ce que je n'ai pas corrigé »).

#### P12 — `.env` versionné avec des identifiants de recette
- **Brique** : Git.
- **Symptôme** : `git ls-files` liste `.env`, que `.gitignore` n'exclut pas. Il contient
  l'URL Postgres de recette avec son mot de passe en clair et `SESSION_SECRET`.
- **Cause** : commit `ecd0790`, « fichier d'env de recette pour l'équipe ».
- **Preuve** : `23` (valeurs masquées dans la preuve), `41`.
- **Correctif** (`c16598c`) : `.env` ignoré et retiré du suivi (le fichier local reste),
  `.env.example` fourni. La clé Stripe est **explicitement un faux pédagogique** (commentaire
  du fichier) : ce n'est pas elle que je signale.

### CI

#### P13 — La CI est verte quoi qu'il arrive
- **Brique** : CI.
- **Symptôme** : un dépôt avec un test rouge et une erreur de type passe la CI.
- **Cause** : `.github/workflows/ci.yml:18-19` ne lance que `npm run lint`, qui n'a aucune
  règle (P8). Les tests sont commentés (« TODO remettre, ça bloquait les merges »,
  commit `07a2c4d`) et il n'y a pas de typecheck.
- **Preuve** : `22` (rejeu des étapes CI : vert alors que `tsc` renvoie 2 et `vitest` 1) ;
  `40` (rejeu après correctif : le test rouge fait échouer `npm test`).
- **Correctif** (`3f85e9a`) : typecheck, lint, tests avec couverture, Stryker. La CI est
  aussi déclenchée sur `push` vers `master`, la branche de ce dépôt de rendu (le dépôt
  d'origine utilise `main`).

### Rules

#### P14 — AGENTS.md ne dit pas la vérité sur le dépôt
- **Brique** : rules.
- **Symptôme** : un agent qui suit AGENTS.md échoue dès sa première commande et reproduit
  un modèle d'erreurs que la règle interdit.
- **Cause** :
  - `AGENTS.md:12`, `npm test` « à lancer avant tout commit » : le script n'existe pas ;
  - `AGENTS.md:13`, `npm run build` vers `dist/` : pas de script, `noEmit: true` ;
  - `AGENTS.md:20-23` présente « jamais de throw, toujours Result » comme la règle du
    dépôt, alors que `validate.ts` lève 3 exceptions, que `POST /bookings` repose sur
    `throw` + `try/catch`, et qu'aucune fonction ne renvoie de `Result`.
- **Preuve** : `00`, `26`.
- **Correctif** (`853afd0`) : vraies commandes (`test`, `check`, `typecheck`,
  `test:mutation`), absence de build dite explicitement, **état réel** de la convention
  `Result` (le code d'avant la refonte n'est pas migré, ne pas le copier), renvoi vers la
  règle locale de `src/lib` pour la JSDoc, convention `*.spec.ts`, `.env.example`.

### Subagents et droits

Tableau résolu par OpenCode (`opencode debug agent <nom>`, preuve `13`) :

| Agent | Rôle annoncé | AVANT : mode / outils actifs | Problème |
|---|---|---|---|
| architect | orchestre, « Never writes code » | primary / edit, write, bash `*` | écrit et lance tout (P17) |
| finder | localiser | subagent / **AUCUN** | ne peut rien lire (P15) |
| explorer | comprendre, lire | subagent / edit `*` | écrit partout (P20) |
| planner | écrire le plan | **primary** / edit limité aux plans | injoignable (P16) |
| dev | implémenter une étape | subagent / task | lance d'autres dev (P19) |
| reviewer | réfuter | subagent / edit `*` | corrige ce qu'il juge (P18) |
| tester | QA sur l'app | subagent / bash, edit limité au scratch | cohérent, mais jamais appelé (P17) |

#### P15 — `finder` répond sans avoir rien lu
- **Brique** : droits + subagents.
- **Symptôme** : `opencode debug agent finder` donne `read: false, glob: false,
  grep: false`, donc aucun outil. finder tourne sur le modèle bon marché, avec un prompt
  qui lui demande d'être « généreux » en prose : il produit une réponse plausible et
  inventée.
- **Cause** : `.opencode/agent/finder.md:15`, `"*": deny` est la **dernière** règle.
  OpenCode applique la dernière règle qui correspond, donc elle écrase les `allow` placés
  au-dessus. Les 6 autres agents mettent `"*": deny` en premier. Deuxième cause : la
  description et le format de sortie (« explain what it does », prose) contredisent le
  rôle que lui donne l'architecte (« Where is X? », « Do NOT use for understanding »).
- **Preuve** : `13` (avant), `43` (après : read, glob, grep actifs).
- **Correctif** (`8e3b402`) : `"*": deny` remis en tête, prompt recentré (liste
  `def:/use: chemin:ligne`).

#### P16 — `planner` est injoignable
- **Brique** : subagents.
- **Symptôme** : l'outil `task` de l'architecte ne propose pas `planner`. L'étape « Plan »
  de la boucle ne peut pas avoir lieu, et `.opencode/plans/` reste vide.
- **Cause** : `.opencode/agent/planner.md:3`, `mode: primary`.
- **Preuve** : `14` (description réelle de l'outil `task` via `opencode serve` : 7 agents,
  pas de planner), `44` (planner présent).
- **Correctif** (`3ebd740`) : `mode: subagent`.

#### P17 — L'architecte a tous les droits, et son prompt lui dit de s'en servir
- **Brique** : droits + subagents.
- **Symptôme** : en run réel, l'architecte à qui on demande de passer par finder lit
  lui-même quand la délégation échoue, **sans signaler l'échec** dans sa réponse
  (preuve `19`). Il peut aussi éditer, lancer n'importe quelle commande, pousser (`/ship`)
  et déléguer à l'agent intégré `general`, qui a tous les droits.
- **Cause** :
  - `.opencode/agent/architect.md:16-19` : `edit: allow`, `bash "*": allow`, ajoutés par
    le commit `865177b` « unblock, trop de refus de permission en session » (la version
    précédente était en lecture seule) ;
  - `architect.md:23-24` : « you also have full access to the repository — use
    whichever is faster » ;
  - `architect.md:32` : « If a question can be answered by a subagent, **it can also be
    answered by you** », l'inverse de l'argument développé juste après ;
  - `architect.md:40-46` : `tester` est absent du tableau de l'équipe et de la boucle
    (une seule mention en passant), donc jamais appelé.
- **Preuve** : `13`, `19`, `24` (règles bash : `* = allow`), `45` (après).
- **Correctif** (`fe3f652`) : permissions d'avant `865177b` plus `npm run check` /
  `npm test` pour vérifier ; `git add` et `git commit` en `ask`, `git push` en `deny` ;
  `task` limité aux 6 subagents du dépôt. Prompt : « should be answered by a subagent »,
  `tester` ajouté à l'équipe et à l'étape Verify, échec de subagent à signaler. La nuance
  « pour 2-3 appels d'outils, fais-le toi-même » est conservée : elle ne concerne plus que
  la lecture.

#### P18 — Le reviewer corrige ce qu'il relit
- **Brique** : droits.
- **Symptôme** : `reviewer` a `edit: allow`, sa description dit « fixes what it finds » et
  sa règle dit « Fix what you find ». Or son propre prompt, et celui de l'architecte,
  fondent sa valeur sur le fait qu'il n'a **pas** écrit le code. En plus, il ne peut
  lancer aucun test pour établir le « concrete failure » qu'on exige de lui.
- **Cause** : `.opencode/agent/reviewer.md:2`, `:14`, `:72-74`.
- **Preuve** : `13`, `46`.
- **Correctif** (`dd1130a`) : `edit: deny`, règle inversée (il rapporte, `dev` corrige),
  lancement des checks autorisé.

#### P19 — `dev` peut lancer d'autres `dev`
- **Brique** : droits + subagents.
- **Symptôme** : `dev` a l'outil `task`, et son prompt lui dit de découper une étape trop
  grosse et d'envoyer les morceaux à d'autres `dev`. Cela contredit la règle de
  l'architecte « Never send two dev agents at the same files » (il ne voit pas ces
  sous-agents) et fait sortir la décomposition du plan relu par un humain.
- **Cause** : `.opencode/agent/dev.md:16` (`task: allow`) et `:44-46` ; `:70` « Report
  back in whatever shape fits ».
- **Preuve** : `13`, `47`.
- **Correctif** (`9a66964`) : `task: deny`, découpe renvoyée à l'architecte, format de
  retour précisé (fichiers, checks avec code de sortie).

#### P20 — `explorer` peut écrire partout
- **Brique** : droits.
- **Symptôme** : `edit: *=allow` pour un agent de lecture, alors que `dev` se présente
  comme « the only agent allowed to change code ».
- **Cause** : `.opencode/agent/explorer.md:15`. Son prompt ne justifie qu'un fichier :
  `.opencode/plans/<slug>-notes.md`.
- **Preuve** : `13`, `48`.
- **Correctif** (`e18522c`) : écriture limitée à `.opencode/plans/*-notes.md`, comme
  `planner` l'est à ses plans.

### Commands et skills

#### P21 — `/ship` pousse sans checks, sans relecture, sans humain
- **Brique** : commands.
- **Symptôme** : `/ship` (exécutée par l'architecte, `bash *=allow`) fait `git add -A`,
  `commit` puis `git push` « sans poser de question ». Elle affirme que le hook a déjà
  lancé les checks (il ne bloque jamais, exit 0) et qu'une relecture est inutile.
  `git add -A` embarquait le `.env`. Le push direct contredit AGENTS.md (« ne pas
  commiter dans main ») et `dev.md` (« The human decides when work is shipped »).
- **Cause** : `.opencode/command/ship.md:8-14`.
- **Preuve** : `24` (contenu et règles bash de l'architecte), `20` (hook toujours à 0),
  `49` (après).
- **Correctif** (`c308ec4`) : `npm run check`, puis relecture par `reviewer`, puis commit
  fichier par fichier avec confirmation. Pas de push.

### MCP et contexte

#### P22 — 6 MCP déclarés, 3 en échec, aucun utilisable par la chaîne, ~27 000 tokens
- **Brique** : MCP + contexte consommé.
- **Symptôme** (`opencode mcp list`, `15`) :
  - `salles-db` en échec (502, hôte `mcp.internal.salles.lan` introuvable) ;
  - `slack` en échec (« Connection closed ») ;
  - `sentry` « needs authentication » ;
  - `github`, `notion` et `playwright` connectés, mais **sans aucun jeton**.

  Les trois qui répondent exposent **75 outils, soit environ 27 000 tokens** de
  définitions (`17`), dont 18 700 pour notion seul. C'est 4 à 5 fois tous les prompts de
  la chaîne réunis (`18`).
- **Causes** :
  - `opencode.json:12` : `"Bearer ${SALLES_MCP_TOKEN}"`. OpenCode ne substitue que
    `{env:VAR}`, donc l'en-tête part **littéralement** avec `${SALLES_MCP_TOKEN}` (`16` :
    serveur local qui affiche l'en-tête reçu ; avec `{env:…}`, il reçoit `Bearer
    secret123`) ;
  - aucun jeton fourni pour github, notion, slack ou sentry ;
  - aucun usage possible :
    - stockage en mémoire, la base n'arrive qu'avec INFRA-140 ;
    - pas d'interface web à piloter avec playwright ;
    - tous les agents du dépôt commencent par `"*": deny` sans autoriser d'outil MCP. En
      run réel, `build` liste les outils `playwright_*`, `architect` répond « NONE »
      (`25`). Ce constat repose sur ce que le modèle déclare, et il est cohérent avec la
      règle documentée d'OpenCode (la dernière règle qui correspond s'applique).

  Les ~27 000 tokens ne pèsent donc que sur les agents intégrés `build`, `plan` et
  `general`. Pour la chaîne, le coût réel est d'avoir des serveurs lancés, en échec ou
  inutilisables à chaque démarrage.
- **Correctif** (`ed9e448`) : notion, slack, sentry et playwright retirés. `salles-db`
  garde sa déclaration pour INFRA-140, avec la syntaxe `{env:SALLES_MCP_TOKEN}`, et il
  est désactivé. `github` est désactivé, avec son jeton passé par `{env:GITHUB_TOKEN}`, à
  activer à la demande. Après : 0 serveur lancé (`50`).

#### Contexte consommé — mesures
| Élément | Avant | Après | Preuve |
|---|---|---|---|
| Définitions d'outils MCP | ~27 000 tokens (75 outils) | 0 | `17`, `55` |
| Prompts des 7 agents | ~5 750 tokens au total | ~6 000 tokens | `18`, `55` |
| AGENTS.md (racine) | ~330 tokens | ~580 tokens | `55` |
| Prompt de l'architecte (chargé à chaque session) | ~1 270 tokens | ~1 470 tokens | `55` |

Les prompts et les rules ne sont **pas** excessifs. AGENTS.md grossit un peu, parce
qu'il dit maintenant la vérité. L'excès venait des MCP. Côté chaîne, la sortie
« prose généreuse » de finder gonflait aussi le contexte de l'architecte, que tout le
design cherche à préserver : c'est corrigé avec P15.

---

## Ce que je n'ai pas corrigé, et pourquoi

### Choix délibérés et corrects, vérifiés et laissés tels quels
| Élément | Pourquoi c'est voulu | Vérifié par |
|---|---|---|
| `vitest.config.ts` : `include: ["test/**/*.spec.ts"]` | commentaire « convention du dépôt, INFRA-205 ». Le défaut est dans les fichiers mal nommés (P1), pas dans le glob. J'ai renommé les fichiers, je n'ai pas élargi le glob. | `04` |
| `scripts/checks.sh` : `exit 0` systématique | commentaire INFRA-231, dans le script et dans le plugin. Un hook **post-écriture** arrive après l'écriture, il ne peut qu'avertir. Le blocage se fait au pre-commit et en CI, maintenant branchés. Le hook avertit bien quand c'est rouge (`20`, `42`). | `20`, `42` |
| `test/overlap.spec.ts:46-60` : `it.skip` du test « legacy » | commentaire « SKIP ASSUMÉ » : la fixture `test/fixtures/legacy-bookings.json` n'a jamais été versée (INFRA-198). Réactivé, le test échouerait au chargement, pas sur une assertion. | fichier absent (`ls test/`, `04`) |
| `src/lib/AGENTS.md` : « Pas de JSDoc ici » | règle **de chemin** qui prime sur la règle 1 de la racine pour `src/lib/`. OpenCode la charge bien quand un agent lit un fichier de ce dossier (vu en run réel, `19`). J'ai seulement ajouté le renvoi dans le AGENTS.md racine. | `19` |
| AGENTS.md : « Ne pas toucher à `src/store.ts` » | il disparaît avec INFRA-140. J'ai respecté la règle : les tests du store ont été réécrits sans modifier ce fichier (P3). | `git log -- src/store.ts` |
| `.env` : `STRIPE_SECRET_KEY=sk_test_FAKE_TEACHING_FIXTURE…` | marquée « jeu de données pédagogique, aucune valeur réelle ». Ce n'est pas une fuite. (Le `.env` lui-même est traité en P12 pour les autres valeurs.) | `23` |
| `explorer` : `curl*` et `webfetch` autorisés | son prompt les demande explicitement (« Use webfetch and curl freely … an internal service »). Risque noté (`curl` peut aussi envoyer des données), mais c'est cohérent avec le rôle. | `13`, `48` |
| `tester` : `bash "*": allow`, écriture limitée à `.opencode/scratch/**` | QA doit démarrer l'app et la piloter avec curl. Commit, push, checkout et reset sont refusés, et il ne peut écrire que dans le scratch (ignoré par Git). Cohérent avec « Never fix anything ». | `13` |
| `planner` : écriture limitée à `.opencode/plans/*.md` | « You cannot touch anything else, by design ». Correct, seul son mode était faux (P16). | `13` |
| `dev` : `bash "*": allow` avec push refusé, `reset --hard`, `clean` et `rm -rf` en `ask` | l'implémenteur doit lancer les checks. Les commandes destructrices sont gardées. | `13` |
| Modèles `opencode/deepseek-v4-pro` et `-flash` | ils existent dans le catalogue OpenCode (`models.json` : 119 modèles, dont ces deux-là). La répartition cher/pas cher correspond au prompt de l'architecte. | `27` |
| Majoration week-end **forfaitaire** de 20 €, calculée sur le jour de début | c'est la règle métier fixée par le test d'origine (`50 + 20 = 70`). Je n'ai corrigé que le type. | `05` |

### Laissés volontairement, hors périmètre
- **Migration de `validate.ts` et `POST /bookings` vers `Result`.** C'est la convention de
  l'équipe, mais c'est une refonte (signatures et routes), pas une réparation. AGENTS.md
  dit maintenant la vérité sur cet état, et le nouveau code doit suivre la convention.
- **`src/lib/AGENTS.md` : « un `export default` par module, obligatoire ».** Aucun module de
  `src/lib` n'en a un, et les « scripts de facturation » qui en dépendraient ne sont pas
  dans ce dépôt. Je ne peux ni prouver que la règle est fausse, ni prouver qu'un script
  casse. Point à clarifier avec l'équipe, pas un défaut démontré.
- **Secrets de recette dans l'historique Git** (commit `ecd0790`). Réécrire l'historique
  exigerait un push forcé sur un dépôt partagé. La vraie réponse est de **changer** le
  mot de passe Postgres de recette et `SESSION_SECRET`, côté infra.
- **Mutants survivants de `src/store.ts`** (noms de salles, données de démo) et mutants
  équivalents (route `""` contre `"/"`, `typeof` redondant avec `Number.isInteger`). Les
  tuer n'apporterait rien.
- **`GET /bookings?roomId[]=x`** renvoie toutes les réservations (le filtre ignore un
  tableau). Comportement discutable mais sans impact démontré, non corrigé.

### Briques absentes : leur absence se défend-elle ?
- **Skills : aucun dans le dépôt** (`opencode debug skill` ne liste que le skill intégré
  d'OpenCode, preuve `24`). **Absence défendable** : le dépôt est petit, les conventions
  tiennent dans AGENTS.md, et la procédure de livraison est une command (`/ship`). Un
  skill « ajouter un endpoint » ferait doublon avec AGENTS.md et le planner.
- **Pas de hook `commit-msg` ni `pre-push`** : le pre-commit lance déjà tout le filet en
  ~5 s, et la CI le rejoue. Un pre-push serait redondant.
- **Pas de script `build`** : le service tourne avec `tsx` (`npm start`). Il n'existe pas
  d'artefact `dist/` à produire. L'absence est défendable, c'est AGENTS.md qui avait
  tort (P14).

---

## Récapitulatif par brique

| Brique | Problèmes |
|---|---|
| Rules | P14 |
| MCP / contexte | P22 |
| Skills / commands | P21 (skills : absence défendable) |
| Subagents | P15, P16, P17, P19 |
| Droits | P15, P17, P18, P19, P20 |
| Hooks | P10 (Git), P11 (OpenCode) |
| Lint / types | P8, P9, P6 (`@ts-nocheck`) |
| Tests | P1, P2, P3, P4 ; bugs cachés P5, P6, P7 |
| CI / Git | P13, P12, P10 |

## Ce qu'il reste à faire à la main
1. Les captures d'écran : voir `captures/README.md` (avant et après, plus la tâche de
   référence relancée depuis une session neuve).
2. `git push` vers `Enesss00/Tp2-optimisation-IA`, puis vérifier le job CI sur GitHub
   (capture `apres-12-ci.png`).
3. Signaler à l'équipe la rotation des secrets de recette (P12).
