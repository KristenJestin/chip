# PRD — chip v2

**Statut :** Brouillon
**Cree le :** 2026-04-14
**PRD precedent :** [docs/archives/2026-04-13-chip-cli-v1.md](docs/archives/2026-04-13-chip-cli-v1.md)

---

## 1. Contexte & Probleme

chip v1 fournit une couche de persistance CRUD pour les features, phases, taches et logs. Les agents peuvent creer des taches et mettre a jour des statuts. Mais le workflow reel des agents OpenCode suit un pipeline structure — `/prd` > `/dev` > `/review` > `/docs` — et chip v1 n'en a aucune conscience :

- **Pas de notion de session** : impossible de savoir quel agent a travaille sur quoi, quand, et pendant combien de temps.
- **Pas de pipeline** : rien n'indique si une feature est en phase de planification, de developpement, de review ou de documentation.
- **Pas de lien review > fix** : quand une review detecte des problemes, rien ne permet de creer des taches de correction traçables et reliees aux constats.
- **Pas de criteres d'acceptation** dans chip : ils restent dans le PRD markdown, impossibles a verifier programmatiquement.
- **Pas de validation des entrees** : un agent peut envoyer n'importe quoi au CLI sans validation structuree.
- **Pas d'integration native OpenCode** : chip est un CLI pur, alors qu'OpenCode supporte un systeme de plugins avec des tools structures (schemas Zod, I/O JSON).
- **Operations unitaires uniquement** : creer une feature avec 4 phases et 15 taches necessite 19 commandes sequentielles.

## 2. Objectif

Faire de chip un outil complet de pilotage du cycle de vie d'une feature pour les agents IA, avec :
- Un pipeline explicite (`planning` > `development` > `review` > `documentation` > `released`)
- Des sessions de travail trackees
- Des constats de review structures avec taches de fix
- Des criteres d'acceptation verifiables
- Une validation Zod v4 sur toutes les entrees (existantes et nouvelles)
- Un plugin OpenCode natif exposant les operations chip comme tools structures
- Une architecture `core` / `cli` / `plugin` propre

## 3. Perimetre

### Inclus

