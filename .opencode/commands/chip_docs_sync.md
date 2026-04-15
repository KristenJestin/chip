---
description: Rebuild the entire documentation from the actual project state
---

You are a senior developer responsible for maintaining the project's technical documentation. You will perform a complete exploration of the codebase and rebuild the documentation to reflect exactly the actual state of the code, as of right now.

**Language note:** all content produced is in English. Pay attention to spelling, punctuation, and clarity.

## Active chip features (context)

!`chip feature list 2>/dev/null || echo "(chip not available or no features)"`

## Existing documentation

!`find docs -name "*.md" 2>/dev/null | sort || echo "(no docs/ folder found — adapt the path to the project)"`

---

## PROCESS

### 1. Project exploration

Start with a methodical exploration of the codebase. The goal is to map the entire domain before touching a single documentation file.

Explore in this order based on the project type:

**Models and schemas**
- Locate all schema/model files in the project (ORM, validation schemas, central types).
- For each model, note: fields and their types, relations, constraints.

**Services and business rules**
- Locate all service or business logic files.
- For each service, identify: exposed operations, applied rules (conditions, validations, status transitions), side effects.

**Public interfaces**
- HTTP routes, CLI commands, exported functions, events — depending on the project type.
- Note methods, parameters, applied guards/middlewares.

**Inter-module flows**
- Identify non-trivial sequences between modules or services.
- Note dependencies and communications between components.

### 2. Audit of existing documentation

Read all existing documentation files.

For each file, evaluate:
- Is the content still accurate relative to the code?
- Is the file properly classified according to the project's documentation architecture?
- Is there content that belongs in another file?
- Does the file cover elements that no longer exist in the code?

### 3. Reconstruction plan

Before modifying anything, establish a complete plan:
- List of files to **create** (with their location and planned content).
- List of files to **update** (with the sections to modify).
- List of files to **move or refactor** (with justification).
- List of files to **delete** (elements removed from the code or that have become obsolete).

**Announce this plan in the chat before executing. This is the only pause in the process.**

### 4. Execution

Execute the plan. For each file produced:
- Verify that every piece of information comes directly from the source code (no speculation).
- Verify the syntactic validity of each Mermaid block.
- Verify that spelling and punctuation are correct.

Recommended architecture if no existing structure:

```
docs/
├── README.md            ← navigation index, maintained automatically
├── entities/            ← data schemas, models, types
│   └── {group}.md
├── rules/               ← business rules, lifecycles, statuses
│   └── {domain}.md
└── flows/               ← sequences between modules (Mermaid diagrams)
    └── {flow}.md
```

Classification rules:
- `entities/` → models, field schemas, relations. No business rules.
- `rules/` → business rules, conditions, status transitions. Interfaces may be mentioned as entry points, but the angle is business.
- `flows/` → sequences between modules (who calls what, in what order, with what effects). Use Mermaid `sequenceDiagram`.

### 5. README

Last, generate or completely replace `docs/README.md` to serve as an exhaustive and accurate index of the final state of the documentation.

Expected format:

```markdown
# Documentation — {Project name}

> Navigation index. Maintained automatically.

## Entities

| File | Content |
|---|---|
| [entities/...md](entities/...md) | ... |

## Business Rules

| File | Domain |
|---|---|
| [rules/...md](rules/...md) | ... |

## Flows

| File | Description |
|---|---|
| [flows/...md](flows/...md) | ... |

---
Last updated: YYYY-MM-DD
```

### 6. chip logging (if active features)

If active chip features were documented in this sync, log for each:

```bash
chip log add <feature-id> "docs-sync: documentation updated in sync with the state of the code." --source chip_docs_sync
```

If documentation-related acceptance criteria can be satisfied:

```bash
chip criteria list <feature-id> --pending
chip criteria check <criteria-id> --source chip_docs_sync
```

---

## BEHAVIOR

### Surgical Changes
Update only what actually changed relative to the current code. A sync is not a rewrite — if a documentation section is still accurate, leave it untouched. If you find sections that need restructuring beyond what the code change requires, add a chip finding and stay focused on accuracy over style.

---

## RULES

- All content is in English. Code, field names, routes and technical identifiers remain as-is.
- Spelling, punctuation and capitalization must be correct. Re-read every title and sentence before writing the file.
- Mermaid diagrams must be syntactically valid. Prefer a simple and correct diagram over a rich and broken one.
- A documentation file contains only what is verified in the code. Nothing speculative.
- Deleting obsolete files is expected and desired. Documentation containing false information is worse than incomplete documentation.
- If a subject is ambiguous (business rules or flows?), decide based on what brings most value to the reader.
- One dense file is better than ten one-page files.
