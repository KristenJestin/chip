# Features — règles métier

> Logique implémentée dans `src/core/feature.ts`.

---

## Cycle de vie d'une feature

Une feature traverse deux axes indépendants : un **statut** (activité) et un **stage** (avancement du pipeline de livraison).

### Statut

| Valeur | Signification |
|---|---|
| `active` | Feature en cours (valeur par défaut à la création) |
| `done` | Feature terminée |
| `archived` | Feature archivée |

Le statut est libre et ne conditionne aucune autre opération.

### Stage (pipeline)

Le stage représente l'étape courante dans le pipeline de livraison. La progression est ordonnée et sa régression est protégée.

```
planning → development → review → documentation → released
```

Constante dans le code : `STAGE_ORDER = ["planning", "development", "review", "documentation", "released"]`

---

## Règles de transition de stage

Implémentées dans `updateFeatureStage()` (`src/core/feature.ts`).

### Règle 1 — Régression interdite

Passer d'un stage avancé à un stage antérieur est bloqué par défaut.

```
feature stage auth-module planning          ← erreur si le stage actuel est "development" ou plus
feature stage auth-module planning --force  ← autorisé
```

La vérification compare les positions dans `STAGE_ORDER` : si `indexOf(nouveau) < indexOf(actuel)`, c'est une régression.

### Règle 2 — Passage à `review` conditionné

Avant de passer au stage `review`, toutes les tâches de la feature doivent être en `review` ou `done`. Si des tâches sont encore en `todo` ou `in-progress`, la transition est bloquée.

```
feature stage auth-module review          ← erreur si des tâches sont en todo/in-progress
feature stage auth-module review --force  ← autorisé
```

Cette règle s'applique uniquement pour la transition vers `review`. Les autres transitions ne vérifient pas l'état des tâches.

---

## Création d'une feature

Implémentée dans `createFeature()`.

1. Validation des entrées via `CreateFeatureInput`.
2. Génération du slug : `toSlug(title)` (minuscules, sans diacritiques, tirets, max 64 chars).
3. Unicité garantie par `uniqueSlug(base, existing)` : si le slug est pris, le suffixe `-2`, `-3`… est ajouté.
4. Insertion avec `status: "active"`, `stage: "planning"`, `createdAt` et `updatedAt` à `nowUnix()`.
5. Retourne l'`id` généré (le slug).

---

## Lecture et export

### `getFeatureDetails()`

Charge en une seule requête relationnelle :
- La feature
- Ses phases avec leurs tâches (ordre croissant)
- Ses 10 derniers logs (ordre décroissant)
- Ses findings (ordre croissant)
- Ses critères (ordre croissant)

Retourne un objet `FeatureDetails`. Lance `Error("Feature not found: <id>")` si la feature n'existe pas.

### `exportFeature()`

Génère un document Markdown complet comprenant :
- En-tête (titre, description, statut, stage)
- Phases avec tâches imbriquées (cases à cocher selon le statut)
- Critères d'acceptation (cases à cocher)
- Findings groupés
- Logs récents horodatés

### `listFeatures()`

Retourne toutes les features, triées par `createdAt ASC`.

---

## Invariants

| Invariant | Détail |
|---|---|
| ID slug | Kebab-case, max 64 caractères, généré depuis le titre, unique dans la DB |
| Timestamps | Unix secondes (`Math.floor(Date.now() / 1000)`), stockés en `integer` SQLite |
| `updatedAt` | Mis à jour à chaque appel de `updateFeatureStage()` |
| Création | `status` toujours `"active"`, `stage` toujours `"planning"` |

---

## Génération de slug (`src/utils/slug.ts`)

```typescript
toSlug(title: string): string
```
1. Conversion en minuscules.
2. Normalisation NFD (décompose les caractères accentués).
3. Suppression des diacritiques (caractères U+0300–U+036F).
4. Remplacement de tous les caractères non alphanumériques par `-`.
5. Suppression des tirets en début et fin.
6. Troncature à 64 caractères.

```typescript
uniqueSlug(base: string, existing: string[]): string
```
- Si `base` n'est pas dans `existing` → retourne `base`.
- Sinon, incrémente : `base-2`, `base-3`, etc., jusqu'à trouver un slug libre.
