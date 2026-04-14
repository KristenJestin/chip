import { describe, it, expect } from "vitest";
import { createTestDb } from "../helpers/db";
import { createFeature } from "../../src/core/feature";
import { addPhase } from "../../src/core/phase";
import { addTask } from "../../src/core/task";
import { eventTools } from "../../src/plugin/tools/event";

// Minimal stub — our tools don't use the ToolContext
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ctx = {} as any;

function parse(json: string) {
  return JSON.parse(json) as unknown;
}

// ── chip_event_add ────────────────────────────────────────────────────────────

describe("chip_event_add", () => {
  it("adds a task_result event and returns it", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    const phase = await addPhase(db, featureId, "Phase 1");
    const task = await addTask(db, featureId, phase.id, "Task A");
    const tools = eventTools(db);

    const result = parse(
      await tools.chip_event_add.execute(
        {
          featureId,
          kind: "task_result",
          data: {
            files: { created: ["src/foo.ts"], modified: [], deleted: [] },
            decisions: ["Used X"],
            issues: [],
            test_result: { passed: true, count: 10 },
          },
          taskId: task.id,
          source: "chip_dev_subagent",
        },
        ctx,
      ),
    ) as { id: number; kind: string; featureId: string };

    expect(result.kind).toBe("task_result");
    expect(result.featureId).toBe(featureId);
  });

  it("rejects invalid kind with an error", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    const tools = eventTools(db);

    await expect(
      tools.chip_event_add.execute(
        {
          featureId,
          // @ts-expect-error intentional invalid kind
          kind: "invalid_kind",
          data: {},
        },
        ctx,
      ),
    ).rejects.toThrow();
  });

  it("rejects data that does not match the kind schema", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    const tools = eventTools(db);

    await expect(
      tools.chip_event_add.execute(
        {
          featureId,
          kind: "correction",
          // correction requires root_cause, fix (non-empty strings)
          data: { root_cause: "", fix: "something", files: [] },
        },
        ctx,
      ),
    ).rejects.toThrow(/Invalid data for event kind "correction"/);
  });
});

// ── chip_event_list ───────────────────────────────────────────────────────────

describe("chip_event_list", () => {
  it("returns an empty array when no events exist", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    const tools = eventTools(db);

    const result = parse(
      await tools.chip_event_list.execute({ featureId }, ctx),
    ) as unknown[];

    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
  });

  it("returns events with deserialized data field", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    const tools = eventTools(db);

    await tools.chip_event_add.execute(
      {
        featureId,
        kind: "task_result",
        data: {
          files: { created: ["src/bar.ts"], modified: [], deleted: [] },
          decisions: [],
          issues: [],
          test_result: { passed: true, count: 5 },
        },
      },
      ctx,
    );

    const result = parse(
      await tools.chip_event_list.execute({ featureId }, ctx),
    ) as Array<{ kind: string; data: { files?: { created?: string[] } } }>;

    expect(result).toHaveLength(1);
    expect(result[0]!.kind).toBe("task_result");
    // data is deserialized (object, not string)
    expect(result[0]!.data.files?.created).toEqual(["src/bar.ts"]);
  });

  it("filters by kind", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    const tools = eventTools(db);

    await tools.chip_event_add.execute(
      {
        featureId,
        kind: "task_result",
        data: {
          files: { created: [], modified: [], deleted: [] },
          decisions: [],
          issues: [],
          test_result: { passed: true, count: 0 },
        },
      },
      ctx,
    );

    await tools.chip_event_add.execute(
      {
        featureId,
        kind: "correction",
        data: { root_cause: "Bug", fix: "Fixed", files: [] },
      },
      ctx,
    );

    const result = parse(
      await tools.chip_event_list.execute({ featureId, kind: "correction" }, ctx),
    ) as Array<{ kind: string }>;

    expect(result).toHaveLength(1);
    expect(result[0]!.kind).toBe("correction");
  });
});
