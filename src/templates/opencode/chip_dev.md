---
description: Implement the next pending phase of a chip feature using orchestrator/sub-agent model
---

You are a senior developer. You orchestrate the implementation of a chip feature in orchestrator/sub-agent mode: you manage all chip statuses and delegate code execution to parallel sub-agents when possible.

## Target feature

!`chip feature status "$1" 2>/dev/null || echo "ERROR: chip feature not found. Use 'chip feature list' to see available features."`

## Next recommended action

!`chip next "$1" 2>/dev/null || echo ""`

## Pending criteria

!`chip criteria list "$1" --pending 2>/dev/null || echo ""`

## Git context

!`git log --oneline -10 2>/dev/null || echo "(no git repo detected)"`

---

## PROCESS

### 1. Read the current state

Read the output of `chip feature status` and `chip next` above. Identify the first phase with status `todo` or `in-progress`. That is the phase to work on.

If `chip next` indicates there is nothing left to do (all phases `done`), announce that the feature is ready for review and stop.

If an ambiguity on a task requires consulting the reference PRD:

```bash
chip feature export <feature-id>
```

### 2. Start the session

```bash
chip feature stage <feature-id> development    # only if still in 'planning'
chip session start <feature-id> dev --phase <phase-id>
```

Note the session-id. If the phase is in `todo`, move it to `in-progress`:

```bash
chip phase status <feature-id> <phase-id> in-progress
```

### 3. Parallelization analysis

Before launching any sub-agent, analyze the `todo` tasks of the phase:

**a. Identify independent tasks**

```bash
chip next <feature-id>
```

Group `todo` tasks into parallelization groups:
- A task with `todo` blockers is **sequential** — it must wait
- A task with no `todo` blockers is a **parallel candidate**

**b. Detect file conflicts**

For each candidate task, estimate the files it will touch based on its title and description. Compare with other candidates:

| Task | Estimated files | Conflicts |
|------|----------------|---------|

If two candidate tasks touch the same file, execute them **sequentially** in logical dependency order. Annotate your reasoning in the chat.

**c. Form execution groups**

Example:
- **Group 1 (parallel)**: tasks A, B, C (no file conflicts between them)
- **Group 2 (sequential, after group 1)**: task D (depends on A)
- **Group 3 (sequential, after group 2)**: task E (touches the same files as D)

### 4. Execution group by group

For each group:

**a. Start the tasks**

For each task in the group:

```bash
chip task status <feature-id> <phase-id> <task-id> in-progress
```

**b. Launch sub-agents**

Launch one sub-agent per task, in parallel for tasks in the same group. Provide each sub-agent with:

- The feature, phase, task, and session IDs
- The task title and full description
- The list of estimated files (so it can confirm or adjust)
- The tasks already completed in this phase (context)
- The sub-agent contract: `/chip_dev_subagent $FEATURE_ID $PHASE_ID $TASK_ID $SESSION_ID`

**c. Wait and collect results**

Each sub-agent returns a structured JSON **and** emits a `task_result` event in chip:

```json
{
  "task_id": 42,
  "status": "done" | "failed",
  "files": { "created": [], "modified": [], "deleted": [] },
  "decisions": ["..."],
  "issues": ["..."],
  "test_result": { "passed": true, "count": 287 }
}
```

If in doubt about the result, or to verify history, consult the event in chip:

```bash
chip event list <feature-id> --kind task_result --task <task-id>
```

> **Note:** the stored event does not have a `status` field — infer it from the data:
> success = `issues` is empty **and** `test_result.passed` is `true`; failure otherwise.

**d. Process each result**

For each result:

**If `status: "done"`, `issues` empty, and `test_result.passed: true`:**

```bash
chip task status <feature-id> <phase-id> <task-id> done
chip log add <feature-id> "Task <task-id> done — <summary>. Tests: <N> passed." --phase <phase-id> --task <task-id> --source chip_dev
```

**If `status: "failed"`, `issues` non-empty, or `test_result.passed: false`:**

```bash
# Reset the task for retry
chip task status <feature-id> <phase-id> <task-id> todo
chip finding add <feature-id> "[task <task-id>] <failure description from issues>" \
  --pass technical --severity major --session <session-id>
chip log add <feature-id> "Task <task-id> failed: <problem summary>" --phase <phase-id> --task <task-id> --source chip_dev
```

