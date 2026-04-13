# chip — agent reference

`chip` is a CLI for structured persistence of software features, phases, tasks, and logs.
The database lives at `.chip/chip.db` in the current working directory (auto-created on first use).

---

## Features

```
chip feature create <title> [description]
chip feature list
chip feature status <feature-id>
chip feature export <feature-id> [-o output.md]
```

Feature IDs are kebab-case slugs derived from the title (`"Auth Module"` → `auth-module`).
Duplicates get a numeric suffix (`auth-module-2`).

**Examples**

```
chip feature create "Auth Module" "Login and registration"
chip feature list
chip feature status auth-module
chip feature export auth-module -o auth-module.md
```

---

## Phases

```
chip phase add <feature-id> <title> [description]
chip phase status <feature-id> <phase-id> <status>
```

Valid statuses: `todo` | `in-progress` | `review` | `done`

- Transitioning to `in-progress` sets `startedAt` (only on first transition).
- Transitioning to `done` sets `completedAt`.

**Examples**

```
chip phase add auth-module "Setup" "Scaffold and config"
chip phase status auth-module 1 in-progress
chip phase status auth-module 1 done
```

---

## Tasks

```
chip task add <feature-id> <phase-id> <title> [description]
chip task status <feature-id> <phase-id> <task-id> <status>
```

Valid statuses: `todo` | `in-progress` | `review` | `done`

Same timestamp rules as phases apply.

**Examples**

```
chip task add auth-module 1 "Write tests"
chip task add auth-module 1 "Implement service" "Business logic only"
chip task status auth-module 1 2 in-progress
chip task status auth-module 1 2 done
```

---

## Logs

```
chip log add <feature-id> <message> [--phase <id>] [--task <id>] [--source <cmd>]
chip log list <feature-id> [--phase <id>] [--task <id>]
```

**Examples**

```
chip log add auth-module "Implemented JWT refresh" --phase 1 --task 2 --source /dev
chip log add auth-module "PR review requested" --phase 1 --source /review
chip log list auth-module
chip log list auth-module --phase 1
```

---

## Typical agent workflow

```
# 1. Create the feature
chip feature create "Auth Module" "Login, registration, JWT"

# 2. Add phases
chip phase add auth-module "Setup"
chip phase add auth-module "Implementation"
chip phase add auth-module "Testing"

# 3. Add tasks to phase 1
chip task add auth-module 1 "Scaffold project"
chip task add auth-module 1 "Configure env"

# 4. Start work
chip phase status auth-module 1 in-progress
chip task status auth-module 1 1 in-progress

# 5. Log progress
chip log add auth-module "Scaffolded with Vite" --phase 1 --task 1 --source /dev

# 6. Complete tasks
chip task status auth-module 1 1 done
chip task status auth-module 1 2 done
chip phase status auth-module 1 done

# 7. Check status
chip feature status auth-module

# 8. Export for human review
chip feature export auth-module
```
