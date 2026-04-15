# chip — agent reference

`chip` is a structured persistence CLI for features, phases, tasks, sessions, findings and criteria.
The database is at `.chip/chip.db` in the current directory (created automatically on first use).

Standard workflow: `planning` → `development` → `review` → `documentation` → `released`

---

## Features

```
chip feature create <title> [description]
chip feature list
chip feature status <feature-id>
chip feature stage <feature-id> <stage> [--force]
chip feature export <feature-id>
chip feature summary <feature-id>
```

Stages in order: `planning` → `development` → `review` → `documentation` → `released`

**Examples**

```
chip feature create "Auth Module" "Login and registration"
chip feature list
chip feature status auth-module
chip feature stage auth-module development
chip feature export auth-module
chip feature summary auth-module
```

---

## Phases

```
chip phase add <feature-id> <title> [description]
chip phase status <feature-id> <phase-id> <status>
```

Valid statuses: `todo` | `in-progress` | `review` | `done`

**Examples**

```
chip phase add auth-module "Setup" "Scaffold and config"
chip phase status auth-module 1 in-progress
chip phase status auth-module 1 done
```

---

## Tasks

```
chip task add <feature-id> <phase-id> <title> [description] [--type <type>] [--parent <id>]
chip task status <feature-id> <phase-id> <task-id> <status>
```

Types: `feature` | `fix` | `docs` | `test`
Statuses: `todo` | `in-progress` | `review` | `done`

**Examples**

```
chip task add auth-module 1 "Write tests" "" --type test
chip task add auth-module 1 "Implement service" "Business logic" --type feature
chip task status auth-module 1 2 in-progress
chip task status auth-module 1 2 done
```

---

## Logs

```
chip log add <feature-id> <message> [--phase <id>] [--task <id>] [--source <cmd>]
chip log list <feature-id> [--limit <n>]
```

**Examples**

```
chip log add auth-module "JWT refresh implemented" --phase 1 --task 2 --source chip_dev
chip log list auth-module --limit 20
```

---

## Sessions

```
chip session start <feature-id> <type> [--phase <id>]
chip session end [session-id] [summary]
chip session list <feature-id> [--type <type>]
chip session current [feature-id]
```

Types: `prd` | `dev` | `review` | `docs`

**Examples**

```
chip session start auth-module dev --phase 1
chip session current auth-module
chip session end 3 "Phase 1 complete. Scaffold + config + basic tests."
chip session list auth-module --type dev
```

---

## Findings

```
chip finding add <feature-id> <description> --pass <pass> --severity <sev> [--category <cat>] [--session <id>]
chip finding list <feature-id> [--unresolved] [--pass <pass>] [--severity <sev>]
chip finding resolve <finding-id> <resolution> [--task <task-id>]
```

Pass: `business` | `technical`
Severity: `critical` | `major` | `minor` | `suggestion`
Category: `security` | `convention` | `quality` | `test` | `scope` | `correctness`

**Examples**

```
chip finding add auth-module "Token not revoked on logout" --pass business --severity critical --session 3
chip finding add auth-module "Unused variable in auth.service.ts" --pass technical --severity minor --session 3
chip finding list auth-module --unresolved
chip finding resolve 2 "Fixed inline — revocation added in logout()"
chip finding resolve 3 "Fix task created: task 8" --task 8
```

---

## Acceptance criteria

```
chip criteria add <feature-id> <description> [--phase <id>]
chip criteria check <criteria-id> [--source <source>]
chip criteria list <feature-id> [--pending] [--phase <id>]
```

**Examples**

```
chip criteria add auth-module "All endpoints are protected by JWT"
chip criteria add auth-module "Test coverage > 80%" --phase 2
chip criteria list auth-module --pending
chip criteria check 1 --source chip_review
```

---

## Agent commands

```
chip next <feature-id>                        — next actionable diagnostic
chip batch <feature-id> --json <file>         — create phases+tasks from a JSON file
chip summary <feature-id>                     — stats dashboard
```

**JSON format for chip batch**

```json
{
  "phases": [
    {
      "title": "Phase 1 — Name",
      "description": "Phase objective",
      "tasks": [
        { "title": "Task 1.1", "description": "Actionable description", "type": "feature" },
        { "title": "Task 1.2", "description": "Actionable description", "type": "test" }
      ]
    }
  ]
}
```

```
chip next auth-module
chip batch auth-module --json batch.json
chip summary auth-module
```

---

## Typical agent workflow

```bash
# 1. PRD — create the feature and structure it
chip feature create "Auth Module" "Login, registration, JWT"
chip session start auth-module prd
chip batch auth-module --json batch.json
chip criteria add auth-module "All endpoints are covered by tests"
chip log add auth-module "PRD created. 3 phases, 8 tasks, 4 criteria." --source chip_prd
chip session end 1 "PRD auth-module. 3 phases, 8 tasks, 4 criteria."

# 2. DEV — implement phase by phase
chip feature stage auth-module development
chip session start auth-module dev --phase 1
chip phase status auth-module 1 in-progress
chip task status auth-module 1 1 in-progress
# ... code + tests ...
chip task status auth-module 1 1 done
chip log add auth-module "Scaffold complete" --phase 1 --task 1 --source chip_dev
chip phase status auth-module 1 done
chip criteria check 2 --source chip_dev
chip session end 2 "Phase 1 complete. 3 tasks delivered."
chip feature stage auth-module review

# 3. REVIEW — two passes with findings
chip session start auth-module review
chip finding add auth-module "Token not revoked" --pass business --severity critical --session 3
chip finding add auth-module "Orphan import" --pass technical --severity minor --session 3
chip finding list auth-module --unresolved
chip finding resolve 1 "Fixed inline"
chip criteria check 1 --source chip_review
chip session end 3 "2 findings, 2 resolved. 0 blocking."
chip feature stage auth-module documentation

# 4. DOCS — update docs and release
chip session start auth-module docs
chip criteria list auth-module --pending
chip criteria check 3 --source chip_docs
chip log add auth-module "Documentation updated." --source chip_docs
chip session end 4 "Docs: 3 files created/updated."
chip feature stage auth-module released
```
