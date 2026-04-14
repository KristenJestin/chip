# chip — référence agent

`chip` est un CLI de persistance structurée pour features, phases, tâches, sessions, findings et critères.
La base de données est à `.chip/chip.db` dans le répertoire courant (créé automatiquement au premier usage).

Workflow standard : `planning` → `development` → `review` → `documentation` → `released`

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

Stages dans l'ordre : `planning` → `development` → `review` → `documentation` → `released`

**Exemples**

```
chip feature create "Auth Module" "Login et registration"
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

Statuts valides : `todo` | `in-progress` | `review` | `done`

**Exemples**

```
chip phase add auth-module "Setup" "Scaffold et config"
chip phase status auth-module 1 in-progress
chip phase status auth-module 1 done
```

---

## Tâches

```
chip task add <feature-id> <phase-id> <title> [description] [--type <type>] [--parent <id>]
chip task status <feature-id> <phase-id> <task-id> <status>
```

Types : `feature` | `fix` | `docs` | `test`
Statuts : `todo` | `in-progress` | `review` | `done`

**Exemples**

```
chip task add auth-module 1 "Écrire les tests" "" --type test
chip task add auth-module 1 "Implémenter le service" "Business logic" --type feature
chip task status auth-module 1 2 in-progress
chip task status auth-module 1 2 done
```

---

## Logs

```
chip log add <feature-id> <message> [--phase <id>] [--task <id>] [--source <cmd>]
chip log list <feature-id> [--limit <n>]
```

**Exemples**

```
chip log add auth-module "JWT refresh implémenté" --phase 1 --task 2 --source chip_dev
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

Types : `prd` | `dev` | `review` | `docs`

**Exemples**

```
chip session start auth-module dev --phase 1
chip session current auth-module
chip session end 3 "Phase 1 terminée. Scaffold + config + tests de base."
chip session list auth-module --type dev
```

---

## Findings

```
chip finding add <feature-id> <description> --pass <pass> --severity <sev> [--category <cat>] [--session <id>]
chip finding list <feature-id> [--unresolved] [--pass <pass>] [--severity <sev>]
chip finding resolve <finding-id> <resolution> [--task <task-id>]
```

Pass : `business` | `technical`
Severity : `high` | `medium` | `low`

**Exemples**

```
chip finding add auth-module "Token non révoqué à la déconnexion" --pass business --severity high --session 3
chip finding add auth-module "Variable non utilisée dans auth.service.ts" --pass technical --severity low --session 3
chip finding list auth-module --unresolved
chip finding resolve 2 "Corrigé inline — révocation ajoutée dans logout()"
chip finding resolve 3 "Tâche fix créée : task 8" --task 8
```

---

## Critères d'acceptation

```
chip criteria add <feature-id> <description> [--phase <id>]
chip criteria check <criteria-id> [--source <source>]
chip criteria list <feature-id> [--pending] [--phase <id>]
```

**Exemples**

```
chip criteria add auth-module "Tous les endpoints sont protégés par JWT"
chip criteria add auth-module "Tests de couverture > 80%" --phase 2
chip criteria list auth-module --pending
chip criteria check 1 --source chip_review
```

---

## Commandes agent

```
chip next <feature-id>                        — prochain diagnostic actionnable
chip batch <feature-id> --json <file>         — créer phases+tâches depuis un fichier JSON
chip summary <feature-id>                     — tableau de bord stats
```

**Format JSON pour chip batch**

```json
{
  "phases": [
    {
      "title": "Phase 1 — Nom",
      "description": "Objectif de la phase",
      "tasks": [
        { "title": "Tâche 1.1", "description": "Description actionnable", "type": "feature" },
        { "title": "Tâche 1.2", "description": "Description actionnable", "type": "test" }
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

## Workflow agent type

```bash
# 1. PRD — créer la feature et la structurer
chip feature create "Auth Module" "Login, registration, JWT"
chip session start auth-module prd
chip batch auth-module --json batch.json
chip criteria add auth-module "Tous les endpoints sont couverts par des tests"
chip log add auth-module "PRD créé. 3 phases, 8 tâches, 4 critères." --source chip_prd
chip session end 1 "PRD auth-module. 3 phases, 8 tâches, 4 critères."

# 2. DEV — implémenter phase par phase
chip feature stage auth-module development
chip session start auth-module dev --phase 1
chip phase status auth-module 1 in-progress
chip task status auth-module 1 1 in-progress
# ... code + tests ...
chip task status auth-module 1 1 done
chip log add auth-module "Scaffold terminé" --phase 1 --task 1 --source chip_dev
chip phase status auth-module 1 done
chip criteria check 2 --source chip_dev
chip session end 2 "Phase 1 terminée. 3 tâches livrées."
chip feature stage auth-module review

# 3. REVIEW — deux passes avec findings
chip session start auth-module review
chip finding add auth-module "Token non révoqué" --pass business --severity high --session 3
chip finding add auth-module "Import orphelin" --pass technical --severity low --session 3
chip finding list auth-module --unresolved
chip finding resolve 1 "Corrigé inline"
chip criteria check 1 --source chip_review
chip session end 3 "2 findings, 2 résolus. 0 bloquant."
chip feature stage auth-module documentation

# 4. DOCS — mettre à jour la doc et releaser
chip session start auth-module docs
chip criteria list auth-module --pending
chip criteria check 3 --source chip_docs
chip log add auth-module "Documentation mise à jour." --source chip_docs
chip session end 4 "Doc : 3 fichiers créés/mis à jour."
chip feature stage auth-module released
```
