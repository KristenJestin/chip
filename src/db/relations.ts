import { defineRelations } from "drizzle-orm";
import * as schema from "./schema";

export const relations = defineRelations(schema, (r) => ({
  features: {
    phases: r.many.phases(),
    logs: r.many.logs(),
    sessions: r.many.sessions(),
    findings: r.many.findings(),
    criteria: r.many.criteria(),
  },
  phases: {
    feature: r.one.features({
      from: r.phases.featureId,
      to: r.features.id,
    }),
    tasks: r.many.tasks(),
  },
  tasks: {
    phase: r.one.phases({
      from: r.tasks.phaseId,
      to: r.phases.id,
    }),
  },
  logs: {
    feature: r.one.features({
      from: r.logs.featureId,
      to: r.features.id,
    }),
  },
  sessions: {
    feature: r.one.features({
      from: r.sessions.featureId,
      to: r.features.id,
    }),
    findings: r.many.findings(),
  },
  findings: {
    feature: r.one.features({
      from: r.findings.featureId,
      to: r.features.id,
    }),
    session: r.one.sessions({
      from: r.findings.sessionId,
      to: r.sessions.id,
    }),
  },
  criteria: {
    feature: r.one.features({
      from: r.criteria.featureId,
      to: r.features.id,
    }),
  },
}));
