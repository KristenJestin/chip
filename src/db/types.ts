import type { features, phases, tasks, logs } from "./schema";

// ── Scalar row types inferred from the schema ────────────────────────────────

export type Feature = typeof features.$inferSelect;
export type Phase   = typeof phases.$inferSelect;
export type Task    = typeof tasks.$inferSelect;
export type Log     = typeof logs.$inferSelect;

// ── Composite types used by services ────────────────────────────────────────

export type PhaseWithTasks = Phase & { phaseTasks: Task[] };

export type FeatureDetails = {
  feature: Feature;
  featurePhases: PhaseWithTasks[];
  recentLogs: Log[];
};
