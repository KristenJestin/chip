# Documentation — chip

> Index de navigation. Maintenu automatiquement.

## Entités

| Fichier | Contenu |
|---|---|
| [entities/modele-de-donnees.md](entities/modele-de-donnees.md) | Schéma complet des 8 tables SQLite (`features`, `phases`, `tasks`, `task_dependencies`, `logs`, `sessions`, `findings`, `criteria`, `events`), colonnes, types, contraintes, relations Drizzle, types TypeScript composites, helpers DB, migrations |
| [entities/schemas-validation.md](entities/schemas-validation.md) | Schémas Zod v4 par domaine (feature, phase, tâche, dépendance, log, session, finding, critère, événement, agent), primitives partagées (`phaseStatus` et `taskStatus` désormais distincts), règle d'import critique |

## Métier

| Fichier | Domaine |
|---|---|
| [metier/features.md](metier/features.md) | Cycle de vie d'une feature : statuts, pipeline de stages, règles de transition (régression, passage à `review`), création et génération de slug, invariants |
| [metier/sessions-findings-criteres.md](metier/sessions-findings-criteres.md) | Règles des sessions (types, résolution, sessions actives simultanées), findings (classification, résolution irréversible, lien tâche fix), critères d'acceptation (satisfaction irréversible, `verified_by`) |
| [metier/commandes-cli.md](metier/commandes-cli.md) | Référence complète de toutes les commandes CLI : syntaxe, options, comportement (`chip init`, `feature`, `phase`, `task`, `task dep`, `log`, `session`, `finding`, `criteria`, `next`, `batch`, `summary`, `event`) |
| [metier/plugin-opencode.md](metier/plugin-opencode.md) | Les 31 outils du plugin OpenCode, paramètres et retours, différences avec la CLI, structures `SummaryData` et `NextDiagnostic` (avec `PendingTaskDiagnostic`), templates installés par `chip init` |

## Flux

| Fichier | Description |
|---|---|
| [flux/cycle-de-vie-feature.md](flux/cycle-de-vie-feature.md) | Séquence complète d'une feature de `planning` à `released` : création, structuration batch, sessions de travail, passage en review, findings, critères, livraison |
| [flux/initialisation.md](flux/initialisation.md) | Séquences de `chip init`, `getDb()` (singleton CLI) et `openDbForProject()` (plugin) : création de `.chip/`, migrations, `.gitignore`, installation des templates |
| [flux/diagnostic-next.md](flux/diagnostic-next.md) | Logique de `getNext()` : collecte des données, enrichissement `PendingTaskDiagnostic` avec bloqueurs actifs, arbre de décision par stage, priorité des sessions actives |
| [flux/dependances-taches.md](flux/dependances-taches.md) | Système de dépendances de blocage entre tâches : règles métier, détection de cycles (DFS), enforcement dans `updateTaskStatus`, création intra-batch via `ref`/`blockedBy`, affichage dans `chip feature status` |

---

Dernière mise à jour : 2026-04-15
