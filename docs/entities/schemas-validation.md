# Schémas de validation

> Schémas Zod v4 définis dans `src/core/schemas.ts`.  
> Utilisés par les services core via le wrapper `validate<T>()` (`src/core/validate.ts`).

---

## Règle d'import critique

```typescript
// CORRECT — import en espace de noms
import * as z from "zod";

// INCORRECT — provoque z = undefined dans Vitest
import { z } from "zod";
```

---

## Wrapper de validation

```typescript
// src/core/validate.ts
validate<T>(schema: z.ZodType<T>, data: unknown): T
```

- Appelle `schema.safeParse(data)`.
- En cas d'échec : lance une `Error` avec le message formaté par `z.prettifyError(result.error)`.
- Appelé en tête de chaque fonction de service core.

---

## Primitives partagées

```typescript
nonEmptyString    = z.string().min(1, "Must not be empty")
positiveInt       = z.number().int().positive()

featureStatus     = z.enum(["active", "done", "archived"])
featureStage      = z.enum(["planning", "development", "review", "documentation", "released"])

phaseStatus       = z.enum(["todo", "in-progress", "review", "done"])
taskStatus        = z.enum(["todo", "in-progress", "done"])
// Note : phaseStatus et taskStatus sont désormais distincts.
// Le statut "review" n'existe que pour les phases (phases.status), pas pour les tâches.

sessionType       = z.enum(["prd", "dev", "review", "docs"])
sessionStatus     = z.enum(["active", "completed", "aborted"])

taskType          = z.enum(["feature", "fix", "docs", "test"])

findingPass       = z.enum(["business", "technical"])
findingSeverity   = z.enum(["critical", "major", "minor", "suggestion"])
findingCategory   = z.enum(["security", "convention", "quality", "test", "scope", "correctness"])
findingResolution = z.enum(["fixed", "wontfix", "deferred"])

eventKind         = z.enum(["task_result", "correction", "decision", "phase_summary"])
```

---

## Schémas par domaine

### Feature

| Schéma | Champs |
|---|---|
| `CreateFeatureInput` | `title: nonEmptyString`, `description?: string` |
| `GetFeatureStatusInput` | `featureId: nonEmptyString` |
| `ExportFeatureInput` | `featureId: nonEmptyString`, `output?: string` |
| `UpdateFeatureStatusInput` | `featureId: nonEmptyString`, `status: featureStatus` |
| `UpdateFeatureStageInput` | `featureId: nonEmptyString`, `stage: featureStage`, `force?: boolean` |

### Phase

| Schéma | Champs |
|---|---|
| `AddPhaseInput` | `featureId: nonEmptyString`, `title: nonEmptyString`, `description?: string` |
| `UpdatePhaseStatusInput` | `featureId: nonEmptyString`, `phaseId: positiveInt`, `status: phaseStatus` |

### Tâche

| Schéma | Champs |
|---|---|
| `AddTaskInput` | `featureId: nonEmptyString`, `phaseId: positiveInt`, `title: nonEmptyString`, `description?: string` |
| `AddTaskInputV2` | Étend `AddTaskInput` + `type?: taskType`, `parentTaskId?: positiveInt` |
| `UpdateTaskStatusInput` | `featureId: nonEmptyString`, `phaseId: positiveInt`, `taskId: positiveInt`, `status: taskStatus` |

> `AddTaskInputV2` est le schéma effectivement utilisé par `addTask()` depuis la phase 3.  
> `UpdateTaskStatusInput` utilise désormais `taskStatus` (sans `"review"`), distinct de `phaseStatus`.

### Log

| Schéma | Champs |
|---|---|
| `AddLogInput` | `featureId: nonEmptyString`, `message: nonEmptyString`, `phaseId?: positiveInt`, `taskId?: positiveInt`, `source?: string` |
| `ListLogsInput` | `featureId: nonEmptyString`, `phaseId?: positiveInt`, `taskId?: positiveInt` |

### Session

