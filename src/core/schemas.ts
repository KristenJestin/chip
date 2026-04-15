import * as z from "zod";

// ── Shared primitives ─────────────────────────────────────────────────────────

const nonEmptyString = z.string().min(1, "Must not be empty");
const positiveInt = z.number().int().positive();
const featureStatus = z.enum(["active", "done", "archived"]);
const phaseStatus = z.enum(["todo", "in-progress", "review", "done"]);
const taskStatus = z.enum(["todo", "in-progress", "done"]);
const featureStage = z.enum(["planning", "development", "review", "documentation", "released"]);
const sessionType = z.enum(["prd", "dev", "review", "docs"]);
const sessionStatus = z.enum(["active", "completed", "aborted"]);
const taskType = z.enum(["feature", "fix", "docs", "test"]);
const findingPass = z.enum(["business", "technical"]);
const findingSeverity = z.enum(["critical", "major", "minor", "suggestion"]);
const findingCategory = z.enum(["security", "convention", "quality", "test", "scope", "correctness"]);
const findingResolution = z.enum(["fixed", "wontfix", "deferred"]);

// ── Feature schemas ───────────────────────────────────────────────────────────

export const CreateFeatureInput = z.object({
  title: nonEmptyString,
  description: z.string().optional(),
});
export type CreateFeatureInput = z.infer<typeof CreateFeatureInput>;

export const GetFeatureStatusInput = z.object({
  featureId: nonEmptyString,
});
export type GetFeatureStatusInput = z.infer<typeof GetFeatureStatusInput>;

export const ExportFeatureInput = z.object({
  featureId: nonEmptyString,
  output: z.string().optional(),
});
export type ExportFeatureInput = z.infer<typeof ExportFeatureInput>;

export const UpdateFeatureStatusInput = z.object({
  featureId: nonEmptyString,
  status: featureStatus,
});
export type UpdateFeatureStatusInput = z.infer<typeof UpdateFeatureStatusInput>;

export const UpdateFeatureInput = z.object({
  featureId: nonEmptyString,
  title: nonEmptyString.optional(),
  description: z.string().optional(),
  status: featureStatus.optional(),
});
export type UpdateFeatureInput = z.infer<typeof UpdateFeatureInput>;

export const UpdateFeatureStageInput = z.object({
  featureId: nonEmptyString,
  stage: featureStage,
  force: z.boolean().optional(),
});
export type UpdateFeatureStageInput = z.infer<typeof UpdateFeatureStageInput>;

// ── Phase schemas ─────────────────────────────────────────────────────────────

export const AddPhaseInput = z.object({
  featureId: nonEmptyString,
  title: nonEmptyString,
  description: z.string().optional(),
});
export type AddPhaseInput = z.infer<typeof AddPhaseInput>;

export const UpdatePhaseStatusInput = z.object({
  featureId: nonEmptyString,
  phaseId: positiveInt,
  status: phaseStatus,
});
export type UpdatePhaseStatusInput = z.infer<typeof UpdatePhaseStatusInput>;

// ── Task schemas ──────────────────────────────────────────────────────────────

export const AddTaskInput = z.object({
  featureId: nonEmptyString,
  phaseId: positiveInt,
  title: nonEmptyString,
  description: z.string().optional(),
});
export type AddTaskInput = z.infer<typeof AddTaskInput>;

export const AddTaskInputV2 = AddTaskInput.extend({
  type: taskType.optional(),
  parentTaskId: positiveInt.optional(),
});
export type AddTaskInputV2 = z.infer<typeof AddTaskInputV2>;

export const UpdateTaskStatusInput = z.object({
  featureId: nonEmptyString,
  phaseId: positiveInt,
  taskId: positiveInt,
  status: taskStatus,
});
export type UpdateTaskStatusInput = z.infer<typeof UpdateTaskStatusInput>;

// ── Log schemas ───────────────────────────────────────────────────────────────

