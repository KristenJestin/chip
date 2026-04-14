import { defineRelations } from "drizzle-orm";
import * as schema from "./schema";

export const relations = defineRelations(schema, (r) => ({
  features: {
    phases: r.many.phases(),
    logs: r.many.logs(),
    sessions: r.many.sessions(),
    findings: r.many.findings(),
    criteria: r.many.criteria(),
    events: r.many.events(),
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
    // Dependencies where this task is blocked (taskDependencies.taskId = tasks.id)
    blockedByDeps: r.many.taskDependencies({
      from: r.tasks.id,
      to: r.taskDependencies.taskId,
    }),
    // Dependencies where this task is the blocker (taskDependencies.blocksTaskId = tasks.id)
    blocksDeps: r.many.taskDependencies({
      from: r.tasks.id,
      to: r.taskDependencies.blocksTaskId,
    }),
  },
  taskDependencies: {
    // The task that is blocked by this dependency
    blockedTask: r.one.tasks({
      from: r.taskDependencies.taskId,
      to: r.tasks.id,
    }),
    // The task that must be done first (the blocker)
    blockerTask: r.one.tasks({
      from: r.taskDependencies.blocksTaskId,
      to: r.tasks.id,
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
  events: {
    feature: r.one.features({
      from: r.events.featureId,
      to: r.features.id,
    }),
    session: r.one.sessions({
      from: r.events.sessionId,
      to: r.sessions.id,
    }),
  },
}));
