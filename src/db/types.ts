import type { features, phases, tasks, logs, sessions, findings, criteria, taskDependencies } from "./schema";

// ── Scalar row types inferred from the schema ────────────────────────────────

export type Feature = typeof features.$inferSelect;
export type Phase = typeof phases.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type Log = typeof logs.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Finding = typeof findings.$inferSelect;
export type Criterion = typeof criteria.$inferSelect;
export type TaskDependency = typeof taskDependencies.$inferSelect;

// ── Composite types used by services ────────────────────────────────────────

export type PhaseWithTasks = Phase & { tasks: Task[] };

export type FeatureDetails = {
  feature: Feature;
  phases: PhaseWithTasks[];
  recentLogs: Log[];
  findings: Finding[];
  criteria: Criterion[];
};

export type FeatureWithSessions = Feature & { sessions: Session[] };

export type TaskWithParent = Task & { parentTask?: Task | null };

export type TaskWithDependencies = Task & {
  blockedByDeps: Array<TaskDependency & { blockerTask: Task }>;
  blocksDeps: Array<TaskDependency & { blockedTask: Task }>;
};

/**
 * A pending task enriched with the list of tasks that are actively blocking it
 * (i.e. blockers that are not yet done). Used by NextDiagnostic.
 */
export type PendingTaskDiagnostic = Task & {
  blockedBy: Task[];
};
