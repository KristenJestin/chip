# Modèle de données

> Schéma complet de la base SQLite stockée dans `<cwd>/.chip/chip.db`.  
> Défini dans `src/db/schema.ts`, relations dans `src/db/relations.ts`, types dans `src/db/types.ts`.

---

## Tables

### `features`

Racine du modèle. Chaque feature est identifiée par un slug kebab-case auto-généré.

| Colonne | Type SQLite | Contraintes | Défaut |
|---|---|---|---|
| `id` | `text` | PRIMARY KEY (slug kebab-case, max 64 chars) | — |
| `title` | `text` | NOT NULL | — |
| `description` | `text` | nullable | — |
| `status` | `text` | NOT NULL, enum | `"active"` |
| `stage` | `text` | NOT NULL, enum | `"planning"` |
| `created_at` | `integer` | NOT NULL (Unix secondes) | — |
| `updated_at` | `integer` | NOT NULL (Unix secondes) | — |

**Valeurs `status` :** `"active"` | `"done"` | `"archived"`

**Valeurs `stage` :** `"planning"` → `"development"` → `"review"` → `"documentation"` → `"released"`

---

### `phases`

Découpage d'une feature en phases de travail séquentielles.

| Colonne | Type SQLite | Contraintes | Défaut |
|---|---|---|---|
| `id` | `integer` | PRIMARY KEY AUTOINCREMENT | — |
| `feature_id` | `text` | NOT NULL, FK → `features.id` | — |
| `order` | `integer` | NOT NULL | — |
| `title` | `text` | NOT NULL | — |
| `description` | `text` | nullable | — |
| `status` | `text` | NOT NULL, enum | `"todo"` |
| `created_at` | `integer` | NOT NULL | — |
| `started_at` | `integer` | nullable | — |
| `completed_at` | `integer` | nullable | — |

**Valeurs `status` :** `"todo"` | `"in-progress"` | `"review"` | `"done"`

---

### `tasks`

Unités de travail atomiques au sein d'une phase.

| Colonne | Type SQLite | Contraintes | Défaut |
|---|---|---|---|
| `id` | `integer` | PRIMARY KEY AUTOINCREMENT | — |
| `phase_id` | `integer` | NOT NULL, FK → `phases.id` | — |
| `order` | `integer` | NOT NULL | — |
| `title` | `text` | NOT NULL | — |
| `description` | `text` | nullable | — |
| `status` | `text` | NOT NULL, enum | `"todo"` |
| `type` | `text` | NOT NULL, enum | `"feature"` |
| `parent_task_id` | `integer` | nullable, FK auto-référence → `tasks.id` | — |
| `created_at` | `integer` | NOT NULL | — |
| `started_at` | `integer` | nullable | — |
| `completed_at` | `integer` | nullable | — |

**Valeurs `status` :** `"todo"` | `"in-progress"` | `"done"`

> **Note :** le statut `"review"` a été **supprimé des tâches** (migration `20260414163000`). Les tâches existantes portant ce statut ont été migrées vers `"done"`. Les phases conservent leur propre statut `"review"`.

**Valeurs `type` :** `"feature"` | `"fix"` | `"docs"` | `"test"`

> **Note :** `parent_task_id` permet de hiérarchiser les tâches (sous-tâches). Cette relation n'est pas déclarée dans Drizzle Relations — elle est gérée manuellement.

---

### `task_dependencies`

Dépendances de blocage entre tâches : une tâche ne peut passer à `"in-progress"` ou `"done"` tant que ses bloqueurs ne sont pas à l'état `"done"`.

| Colonne | Type SQLite | Contraintes | Défaut |
|---|---|---|---|
| `id` | `integer` | PRIMARY KEY AUTOINCREMENT | — |
| `task_id` | `integer` | NOT NULL, FK → `tasks.id` ON DELETE CASCADE | — |
| `blocks_task_id` | `integer` | NOT NULL, FK → `tasks.id` ON DELETE CASCADE | — |
| `created_at` | `integer` | NOT NULL (Unix secondes) | — |

**Index unique :** `(task_id, blocks_task_id)` — une paire bloqué/bloqueur ne peut exister qu'une fois.

