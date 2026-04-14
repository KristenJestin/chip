# Cycle de vie d'une feature

> Séquence complète d'une feature de `planning` à `released`, illustrant les interactions entre la CLI/plugin, les services core et la base de données.

---

## Vue d'ensemble du pipeline

```mermaid
stateDiagram-v2
    [*] --> planning : chip feature create
    planning --> development : chip feature stage ... development
    development --> review : chip feature stage ... review\n(toutes tâches done/review)
    review --> documentation : chip feature stage ... documentation
    documentation --> released : chip feature stage ... released
    development --> planning : --force (régression)
    review --> development : --force (régression)
```

---

## Flux complet — de la création à la livraison

```mermaid
sequenceDiagram
    actor Agent
    participant CLI as CLI / Plugin
    participant Core as Services core
    participant DB as SQLite (.chip/chip.db)

    Note over Agent,DB: 1. Création de la feature
    Agent->>CLI: chip feature create "Auth Module"
    CLI->>Core: createFeature(title)
    Core->>DB: SELECT id FROM features (slugs existants)
    DB-->>Core: liste des slugs
    Core->>DB: INSERT INTO features (id="auth-module", stage="planning", status="active")
    DB-->>Core: ok
    Core-->>CLI: id = "auth-module"
    CLI-->>Agent: ✓ auth-module créé

    Note over Agent,DB: 2. Structuration (phase planning)
    Agent->>CLI: chip batch auth-module --json phases.json
    CLI->>Core: executeBatch(featureId, payload)
    Core->>DB: assertFeatureExists
    loop Pour chaque phase
        Core->>DB: INSERT INTO phases (feature_id, order, title)
        loop Pour chaque tâche
            Core->>DB: INSERT INTO tasks (phase_id, order, title, type)
        end
    end
    Core-->>CLI: { phasesCreated: 3, tasksCreated: 12 }

    Note over Agent,DB: 3. Passage en développement
    Agent->>CLI: chip feature stage auth-module development
    CLI->>Core: updateFeatureStage("auth-module", "development")
    Core->>DB: SELECT stage FROM features WHERE id="auth-module"
    DB-->>Core: "planning"
    Note right of Core: Pas de régression → OK
    Core->>DB: UPDATE features SET stage="development", updated_at=now
    Core-->>CLI: feature mise à jour

    Note over Agent,DB: 4. Travail (sessions + tâches)
    Agent->>CLI: chip session start auth-module dev --phase 1
    CLI->>Core: startSession(featureId, "dev", phaseId)
    Core->>DB: INSERT INTO sessions (feature_id, type="dev", status="active")
    DB-->>Core: session #1

    Agent->>CLI: chip task status auth-module 1 1 in-progress
    CLI->>Core: updateTaskStatus(..., "in-progress")
    Core->>DB: assertFeatureExists + assertPhaseExists + assertTaskExists
    Core->>DB: UPDATE tasks SET status="in-progress", started_at=now WHERE id=1
    Note right of Core: started_at affecté une seule fois

    Agent->>CLI: chip task status auth-module 1 1 done
    CLI->>Core: updateTaskStatus(..., "done")
    Core->>DB: UPDATE tasks SET status="done", completed_at=now WHERE id=1

    Agent->>CLI: chip session end "Phase 1 terminée"
    CLI->>Core: endSession({ summary: "Phase 1 terminée" })
    Core->>DB: SELECT sessions WHERE status="active" ORDER BY created_at DESC LIMIT 1
    DB-->>Core: session #1
    Core->>DB: UPDATE sessions SET status="completed", completed_at=now, summary=...

    Note over Agent,DB: 5. Passage en review
    Agent->>CLI: chip feature stage auth-module review
    CLI->>Core: updateFeatureStage("auth-module", "review")
    Core->>DB: SELECT tasks WHERE feature_id="auth-module" AND status IN ("todo","in-progress")
    DB-->>Core: [] (liste vide)
    Note right of Core: Toutes les tâches terminées → OK
    Core->>DB: UPDATE features SET stage="review"

    Note over Agent,DB: 6. Revue (findings + critères)
    Agent->>CLI: chip session start auth-module review
    CLI->>Core: startSession(featureId, "review")
    Core->>DB: INSERT INTO sessions (type="review", status="active")

    Agent->>CLI: chip finding add auth-module "Validation manquante" --pass technical --severity major
    CLI->>Core: addFinding(featureId, description, { pass, severity })
    Core->>DB: INSERT INTO findings (resolution=null)

    Agent->>CLI: chip finding resolve 1 fixed --task 15
    CLI->>Core: resolveFinding(1, "fixed", taskId=15)
    Core->>DB: SELECT findings WHERE id=1
    Note right of Core: resolution == null → OK (irréversible sinon)
    Core->>DB: UPDATE findings SET resolution="fixed", task_id=15

    Agent->>CLI: chip criteria check 3 --source "revue agent"
    CLI->>Core: checkCriterion(3, { source: "revue agent" })
    Core->>DB: SELECT criteria WHERE id=3
    Note right of Core: satisfied == 0 → OK (irréversible sinon)
    Core->>DB: UPDATE criteria SET satisfied=1, satisfied_at=now, verified_by="revue agent"

    Note over Agent,DB: 7. Documentation puis livraison
    Agent->>CLI: chip feature stage auth-module documentation
    CLI->>Core: updateFeatureStage("auth-module", "documentation")
    Core->>DB: UPDATE features SET stage="documentation"

    Agent->>CLI: chip feature stage auth-module released
    CLI->>Core: updateFeatureStage("auth-module", "released")
    Core->>DB: UPDATE features SET stage="released"
    CLI-->>Agent: ✓ Feature livrée
```

---

## Règles critiques dans ce flux

| Étape | Règle |
|---|---|
| Création slug | Unicité garantie par `uniqueSlug()` — suffixe `-2`, `-3`… si collision |
| Passage à `review` | Bloqué si des tâches sont en `todo` ou `in-progress` (sauf `--force`) |
| `started_at` tâche/phase | Affecté une seule fois, lors du premier passage à `in-progress` |
| `completed_at` tâche/phase | Affecté à chaque passage à `done` (peut être écrasé) |
| Résolution finding | Irréversible — erreur si déjà résolu |
| Satisfaction critère | Irréversible — erreur si déjà satisfait |
| Régression de stage | Interdite sans `--force` |

---

## Commandes `chip next` tout au long du cycle

À n'importe quel moment, `chip next <feature-id>` retourne la prochaine action recommandée. Voir [flux/diagnostic-next.md](diagnostic-next.md) pour la logique complète.