export const AddLogInput = z.object({
  featureId: nonEmptyString,
  message: nonEmptyString,
  phaseId: positiveInt.optional(),
  taskId: positiveInt.optional(),
  source: z.string().optional(),
});
export type AddLogInput = z.infer<typeof AddLogInput>;

export const ListLogsInput = z.object({
  featureId: nonEmptyString,
  phaseId: positiveInt.optional(),
  taskId: positiveInt.optional(),
});
export type ListLogsInput = z.infer<typeof ListLogsInput>;

// ── Session schemas ───────────────────────────────────────────────────────────

export const StartSessionInput = z.object({
  featureId: nonEmptyString,
  type: sessionType,
  phaseId: positiveInt.optional(),
});
export type StartSessionInput = z.infer<typeof StartSessionInput>;

export const EndSessionInput = z.object({
  sessionId: positiveInt.optional(),
  featureId: nonEmptyString.optional(),
  summary: z.string().optional(),
});
export type EndSessionInput = z.infer<typeof EndSessionInput>;

export const ListSessionsInput = z.object({
  featureId: nonEmptyString,
  type: sessionType.optional(),
  status: sessionStatus.optional(),
});
export type ListSessionsInput = z.infer<typeof ListSessionsInput>;

export const GetCurrentSessionInput = z.object({
  featureId: nonEmptyString.optional(),
});
export type GetCurrentSessionInput = z.infer<typeof GetCurrentSessionInput>;

// ── Finding schemas ───────────────────────────────────────────────────────────

export const AddFindingInput = z.object({
  featureId: nonEmptyString,
  description: nonEmptyString,
  pass: findingPass,
  severity: findingSeverity,
  category: findingCategory.optional(),
  sessionId: positiveInt.optional(),
});
export type AddFindingInput = z.infer<typeof AddFindingInput>;

export const ListFindingsInput = z.object({
  featureId: nonEmptyString,
  unresolved: z.boolean().optional(),
  pass: findingPass.optional(),
  severity: findingSeverity.optional(),
});
export type ListFindingsInput = z.infer<typeof ListFindingsInput>;

export const ResolveFindingInput = z.object({
  findingId: positiveInt,
  resolution: findingResolution,
  taskId: positiveInt.optional(),
});
export type ResolveFindingInput = z.infer<typeof ResolveFindingInput>;

// ── Criterion schemas ─────────────────────────────────────────────────────────

export const AddCriterionInput = z.object({
  featureId: nonEmptyString,
  description: nonEmptyString,
  phaseId: positiveInt.optional(),
});
export type AddCriterionInput = z.infer<typeof AddCriterionInput>;

export const CheckCriterionInput = z.object({
  criterionId: positiveInt,
  source: z.string().optional(),
});
export type CheckCriterionInput = z.infer<typeof CheckCriterionInput>;

export const ListCriteriaInput = z.object({
  featureId: nonEmptyString,
  pending: z.boolean().optional(),
  phaseId: positiveInt.optional(),
});
export type ListCriteriaInput = z.infer<typeof ListCriteriaInput>;

// ── Dependency schemas ────────────────────────────────────────────────────────

export const AddTaskDependencyInput = z.object({
  featureId: nonEmptyString,
  taskId: positiveInt,
  blockingTaskId: positiveInt,
});
export type AddTaskDependencyInput = z.infer<typeof AddTaskDependencyInput>;

export const RemoveTaskDependencyInput = z.object({
  featureId: nonEmptyString,
  taskId: positiveInt,
  blockingTaskId: positiveInt,
});
export type RemoveTaskDependencyInput = z.infer<typeof RemoveTaskDependencyInput>;

// ── Agent command schemas ─────────────────────────────────────────────────────

export const NextInput = z.object({
  featureId: nonEmptyString,
});
export type NextInput = z.infer<typeof NextInput>;

