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

### `chip task add <feature-id> <phase-id> <title> [description] [--type <type>] [--parent <task-id>]`

Ajoute une tâche à une phase.

| Option | Valeurs | Défaut |
|---|---|---|
| `--type` | `feature`, `fix`, `docs`, `test` | `feature` |
| `--parent` | ID d'une tâche parente (sous-tâche) | *(aucun)* |

```bash
chip task add auth-module 1 "Écrire les tests unitaires" --type test
chip task add auth-module 1 "Sous-tâche" --parent 3
```

### `chip task status <feature-id> <phase-id> <task-id> <status>`

Met à jour le statut d'une tâche.

Valeurs : `todo`, `in-progress`, `review`, `done`

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

Crée des phases et des tâches en masse depuis un fichier JSON (ou stdin).

```bash
chip batch auth-module --json phases.json
echo '{"phases":[...]}' | chip batch auth-module
```

Format JSON attendu :

```json
{
  "phases": [
    {
      "title": "Phase 1",
      "description": "...",
      "tasks": [
        { "title": "Tâche 1", "type": "feature" },
        { "title": "Tâche 2", "type": "test" }
      ]
    }
  ]
}
```

---

## `chip summary <feature-id>`

Affiche un tableau de bord compact :
- Progression globale (% de tâches `done`)
- Répartition des tâches par statut et par type
- Findings résolus / non résolus
- Critères satisfaits / total
- Nombre de sessions