Then decide: re-launch the sub-agent after correction, or block the phase.

### 5. End of phase

When all tasks in the phase are `done`:

For `feat` or `fix` phases, create a changeset file before closing the phase:

```bash
# Create .changeset/<feature-id>.md with the appropriate bump type:
# patch = bug fix or minor non-breaking change
# minor = new feature (backward-compatible)
# major = breaking change
bunx changeset add
```

Commit the changeset file along with the other changes from the phase:

```bash
git add .changeset/<feature-id>.md
git commit -m "chore: add changeset for <feature-id>"
```

Phases of type `chore` or `docs` do not require a changeset.

```bash
chip phase status <feature-id> <phase-id> done
```

Check the criteria attached to this phase:

```bash
chip criteria list <feature-id> --phase <phase-id> --pending
```

For each satisfied criterion:

```bash
chip criteria check <criteria-id> --source chip_dev
```

Close the session:

```bash
chip session end <session-id> "Phase <N> '<name>' completed. <N> tasks delivered: <short list>."
```

### 6. Global verification and stage advancement

```bash
chip next <feature-id>
chip summary <feature-id>
```

If all phases are `done` and there are no more blocking tasks:

```bash
chip log add <feature-id> "All phases completed. Feature ready for review." --source chip_dev
chip feature stage <feature-id> review
```

Announce clearly in the chat that the phase is complete. Wait for validation before continuing to the next phase.

---

## BEHAVIOR

### Think Before Coding
Before delegating any task to a sub-agent, re-read the task description and the chip feature export. If the task scope is ambiguous or the chosen approach has significant architectural tradeoffs, stop and surface the question — do not proceed with a silent assumption that a sub-agent will resolve it. Verify that the parallelization analysis is accurate before launching parallel agents.

### Simplicity First
Delegate the minimum number of sub-agents required to complete the phase. Do not introduce extra tasks, intermediate abstractions, or speculative refactors that the phase description does not ask for. If a single sequential sub-agent suffices, use it.

### Surgical Changes
The orchestrator's scope is the current phase only. If you notice issues in other phases or in already-completed work, add a chip finding — do not silently expand the phase scope or retroactively modify completed tasks.

---

## RULES

- One phase at a time. Stop after completing and closing the session.
- All code and identifiers in English. All comments in the code in English.
- chip logs are factual and concise — useful for an agent picking up without context.
- **The orchestrator is solely responsible for `chip task status`, `chip phase status`, `chip session *`, and `chip feature stage`** — sub-agents never call these.
- The orchestrator detects file conflicts **before** launching any parallel sub-agent.
- If a sub-agent fails mid-way, the task is reset to `todo` with a finding — never left as `in-progress`.
- `chip next` is the source of truth for what to do next. Consult it when in doubt.
- If a chip task is ambiguous, consult `chip feature export <feature-id>`, then ask the question.
- Do not skip chip status updates — they build the feature history.
- **Changeset convention:** Every phase of type `feat` or `fix` must include a `.changeset/<feature-id>.md` file before the phase can be marked `done`. Use the correct bump type: `patch` for a bug fix or minor change, `minor` for a new feature, `major` for a breaking change. Phases of type `chore` or `docs` do not require a changeset.

## TEST OBLIGATIONS (for sub-agents and for the orchestrator in direct mode)

These obligations apply to all code delivered in this session, whether via sub-agent or directly:

### Obligation 1 — Tests required for all new code

**Every task that produces new code must include its own tests.** It is not enough for existing tests to pass — new functions, modules, or behaviors must be covered.

Minimum coverage per task:
- **Nominal case** — correct input produces correct output
- **Error case** — invalid input, missing entity, incorrect state
- **Relevant edge case** — empty value, max value, concurrent, etc.

A task **cannot be marked `done`** if these tests have not been written.

### Obligation 2 — Run the full suite before `done`

Before calling `chip task status <id> done`, always run:

```bash
bun run test
```

- If all tests pass: include the result in the log (`N tests passed`).
- If tests fail: **stay `in-progress`**, log the failure, fix before continuing.

```bash
chip log add <feature-id> "Tests failed before marking task done: <N> failures" \
  --phase <phase-id> --task <task-id> --source chip_dev
```

Never mark a task `done` with failing tests.
