import { type Db } from "../db/client";
import { validate } from "./validate";
import { SummaryInput } from "./schemas";

// ── Types ─────────────────────────────────────────────────────────────────────

export type TaskStats = {
  todo: number;
  "in-progress": number;
  review: number;
  done: number;
};

export type TypeStats = {
  feature: number;
  fix: number;
  docs: number;
  test: number;
};

export type SummaryData = {
  featureId: string;
  title: string;
  status: string;
  stage: string;
  progress: number;
  totalTasks: number;
  taskStats: TaskStats;
  typeStats: TypeStats;
  findingsResolved: number;
  findingsUnresolved: number;
  criteriaSatisfied: number;
  criteriaTotal: number;
  sessionCount: number;
};

// ── Services ──────────────────────────────────────────────────────────────────

export async function getSummary(db: Db, featureId: string): Promise<SummaryData> {
  validate(SummaryInput, { featureId });

  const feature = await db.query.features.findFirst({
    where: { id: featureId },
    with: {
      phases: {
        with: { tasks: true },
      },
      findings: true,
      criteria: true,
      sessions: true,
    },
  });

  if (!feature) throw new Error(`Feature not found: ${featureId}`);

  const allTasks = feature.phases.flatMap((p) => p.tasks);

  const taskStats: TaskStats = { todo: 0, "in-progress": 0, review: 0, done: 0 };
  const typeStats: TypeStats = { feature: 0, fix: 0, docs: 0, test: 0 };

  for (const t of allTasks) {
    taskStats[t.status as keyof TaskStats]++;
    typeStats[t.type as keyof TypeStats]++;
  }

  const progress =
    allTasks.length > 0 ? Math.round((taskStats.done / allTasks.length) * 100) : 0;

  return {
    featureId: feature.id,
    title: feature.title,
    status: feature.status,
    stage: feature.stage,
    progress,
    totalTasks: allTasks.length,
    taskStats,
    typeStats,
    findingsResolved: feature.findings.filter((f) => f.resolution != null).length,
    findingsUnresolved: feature.findings.filter((f) => f.resolution == null).length,
    criteriaSatisfied: feature.criteria.filter((c) => c.satisfied).length,
    criteriaTotal: feature.criteria.length,
    sessionCount: feature.sessions.length,
  };
}
