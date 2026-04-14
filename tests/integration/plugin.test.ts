import { describe, it, expect } from "vitest";
import { createTestDb } from "../helpers/db";
import { featureTools } from "../../src/plugin/tools/feature";
import { sessionTools } from "../../src/plugin/tools/session";
import { phaseTools } from "../../src/plugin/tools/phase";
import { taskTools } from "../../src/plugin/tools/task";
import { logTools } from "../../src/plugin/tools/log";
import { findingTools } from "../../src/plugin/tools/finding";
import { criteriaTools } from "../../src/plugin/tools/criteria";
import { agentTools } from "../../src/plugin/tools/agent";

// Minimal stub — our tools don't use the ToolContext
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ctx = {} as any;

// ── Helpers ───────────────────────────────────────────────────────────────────

function parse(json: string) {
  return JSON.parse(json) as unknown;
}

// ── featureTools ──────────────────────────────────────────────────────────────

describe("featureTools", () => {
  it("chip_feature_create returns { id }", async () => {
    const db = await createTestDb();
    const tools = featureTools(db);
    const result = parse(await tools.chip_feature_create.execute({ title: "My Feature" }, ctx));
    expect(result).toMatchObject({ id: "my-feature" });
  });

  it("chip_feature_list returns array", async () => {
    const db = await createTestDb();
    const tools = featureTools(db);
    await tools.chip_feature_create.execute({ title: "Feature A" }, ctx);
    const result = parse(await tools.chip_feature_list.execute({}, ctx)) as unknown[];
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
  });

  it("chip_feature_status returns feature details", async () => {
    const db = await createTestDb();
    const tools = featureTools(db);
    await tools.chip_feature_create.execute({ title: "Detail Feature" }, ctx);
    const result = parse(
      await tools.chip_feature_status.execute({ featureId: "detail-feature" }, ctx),
    ) as { feature: { id: string } };
    expect(result.feature.id).toBe("detail-feature");
  });

  it("chip_feature_stage updates stage and returns id + stage", async () => {
    const db = await createTestDb();
    const tools = featureTools(db);
    await tools.chip_feature_create.execute({ title: "Stage Feature" }, ctx);
    const result = parse(
      await tools.chip_feature_stage.execute(
        { featureId: "stage-feature", stage: "development" },
        ctx,
      ),
    ) as { id: string; stage: string };
    expect(result.stage).toBe("development");
  });

  it("chip_feature_export returns a non-empty string", async () => {
    const db = await createTestDb();
    const tools = featureTools(db);
    await tools.chip_feature_create.execute({ title: "Export Feature" }, ctx);
    const result = await tools.chip_feature_export.execute(
      { featureId: "export-feature" },
      ctx,
    );
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("chip_feature_summary returns stats object", async () => {
    const db = await createTestDb();
    const tools = featureTools(db);
    await tools.chip_feature_create.execute({ title: "Summary Feature" }, ctx);
    const result = parse(
      await tools.chip_feature_summary.execute({ featureId: "summary-feature" }, ctx),
    ) as { featureId: string };
    expect(result.featureId).toBe("summary-feature");
  });
});

// ── sessionTools ──────────────────────────────────────────────────────────────

describe("sessionTools", () => {
  it("chip_session_start creates and returns a session", async () => {
    const db = await createTestDb();
    await featureTools(db).chip_feature_create.execute({ title: "Sess Feature" }, ctx);
    const tools = sessionTools(db);
    const result = parse(
      await tools.chip_session_start.execute({ featureId: "sess-feature", type: "dev" }, ctx),
    ) as { id: number; featureId: string; type: string };
    expect(result.featureId).toBe("sess-feature");
    expect(result.type).toBe("dev");
  });

  it("chip_session_current returns the active session", async () => {
    const db = await createTestDb();
    await featureTools(db).chip_feature_create.execute({ title: "Curr Feature" }, ctx);
    const tools = sessionTools(db);
    await tools.chip_session_start.execute({ featureId: "curr-feature", type: "prd" }, ctx);
    const result = parse(
      await tools.chip_session_current.execute({ featureId: "curr-feature" }, ctx),
    ) as { type: string };
    expect(result.type).toBe("prd");
  });

  it("chip_session_end ends the active session", async () => {
    const db = await createTestDb();
    await featureTools(db).chip_feature_create.execute({ title: "End Feature" }, ctx);
    const tools = sessionTools(db);
    await tools.chip_session_start.execute({ featureId: "end-feature", type: "dev" }, ctx);
    const result = parse(
      await tools.chip_session_end.execute(
        { featureId: "end-feature", summary: "Done" },
        ctx,
      ),
    ) as { status: string };
    expect(result.status).toBe("completed");
  });

  it("chip_session_list returns sessions array", async () => {
    const db = await createTestDb();
    await featureTools(db).chip_feature_create.execute({ title: "List Sess" }, ctx);
    const tools = sessionTools(db);
    await tools.chip_session_start.execute({ featureId: "list-sess", type: "review" }, ctx);
    await tools.chip_session_end.execute({ featureId: "list-sess" }, ctx);
    const result = parse(
      await tools.chip_session_list.execute({ featureId: "list-sess" }, ctx),
    ) as unknown[];
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
  });
});

// ── phaseTools ────────────────────────────────────────────────────────────────

describe("phaseTools", () => {
  it("chip_phase_add creates a phase", async () => {
    const db = await createTestDb();
    await featureTools(db).chip_feature_create.execute({ title: "Phase Feature" }, ctx);
    const tools = phaseTools(db);
    const result = parse(
      await tools.chip_phase_add.execute(
        { featureId: "phase-feature", title: "Phase One" },
        ctx,
      ),
    ) as { id: number; title: string };
    expect(result.title).toBe("Phase One");
  });

  it("chip_phase_status updates phase status", async () => {
    const db = await createTestDb();
    await featureTools(db).chip_feature_create.execute({ title: "PStatus Feature" }, ctx);
    const pt = phaseTools(db);
    const phase = parse(
      await pt.chip_phase_add.execute(
        { featureId: "pstatus-feature", title: "P1" },
        ctx,
      ),
    ) as { id: number };
    const result = parse(
      await pt.chip_phase_status.execute(
        { featureId: "pstatus-feature", phaseId: phase.id, status: "in-progress" },
        ctx,
      ),
    ) as { status: string };
    expect(result.status).toBe("in-progress");
  });
});

// ── taskTools ─────────────────────────────────────────────────────────────────

describe("taskTools", () => {
  it("chip_task_add creates a task", async () => {
    const db = await createTestDb();
    await featureTools(db).chip_feature_create.execute({ title: "Task Feature" }, ctx);
    const phase = parse(
      await phaseTools(db).chip_phase_add.execute(
        { featureId: "task-feature", title: "P1" },
        ctx,
      ),
    ) as { id: number };
    const tools = taskTools(db);
    const result = parse(
      await tools.chip_task_add.execute(
        { featureId: "task-feature", phaseId: phase.id, title: "Write tests" },
        ctx,
      ),
    ) as { title: string; type: string };
    expect(result.title).toBe("Write tests");
    expect(result.type).toBe("feature");
  });

  it("chip_task_status updates task status", async () => {
    const db = await createTestDb();
    await featureTools(db).chip_feature_create.execute({ title: "TStatus Feature" }, ctx);
    const phase = parse(
      await phaseTools(db).chip_phase_add.execute(
        { featureId: "tstatus-feature", title: "P1" },
        ctx,
      ),
    ) as { id: number };
    const tt = taskTools(db);
    const task = parse(
      await tt.chip_task_add.execute(
        { featureId: "tstatus-feature", phaseId: phase.id, title: "T1" },
        ctx,
      ),
    ) as { id: number };
    const result = parse(
      await tt.chip_task_status.execute(
        {
          featureId: "tstatus-feature",
          phaseId: phase.id,
          taskId: task.id,
          status: "in-progress",
        },
        ctx,
      ),
    ) as { status: string };
    expect(result.status).toBe("in-progress");
  });
});

// ── logTools ──────────────────────────────────────────────────────────────────

describe("logTools", () => {
  it("chip_log_add adds a log entry", async () => {
    const db = await createTestDb();
    await featureTools(db).chip_feature_create.execute({ title: "Log Feature" }, ctx);
    const tools = logTools(db);
    const result = parse(
      await tools.chip_log_add.execute(
        { featureId: "log-feature", message: "Started work" },
        ctx,
      ),
    ) as { message: string };
    expect(result.message).toBe("Started work");
  });

  it("chip_log_list returns logs array", async () => {
    const db = await createTestDb();
    await featureTools(db).chip_feature_create.execute({ title: "Log List Feature" }, ctx);
    const tools = logTools(db);
    await tools.chip_log_add.execute(
      { featureId: "log-list-feature", message: "Entry one" },
      ctx,
    );
    const result = parse(
      await tools.chip_log_list.execute({ featureId: "log-list-feature" }, ctx),
    ) as unknown[];
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
  });
});

// ── findingTools ──────────────────────────────────────────────────────────────

describe("findingTools", () => {
  it("chip_finding_add creates a finding", async () => {
    const db = await createTestDb();
    await featureTools(db).chip_feature_create.execute({ title: "Find Feature" }, ctx);
    const tools = findingTools(db);
    const result = parse(
      await tools.chip_finding_add.execute(
        {
          featureId: "find-feature",
          description: "Missing input validation",
          pass: "technical",
          severity: "major",
        },
        ctx,
      ),
    ) as { description: string; resolution: null };
    expect(result.description).toBe("Missing input validation");
    expect(result.resolution).toBeNull();
  });

  it("chip_finding_list returns findings", async () => {
    const db = await createTestDb();
    await featureTools(db).chip_feature_create.execute({ title: "Find List" }, ctx);
    const tools = findingTools(db);
    await tools.chip_finding_add.execute(
      {
        featureId: "find-list",
        description: "Issue one",
        pass: "business",
        severity: "minor",
      },
      ctx,
    );
    const result = parse(
      await tools.chip_finding_list.execute({ featureId: "find-list" }, ctx),
    ) as unknown[];
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
  });

  it("chip_finding_resolve resolves a finding", async () => {
    const db = await createTestDb();
    await featureTools(db).chip_feature_create.execute({ title: "Find Resolve" }, ctx);
    const tools = findingTools(db);
    const finding = parse(
      await tools.chip_finding_add.execute(
        {
          featureId: "find-resolve",
          description: "Bug",
          pass: "technical",
          severity: "critical",
        },
        ctx,
      ),
    ) as { id: number };
    const result = parse(
      await tools.chip_finding_resolve.execute(
        { findingId: finding.id, resolution: "fixed" },
        ctx,
      ),
    ) as { resolution: string };
    expect(result.resolution).toBe("fixed");
  });
});

// ── criteriaTools ─────────────────────────────────────────────────────────────

describe("criteriaTools", () => {
  it("chip_criteria_add creates a criterion", async () => {
    const db = await createTestDb();
    await featureTools(db).chip_feature_create.execute({ title: "Crit Feature" }, ctx);
    const tools = criteriaTools(db);
    const result = parse(
      await tools.chip_criteria_add.execute(
        { featureId: "crit-feature", description: "All tests pass" },
        ctx,
      ),
    ) as { description: string; satisfied: number };
    expect(result.description).toBe("All tests pass");
    expect(result.satisfied).toBe(0);
  });

  it("chip_criteria_check marks criterion as satisfied", async () => {
    const db = await createTestDb();
    await featureTools(db).chip_feature_create.execute({ title: "Crit Check" }, ctx);
    const tools = criteriaTools(db);
    const criterion = parse(
      await tools.chip_criteria_add.execute(
        { featureId: "crit-check", description: "Coverage >= 80%" },
        ctx,
      ),
    ) as { id: number };
    const result = parse(
      await tools.chip_criteria_check.execute({ criterionId: criterion.id }, ctx),
    ) as { satisfied: number };
    expect(result.satisfied).toBe(1);
  });

  it("chip_criteria_list returns criteria array", async () => {
    const db = await createTestDb();
    await featureTools(db).chip_feature_create.execute({ title: "Crit List" }, ctx);
    const tools = criteriaTools(db);
    await tools.chip_criteria_add.execute(
      { featureId: "crit-list", description: "No regressions" },
      ctx,
    );
    const result = parse(
      await tools.chip_criteria_list.execute({ featureId: "crit-list" }, ctx),
    ) as unknown[];
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
  });
});

// ── agentTools ────────────────────────────────────────────────────────────────

describe("agentTools", () => {
  it("chip_next returns a diagnostic with nextAction", async () => {
    const db = await createTestDb();
    await featureTools(db).chip_feature_create.execute({ title: "Next Feature" }, ctx);
    const tools = agentTools(db);
    const result = parse(
      await tools.chip_next.execute({ featureId: "next-feature" }, ctx),
    ) as { nextAction: string; stage: string };
    expect(typeof result.nextAction).toBe("string");
    expect(result.stage).toBe("planning");
  });

  it("chip_batch creates phases and tasks in bulk", async () => {
    const db = await createTestDb();
    await featureTools(db).chip_feature_create.execute({ title: "Batch Feature" }, ctx);
    const tools = agentTools(db);
    const result = parse(
      await tools.chip_batch.execute(
        {
          featureId: "batch-feature",
          payload: {
            phases: [
              {
                title: "Phase 1",
                tasks: [{ title: "Task A" }, { title: "Task B" }],
              },
              {
                title: "Phase 2",
                tasks: [{ title: "Task C" }],
              },
            ],
          },
        },
        ctx,
      ),
    ) as { phasesCreated: number; tasksCreated: number };
    expect(result.phasesCreated).toBe(2);
    expect(result.tasksCreated).toBe(3);
  });

  it("chip_batch throws on invalid feature id", async () => {
    const db = await createTestDb();
    const tools = agentTools(db);
    await expect(
      tools.chip_batch.execute(
        {
          featureId: "nonexistent",
          payload: { phases: [{ title: "P1", tasks: [{ title: "T1" }] }] },
        },
        ctx,
      ),
    ).rejects.toThrow();
  });
});