**Lecture :** `task_id` est la tâche **bloquée**, `blocks_task_id` est la tâche **bloquante** (celle qui doit être terminée en premier).

> Les deux FK sont déclarées avec `ON DELETE CASCADE` : supprimer une tâche supprime automatiquement toutes les dépendances où elle apparaît.

---

### `logs`

Journal d'événements associé à une feature. Optionnellement scopé à une phase ou une tâche.

| Colonne | Type SQLite | Contraintes | Défaut |
|---|---|---|---|
| `id` | `integer` | PRIMARY KEY AUTOINCREMENT | — |
| `feature_id` | `text` | NOT NULL, FK → `features.id` | — |
| `phase_id` | `integer` | nullable | — |
| `task_id` | `integer` | nullable | — |
| `source` | `text` | nullable (ex. : nom de la commande ou agent) | — |
| `message` | `text` | NOT NULL | — |
| `created_at` | `integer` | NOT NULL | — |

---

### `sessions`

Sessions de travail typées associées à une feature. Plusieurs sessions actives simultanément sont techniquement possibles.

| Colonne | Type SQLite | Contraintes | Défaut |
|---|---|---|---|
| `id` | `integer` | PRIMARY KEY AUTOINCREMENT | — |
| `feature_id` | `text` | NOT NULL, FK → `features.id` | — |
| `type` | `text` | NOT NULL, enum | — |
| `status` | `text` | NOT NULL, enum | `"active"` |
| `phase_id` | `integer` | nullable | — |
| `summary` | `text` | nullable | — |
| `created_at` | `integer` | NOT NULL | — |
| `completed_at` | `integer` | nullable | — |

**Valeurs `type` :** `"prd"` | `"dev"` | `"review"` | `"docs"`

**Valeurs `status` :** `"active"` | `"completed"` | `"aborted"`

---

### `findings`

Observations relevées lors d'une session de review (passe métier ou technique).

| Colonne | Type SQLite | Contraintes | Défaut |
|---|---|---|---|
| `id` | `integer` | PRIMARY KEY AUTOINCREMENT | — |
| `feature_id` | `text` | NOT NULL, FK → `features.id` | — |
| `session_id` | `integer` | nullable, FK → `sessions.id` | — |
| `pass` | `text` | NOT NULL, enum | — |
| `severity` | `text` | NOT NULL, enum | — |
| `category` | `text` | nullable, enum | — |
| `description` | `text` | NOT NULL | — |
| `task_id` | `integer` | nullable (FK vers tâche fix associée) | — |
| `resolution` | `text` | nullable, enum | — |
| `created_at` | `integer` | NOT NULL | — |

**Valeurs `pass` :** `"business"` | `"technical"`

**Valeurs `severity` :** `"critical"` | `"major"` | `"minor"` | `"suggestion"`

**Valeurs `category` :** `"security"` | `"convention"` | `"quality"` | `"test"` | `"scope"` | `"correctness"`

**Valeurs `resolution` :** `"fixed"` | `"wontfix"` | `"deferred"`

> **Note :** `task_id` (lien vers la tâche de correction) n'est pas déclaré dans Drizzle Relations — géré manuellement.

---

### `criteria`

Critères d'acceptation associés à une feature, optionnellement scopés à une phase.

| Colonne | Type SQLite | Contraintes | Défaut |
|---|---|---|---|
| `id` | `integer` | PRIMARY KEY AUTOINCREMENT | — |
| `feature_id` | `text` | NOT NULL, FK → `features.id` | — |
| `phase_id` | `integer` | nullable | — |
| `description` | `text` | NOT NULL | — |
| `satisfied` | `integer` | NOT NULL (0 ou 1) | `0` |
| `satisfied_at` | `integer` | nullable | — |
| `verified_by` | `text` | nullable | — |
| `created_at` | `integer` | NOT NULL | — |

---

### `events`

Événements typés et structurés associés à une feature. Chaque événement porte un payload JSON validé par un schéma Zod spécifique à son `kind`.

