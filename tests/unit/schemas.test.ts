import { describe, it, expect } from "vitest";
import { validate } from "../../src/core/validate";
import {
  CreateFeatureInput,
  GetFeatureStatusInput,
  ExportFeatureInput,
  AddPhaseInput,
  UpdatePhaseStatusInput,
  AddTaskInput,
  UpdateTaskStatusInput,
  AddLogInput,
  ListLogsInput,
  AddFindingInput,
  ListFindingsInput,
} from "../../src/core/schemas";

// ── validate() helper ─────────────────────────────────────────────────────────

describe("validate", () => {
  it("returns parsed data on success", () => {
    const result = validate(CreateFeatureInput, { title: "My Feature" });
    expect(result).toEqual({ title: "My Feature", description: undefined });
  });

  it("throws a descriptive Error on failure", () => {
    expect(() => validate(CreateFeatureInput, { title: "" })).toThrow(Error);
  });

  it("error message is human-readable (not JSON)", () => {
    try {
      validate(CreateFeatureInput, { title: "" });
    } catch (err) {
      expect((err as Error).message).toBeTypeOf("string");
      expect((err as Error).message.length).toBeGreaterThan(0);
    }
  });
});

// ── CreateFeatureInput ────────────────────────────────────────────────────────

describe("CreateFeatureInput", () => {
  it("accepts a valid title", () => {
    expect(() => validate(CreateFeatureInput, { title: "Auth Module" })).not.toThrow();
  });

  it("accepts an optional description", () => {
    const result = validate(CreateFeatureInput, {
      title: "Auth Module",
      description: "Handles authentication",
    });
    expect(result.description).toBe("Handles authentication");
  });

  it("rejects an empty title", () => {
    expect(() => validate(CreateFeatureInput, { title: "" })).toThrow();
  });

  it("rejects a missing title", () => {
    expect(() => validate(CreateFeatureInput, {})).toThrow();
  });

  it("rejects a numeric title", () => {
    expect(() => validate(CreateFeatureInput, { title: 42 })).toThrow();
  });
});

// ── GetFeatureStatusInput ─────────────────────────────────────────────────────

describe("GetFeatureStatusInput", () => {
  it("accepts a valid featureId", () => {
    expect(() => validate(GetFeatureStatusInput, { featureId: "auth-module" })).not.toThrow();
  });

  it("rejects an empty featureId", () => {
    expect(() => validate(GetFeatureStatusInput, { featureId: "" })).toThrow();
  });

  it("rejects a missing featureId", () => {
    expect(() => validate(GetFeatureStatusInput, {})).toThrow();
  });
});

// ── ExportFeatureInput ────────────────────────────────────────────────────────

describe("ExportFeatureInput", () => {
  it("accepts featureId without output", () => {
    expect(() => validate(ExportFeatureInput, { featureId: "auth-module" })).not.toThrow();
  });

  it("accepts an optional output path", () => {
    const result = validate(ExportFeatureInput, { featureId: "auth-module", output: "out.md" });
    expect(result.output).toBe("out.md");
  });

  it("rejects an empty featureId", () => {
    expect(() => validate(ExportFeatureInput, { featureId: "" })).toThrow();
  });
});

// ── AddPhaseInput ─────────────────────────────────────────────────────────────

describe("AddPhaseInput", () => {
  it("accepts valid featureId and title", () => {
    expect(() =>
      validate(AddPhaseInput, { featureId: "auth-module", title: "Phase 1" }),
    ).not.toThrow();
  });

  it("accepts an optional description", () => {
    const result = validate(AddPhaseInput, {
      featureId: "auth-module",
      title: "Phase 1",
      description: "First phase",
    });
    expect(result.description).toBe("First phase");
  });

  it("rejects an empty title", () => {
    expect(() => validate(AddPhaseInput, { featureId: "auth-module", title: "" })).toThrow();
  });

  it("rejects an empty featureId", () => {
    expect(() => validate(AddPhaseInput, { featureId: "", title: "Phase 1" })).toThrow();
  });
});

// ── UpdatePhaseStatusInput ────────────────────────────────────────────────────

