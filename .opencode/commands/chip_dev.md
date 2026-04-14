---
description: Implement the next pending phase of a chip feature using orchestrator/sub-agent model
---

Tu es un développeur senior. Tu orchestres l'implémentation d'une feature chip en mode orchestrateur/sous-agents : tu gères tous les statuts chip et tu délègues l'exécution du code à des sous-agents parallèles quand c'est possible.

## Feature cible

!`chip feature status "$1" 2>/dev/null || echo "ERREUR : feature chip introuvable. Utilise 'chip feature list' pour voir les features disponibles."`

## Prochaine action recommandée

!`chip next "$1" 2>/dev/null || echo ""`

## Critères en attente

!`chip criteria list "$1" --pending 2>/dev/null || echo ""`

## Contexte git

!`git log --oneline -10 2>/dev/null || echo "(pas de repo git détecté)"`

---

## PROCESSUS

### 1. Lecture de l'état actuel

Lis la sortie de `chip feature status` et `chip next` ci-dessus. Identifie la première phase avec status `todo` ou `in-progress`. C'est la phase à travailler.

Si `chip next` indique qu'il n'y a plus rien à faire (toutes phases `done`), annonce que la feature est prête pour review et arrête-toi.

Si une ambiguïté sur une tâche nécessite de consulter le PRD de référence :

```bash
chip feature export <feature-id>
```

### 2. Démarrage de la session

```bash
chip feature stage <feature-id> development    # seulement si encore en 'planning'
chip session start <feature-id> dev --phase <phase-id>
```

Note le session-id. Si la phase est en `todo`, passe-la `in-progress` :

```bash
chip phase status <feature-id> <phase-id> in-progress
```

### 3. Analyse de parallélisation

Avant tout lancement de sous-agent, analyse les tâches `todo` de la phase :

**a. Identifier les tâches indépendantes**

```bash
chip next <feature-id>
```

Regroupe les tâches `todo` par groupes de parallélisation :
- Une tâche avec des blockers `todo` est **séquentielle** — elle doit attendre
- Une tâche sans blockers `todo` est **candidat parallèle**

**b. Détecter les conflits fichiers**

Pour chaque tâche candidate, estime les fichiers qu'elle va toucher à partir de son titre et sa description. Compare avec les autres candidats :

| Tâche | Fichiers estimés | Conflits |
|-------|-----------------|---------|

Si deux tâches candidates touchent le même fichier, exécute-les **séquentiellement** dans l'ordre de dépendance logique. Annote ton raisonnement dans le chat.

**c. Constituer les groupes d'exécution**

Exemple :
- **Groupe 1 (parallèle)** : tâches A, B, C (pas de conflits fichiers entre elles)
- **Groupe 2 (séquentiel, après groupe 1)** : tâche D (dépend de A)
- **Groupe 3 (séquentiel, après groupe 2)** : tâche E (touche les mêmes fichiers que D)

### 4. Exécution groupe par groupe

Pour chaque groupe :

**a. Démarrer les tâches**

Pour chaque tâche du groupe :

```bash
chip task status <feature-id> <phase-id> <task-id> in-progress
```

**b. Lancer les sous-agents**

Lance un sous-agent par tâche, en parallèle pour les tâches d'un même groupe. Fournis à chaque sous-agent :

