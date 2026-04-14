import { eq } from "drizzle-orm";
import { type Db } from "../db/client";
import { features } from "../db/schema";
import { type Feature, type FeatureDetails } from "../db/types";
import { toSlug, uniqueSlug } from "../utils/slug";
import { formatDate, formatDateTime } from "../utils/format";
import { nowUnix } from "../utils/time";
import { validate } from "./validate";
import {
  CreateFeatureInput,
  GetFeatureStatusInput,
  ExportFeatureInput,
  UpdateFeatureStageInput,
} from "./schemas";

export const STAGE_ORDER = [
  "planning",
  "development",
  "review",
  "documentation",
  "released",
] as const;
export type FeatureStage = (typeof STAGE_ORDER)[number];

const RECENT_LOGS_LIMIT = 10;

// ── Services ──────────────────────────────────────────────────────────────────

export async function createFeature(db: Db, title: string, description?: string): Promise<string> {
  validate(CreateFeatureInput, { title, description });
  const now = nowUnix();
  const existing = await db.query.features.findMany({ columns: { id: true } });
  const id = uniqueSlug(
    toSlug(title),
    existing.map((f) => f.id),
  );
  await db
    .insert(features)
    .values({
      id,
      title,
      description: description ?? null,
      status: "active",
      createdAt: now,
      updatedAt: now,
    })
    .run();
  return id;
}

export async function listFeatures(db: Db) {
  return db.query.features.findMany({ orderBy: { createdAt: "asc" } });
}

export async function getFeatureDetails(db: Db, featureId: string): Promise<FeatureDetails> {
  validate(GetFeatureStatusInput, { featureId });
  const result = await db.query.features.findFirst({
    where: { id: featureId },
    with: {
      phases: {
        orderBy: { order: "asc" },
        with: {
          tasks: {
            orderBy: { order: "asc" },
          },
        },
      },
      logs: {
        orderBy: { createdAt: "desc" },
        limit: RECENT_LOGS_LIMIT,
      },
      findings: {
        orderBy: { createdAt: "asc" },
      },
      criteria: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!result) throw new Error(`Feature not found: ${featureId}`);

  const { phases: featurePhases, logs: recentLogs, findings, criteria, ...feature } = result;
  return { feature, phases: featurePhases, recentLogs, findings, criteria };
}

export async function exportFeature(db: Db, featureId: string): Promise<string> {
  validate(ExportFeatureInput, { featureId });
  const result = await db.query.features.findFirst({
    where: { id: featureId },
    with: {
      phases: {
        orderBy: { order: "asc" },
        with: { tasks: { orderBy: { order: "asc" } } },
      },
      logs: { orderBy: { createdAt: "asc" } },
      findings: { orderBy: { createdAt: "asc" } },
      criteria: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!result) throw new Error(`Feature not found: ${featureId}`);

  const lines: string[] = [];

  // ── Header ──────────────────────────────────────────────────────────────────
  lines.push(`# ${result.title}`);
  lines.push("");
  lines.push(`**ID:** ${result.id}  `);
  lines.push(`**Status:** ${result.status}  `);
  lines.push(`**Stage:** ${result.stage}  `);
  if (result.description) lines.push(`**Description:** ${result.description}  `);
  lines.push(`**Created:** ${formatDate(result.createdAt)}  `);
  if (result.updatedAt !== result.createdAt) {
    lines.push(`**Updated:** ${formatDate(result.updatedAt)}  `);
  }
  lines.push("");

  // ── Phases ───────────────────────────────────────────────────────────────────
  if (result.phases.length > 0) {
    lines.push("## Phases");
    lines.push("");
    for (const phase of result.phases) {
      lines.push(`### ${phase.order}. ${phase.title} \`[${phase.status}]\``);
      lines.push("");
      if (phase.description) {
        lines.push(phase.description);
        lines.push("");
      }
      if (phase.startedAt != null) lines.push(`**Started:** ${formatDate(phase.startedAt)}  `);
      if (phase.completedAt != null)
        lines.push(`**Completed:** ${formatDate(phase.completedAt)}  `);
      if (phase.startedAt != null || phase.completedAt != null) lines.push("");

      if (phase.tasks.length > 0) {
        for (const task of phase.tasks) {
          const check = task.status === "done" ? "x" : " ";
          const desc = task.description ? ` — ${task.description}` : "";
          const typeTag = task.type !== "feature" ? ` \`[${task.type}]\`` : "";
          lines.push(`- [${check}] **${task.title}** \`[${task.status}]\`${typeTag}${desc}`);
        }
        lines.push("");
      }
    }
  }

  // ── Criteria ─────────────────────────────────────────────────────────────────
  if (result.criteria.length > 0) {
    lines.push("## Acceptance Criteria");
    lines.push("");
    for (const c of result.criteria) {
      const check = c.satisfied ? "x" : " ";
      lines.push(`- [${check}] ${c.description}`);
    }
    lines.push("");
  }

  // ── Findings ─────────────────────────────────────────────────────────────────
  if (result.findings.length > 0) {
    lines.push("## Findings");
    lines.push("");
    for (const f of result.findings) {
      const resolved = f.resolution ? ` ~~resolved: ${f.resolution}~~` : " **[unresolved]**";
      const category = f.category ? ` · ${f.category}` : "";
      lines.push(
        `- **[${f.severity}]** [${f.pass}${category}]${resolved} ${f.description}`,
      );
    }
    lines.push("");
  }

  // ── Logs ─────────────────────────────────────────────────────────────────────
  if (result.logs.length > 0) {
    lines.push("## Logs");
    lines.push("");
    for (const log of result.logs) {
      const ctx = [
        log.phaseId != null ? `phase ${log.phaseId}` : null,
        log.taskId != null ? `task ${log.taskId}` : null,
        log.source ?? null,
      ]
        .filter(Boolean)
        .join(" · ");
      const ctxStr = ctx ? ` _(${ctx})_` : "";
      lines.push(`- \`${formatDateTime(log.createdAt)}\`${ctxStr} ${log.message}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

export async function updateFeatureStage(
  db: Db,
  featureId: string,
  stage: FeatureStage,
  force = false,
): Promise<Feature> {
  validate(UpdateFeatureStageInput, { featureId, stage, force });

  const feature = await db.query.features.findFirst({ where: { id: featureId } });
  if (!feature) throw new Error(`Feature not found: ${featureId}`);

  const currentIdx = STAGE_ORDER.indexOf(feature.stage as FeatureStage);
  const targetIdx = STAGE_ORDER.indexOf(stage);

  if (targetIdx < currentIdx && !force) {
    throw new Error(
      `Cannot go backwards from "${feature.stage}" to "${stage}" without --force`,
    );
  }

  if (stage === "review" && !force) {
    const featurePhases = await db.query.phases.findMany({
      where: { featureId },
      with: { tasks: { columns: { status: true } } },
    });
    const hasIncomplete = featurePhases
      .flatMap((p) => p.tasks)
      .some((t) => t.status === "todo" || t.status === "in-progress");
    if (hasIncomplete) {
      throw new Error(
        "Cannot transition to review: there are unfinished tasks (use --force to override)",
      );
    }
  }

  const now = nowUnix();
  const [updated] = await db
    .update(features)
    .set({ stage, updatedAt: now })
    .where(eq(features.id, featureId))
    .returning()
    .all();
  if (!updated) throw new Error("Failed to update feature stage");
  return updated;
}
