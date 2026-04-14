# Documentation — chip

> Index de navigation. Maintenu automatiquement.

## Entités

| Fichier | Contenu |
|---|---|
| [entities/modele-de-donnees.md](entities/modele-de-donnees.md) | Schéma complet des 6 tables SQLite (colonnes, types, contraintes, valeurs d'énumération), relations Drizzle, types TypeScript composites, couche client DB, helpers, migrations |
| [entities/schemas-validation.md](entities/schemas-validation.md) | Schémas Zod v4 par domaine (feature, phase, tâche, log, session, finding, critère, agent), primitives partagées, règle d'import critique |

## Métier

| Fichier | Domaine |
|---|---|
| [metier/features.md](metier/features.md) | Cycle de vie d'une feature : statuts, pipeline de stages, règles de transition (régression, passage à `review`), création et génération de slug, invariants |
| [metier/sessions-findings-criteres.md](metier/sessions-findings-criteres.md) | Règles des sessions (types, résolution, sessions actives simultanées), findings (classification, résolution irréversible, lien tâche fix), critères d'acceptation (satisfaction irréversible, `verified_by`) |
| [metier/commandes-cli.md](metier/commandes-cli.md) | Référence complète de toutes les commandes CLI : syntaxe, options, comportement (`chip init`, `feature`, `phase`, `task`, `log`, `session`, `finding`, `criteria`, `next`, `batch`, `summary`, `event`) |
| [metier/plugin-opencode.md](metier/plugin-opencode.md) | Les 26 outils du plugin OpenCode, paramètres et retours, différences avec la CLI, structures `SummaryData` et `NextDiagnostic`, templates installés par `chip init` |

## Flux

| Fichier | Description |
|---|---|
| [flux/cycle-de-vie-feature.md](flux/cycle-de-vie-feature.md) | Séquence complète d'une feature de `planning` à `released` : création, structuration batch, sessions de travail, passage en review, findings, critères, livraison |
| [flux/initialisation.md](flux/initialisation.md) | Séquences de `chip init`, `getDb()` (singleton CLI) et `openDbForProject()` (plugin) : création de `.chip/`, migrations, `.gitignore`, installation des templates |
| [flux/diagnostic-next.md](flux/diagnostic-next.md) | Logique de `getNext()` : collecte des données, arbre de décision par stage, priorité des sessions actives |

---

Dernière mise à jour : 2026-04-15