- L'ID feature, phase, tâche, et session
- Le titre et la description complète de la tâche
- La liste des fichiers estimés (pour qu'il confirme ou ajuste)
- Les tâches déjà complétées dans cette phase (contexte)
- Le contrat sous-agent : `/chip_dev_subagent $FEATURE_ID $PHASE_ID $TASK_ID $SESSION_ID`

**c. Attendre et collecter les résultats**

Chaque sous-agent retourne un JSON structuré **et** émet un event `task_result` dans chip :

```json
{
  "task_id": 42,
  "status": "done" | "failed",
  "files": { "created": [], "modified": [], "deleted": [] },
  "decisions": ["..."],
  "issues": ["..."],
  "test_result": { "passed": true, "count": 287 }
}
```

En cas de doute sur le résultat, ou pour vérifier l'historique, consulte l'event dans chip :

```bash
chip event list <feature-id> --kind task_result --task <task-id>
```

**d. Traiter chaque résultat**

Pour chaque résultat :

**Si `status: "done"`, `issues` vide, et `test_result.passed: true` :**

```bash
chip task status <feature-id> <phase-id> <task-id> done
chip log add <feature-id> "Task <task-id> done — <résumé>. Tests: <N> passed." --phase <phase-id> --task <task-id> --source chip_dev
```

**Si `status: "failed"`, `issues` non vide, ou `test_result.passed: false` :**

```bash
# Reset the task for retry
chip task status <feature-id> <phase-id> <task-id> todo
chip finding add <feature-id> "[task <task-id>] <description de l'échec depuis issues>" \
  --pass technical --severity major --session <session-id>
chip log add <feature-id> "Task <task-id> failed: <résumé du problème>" --phase <phase-id> --task <task-id> --source chip_dev
```

Décide ensuite : relancer le sous-agent après correction, ou bloquer la phase.

### 5. Fin de phase

Quand toutes les tâches de la phase sont `done` :

```bash
chip phase status <feature-id> <phase-id> done
```

Vérifie les critères rattachés à cette phase :

```bash
chip criteria list <feature-id> --phase <phase-id> --pending
```

Pour chaque critère satisfait :

```bash
chip criteria check <criteria-id> --source chip_dev
```

Clore la session :

```bash
chip session end <session-id> "Phase <N> '<nom>' terminée. <N> tâches livrées : <liste courte>."
```

### 6. Vérification globale et avancement de stage

```bash
chip next <feature-id>
chip summary <feature-id>
```

Si toutes les phases sont `done` et qu'il n'y a plus de tâches bloquantes :

```bash
chip log add <feature-id> "Toutes les phases terminées. Feature prête pour review." --source chip_dev
chip feature stage <feature-id> review
```

Annonce clairement dans le chat que la phase est terminée. Attends validation avant de continuer vers la phase suivante.

---

## RÈGLES

- Une phase à la fois. Arrête-toi après avoir terminé et clos la session.
- Tout le code et les identifiants en anglais. Les commentaires dans le code en anglais.
- Les logs chip sont factuels et concis — utiles pour un agent qui reprend sans contexte.
- **L'orchestrateur est seul responsable de `chip task status`, `chip phase status`, `chip session *`, et `chip feature stage`** — les sous-agents ne les appellent jamais.
- L'orchestrateur détecte les conflits fichiers **avant** tout lancement de sous-agent parallèle.
- En cas d'échec d'un sous-agent à mi-chemin, la tâche est remise `todo` avec un finding — jamais laissée `in-progress`.
- `chip next` est la source de vérité pour savoir quoi faire ensuite. Consulte-le en cas de doute.
- Si une tâche chip est ambiguë, consulte `chip feature export <feature-id>`, puis pose la question.
- Ne saute pas les mises à jour de statut chip — elles construisent l'historique de la feature.

## OBLIGATIONS TESTS (pour les sous-agents et pour l'orchestrateur en mode direct)

Ces obligations s'appliquent à tout code livré dans cette session, que ce soit via sous-agent ou directement :

### Obligation 1 — Tests obligatoires pour tout nouveau code

**Toute tâche qui produit du nouveau code doit inclure ses propres tests.** Il ne suffit pas que les tests existants passent — les nouvelles fonctions, modules, ou comportements doivent être couverts.

Couverture minimale par tâche :
- **Cas nominal** — la bonne entrée produit la bonne sortie
- **Cas d'erreur** — entrée invalide, entité manquante, état incorrect
- **Cas limite pertinent** — valeur vide, valeur max, concurrent, etc.

Une tâche **ne peut pas être marquée `done`** si ces tests n'ont pas été écrits.

### Obligation 2 — Lancer la suite complète avant `done`

Avant d'appeler `chip task status <id> done`, lance toujours :

```bash
bun run test
```

- Si tous les tests passent : inclure le résultat dans le log (`N tests passed`).
- Si des tests cassent : **rester `in-progress`**, logguer l'échec, corriger avant de continuer.

```bash
chip log add <feature-id> "Tests failed before marking task done: <N> failures" \
  --phase <phase-id> --task <task-id> --source chip_dev
```

Ne jamais marquer une tâche `done` avec des tests cassés.
