# chip

A CLI tool for managing software features, phases, and tasks — designed to be called by AI coding agents.

`chip` replaces fragile markdown file editing with explicit, typed commands backed by SQLite. It provides structured persistence so agents can track progress across sessions without touching markdown files.

---

## Install

```bash
npm install -g @krinest/chip
```

Or from the repo:

```bash
npm install -g .
```

---

## Quick start

```bash
# Create a feature
chip feature create "Auth Module" "Login and registration"

# Add phases
chip phase add auth-module "Setup"
chip phase add auth-module "Implementation"

# Add tasks
chip task add auth-module 1 "Scaffold project"
chip task add auth-module 1 "Configure env"

# Update statuses
chip phase status auth-module 1 in-progress
chip task status auth-module 1 1 done

# Log progress
chip log add auth-module "Setup complete" --phase 1 --source /dev

# View full status
chip feature status auth-module

# Export as markdown
chip feature export auth-module
```

---

## Commands

### Features

| Command | Description |
|---|---|
| `chip feature create <title> [desc]` | Create a feature (slug ID auto-generated) |
| `chip feature list` | List all features |
| `chip feature status <feature-id>` | Show phases, tasks, and recent logs |
| `chip feature export <feature-id> [-o file]` | Export full feature as markdown |

### Phases

| Command | Description |
|---|---|
| `chip phase add <feature-id> <title> [desc]` | Add a phase to a feature |
| `chip phase status <feature-id> <phase-id> <status>` | Update phase status |

### Tasks

| Command | Description |
|---|---|
| `chip task add <feature-id> <phase-id> <title> [desc]` | Add a task to a phase |
| `chip task status <feature-id> <phase-id> <task-id> <status>` | Update task status |

### Logs

| Command | Description |
|---|---|
| `chip log add <feature-id> <message> [options]` | Add a log entry |
| `chip log list <feature-id> [options]` | List log entries |

`chip log add` options: `--phase <id>`, `--task <id>`, `--source <cmd>`  
`chip log list` options: `--phase <id>`, `--task <id>`

---

## Statuses

| Entity | Valid values |
|---|---|
| Feature | `active` · `done` · `archived` |
| Phase / Task | `todo` · `in-progress` · `review` · `done` |

Transitioning a phase or task to `in-progress` sets `startedAt` (only on the first transition).  
Transitioning to `done` sets `completedAt`.

---

## Database

The database is stored at `.chip/chip.db` relative to wherever `chip` is invoked.  
The `.chip/` directory is created automatically on first use and added to `.gitignore`.

To inspect the database visually:

```bash
bun run db:studio    # opens https://local.drizzle.studio
```

---

## Development

```bash
bun install          # install deps
bun run typecheck    # type-check
bun run lint         # lint (oxlint)
bun run fmt          # format (oxfmt)
bun run test         # run all tests
bun run build:win    # production build (Windows)
bun run build        # production build (Linux/macOS)
```

Run commands directly from source (no build needed):

```bash
bun run chip feature list
bun run chip phase add my-feature "Phase 1"
bun run chip task add my-feature 1 "Write tests"
```

---

## Tech stack

- **Runtime:** Node.js 18+ (package manager: Bun)
- **Language:** TypeScript (strict)
- **CLI framework:** Commander.js
- **Database:** SQLite via `@libsql/client` + Drizzle ORM
- **Bundler:** tsup
- **Tests:** Vitest