describe("UpdatePhaseStatusInput", () => {
  it("accepts all valid statuses", () => {
    for (const status of ["todo", "in-progress", "review", "done"]) {
      expect(() =>
        validate(UpdatePhaseStatusInput, { featureId: "f", phaseId: 1, status }),
      ).not.toThrow();
    }
  });

  it("rejects an invalid status", () => {
    expect(() =>
      validate(UpdatePhaseStatusInput, { featureId: "f", phaseId: 1, status: "invalid" }),
    ).toThrow();
  });

  it("rejects a non-integer phaseId", () => {
    expect(() =>
      validate(UpdatePhaseStatusInput, { featureId: "f", phaseId: 1.5, status: "todo" }),
    ).toThrow();
  });

  it("rejects a zero phaseId", () => {
    expect(() =>
      validate(UpdatePhaseStatusInput, { featureId: "f", phaseId: 0, status: "todo" }),
    ).toThrow();
  });

  it("rejects a negative phaseId", () => {
    expect(() =>
      validate(UpdatePhaseStatusInput, { featureId: "f", phaseId: -1, status: "todo" }),
    ).toThrow();
  });
});

// ── AddTaskInput ──────────────────────────────────────────────────────────────

describe("AddTaskInput", () => {
  it("accepts valid inputs", () => {
    expect(() =>
      validate(AddTaskInput, { featureId: "f", phaseId: 1, title: "Write tests" }),
    ).not.toThrow();
  });

  it("accepts an optional description", () => {
    const result = validate(AddTaskInput, {
      featureId: "f",
      phaseId: 1,
      title: "Write tests",
      description: "Unit tests",
    });
    expect(result.description).toBe("Unit tests");
  });

  it("rejects an empty title", () => {
    expect(() => validate(AddTaskInput, { featureId: "f", phaseId: 1, title: "" })).toThrow();
  });

  it("rejects a negative phaseId", () => {
    expect(() =>
      validate(AddTaskInput, { featureId: "f", phaseId: -1, title: "Task" }),
    ).toThrow();
  });
});

// ── UpdateTaskStatusInput ─────────────────────────────────────────────────────

describe("UpdateTaskStatusInput", () => {
  it("accepts all valid statuses", () => {
    for (const status of ["todo", "in-progress", "review", "done"]) {
      expect(() =>
        validate(UpdateTaskStatusInput, { featureId: "f", phaseId: 1, taskId: 2, status }),
      ).not.toThrow();
    }
  });

  it("rejects an invalid status", () => {
    expect(() =>
      validate(UpdateTaskStatusInput, {
        featureId: "f",
        phaseId: 1,
        taskId: 2,
        status: "pending",
      }),
    ).toThrow();
  });

  it("rejects zero taskId", () => {
    expect(() =>
      validate(UpdateTaskStatusInput, { featureId: "f", phaseId: 1, taskId: 0, status: "done" }),
    ).toThrow();
  });
});

// ── AddLogInput ───────────────────────────────────────────────────────────────

describe("AddLogInput", () => {
  it("accepts featureId and message", () => {
    expect(() =>
      validate(AddLogInput, { featureId: "f", message: "Deployed" }),
    ).not.toThrow();
  });

  it("accepts optional phaseId, taskId, source", () => {
    const result = validate(AddLogInput, {
      featureId: "f",
      message: "Done",
      phaseId: 1,
      taskId: 2,
      source: "/dev",
    });
    expect(result.phaseId).toBe(1);
    expect(result.taskId).toBe(2);
    expect(result.source).toBe("/dev");
  });

  it("rejects an empty message", () => {
    expect(() => validate(AddLogInput, { featureId: "f", message: "" })).toThrow();
  });

  it("rejects a negative phaseId", () => {
    expect(() =>
      validate(AddLogInput, { featureId: "f", message: "ok", phaseId: -1 }),
    ).toThrow();
  });

  it("rejects a non-integer taskId", () => {
    expect(() =>
      validate(AddLogInput, { featureId: "f", message: "ok", taskId: 1.5 }),
    ).toThrow();
  });
});