- Validation Zod v4 sur toutes les entrees CLI (commandes existantes v1 + nouvelles commandes v2)
- Champ `stage` sur les features (pipeline de workflow)
- Table et commandes `sessions` (tracking des runs agent)
- Champs `type` et `parentTaskId` sur les taches (taches fix, docs, test)
- Table et commandes `findings` (constats de review structures)
- Table et commandes `criteria` (criteres d'acceptation)
- Commande `chip next` (point d'entree intelligent pour les agents)
- Commande `chip batch` (creation en masse depuis un PRD)
- Commande `chip summary` (dashboard rapide)
- Plugin OpenCode (`@opencode-ai/plugin`) exposant les operations chip comme tools
- Refactoring de l'architecture en `core` / `cli` / `plugin`
- Tests pour chaque fonctionnalite (existante et nouvelle)

### Exclus (explicitement)

- Interface web (v3)
- Synchronisation multi-machines
- Authentification / multi-utilisateurs
- Publication sur npm (deja couvert par le PRD v1)

## 4. Contraintes & Decisions techniques

- **Runtime :** Node.js 18+, TypeScript strict, Bun comme package manager
- **Build :** tsup — un seul fichier de sortie CLI avec shebang + un point d'entree plugin separe
- **CLI :** Commander.js avec `@commander-js/extra-typings`
- **Database :** SQLite via `@libsql/client` + Drizzle ORM v1 beta
- **Validation :** Zod v4 (`zod/v4`) pour toutes les entrees CLI et plugin
- **Plugin OpenCode :** `@opencode-ai/plugin` v1.4+ — tools definies avec `tool()` et schemas Zod
- **Tests :** Vitest v4, DB reelle via `createTestDb()`, jamais de mocks DB
- **Architecture cible :**
  ```
  src/
    core/           -- logique metier pure (services, schemas Zod, types)
    cli/            -- Commander.js, parsing, affichage terminal
    plugin/         -- plugin OpenCode, tools definitions
    db/             -- schema Drizzle, client, helpers (inchange)
    utils/          -- utilitaires (inchange)
  ```

### Conventions Drizzle rappel

```ts
// CORRECT — v2 object syntax pour db.query
db.query.features.findFirst({ where: { id: featureId } });
db.query.features.findMany({ orderBy: { createdAt: "asc" } });

// SQL-builder API pour db.insert/update/delete
db.insert(features).values({ ... });
db.update(tasks).set({ ... }).where(eq(tasks.id, taskId));
```

## 5. Modele de donnees

### Modifications sur tables existantes

**features** — ajout de `stage`

| Champ | Type | Description |
|---|---|---|
| stage | text | `planning` \| `development` \| `review` \| `documentation` \| `released` — defaut `planning` |

**tasks** — ajout de `type` et `parentTaskId`

| Champ | Type | Description |
|---|---|---|
| type | text | `feature` \| `fix` \| `docs` \| `test` — defaut `feature` |
| parentTaskId | integer | Optionnel — FK vers une autre tache (la tache originale pour un fix) |

### Nouvelles tables

**sessions**

| Champ | Type | Description |
|---|---|---|
| id | integer PK | Auto-increment |
| featureId | text FK | Feature concernee |
| type | text | `prd` \| `dev` \| `review` \| `docs` |
| status | text | `active` \| `completed` \| `aborted` |
| phaseId | integer | Optionnel — phase ciblee (pour `dev`) |
| summary | text | Resume de session (ecrit a la fin) |
| createdAt | integer | Timestamp Unix |
| completedAt | integer | Timestamp Unix |

**findings**

| Champ | Type | Description |
|---|---|---|
| id | integer PK | Auto-increment |
| featureId | text FK | Feature |
| sessionId | integer FK | Session de review |
| pass | text | `business` \| `technical` |
| severity | text | `critical` \| `major` \| `minor` \| `suggestion` |
| category | text | `security` \| `convention` \| `quality` \| `test` \| `scope` \| `correctness` |
| description | text | Le constat |
| taskId | integer | Optionnel — tache fix creee pour corriger |
| resolution | text | `fixed` \| `wontfix` \| `deferred` \| null |
| createdAt | integer | Timestamp Unix |

**criteria**

| Champ | Type | Description |
|---|---|---|
| id | integer PK | Auto-increment |
| featureId | text FK | Feature |
| phaseId | integer | Optionnel — si specifique a une phase |
| description | text | Le critere |
| satisfied | integer | 0 ou 1 — defaut 0 |
| satisfiedAt | integer | Timestamp Unix |
| verifiedBy | text | Source/session qui l'a valide |
| createdAt | integer | Timestamp Unix |

### Relations

- `features` -> many `sessions`
- `features` -> many `findings`
- `features` -> many `criteria`
- `sessions` -> many `findings`
- `findings` -> optional `tasks` (tache fix)
- `tasks` -> optional parent `tasks` (via `parentTaskId`)
- `criteria` -> optional `phases`

## 6. Phases & Taches

### [ ] Phase 1 — Validation Zod v4 sur les commandes existantes

**Objectif :** Ajouter Zod v4 comme dependance, creer des schemas de validation pour toutes les entrees existantes du CLI, et les integrer dans les services actuels. Aucun changement de fonctionnalite — uniquement de la validation.
**Criteres de completion :** Toutes les commandes existantes (`feature create/list/status/export`, `phase add/status`, `task add/status`, `log add/list`) valident leurs entrees via Zod avant d'atteindre la logique metier. Les messages d'erreur Zod sont clairs et actionables. Tests couvrant les cas nominaux et les cas d'entrees invalides.

- [ ] Installer `zod` (v4) comme dependance du projet
- [ ] Creer `src/core/schemas.ts` — schemas Zod pour toutes les entrees existantes : `CreateFeatureInput`, `ListFeaturesInput`, `GetFeatureStatusInput`, `ExportFeatureInput`, `AddPhaseInput`, `UpdatePhaseStatusInput`, `AddTaskInput`, `UpdateTaskStatusInput`, `AddLogInput`, `ListLogsInput` — avec les contraintes appropriees (titres non vides, slugs valides, statuts en enum, IDs numeriques positifs, etc.)
- [ ] Creer `src/core/validate.ts` — fonction wrapper `validate<T>(schema, data): T` qui parse et retourne le resultat ou leve une erreur exploitable par les handlers CLI
- [ ] Integrer la validation dans les services existants (`feature.ts`, `phase.ts`, `task.ts`, `log.ts`) — chaque service parse ses entrees via le schema Zod correspondant avant d'executer la logique metier
- [ ] Ecrire les tests de validation : pour chaque schema, tester les cas nominaux (entrees valides) et les cas limites (chaines vides, types incorrects, statuts invalides, IDs negatifs, valeurs hors enum)
- [ ] Mettre a jour les tests d'integration existants pour verifier que les erreurs de validation sont bien remontees

### [ ] Phase 2 — Pipeline de workflow (stage) et sessions

**Objectif :** Ajouter la notion de pipeline (`stage`) sur les features et le tracking des sessions de travail. Un agent peut demarrer une session, la terminer, et consulter l'historique.
**Criteres de completion :** `chip feature stage` change le stage avec validations. `chip session start/end/list/current` fonctionnent. Les sessions sont liees aux features. Les schemas Zod valident toutes les entrees. Tests complets.

- [ ] Ecrire la migration Drizzle : ajouter `stage` sur `features` (defaut `planning`), creer la table `sessions`
- [ ] Mettre a jour `src/db/schema.ts` avec le champ `stage` sur `features` et la table `sessions`
- [ ] Mettre a jour `src/db/relations.ts` avec la relation `features` -> many `sessions`
- [ ] Mettre a jour `src/db/types.ts` avec les types `Session`, `FeatureWithSessions`
- [ ] Creer les schemas Zod dans `src/core/schemas.ts` : `UpdateFeatureStageInput`, `StartSessionInput`, `EndSessionInput`, `ListSessionsInput`, `GetCurrentSessionInput`
- [ ] Implementer `src/commands/session.ts` — services : `startSession()`, `endSession()`, `listSessions()`, `getCurrentSession()` avec validation Zod
- [ ] Implementer la commande `chip feature stage <feature-id> <stage>` — avec validations : ne peut pas regresser en arriere sans flag `--force`, ne peut pas passer en `review` si des taches sont encore `todo`/`in-progress`
- [ ] Implementer `chip session start <feature-id> <type> [--phase <id>]`
- [ ] Implementer `chip session end [session-id] [summary]` — termine la session courante si pas d'ID, avec resume optionnel
- [ ] Implementer `chip session list <feature-id> [--type <type>]`
- [ ] Implementer `chip session current [feature-id]` — retourne la session active (erreur si aucune)
- [ ] Ecrire les tests : creation/fin de session, session courante, listing avec filtres, transitions de stage valides/invalides, validations Zod

### [ ] Phase 3 — Types de taches, findings et criteres d'acceptation

**Objectif :** Enrichir les taches avec un type et un lien parent. Ajouter les tables `findings` et `criteria` avec leurs commandes. La review peut creer des constats structures qui generent des taches de fix traçables.
**Criteres de completion :** Les taches ont un `type` et un `parentTaskId` optionnel. Les findings sont crees, listes, resolus. Les criteres sont crees et coches. Tous les schemas Zod sont en place. Tests complets.

- [ ] Ecrire la migration Drizzle : ajouter `type` et `parentTaskId` sur `tasks`, creer les tables `findings` et `criteria`
- [ ] Mettre a jour `src/db/schema.ts` avec les champs `type`/`parentTaskId` sur `tasks`, et les tables `findings`/`criteria`
- [ ] Mettre a jour `src/db/relations.ts` avec toutes les nouvelles relations
- [ ] Mettre a jour `src/db/types.ts` avec les types `Finding`, `Criterion`, `TaskWithParent`
- [ ] Creer les schemas Zod : `AddTaskInputV2` (avec `type`, `parentTaskId`), `AddFindingInput`, `ListFindingsInput`, `ResolveFindingInput`, `AddCriterionInput`, `CheckCriterionInput`, `ListCriteriaInput`
- [ ] Mettre a jour le service `addTask()` pour accepter `type` et `parentTaskId` (retrocompatible, defaut `feature`)
- [ ] Mettre a jour la commande `chip task add` avec les options `--type <type>` et `--parent <task-id>`
- [ ] Implementer `src/commands/finding.ts` — services : `addFinding()`, `listFindings()`, `resolveFinding()`
- [ ] Implementer `chip finding add <feature-id> <description> --pass <pass> --severity <sev> [--category <cat>] [--session <id>]`
- [ ] Implementer `chip finding list <feature-id> [--unresolved] [--pass <pass>] [--severity <sev>]`
- [ ] Implementer `chip finding resolve <finding-id> <resolution> [--task <task-id>]` — lie optionnellement une tache fix
- [ ] Implementer `src/commands/criterion.ts` — services : `addCriterion()`, `checkCriterion()`, `listCriteria()`
- [ ] Implementer `chip criteria add <feature-id> <description> [--phase <id>]`
- [ ] Implementer `chip criteria check <criteria-id> [--source <source>]`
- [ ] Implementer `chip criteria list <feature-id> [--pending] [--phase <id>]`
- [ ] Mettre a jour `chip feature status` et `chip feature export` pour afficher les findings, criteres, et types de taches
- [ ] Ecrire les tests : taches avec type/parent, CRUD findings, resolution de findings, CRUD criteria, affichage enrichi dans status/export

### [ ] Phase 4 — Commandes agents (next, batch, summary)

**Objectif :** Fournir les commandes de confort qui rendent chip reellement exploitable par un agent autonome : savoir quoi faire ensuite, creer en masse, et obtenir un dashboard rapide.
**Criteres de completion :** `chip next` donne un diagnostic actionable. `chip batch` cree phases+taches en une commande. `chip summary` affiche un dashboard compact. Tests complets.

- [ ] Creer les schemas Zod : `NextInput`, `BatchInput` (avec schema du format batch), `SummaryInput`
- [ ] Implementer `src/commands/next.ts` — service `getNext()` : agrege le stage, les taches non faites, les findings non resolus, les criteres non satisfaits, et produit un diagnostic structure avec la prochaine action suggeree
- [ ] Implementer `chip next <feature-id>` — affichage structure du diagnostic
- [ ] Implementer `src/commands/batch.ts` — service `executeBatch()` : accepte un payload JSON (ou heredoc texte) decrivant des phases avec leurs taches, et les cree en une seule transaction
- [ ] Implementer `chip batch <feature-id> --json <file>` — lecture depuis fichier JSON ou stdin
- [ ] Definir le format batch JSON : `{ phases: [{ title, description?, tasks: [{ title, description?, type? }] }] }`
- [ ] Implementer `src/commands/summary.ts` — service `getSummary()` : calcule les stats (progression, taches par type/statut, findings resolus/non resolus, criteres satisfaits, sessions)
- [ ] Implementer `chip summary <feature-id>` — affichage dashboard compact
- [ ] Ecrire les tests : `next` avec differents etats de feature, `batch` avec JSON valide/invalide, `summary` avec donnees variees

### [ ] Phase 5 — Plugin OpenCode

**Objectif :** Exposer toutes les operations chip comme tools OpenCode natifs via le systeme de plugin `@opencode-ai/plugin`. L'agent n'a plus besoin de passer par le shell — il appelle directement les tools.
**Criteres de completion :** Le plugin s'enregistre dans OpenCode, expose les operations chip comme tools avec schemas Zod, et retourne des reponses JSON structurees. Les tools couvrent : feature (create, list, status, stage, export, summary), session (start, end, current, list), phase (add, status), task (add, status), log (add, list), finding (add, list, resolve), criteria (add, check, list), next, batch. Tests du plugin.

- [ ] Installer `@opencode-ai/plugin` comme dependance de developpement
- [ ] Creer `src/plugin/index.ts` — point d'entree du plugin OpenCode, exporte un `PluginModule` avec `id: "chip"` et la fonction `server`
- [ ] Creer `src/plugin/tools/feature.ts` — tools : `chip_feature_create`, `chip_feature_list`, `chip_feature_status`, `chip_feature_stage`, `chip_feature_export`, `chip_feature_summary`
- [ ] Creer `src/plugin/tools/session.ts` — tools : `chip_session_start`, `chip_session_end`, `chip_session_current`, `chip_session_list`
- [ ] Creer `src/plugin/tools/phase.ts` — tools : `chip_phase_add`, `chip_phase_status`
- [ ] Creer `src/plugin/tools/task.ts` — tools : `chip_task_add`, `chip_task_status`
- [ ] Creer `src/plugin/tools/log.ts` — tools : `chip_log_add`, `chip_log_list`
- [ ] Creer `src/plugin/tools/finding.ts` — tools : `chip_finding_add`, `chip_finding_list`, `chip_finding_resolve`
- [ ] Creer `src/plugin/tools/criteria.ts` — tools : `chip_criteria_add`, `chip_criteria_check`, `chip_criteria_list`
- [ ] Creer `src/plugin/tools/agent.ts` — tools : `chip_next`, `chip_batch`
- [ ] Chaque tool utilise `tool()` de `@opencode-ai/plugin/tool` avec les schemas Zod de `src/core/schemas.ts`, appelle les services de `src/core/`, et retourne du JSON structure
- [ ] Configurer tsup pour produire un second point d'entree `dist/plugin.js` (ESM) en plus du CLI
- [ ] Mettre a jour `.opencode/package.json` pour referencer le plugin local
- [ ] Ecrire les tests : chaque tool retourne le bon resultat JSON, les erreurs de validation sont bien remontees, le plugin s'initialise correctement

### [ ] Phase 6 — Refactoring architecture core/cli/plugin

**Objectif :** Reorganiser le code pour separer clairement la logique metier (core), l'interface CLI (cli), et le plugin OpenCode (plugin). Le core ne depend ni de Commander ni du plugin. Le CLI et le plugin ne font que de la plomberie d'I/O autour du core.
**Criteres de completion :** Le code est reorganise selon l'architecture cible. Les imports sont propres (pas de dependances circulaires). Le CLI et le plugin fonctionnent identiquement. Tous les tests passent apres le refactoring. La couverture de test n'a pas diminue.

- [ ] Creer la structure `src/core/` et y deplacer tous les services metier (actuellement dans `src/commands/*.ts`) — chaque service devient un module dans `src/core/` : `src/core/feature.ts`, `src/core/phase.ts`, `src/core/task.ts`, `src/core/log.ts`, `src/core/session.ts`, `src/core/finding.ts`, `src/core/criterion.ts`, `src/core/next.ts`, `src/core/batch.ts`, `src/core/summary.ts`
- [ ] Les schemas Zod restent dans `src/core/schemas.ts`, la validation dans `src/core/validate.ts`
- [ ] Creer la structure `src/cli/` et y deplacer tout le code Commander — chaque fichier CLI importe ses services depuis `src/core/` et ne fait que du parsing d'arguments + affichage
- [ ] Mettre a jour `src/cli/index.ts` comme point d'entree CLI (remplace `src/index.ts`)
- [ ] Les fichiers dans `src/plugin/` importent leurs services depuis `src/core/`
- [ ] Verifier qu'aucun fichier de `src/core/` n'importe depuis `src/cli/` ou `src/plugin/`
- [ ] Mettre a jour la configuration tsup : entree CLI (`src/cli/index.ts` -> `dist/cli.js` avec shebang), entree plugin (`src/plugin/index.ts` -> `dist/plugin.js` ESM)
- [ ] Mettre a jour `package.json` : `bin` pointe vers `dist/cli.js`, ajouter un export `./plugin` vers `dist/plugin.js`
- [ ] Mettre a jour les imports dans tous les tests pour pointer vers `src/core/`
- [ ] Lancer `bun run typecheck`, `bun run test`, `bun run build:win` — tout doit passer
- [ ] Mettre a jour `AGENTS.md` avec la nouvelle structure de code

## 7. Criteres d'acceptation globaux

- [ ] Toutes les entrees CLI sont validees par Zod v4 avec des messages d'erreur clairs
- [ ] Le pipeline `planning` > `development` > `review` > `documentation` > `released` est enforce par chip
- [ ] Un agent peut demarrer une session, travailler, la terminer, et retrouver l'historique au run suivant
- [ ] La commande review peut creer des findings structures qui generent des taches de fix traçables
- [ ] `chip next` donne un diagnostic complet et actionable en une commande
- [ ] `chip batch` permet de creer une feature complete (phases + taches) en une seule commande
- [ ] Le plugin OpenCode expose toutes les operations chip comme tools structures
- [ ] Le core metier (`src/core/`) ne depend ni de Commander ni du plugin OpenCode
- [ ] Tous les tests passent (`bun run test`)
- [ ] Le build produit un CLI fonctionnel et un plugin fonctionnel (`bun run build:win`)
- [ ] Pas de regression sur les commandes v1 existantes

## 8. Risques & Questions ouvertes

| Sujet | Impact estime | Statut |
|---|---|---|
| Migration Drizzle sur une BDD existante avec donnees v1 | Moyen — les nouvelles colonnes ont des defauts, pas de perte de donnees | A valider |
| Zod v4 est recent — stabilite de l'API | Faible — Zod v4 est stable, deja utilise par `@opencode-ai/plugin` | Resolu |
| Plugin OpenCode necessite Bun runtime pour `$` shell | Moyen — le plugin chip n'utilise pas `$`, il appelle directement les services core via DB | Resolu |
| Double point d'entree tsup (CJS cli + ESM plugin) | Faible — tsup supporte nativement les entrees multiples | A valider au build |
| Taille du bundle avec Zod v4 inclus | Faible — Zod v4/mini est leger, et deja present dans les deps OpenCode | Resolu |
| Retrocompatibilite des commandes v1 apres refactoring | Moyen — les commandes gardent la meme signature CLI, seule l'organisation interne change | A tester |

---

## Journal

[2026-04-14] /prd -- PRD v2 cree. 6 phases, ~60 taches. Couvre : validation Zod, pipeline, sessions, findings, criteres, commandes agent, plugin OpenCode, refactoring architecture.