| Colonne | Type SQLite | Contraintes | Défaut |
|---|---|---|---|
| `id` | `integer` | PRIMARY KEY AUTOINCREMENT | — |
| `feature_id` | `text` | NOT NULL, FK → `features.id` | — |
| `kind` | `text` | NOT NULL, enum | — |
| `data` | `text` | NOT NULL (JSON stringifié, validé par kind) | — |
| `phase_id` | `integer` | nullable | — |
| `task_id` | `integer` | nullable | — |
| `finding_id` | `integer` | nullable | — |
| `session_id` | `integer` | nullable, FK → `sessions.id` | — |
| `source` | `text` | nullable (ex. : `chip_dev_subagent`) | — |
| `created_at` | `integer` | NOT NULL (Unix secondes) | — |

**Valeurs `kind` :** `"task_result"` | `"correction"` | `"decision"` | `"phase_summary"`

Schéma du payload par `kind` :

| `kind` | Champs du payload |
|---|---|
| `task_result` | `files: { created, modified, deleted }`, `decisions: string[]`, `issues: string[]`, `test_result: { passed, count }` |
| `correction` | `root_cause: string`, `fix: string`, `files: string[]` |
| `decision` | `context: string`, `options: string[]` (min 1), `chosen: string`, `rationale: string` |
| `phase_summary` | `delivered: string[]` (min 1), `coverage_verdict: "SUFFICIENT"\|"PARTIAL"\|"MISSING"`, `risks: string[]` |

> `data` est stocké comme chaîne JSON. La validation du payload est effectuée **avant l'insertion** par `addEvent()` via `EVENT_DATA_SCHEMAS[kind].safeParse(data)`. Le plugin retourne le champ désérialisé.

---

## Relations Drizzle

Définies via `defineRelations` (API v2, Drizzle ORM v1 beta) dans `src/db/relations.ts`.

```
features  ──< phases            (one-to-many, via phases.feature_id)
features  ──< logs              (one-to-many, via logs.feature_id)
features  ──< sessions          (one-to-many, via sessions.feature_id)
features  ──< findings          (one-to-many, via findings.feature_id)
features  ──< criteria          (one-to-many, via criteria.feature_id)
features  ──< events            (one-to-many, via events.feature_id)

phases    >── features          (many-to-one)
phases    ──< tasks             (one-to-many, via tasks.phase_id)

tasks     >── phases            (many-to-one)
tasks     ──< taskDependencies  (blockedByDeps : dépendances où cette tâche est bloquée)
tasks     ──< taskDependencies  (blocksDeps    : dépendances où cette tâche est le bloqueur)

taskDependencies >── tasks      (blockedTask  : tâche bloquée, via task_dependencies.task_id)
taskDependencies >── tasks      (blockerTask  : tâche bloquante, via task_dependencies.blocks_task_id)

logs      >── features          (many-to-one)

sessions  >── features          (many-to-one)
sessions  ──< findings          (one-to-many, via findings.session_id)

findings  >── features          (many-to-one)
findings  >── sessions          (many-to-one)

criteria  >── features          (many-to-one)

events    >── features          (many-to-one)
events    >── sessions          (many-to-one, optionnel, via events.session_id)
```

**Relations non déclarées dans Drizzle (gérées manuellement) :**
- `tasks.parent_task_id` → `tasks.id` (auto-référence, sous-tâches)
- `findings.task_id` → `tasks.id` (lien vers la tâche de correction)

---

## Types TypeScript composites

Définis dans `src/db/types.ts`.

```typescript
// Types scalaires inférés du schéma Drizzle
type Feature        = typeof features.$inferSelect;
type Phase          = typeof phases.$inferSelect;
type Task           = typeof tasks.$inferSelect;
type Log            = typeof logs.$inferSelect;
type Session        = typeof sessions.$inferSelect;
type Finding        = typeof findings.$inferSelect;
type Criterion      = typeof criteria.$inferSelect;
type TaskDependency = typeof taskDependencies.$inferSelect;
type Event          = typeof events.$inferSelect;

// Types composites utilisés par les services
type PhaseWithTasks      = Phase & { tasks: Task[] };
type FeatureDetails      = {
  feature:    Feature;
  phases:     PhaseWithTasks[];
  recentLogs: Log[];        // limité aux 10 derniers
  findings:   Finding[];
  criteria:   Criterion[];
};
type FeatureWithSessions  = Feature & { sessions: Session[] };
type TaskWithParent       = Task & { parentTask?: Task | null };
type TaskWithDependencies = Task & {
  blockedByDeps: Array<TaskDependency & { blockerTask: Task }>;
  blocksDeps:    Array<TaskDependency & { blockedTask: Task }>;
};

/**
 * Tâche en attente enrichie avec la liste des tâches qui la bloquent activement
 * (bloqueurs dont le statut n'est pas encore "done"). Utilisé par NextDiagnostic.
 */
type PendingTaskDiagnostic = Task & { blockedBy: Task[] };
```

