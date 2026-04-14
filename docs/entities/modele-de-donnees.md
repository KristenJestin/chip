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

**Valeurs `status` :** `"todo"` | `"in-progress"` | `"review"` | `"done"`

**Valeurs `type` :** `"feature"` | `"fix"` | `"docs"` | `"test"`

> **Note :** `parent_task_id` permet de hiérarchiser les tâches (sous-tâches). Cette relation n'est pas déclarée dans Drizzle Relations — elle est gérée manuellement.

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

## Relations Drizzle

Définies via `defineRelations` (API v2, Drizzle ORM v1 beta) dans `src/db/relations.ts`.

```
features  ──< phases     (one-to-many, via phases.feature_id)
features  ──< logs       (one-to-many, via logs.feature_id)
features  ──< sessions   (one-to-many, via sessions.feature_id)
features  ──< findings   (one-to-many, via findings.feature_id)
features  ──< criteria   (one-to-many, via criteria.feature_id)

phases    >── features   (many-to-one)
phases    ──< tasks      (one-to-many, via tasks.phase_id)

tasks     >── phases     (many-to-one)

logs      >── features   (many-to-one)

sessions  >── features   (many-to-one)
sessions  ──< findings   (one-to-many, via findings.session_id)

findings  >── features   (many-to-one)
findings  >── sessions   (many-to-one)

criteria  >── features   (many-to-one)
```

**Relations non déclarées dans Drizzle (gérées manuellement) :**
- `tasks.parent_task_id` → `tasks.id` (auto-référence, sous-tâches)
- `findings.task_id` → `tasks.id` (lien vers la tâche de correction)

---

## Types TypeScript composites

Définis dans `src/db/types.ts`.

```typescript
// Types scalaires inférés du schéma Drizzle
type Feature   = typeof features.$inferSelect;
type Phase     = typeof phases.$inferSelect;
type Task      = typeof tasks.$inferSelect;
type Log       = typeof logs.$inferSelect;
type Session   = typeof sessions.$inferSelect;
type Finding   = typeof findings.$inferSelect;
type Criterion = typeof criteria.$inferSelect;

// Types composites utilisés par les services
type PhaseWithTasks      = Phase & { tasks: Task[] };
type FeatureDetails      = {
  feature:    Feature;
  phases:     PhaseWithTasks[];
  recentLogs: Log[];        // limité aux 10 derniers
  findings:   Finding[];
  criteria:   Criterion[];
};
type FeatureWithSessions = Feature & { sessions: Session[] };
type TaskWithParent      = Task & { parentTask?: Task | null };
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
- **IDs phases/tasks/logs/sessions/findings/criteria :** entiers autoincrémentés.

---

## Migrations

| Fichier | Date | Contenu |
|---|---|---|
| `20260413130137_puzzling_cannonball` | 2026-04-13 | Création initiale : `features`, `phases`, `tasks`, `logs` |
| `20260414095646_thankful_thunderbolt` | 2026-04-14 | Ajout de `sessions`, colonne `stage` sur `features` (défaut `"planning"`) |
| `20260414100337_even_whiplash` | 2026-04-14 | Ajout de `criteria`, `findings`, colonnes `type` et `parent_task_id` sur `tasks` |

Les migrations sont stockées dans `drizzle/` et copiées dans `dist/migrations/` au moment du build.
