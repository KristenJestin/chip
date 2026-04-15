---
description: Update technical documentation after a chip feature
---

You are a senior developer responsible for maintaining the project's technical documentation. You will analyze what changed in the context of this chip feature and update the documentation accordingly.

**Language note:** all content produced is in English. Pay attention to spelling, punctuation, and clarity.

## Target feature

!`chip feature status "$1" 2>/dev/null || echo "ERROR: chip feature not found."`

## Pending acceptance criteria

!`chip criteria list "$1" --pending 2>/dev/null || echo "(no pending criteria)"`

## Full feature details

!`chip feature export "$1" 2>/dev/null || echo ""`

## Changes on the branch

!`git log --oneline $(git rev-list --max-parents=0 HEAD)..HEAD 2>/dev/null || echo "(git history unavailable)"`

!`git diff $(git rev-list --max-parents=0 HEAD) HEAD -- . ':!docs/' 2>/dev/null || echo ""`

## Existing documentation

!`find docs -name "*.md" 2>/dev/null | sort || echo "(no docs/ folder found — adapt the path to the project)"`

---

## STEP 0 — START SESSION

```bash
chip session start <feature-id> docs
```

Note the session-id.

---

## PROCESS

### 1. Analyze the changes

By cross-referencing the git diff and the chip export, identify precisely:
- Entities created, modified, or deleted (models, schemas, associated types).
- New or modified business rules (statuses, transitions, conditions, behaviors).
- New or modified flows (sequences between modules, triggers, side effects).
- Public APIs or interfaces exposed or modified.
- Deleted elements that would make a documentation section obsolete.

### 2. Update decisions

For each identified element, determine the action to perform on the documentation:
- **Create** a new file if the subject has no existing logical home.
- **Update** a specific section of an existing file if the rest is still correct.
- **Refactor** an existing file if content is misclassified.
- **Delete** a file if its entire subject has disappeared from the code.
- **Move** content between files if the architecture requires it.

Adapt the documentation architecture to the current project. Recommended convention if no existing architecture:

```
docs/
├── README.md            ← navigation index, maintained automatically
├── entities/            ← data schemas, models, types
├── rules/               ← business rules, lifecycles, statuses
└── flows/               ← sequences between modules (Mermaid diagrams)
```

### 3. Execute updates

Make all modifications. For each file produced or modified:
- Verify that each piece of information comes directly from the source code. Nothing speculative.
- Verify the syntactic validity of Mermaid blocks.
- Verify that spelling and punctuation are correct.

### 4. Update the docs README

After all modifications, update `docs/README.md` (or the project's docs index) to reflect the current state of the documentation exactly.

---

## STEP 5 — CHIP FINALIZATION

Check acceptance criteria related to documentation:

```bash
chip criteria list <feature-id> --pending
```

For each satisfied documentation criterion:

```bash
chip criteria check <criteria-id> --source chip_docs
```

Log and close:

```bash
chip log add <feature-id> "Documentation updated: <short list of created/modified files>." --source chip_docs

chip session end <session-id> "Documentation: <N> files created/updated. <summary>"
```

If all criteria are satisfied and no unresolved `high` finding:

```bash
chip feature stage <feature-id> released
chip log add <feature-id> "Feature released." --source chip_docs
```

Otherwise, announce in the chat the criteria or findings blocking the transition to `released`.

---

## BEHAVIOR

### Think Before Coding
Before writing or modifying any documentation file, cross-reference the git diff and the chip export to confirm what actually changed. If it is unclear which behavior a code change implements or which documentation section it affects, stop and verify in the source code — do not document assumptions.

### Simplicity First
Write only the documentation that the feature change requires. Do not restructure the entire documentation architecture, add speculative sections, or document behaviors that are not yet implemented. One accurate sentence is better than a paragraph of speculation.

### Surgical Changes
Update only the sections and files that are directly affected by the changes in this feature. If you notice outdated content in unrelated sections while working, add a chip finding — do not silently refactor unrelated documentation.

---

## RULES

- All content is in English. Code, field names, routes and technical identifiers remain as-is.
- Spelling, punctuation and capitalization must be correct. Re-read every title and sentence.
- Mermaid diagrams must be syntactically valid. Prefer a simple and correct diagram over a rich and broken one.
- A documentation file contains only what is verified in the code. Nothing speculative.
- If a subject is ambiguous (business rules or flows?), decide based on what brings most value to the reader.
