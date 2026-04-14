import { type Db } from "../db/client";
import { type Feature, type Task, type Finding, type Criterion, type Session } from "../db/types";
import { validate } from "./validate";
import { NextInput } from "./schemas";

// ── Types ─────────────────────────────────────────────────────────────────────

export type NextDiagnostic = {
  feature: Feature;
  stage: string;
  activeSession: Session | null;
  pendingTasks: Task[];
  unresolvedFindings: Finding[];
  unsatisfiedCriteria: Criterion[];
  nextAction: string;
};

// ── Services ──────────────────────────────────────────────────────────────────

export async function getNext(db: Db, featureId: string): Promise<NextDiagnostic> {
  validate(NextInput, { featureId });

  const feature = await db.query.features.findFirst({
    where: { id: featureId },
    with: {
      phases: {
        orderBy: { order: "asc" },
        with: { tasks: { orderBy: { order: "asc" } } },
      },
      findings: { orderBy: { createdAt: "asc" } },
      criteria: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!feature) throw new Error(`Feature not found: ${featureId}`);

  // Fetch active session separately to avoid nested filter complexity
  const activeSession =
    (await db.query.sessions.findFirst({
      where: { featureId, status: "active" },
      orderBy: { createdAt: "desc" },
    })) ?? null;

  const allTasks = feature.phases.flatMap((p) => p.tasks);
  const pendingTasks = allTasks.filter(
    (t) => t.status === "todo" || t.status === "in-progress",
  );
  const unresolvedFindings = feature.findings.filter((f) => f.resolution == null);
  const unsatisfiedCriteria = feature.criteria.filter((c) => !c.satisfied);

  // Determine the most actionable next step
  let nextAction: string;
  if (activeSession) {
    nextAction = `Continue session #${activeSession.id} (type: ${activeSession.type})`;
  } else if (feature.stage === "planning") {
    if (feature.phases.length === 0) {
      nextAction = "Add phases and tasks to the feature (chip phase add / chip batch)";
    } else {
      nextAction = "Move feature to development stage (chip feature stage <id> development)";
    }
  } else if (feature.stage === "development") {
    if (pendingTasks.length > 0) {
      nextAction = `Complete ${pendingTasks.length} pending task(s)`;
    } else {
      nextAction = "Move feature to review stage (chip feature stage <id> review)";
    }
  } else if (feature.stage === "review") {
    if (unresolvedFindings.length > 0) {
      nextAction = `Resolve ${unresolvedFindings.length} unresolved finding(s) (chip finding resolve)`;
    } else if (unsatisfiedCriteria.length > 0) {
      nextAction = `Satisfy ${unsatisfiedCriteria.length} pending criterion/criteria (chip criteria check)`;
    } else {
      nextAction = "Move feature to documentation stage (chip feature stage <id> documentation)";
    }
  } else if (feature.stage === "documentation") {
    nextAction = "Add documentation, then release (chip feature stage <id> released)";
  } else {
    nextAction = "Feature is released. No further action required.";
  }

  const { phases: _phases, findings, criteria, ...feat } = feature;

  return {
    feature: feat,
    stage: feature.stage,
    activeSession,
    pendingTasks,
    unresolvedFindings,
    unsatisfiedCriteria,
    nextAction,
  };
}
