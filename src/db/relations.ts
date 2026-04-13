import { defineRelations } from "drizzle-orm";
import * as schema from "./schema";

export const relations = defineRelations(schema, (r) => ({
  features: {
    phases: r.many.phases(),
    logs: r.many.logs(),
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
}));
