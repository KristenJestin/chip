# chip

A CLI tool designed to be called by AI coding agents. `chip` provides structured persistence for managing software **features**, **phases**, **tasks**, **sessions**, **findings**, and **acceptance criteria** — replacing fragile markdown file editing with explicit, typed commands backed by SQLite.

---

## What it solves

AI agents working on a codebase lose context between sessions, duplicate work, and have no structured way to track progress. `chip` gives agents a shared, persistent, queryable state store so they can pick up exactly where they left off — across sessions, across agents.

---

## Install

```bash
npm install -g @netsirk/chip
```

---

## Quick start

```bash
# Initialize chip in your project (creates .chip/ and installs OpenCode commands)
chip init --provider opencode

# Create a feature
chip feature create "Auth Module" "Login and registration"

# Add phases and tasks
chip phase add auth-module "Setup"
chip task add auth-module 1 "Scaffold project"
chip task add auth-module 1 "Configure env"

# Track progress
chip task status auth-module 1 1 in-progress
chip task status auth-module 1 1 done

# Log what happened
chip log add auth-module "Setup complete" --phase 1 --source agent

# Ask chip what to do next
chip next auth-module

# Full status overview
chip feature status auth-module
```

---

## Workflow stages

Features move through a fixed pipeline:

```
planning → development → review → documentation → released
```

```bash
chip feature stage auth-module development
chip feature stage auth-module review
```

---

## Command reference

### Features

```
chip feature create <title> [description]     Create a feature (slug ID auto-generated)
chip feature list                             List all features
chip feature status <feature-id>              Phases, tasks, findings, criteria, logs
chip feature stage <feature-id> <stage>       Advance workflow stage
chip feature export <feature-id>              Export as JSON
chip feature summary <feature-id>             Compact stats dashboard
```

### Phases

```
chip phase add <feature-id> <title> [desc]              Add a phase
chip phase status <feature-id> <phase-id> <status>      Update phase status
```

Phase statuses: `todo` · `in-progress` · `review` · `done`

### Tasks

```
chip task add <feature-id> <phase-id> <title> [desc] [--type <type>] [--parent <id>]
chip task status <feature-id> <phase-id> <task-id> <status>
```

Task types: `feature` · `fix` · `docs` · `test`  
Task statuses: `todo` · `in-progress` · `review` · `done`

### Sessions

Sessions track agent work periods. Each session is scoped to a feature and an activity type.

```
chip session start <feature-id> <type> [--phase <id>]   Start a session
chip session end [session-id] [summary]                 End the current session
chip session list <feature-id> [--type <type>]          List sessions
chip session current [feature-id]                       Show active session
```

Session types: `prd` · `dev` · `review` · `docs`

### Logs

```
chip log add <feature-id> <message> [--phase <id>] [--task <id>] [--source <src>]
chip log list <feature-id> [--limit <n>]
```

### Findings

Findings are structured observations — bugs, risks, or quality issues — tracked before being acted on.

```
chip finding add <feature-id> <description> --pass <pass> --severity <sev> [--category <cat>] [--session <id>]
chip finding list <feature-id> [--unresolved] [--pass <pass>] [--severity <sev>]
chip finding resolve <finding-id> <resolution> [--task <task-id>]
```

Pass: `business` · `technical`  
Severity: `critical` · `major` · `minor` · `suggestion`  
Category: `security` · `convention` · `quality` · `test` · `scope` · `correctness`  
Resolution: `fixed` · `wontfix` · `deferred`

### Acceptance criteria

```
chip criteria add <feature-id> <description> [--phase <id>]
chip criteria check <criteria-id> [--source <source>]
chip criteria list <feature-id> [--pending] [--phase <id>]
```

### Agent commands

```
chip next <feature-id>                    Actionable diagnostic — what to do next
chip batch <feature-id> --json <file>     Bulk create phases and tasks from JSON
chip summary <feature-id>                 Stats dashboard
```

### Init

```
chip init [--provider <provider>] [--no-commands]
```

Initializes `.chip/` in the current directory and installs provider-specific command files.  
Supported providers: `opencode`.  
Use `--no-commands` to initialize the database only.

---

## Database

The database lives at `.chip/chip.db` relative to wherever `chip` is invoked. The `.chip/` directory is created automatically and added to `.gitignore`.

```bash
bun run db:studio    # Open Drizzle Studio at https://local.drizzle.studio
```

---

## OpenCode plugin

`chip` ships as an OpenCode plugin, exposing all operations as tools usable by agents directly.

```json
{
  "plugin": "@netsirk/chip/plugin"
}
```

To scaffold OpenCode command files in your project:

```bash
chip init --provider opencode
```

This installs ready-to-use slash commands in `.opencode/commands/`:

| Command | Description |
|---|---|
| `/chip_prd` | Write and structure a PRD into chip |
| `/chip_dev` | Implement a feature phase by phase |
| `/chip_review` | Two-pass review (business + technical) with finding tracking |
| `/chip_docs` | Write documentation |

---

## Release setup

To publish releases via the GitHub Actions release workflow, a repository secret must be configured.

### NPM_TOKEN

1. Go to [npmjs.com](https://www.npmjs.com) and sign in.
2. Navigate to **Access Tokens** (top-right menu > Access Tokens).
3. Click **Generate New Token** and select the **Automation** type (bypasses 2FA for CI).
4. Copy the generated token.
5. In your GitHub repository, go to **Settings > Secrets and variables > Actions**.
6. Click **New repository secret**.
7. Set the name to `NPM_TOKEN` and paste the token as the value.

The release workflow references it as:

```yaml
NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

---

## Development

```bash
bun install          # Install deps
bun run typecheck    # Type-check without emitting
bun run test         # Run all tests
bun run build        # Production build (Linux/macOS)
bun run build:win    # Production build (Windows)
```

Run commands directly from source (no build needed):

```bash
bun run chip feature list
bun run chip next auth-module
```

---

## Tech stack

- **Runtime:** Node.js 18+ · Bun
- **Language:** TypeScript (strict)
- **CLI:** Commander.js
- **Database:** SQLite via `@libsql/client` + Drizzle ORM v1 beta
- **Validation:** Zod v4
- **Bundler:** tsup
- **Tests:** Vitest