---

## Couche client (`src/db/client.ts`)

Trois fonctions d'ouverture selon le contexte :

| Fonction | Usage | Comportement |
|---|---|---|
| `openDb(url, migrationsFolder)` | Tests | Crée et migre une DB à l'URL donnée |
| `openDbForProject(projectDir, migrationsFolder)` | Plugin OpenCode | Ouvre `<projectDir>/.chip/chip.db`, crée `.chip/` si absent |
| `getDb()` | CLI (singleton production) | Appelle `ensureInit()`, charge les migrations bundlées depuis `dist/migrations/` |

---

## Helpers DB (`src/db/helpers.ts`)

Fonctions de garde et de calcul d'ordre utilisées par les services core.

```typescript
assertFeatureExists(db, featureId: string): Promise<void>
// Lance Error("Feature not found: <id>") si la feature est absente.

assertFeatureInPlanning(db, featureId: string): Promise<void>
// Lance Error si la feature est absente OU si son stage n'est pas "planning".
// Utilisé par addTaskDependency / removeTaskDependency pour restreindre
// les modifications de dépendances au stage de planification.

assertPhaseExists(db, phaseId: number, featureId: string): Promise<void>
// Lance Error si la phase est absente OU n'appartient pas à la feature.

assertTaskExists(db, taskId: number, phaseId: number): Promise<void>
// Lance Error si la tâche est absente OU n'appartient pas à la phase.

nextPhaseOrder(db, featureId: string): Promise<number>
// Retourne max(order) + 1 parmi les phases de la feature. Retourne 1 si aucune phase.

nextTaskOrder(db, phaseId: number): Promise<number>
// Retourne max(order) + 1 parmi les tâches de la phase. Retourne 1 si aucune tâche.
```

---

## Conventions de stockage

- **Timestamps :** entiers Unix en secondes (`Math.floor(Date.now() / 1000)`), stockés en `integer` SQLite.
- **Booléens :** `integer` SQLite (0 ou 1). Uniquement sur `criteria.satisfied`.
- **IDs features :** slugs kebab-case, max 64 caractères, générés depuis le titre. En cas de collision, suffixe `-2`, `-3`, etc.
- **IDs phases/tasks/logs/sessions/findings/criteria/taskDependencies/events :** entiers autoincrémentés.

---

## Migrations

| Fichier | Date | Contenu |
|---|---|---|
| `20260413130137_puzzling_cannonball` | 2026-04-13 | Création initiale : `features`, `phases`, `tasks`, `logs` |
| `20260414095646_thankful_thunderbolt` | 2026-04-14 | Ajout de `sessions`, colonne `stage` sur `features` (défaut `"planning"`) |
| `20260414100337_even_whiplash` | 2026-04-14 | Ajout de `criteria`, `findings`, colonnes `type` et `parent_task_id` sur `tasks` |
| `20260414163000_migrate_task_review_to_done` | 2026-04-14 | Migration des tâches `status = 'review'` vers `'done'` ; suppression de `"review"` de l'enum des tâches |
| `20260414180853_curved_storm` | 2026-04-14 | Création de `task_dependencies` avec contrainte unique `(task_id, blocks_task_id)` et FK CASCADE |
| `20260414221404_nebulous_shadowcat` | 2026-04-14 | Création de `events` avec FK sur `features.id` et `sessions.id` |

Les migrations sont stockées dans `drizzle/` et copiées dans `dist/migrations/` au moment du build.
