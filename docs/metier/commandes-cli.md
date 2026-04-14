# Référence des commandes CLI

> Implémentée dans `src/cli/`. Point d'entrée : `src/cli/index.ts`.  
> Binaire : `chip` (défini dans `package.json` → `dist/index.js`).

---

## `chip init`

```
chip init [--provider <provider>] [--no-commands]
```

Initialise le répertoire `.chip/` dans le répertoire courant et installe les fichiers de commandes du provider.

| Option | Comportement |
|---|---|
| *(aucune)* | Initialise la DB et installe tous les providers supportés (actuellement : `opencode`) |
| `--provider opencode` | Installe uniquement le provider `opencode` |
| `--no-commands` | Initialise uniquement la DB, sans copier les fichiers de commandes |

**Provider `opencode` :** copie les fichiers `.md` de `src/templates/opencode/` vers `.opencode/commands/` dans le répertoire courant. Les fichiers existants sont écrasés.

---

## `chip feature`

### `chip feature create <title> [description]`

Crée une nouvelle feature. L'ID (slug kebab-case) est auto-généré depuis le titre.

```bash
chip feature create "Auth Module" "Gestion de l'authentification"
```

### `chip feature list`

Affiche un tableau de toutes les features (ID, titre, statut).

### `chip feature status <feature-id>`

Affiche l'état complet d'une feature : header, phases avec tâches imbriquées, critères, findings, logs récents.

### `chip feature export <feature-id> [-o, --output <fichier>]`

Génère un document Markdown complet de la feature.
- Sans `-o` : sortie sur stdout.
- Avec `-o <fichier>` : écrit dans le fichier spécifié.

### `chip feature stage <feature-id> <stage> [--force]`

Fait avancer (ou reculer avec `--force`) le pipeline de la feature.

Valeurs de `stage` : `planning`, `development`, `review`, `documentation`, `released`

```bash
chip feature stage auth-module development
chip feature stage auth-module planning --force   # régression autorisée
```

---

## `chip phase`

### `chip phase add <feature-id> <title> [description]`

Ajoute une phase à la feature. L'ordre est calculé automatiquement (incrément).

### `chip phase status <feature-id> <phase-id> <status>`

Met à jour le statut d'une phase.

Valeurs : `todo`, `in-progress`, `review`, `done`

```bash
chip phase status auth-module 1 in-progress
```

---

## `chip task`

### `chip task add <feature-id> <phase-id> <title> [description] [--type <type>] [--parent <task-id>] [--blocked-by <task-id>]`

Ajoute une tâche à une phase.

| Option | Valeurs | Défaut |
|---|---|---|
| `--type` | `feature`, `fix`, `docs`, `test` | `feature` |
| `--parent` | ID d'une tâche parente (sous-tâche) | *(aucun)* |
| `--blocked-by` | ID d'une tâche bloquante (la nouvelle tâche ne démarrera que lorsque celle-ci sera `done`) | *(aucun)* |

```bash
chip task add auth-module 1 "Écrire les tests unitaires" --type test
chip task add auth-module 1 "Sous-tâche" --parent 3
chip task add auth-module 1 "Déployer en staging" --blocked-by 5
```

### `chip task status <feature-id> <phase-id> <task-id> <status>`

Met à jour le statut d'une tâche.

Valeurs : `todo`, `in-progress`, `done`

> **Note :** le statut `"review"` a été supprimé des tâches. Si la tâche est bloquée par des dépendances non terminées ou par la phase précédente (non entièrement `done`), la mise à jour échoue avec un message explicite listant les bloqueurs. La commande ne propose pas d'option `--force` : il convient de demander à l'utilisateur comment procéder.

---

## `chip task dep`

Sous-commandes de `task` pour gérer les dépendances de blocage. Accessibles uniquement lorsque la feature est en stage `planning`.

### `chip task dep add <feature-id> <task-id> <blocking-task-id>`

Bloque `task-id` jusqu'à ce que `blocking-task-id` soit à l'état `done`.

```bash
chip task dep add auth-module 7 4   # la tâche 7 est bloquée par la tâche 4
```

**Règles :**
- Les deux tâches doivent appartenir à la même feature.
- Une tâche ne peut pas dépendre d'elle-même.
- Les cycles sont détectés (DFS) et rejetés avant l'insertion.
- La paire `(task_id, blocking_task_id)` doit être unique.

### `chip task dep remove <feature-id> <task-id> <blocking-task-id>`

Supprime la dépendance de blocage entre les deux tâches.

```bash
chip task dep remove auth-module 7 4
```

### `chip task dep list <feature-id> <task-id>`

Affiche les dépendances d'une tâche :
- **Blocked by** : tâches qui doivent être terminées avant elle.
- **Blocks** : tâches qu'elle est en train de bloquer.

```bash
chip task dep list auth-module 7
```

---

## `chip log`

### `chip log add <feature-id> <message> [--phase <id>] [--task <id>] [--source <cmd>]`

Ajoute une entrée de journal à la feature.

```bash
chip log add auth-module "Implémentation terminée" --phase 1 --source chip_dev
```

### `chip log list <feature-id> [--phase <id>] [--task <id>]`

Liste les logs de la feature, avec filtrage optionnel par phase ou tâche.

---

## `chip session`

### `chip session start <feature-id> <type> [--phase <id>]`

