# Plugin OpenCode

> Implémenté dans `src/plugin/`. Point d'entrée : `src/plugin/index.ts`.  
> Export : `dist/plugin.mjs` (format ESM).  
> ID du plugin : `"chip"`.

---

## Architecture

Le plugin expose un objet `PluginModule` (interface de `@opencode-ai/plugin`) :

```typescript
export const plugin: PluginModule = {
  id: "chip",
  server: async (input) => {
    const db = await openDbForProject(input.directory, migrationsFolder);
    return { tool: { /* 24 outils */ } };
  }
}
```

À chaque invocation, le plugin ouvre la DB du projet en cours (`input.directory/.chip/chip.db`) et injecte l'instance dans chaque outil. Les outils appellent les mêmes services core que la CLI.

Les retours sont tous en JSON stringifié, sauf `chip_feature_export` qui retourne du Markdown brut.

---

## Différences avec la CLI

| Aspect | CLI | Plugin |
|---|---|---|
| Ouverture DB | Singleton (`getDb()`) | Par-projet (`openDbForProject()`) |
| Format de retour | Texte formaté (chalk, tableaux) | JSON structuré |
| Gestion d'erreur | `die()` + `process.exit(1)` | Exception propagée au runtime OpenCode |
| Schémas Zod | `schemas.ts` (partagé) | `tool.schema.*` de `@opencode-ai/plugin/tool` |

---

## Inventaire des outils (24 outils)

### Feature

| Outil | Paramètres obligatoires | Paramètres optionnels | Retour |
|---|---|---|---|
| `chip_feature_create` | `title: string` | `description?: string` | `{ id: string }` |
| `chip_feature_list` | — | — | `Feature[]` |
| `chip_feature_status` | `featureId: string` | — | `FeatureDetails` |
| `chip_feature_stage` | `featureId: string`, `stage: enum` | `force?: boolean` | `{ id, stage }` |
| `chip_feature_export` | `featureId: string` | — | Markdown (string brute) |
| `chip_feature_summary` | `featureId: string` | — | `SummaryData` |

### Session

| Outil | Paramètres obligatoires | Paramètres optionnels | Retour |
|---|---|---|---|
| `chip_session_start` | `featureId: string`, `type: "prd"\|"dev"\|"review"\|"docs"` | `phaseId?: int` | `Session` |
| `chip_session_end` | — | `sessionId?: int`, `featureId?: string`, `summary?: string` | `Session` |
| `chip_session_current` | — | `featureId?: string` | `Session` |
| `chip_session_list` | `featureId: string` | `type?: enum`, `status?: enum` | `Session[]` |

### Phase

| Outil | Paramètres obligatoires | Paramètres optionnels | Retour |
|---|---|---|---|
| `chip_phase_add` | `featureId: string`, `title: string` | `description?: string` | `Phase` |
| `chip_phase_status` | `featureId: string`, `phaseId: int`, `status: enum` | — | `Phase` |

### Tâche

| Outil | Paramètres obligatoires | Paramètres optionnels | Retour |
|---|---|---|---|
| `chip_task_add` | `featureId: string`, `phaseId: int`, `title: string` | `description?: string`, `type?: enum`, `parentTaskId?: int` | `Task` |
| `chip_task_status` | `featureId: string`, `phaseId: int`, `taskId: int`, `status: enum` | — | `Task` |

### Log

| Outil | Paramètres obligatoires | Paramètres optionnels | Retour |
|---|---|---|---|
| `chip_log_add` | `featureId: string`, `message: string` | `phaseId?: int`, `taskId?: int`, `source?: string` | `Log` |
| `chip_log_list` | `featureId: string` | `phaseId?: int`, `taskId?: int` | `Log[]` |

### Finding

| Outil | Paramètres obligatoires | Paramètres optionnels | Retour |
|---|---|---|---|
| `chip_finding_add` | `featureId: string`, `description: string`, `pass: enum`, `severity: enum` | `category?: enum`, `sessionId?: int` | `Finding` |
| `chip_finding_list` | `featureId: string` | `unresolved?: bool`, `pass?: enum`, `severity?: enum` | `Finding[]` |
| `chip_finding_resolve` | `findingId: int`, `resolution: enum` | `taskId?: int` | `Finding` |

### Critère d'acceptation

| Outil | Paramètres obligatoires | Paramètres optionnels | Retour |
|---|---|---|---|
| `chip_criteria_add` | `featureId: string`, `description: string` | `phaseId?: int` | `Criterion` |
| `chip_criteria_check` | `criterionId: int` | `source?: string` | `Criterion` |
| `chip_criteria_list` | `featureId: string` | `pending?: bool`, `phaseId?: int` | `Criterion[]` |

### Commandes agent

| Outil | Paramètres obligatoires | Paramètres optionnels | Retour |
|---|---|---|---|
| `chip_next` | `featureId: string` | — | `NextDiagnostic` |
| `chip_batch` | `featureId: string`, `payload: { phases: [...] }` | — | `BatchResult` |

---

## Structure `SummaryData`

Retourné par `chip_feature_summary` :

```typescript
{
  featureId: string,
  title: string,
  status: string,
  stage: string,
  progress: number,           // pourcentage arrondi (done / total * 100)
  totalTasks: number,
  taskStats: {
    todo: number,
    "in-progress": number,
    review: number,
    done: number
  },
  typeStats: {
    feature: number,
    fix: number,
    docs: number,
    test: number
  },
  findingsResolved: number,
  findingsUnresolved: number,
  criteriaSatisfied: number,
  criteriaTotal: number,
  sessionCount: number
}
```

## Structure `NextDiagnostic`

Retourné par `chip_next` :

```typescript
{
  feature: Feature,
  stage: string,
  activeSession: Session | null,
  pendingTasks: Task[],             // statut "todo" ou "in-progress"
  unresolvedFindings: Finding[],    // resolution === null
  unsatisfiedCriteria: Criterion[], // satisfied === false
  nextAction: string                // message actionnable
}
```

---

## Templates OpenCode installés par `chip init`

Le provider `opencode` installe les fichiers suivants dans `.opencode/commands/` :

| Fichier | Commande OpenCode | Rôle |
|---|---|---|
| `chip.md` | `/chip` | Référence complète de toutes les commandes chip |
| `chip_prd.md` | `/chip_prd` | Workflow de rédaction du PRD (5 étapes) |
| `chip_dev.md` | `/chip_dev` | Workflow de développement phase par phase |
| `chip_review.md` | `/chip_review` | Workflow de revue (2 passes : métier + technique) |
| `chip_docs.md` | `/chip_docs` | Mise à jour de la documentation post-feature |
| `chip_docs_sync.md` | `/chip_docs_sync` | Reconstruction complète de la documentation |