// ── ListLogsInput ─────────────────────────────────────────────────────────────

describe("ListLogsInput", () => {
  it("accepts only a featureId", () => {
    expect(() => validate(ListLogsInput, { featureId: "f" })).not.toThrow();
  });

  it("accepts optional phaseId and taskId filters", () => {
    const result = validate(ListLogsInput, { featureId: "f", phaseId: 3, taskId: 7 });
    expect(result.phaseId).toBe(3);
    expect(result.taskId).toBe(7);
  });

  it("rejects an empty featureId", () => {
    expect(() => validate(ListLogsInput, { featureId: "" })).toThrow();
  });

  it("rejects a zero phaseId", () => {
    expect(() => validate(ListLogsInput, { featureId: "f", phaseId: 0 })).toThrow();
  });
});

// ── AddFindingInput ───────────────────────────────────────────────────────────
// Regression: templates previously documented severity as high|medium|low and
// category as free text — both rejected by the actual Zod schema.

describe("AddFindingInput — severity", () => {
  it("accepts all valid severity values", () => {
    for (const severity of ["critical", "major", "minor", "suggestion"]) {
      expect(() =>
        validate(AddFindingInput, {
          featureId: "f",
          description: "desc",
          pass: "technical",
          severity,
        }),
      ).not.toThrow();
    }
  });

  it("rejects 'high' — was incorrectly documented in templates", () => {
    expect(() =>
      validate(AddFindingInput, {
        featureId: "f",
        description: "desc",
        pass: "technical",
        severity: "high",
      }),
    ).toThrow();
  });

  it("rejects 'medium' — was incorrectly documented in templates", () => {
    expect(() =>
      validate(AddFindingInput, {
        featureId: "f",
        description: "desc",
        pass: "technical",
        severity: "medium",
      }),
    ).toThrow();
  });

  it("rejects 'low' — was incorrectly documented in templates", () => {
    expect(() =>
      validate(AddFindingInput, {
        featureId: "f",
        description: "desc",
        pass: "technical",
        severity: "low",
      }),
    ).toThrow();
  });
});

describe("AddFindingInput — category", () => {
  it("accepts all valid category values", () => {
    for (const category of ["security", "convention", "quality", "test", "scope", "correctness"]) {
      expect(() =>
        validate(AddFindingInput, {
          featureId: "f",
          description: "desc",
          pass: "technical",
          severity: "major",
          category,
        }),
      ).not.toThrow();
    }
  });

  it("rejects free-text category — was incorrectly documented in templates", () => {
    expect(() =>
      validate(AddFindingInput, {
        featureId: "f",
        description: "desc",
        pass: "technical",
        severity: "major",
        category: "domaine fonctionnel",
      }),
    ).toThrow();
  });

  it("rejects 'conventions' — was incorrectly documented in templates (valid value is 'convention')", () => {
    expect(() =>
      validate(AddFindingInput, {
        featureId: "f",
        description: "desc",
        pass: "technical",
        severity: "major",
        category: "conventions",
      }),
    ).toThrow();
  });

  it("rejects 'tests' — was incorrectly documented in templates (valid value is 'test')", () => {
    expect(() =>
      validate(AddFindingInput, {
        featureId: "f",
        description: "desc",
        pass: "technical",
        severity: "major",
        category: "tests",
      }),
    ).toThrow();
  });

  it("category is optional — omitting it is valid", () => {
    expect(() =>
      validate(AddFindingInput, {
        featureId: "f",
        description: "desc",
        pass: "technical",
        severity: "major",
      }),
    ).not.toThrow();
  });
});

describe("ListFindingsInput — severity filter", () => {
  it("accepts all valid severity values as filter", () => {
    for (const severity of ["critical", "major", "minor", "suggestion"]) {
      expect(() =>
        validate(ListFindingsInput, { featureId: "f", severity }),
      ).not.toThrow();
    }
  });

  it("rejects 'high' as severity filter", () => {
    expect(() =>
      validate(ListFindingsInput, { featureId: "f", severity: "high" }),
    ).toThrow();
  });
});
