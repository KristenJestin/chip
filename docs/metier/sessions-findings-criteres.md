# Sessions, findings et critères — règles métier

> Logique implémentée dans `src/core/session.ts`, `src/core/finding.ts`, `src/core/criterion.ts`.

---

## Sessions

Une session représente une période de travail typée, associée à une feature.

### Types de session

| Type | Usage attendu |
|---|---|
| `prd` | Rédaction du Product Requirements Document |
| `dev` | Développement (implémentation) |
| `review` | Revue (métier + technique) |
| `docs` | Mise à jour de la documentation |

### Statuts de session

| Statut | Signification |
|---|---|
| `active` | Session en cours |
| `completed` | Session terminée normalement |
| `aborted` | Session interrompue |

### Règles `startSession()`

- Insère directement avec `status: "active"`.
- **Aucune contrainte sur le nombre de sessions actives simultanées** : plusieurs sessions peuvent être actives en même temps pour la même feature.

### Règles `endSession()`

Résolution de la session à clore, par ordre de priorité :

1. Par `sessionId` explicite, si fourni.
2. Par `featureId` → session `active` la plus récente de cette feature.
3. Sans argument → session `active` la plus récente toutes features confondues.

Contraintes :
- La session trouvée doit être en statut `"active"` — sinon, erreur.
- Met `status: "completed"`, affecte `completedAt = nowUnix()`, stocke le résumé éventuel.

> **Note :** Il n'est pas possible de clore une session déjà `completed` ou `aborted` via `endSession()`. Le statut `"aborted"` n'est pas affecté par la CLI — il est réservé à un usage programmatique.

### Règles `getCurrentSession()`

- Cherche la session `active` la plus récente.
- Optionnellement scopée à une feature via `featureId`.
- Lance une erreur si aucune session active n'est trouvée.

---

## Findings (observations de revue)

Un finding est une observation relevée lors d'une session de revue. Il porte une passe (métier ou technique), une sévérité et une catégorie optionnelle.

### Classification

| Dimension | Valeurs |
|---|---|
| `pass` | `"business"` (passe métier) ou `"technical"` (passe technique) |
| `severity` | `"critical"` > `"major"` > `"minor"` > `"suggestion"` |
| `category` | `"security"`, `"convention"`, `"quality"`, `"test"`, `"scope"`, `"correctness"` (optionnel) |

### Règles `addFinding()`

- Insère avec `resolution: null` et `taskId: null`.
- Lie optionnellement une session via `sessionId`.

### Règles `resolveFinding()`

- Erreur si le finding n'existe pas.
- **Erreur si déjà résolu :** `"Finding <id> is already resolved as <resolution>"`. La résolution est irréversible.
- Met à jour `resolution` (obligatoire) et optionnellement `taskId` — pour lier la tâche de correction créée en réponse au finding.

### Valeurs de résolution

| Valeur | Signification |
|---|---|
| `"fixed"` | Corrigé |
| `"wontfix"` | Décision de ne pas corriger |
| `"deferred"` | Reporté à plus tard |

### Filtrage `listFindings()`

Les findings sont récupérés depuis la DB par `featureId`, puis filtrés en mémoire :
- `unresolved: true` → exclut les findings dont `resolution` n'est pas `null`.
- `pass` → filtre par passe.
- `severity` → filtre par sévérité.

---

## Critères d'acceptation

Un critère d'acceptation décrit une condition vérifiable que la feature doit satisfaire. Il est optionnellement scopé à une phase.

### Règles `addCriterion()`

- Insère avec `satisfied: 0`, `satisfiedAt: null`, `verifiedBy: null`.

### Règles `checkCriterion()`

- Erreur si le critère n'existe pas.
- **Erreur si déjà satisfait :** `"Criterion <id> is already satisfied"`. La satisfaction est irréversible.
- Met `satisfied: 1`, `satisfiedAt: nowUnix()`, `verifiedBy: source ?? null`.

> `source` est un champ libre permettant d'identifier qui ou quoi a vérifié le critère (ex. : `"chip_docs_sync"`, `"agent"`, etc.).

### Filtrage `listCriteria()`

- `pending: true` → retourne uniquement les critères dont `satisfied === 0`.
- `phaseId` → filtre sur la phase exacte.

---

## Interaction findings ↔ tâches

Lors de la résolution d'un finding (`resolveFinding()`), on peut passer un `taskId` en option. Cela lie le finding à la tâche de correction créée pour le traiter. Ce lien est visible dans `FeatureDetails` et dans l'export Markdown.

La relation inverse n'existe pas : une tâche ne connaît pas les findings qu'elle corrige (la FK n'est que dans `findings.task_id`).