export const BatchTaskSpec = z.object({
  title: nonEmptyString,
  description: z.string().optional(),
  type: taskType.optional(),
  ref: z.string().min(1).optional(),
  blockedBy: z.array(z.string().min(1)).optional(),
});
export type BatchTaskSpec = z.infer<typeof BatchTaskSpec>;

export const BatchPhaseSpec = z.object({
  title: nonEmptyString,
  description: z.string().optional(),
  tasks: z.array(BatchTaskSpec),
});
export type BatchPhaseSpec = z.infer<typeof BatchPhaseSpec>;

export const BatchPayload = z.object({
  phases: z.array(BatchPhaseSpec).min(1, "At least one phase is required"),
});
export type BatchPayload = z.infer<typeof BatchPayload>;

export const BatchInput = z.object({
  featureId: nonEmptyString,
  payload: BatchPayload,
});
export type BatchInput = z.infer<typeof BatchInput>;

export const SummaryInput = z.object({
  featureId: nonEmptyString,
});
export type SummaryInput = z.infer<typeof SummaryInput>;

// ── Event schemas ─────────────────────────────────────────────────────────────

export const eventKind = z.enum(["task_result", "correction", "decision", "phase_summary"]);
export type EventKind = z.infer<typeof eventKind>;

/**
 * task_result: emitted by a sub-agent upon completing (or failing) a task.
 * Carries the list of modified files, decisions, issues, and test outcome.
 */
export const TaskResultData = z.object({
  files: z.object({
    created: z.array(z.string()),
    modified: z.array(z.string()),
    deleted: z.array(z.string()),
  }),
  decisions: z.array(z.string()),
  issues: z.array(z.string()),
  test_result: z.object({
    passed: z.boolean(),
    count: z.number().int().nonnegative(),
  }),
});
export type TaskResultData = z.infer<typeof TaskResultData>;

/**
 * correction: emitted by chip_review when a finding is auto-corrected.
 * Captures root cause, fix description, and impacted files.
 */
export const CorrectionData = z.object({
  root_cause: nonEmptyString,
  fix: nonEmptyString,
  files: z.array(z.string()),
});
export type CorrectionData = z.infer<typeof CorrectionData>;

/**
 * decision: captures a significant architectural or implementation decision.
 * Useful for auditing why a direction was chosen over alternatives.
 */
export const DecisionData = z.object({
  context: nonEmptyString,
  options: z.array(z.string()).min(1),
  chosen: nonEmptyString,
  rationale: nonEmptyString,
});
export type DecisionData = z.infer<typeof DecisionData>;

/**
 * phase_summary: emitted at phase completion with a delivery and quality summary.
 */
export const PhaseSummaryData = z.object({
  delivered: z.array(nonEmptyString).min(1),
  coverage_verdict: z.enum(["SUFFICIENT", "PARTIAL", "MISSING"]),
  risks: z.array(z.string()),
});
export type PhaseSummaryData = z.infer<typeof PhaseSummaryData>;

/** Union of all event data schemas, keyed by kind. */
export const EVENT_DATA_SCHEMAS = {
  task_result: TaskResultData,
  correction: CorrectionData,
  decision: DecisionData,
  phase_summary: PhaseSummaryData,
} as const satisfies Record<EventKind, z.ZodTypeAny>;

export const AddEventInput = z.object({
  featureId: nonEmptyString,
  kind: eventKind,
  data: z.unknown(), // validated against kind-specific schema in core service
  phaseId: positiveInt.optional(),
  taskId: positiveInt.optional(),
  findingId: positiveInt.optional(),
  sessionId: positiveInt.optional(),
  source: z.string().optional(),
});
export type AddEventInput = z.infer<typeof AddEventInput>;

export const ListEventsInput = z.object({
  featureId: nonEmptyString,
  kind: eventKind.optional(),
  taskId: positiveInt.optional(),
  findingId: positiveInt.optional(),
  sessionId: positiveInt.optional(),
});
export type ListEventsInput = z.infer<typeof ListEventsInput>;
