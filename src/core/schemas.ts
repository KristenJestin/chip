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

// ── Agent command schemas ─────────────────────────────────────────────────────

export const NextInput = z.object({
  featureId: nonEmptyString,
});
export type NextInput = z.infer<typeof NextInput>;

export const BatchTaskSpec = z.object({
  title: nonEmptyString,
  description: z.string().optional(),
  type: taskType.optional(),
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