| Schéma | Champs |
|---|---|
| `StartSessionInput` | `featureId: nonEmptyString`, `type: sessionType`, `phaseId?: positiveInt` |
| `EndSessionInput` | `sessionId?: positiveInt`, `featureId?: nonEmptyString`, `summary?: string` |
| `ListSessionsInput` | `featureId: nonEmptyString`, `type?: sessionType`, `status?: sessionStatus` |
| `GetCurrentSessionInput` | `featureId?: nonEmptyString` |

### Finding

| Schéma | Champs |
|---|---|
| `AddFindingInput` | `featureId: nonEmptyString`, `description: nonEmptyString`, `pass: findingPass`, `severity: findingSeverity`, `category?: findingCategory`, `sessionId?: positiveInt` |
| `ListFindingsInput` | `featureId: nonEmptyString`, `unresolved?: boolean`, `pass?: findingPass`, `severity?: findingSeverity` |
| `ResolveFindingInput` | `findingId: positiveInt`, `resolution: findingResolution`, `taskId?: positiveInt` |

### Critère d'acceptation

| Schéma | Champs |
|---|---|
| `AddCriterionInput` | `featureId: nonEmptyString`, `description: nonEmptyString`, `phaseId?: positiveInt` |
| `CheckCriterionInput` | `criterionId: positiveInt`, `source?: string` |
| `ListCriteriaInput` | `featureId: nonEmptyString`, `pending?: boolean`, `phaseId?: positiveInt` |

### Commandes agent

| Schéma | Champs |
|---|---|
| `NextInput` | `featureId: nonEmptyString` |
| `SummaryInput` | `featureId: nonEmptyString` |
| `BatchTaskSpec` | `title: nonEmptyString`, `description?: string`, `type?: taskType`, `ref?: string` (min 1), `blockedBy?: string[]` |
| `BatchPhaseSpec` | `title: nonEmptyString`, `description?: string`, `tasks: BatchTaskSpec[]` |
| `BatchPayload` | `phases: BatchPhaseSpec[]` (min 1 élément) |
| `BatchInput` | `featureId: nonEmptyString`, `payload: BatchPayload` |

> `ref` est une clé de référence interne au batch (unique dans le payload). `blockedBy` liste les `ref` des tâches bloquantes au sein du même batch. Les cycles et les références invalides sont rejetés avant toute insertion.

### Dépendances de tâches

| Schéma | Champs |
|---|---|
| `AddTaskDependencyInput` | `featureId: nonEmptyString`, `taskId: positiveInt`, `blockingTaskId: positiveInt` |
| `RemoveTaskDependencyInput` | `featureId: nonEmptyString`, `taskId: positiveInt`, `blockingTaskId: positiveInt` |

### Événements

| Schéma | Champs |
|---|---|
| `AddEventInput` | `featureId: nonEmptyString`, `kind: eventKind`, `data: unknown` (validé par le service), `phaseId?: positiveInt`, `taskId?: positiveInt`, `findingId?: positiveInt`, `sessionId?: positiveInt`, `source?: string` |
| `ListEventsInput` | `featureId: nonEmptyString`, `kind?: eventKind`, `taskId?: positiveInt`, `findingId?: positiveInt`, `sessionId?: positiveInt` |

**Schémas de payload par `kind` :**

| Schéma | Champs validés |
|---|---|
| `TaskResultData` | `files: { created: string[], modified: string[], deleted: string[] }`, `decisions: string[]`, `issues: string[]`, `test_result: { passed: boolean, count: integer ≥ 0 }` |
| `CorrectionData` | `root_cause: nonEmptyString`, `fix: nonEmptyString`, `files: string[]` |
| `DecisionData` | `context: nonEmptyString`, `options: string[]` (min 1), `chosen: nonEmptyString`, `rationale: nonEmptyString` |
| `PhaseSummaryData` | `delivered: nonEmptyString[]` (min 1), `coverage_verdict: "SUFFICIENT"\|"PARTIAL"\|"MISSING"`, `risks: string[]` |

> La constante `EVENT_DATA_SCHEMAS` mappe chaque `EventKind` vers son schéma Zod. Elle est utilisée par `addEvent()` pour valider `data` avant insertion.