Démarre une session de travail.

Valeurs de `type` : `prd`, `dev`, `review`, `docs`

```bash
chip session start auth-module dev --phase 1
```

### `chip session end [session-id] [summary] [--feature <feature-id>]`

Termine une session active.

- Sans argument : termine la session active la plus récente.
- Avec `--feature` : termine la session active la plus récente de cette feature.
- Avec `session-id` en argument positionnel : termine cette session précise.
- `summary` (argument positionnel optionnel) : résumé textuel de la session.

### `chip session list <feature-id> [--type <type>] [--status <status>]`

Liste les sessions d'une feature, avec filtrage optionnel.

### `chip session current [feature-id]`

Affiche la session active la plus récente, optionnellement scopée à une feature.

---

## `chip finding`

### `chip finding add <feature-id> <description> --pass <pass> --severity <sev> [--category <cat>] [--session <id>]`

Enregistre un finding de revue. `--pass` et `--severity` sont **obligatoires**.

```bash
chip finding add auth-module "Validation JWT manquante" \
  --pass technical --severity critical --category security --session 2
```

### `chip finding list <feature-id> [--unresolved] [--pass <pass>] [--severity <sev>]`

Liste les findings. `--unresolved` filtre sur les findings sans résolution.

### `chip finding resolve <finding-id> <resolution> [--task <task-id>]`

Résout un finding.

Valeurs de `resolution` : `fixed`, `wontfix`, `deferred`

```bash
chip finding resolve 3 fixed --task 7
```

---

## `chip criteria`

### `chip criteria add <feature-id> <description> [--phase <id>]`

Ajoute un critère d'acceptation à la feature.

### `chip criteria check <criterion-id> [--source <source>]`

Marque un critère comme satisfait. Opération irréversible.

```bash
chip criteria check 5 --source "revue manuelle"
```

### `chip criteria list <feature-id> [--pending] [--phase <id>]`

Liste les critères. `--pending` filtre sur les critères non encore satisfaits.

---

## `chip next <feature-id>`

Affiche un diagnostic actionnable de l'état de la feature :
- Stage courant
- Prochaine action recommandée
- Session active (si présente)
- Tâches en attente
- Findings non résolus
- Critères non satisfaits

Voir [flux/diagnostic-next.md](../flux/diagnostic-next.md) pour la logique de décision.

---

## `chip batch <feature-id> [--json <fichier>]`

Crée des phases et des tâches en masse depuis un fichier JSON (ou stdin). Toutes les insertions sont effectuées dans une **transaction unique** : si une erreur survient, rien n'est persisté.

```bash
chip batch auth-module --json phases.json
echo '{"phases":[...]}' | chip batch auth-module
```

Format JSON attendu (avec dépendances intra-batch) :

```json
{
  "phases": [
    {
      "title": "Phase 1",
      "description": "...",
      "tasks": [
        { "title": "Tâche A", "type": "feature", "ref": "task-a" },
        { "title": "Tâche B", "type": "test",    "ref": "task-b", "blockedBy": ["task-a"] }
      ]
    }
  ]
}
```

| Champ tâche | Rôle |
|---|---|
| `ref` | Clé de référence unique dans le batch (string, optionnel) |
| `blockedBy` | Liste de `ref` des tâches bloquantes au sein du même batch (optionnel) |

**Règles de validation avant insertion :**
- Les `ref` doivent être uniques dans le payload.
- Les `ref` référencés dans `blockedBy` doivent être définis dans le payload.
- Les cycles dans le graphe de dépendances intra-batch sont rejetés.

**Résultat :** `{ phasesCreated, tasksCreated, depsCreated }`

---

## `chip event`

### `chip event add <feature-id> --kind <kind> --data <json> [--phase <id>] [--task <id>] [--finding <id>] [--session <id>] [--source <cmd>]`

Enregistre un événement typé sur la feature. `--kind` et `--data` sont **obligatoires**.

| Option | Valeurs |
|---|---|
| `--kind` | `task_result`, `correction`, `decision`, `phase_summary` |
| `--data` | Chaîne JSON valide, validée contre le schéma du `kind` |
| `--phase` | ID de phase (optionnel) |
| `--task` | ID de tâche (optionnel) |
| `--finding` | ID de finding (optionnel) |
| `--session` | ID de session (optionnel) |
| `--source` | Identifiant de la commande ou de l'agent émetteur (optionnel) |

Le payload `--data` est validé par Zod avant insertion. Un `kind` invalide ou un payload non conforme au schéma du `kind` retourne une erreur explicite.

```bash
chip event add my-feature \
  --kind task_result \
  --data '{"files":{"created":["src/foo.ts"],"modified":[],"deleted":[]},"decisions":[],"issues":[],"test_result":{"passed":true,"count":12}}' \
  --task 5 --source chip_dev_subagent
```

### `chip event list <feature-id> [--kind <kind>] [--task <id>] [--finding <id>] [--session <id>]`

Liste les événements d'une feature, avec filtrage optionnel.

```bash
chip event list my-feature --kind task_result --task 5
```

---

## `chip summary <feature-id>`

Affiche un tableau de bord compact :
- Progression globale (% de tâches `done`)
- Répartition des tâches par statut et par type
- Findings résolus / non résolus
- Critères satisfaits / total
- Nombre de sessions
