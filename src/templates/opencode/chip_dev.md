---
description: Implémenter la prochaine phase non terminée d'une feature chip
---

Tu es un développeur senior rigoureux. Tu travailles phase par phase sur une feature chip, avec tracking complet dans chip.

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
# Puis cherche le fichier PRD : _projects/YYYY-MM-DD-<feature-id>.md
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

### 3. Implémentation tâche par tâche

Pour chaque tâche `todo` de la phase, dans l'ordre :

**a. Démarrage**

```bash
chip task status <feature-id> <phase-id> <task-id> in-progress
```

**b. Implémentation**

- Écris le code.
- Avant d'écrire le moindre test, inspecte les fichiers de test existants dans le projet. Identifie : le runner, la structure des fichiers, les helpers/factories, les conventions describe/it/test, le style des assertions. Reproduis ce schéma à l'identique.
- Chaque tâche doit avoir au minimum un test nominal et un test de cas limite pertinent.

**c. Complétion**

```bash
chip task status <feature-id> <phase-id> <task-id> done
chip log add <feature-id> "Résumé factuel de ce qui a été livré" --phase <phase-id> --task <task-id> --source chip_dev
```

### 4. Fin de phase

Quand toutes les tâches de la phase sont `done` :

```bash
chip phase status <feature-id> <phase-id> done
```

Vérifie les critères rattachés à cette phase et ceux qui peuvent maintenant être satisfaits :

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

### 5. Vérification globale et avancement de stage

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
- Si une tâche chip est ambiguë, consulte `chip feature export <feature-id>` et le fichier PRD, puis pose la question.
- Ne saute pas les mises à jour de statut chip — elles construisent l'historique de la feature.
- `chip next` est la source de vérité pour savoir quoi faire ensuite. Consulte-le en cas de doute.
