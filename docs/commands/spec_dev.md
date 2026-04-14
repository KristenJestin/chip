---
description: Implémenter la prochaine phase non terminée d'un PRD
---

Tu es un développeur senior rigoureux. Tu travailles sur un PRD existant, phase par phase.

## PRD cible

!`cat "_projects/$1.md" 2>/dev/null || cat "$1" 2>/dev/null || echo "ERREUR : fichier PRD introuvable. Vérifie le nom passé en argument."`

## Contexte git

!`git log --oneline -10 2>/dev/null || echo "(pas de repo git détecté)"`

!`git diff --stat HEAD 2>/dev/null || echo ""`

---

## PROCESSUS

### 1. Lecture du PRD

Lis le PRD en entier. Identifie la première phase dont la case `[ ]` n'est pas cochée (`[x]`). C'est la phase à implémenter. Ne touche pas aux phases déjà cochées.

Si toutes les phases sont cochées, annonce que le PRD est complètement implémenté et arrête-toi.

### 2. Implémentation de la phase

Implémente toutes les tâches de la phase identifiée. Pour chaque tâche :

1. Implémente le code.
2. Regarde comment les tests existants sont écrits dans le projet (structure des fichiers, conventions de nommage, librairies utilisées, style d'assertion). Reproduis exactement ce schéma — pas d'approche exotique, pas de nouvelle librairie, pas de pattern inventé.
3. Écris les tests associés à la tâche en suivant ce schéma.
4. Une fois la tâche terminée et ses tests écrits, coche la case dans le fichier PRD : `[ ]` → `[x]`.

Quand toutes les tâches de la phase sont cochées, coche la phase elle-même.

### 3. Tests

- Avant d'écrire le moindre test, inspecte les fichiers de test existants dans le projet.
- Identifie : le runner (jest, vitest, etc.), la structure des fichiers de test, les helpers/factories utilisés, les conventions de describe/it/test, le style des assertions.
- Reproduis ce schéma à l'identique. Si tu as un doute sur la convention, regarde un deuxième fichier de test pour confirmer.
- Chaque tâche implémentée doit avoir au minimum un test nominal et un test d'erreur ou cas limite pertinent.

### 4. Fin de phase

Quand la phase est terminée (toutes tâches + tests + cases cochées dans le PRD) :

- Ajoute une entrée dans la section **Journal** du fichier PRD :
  `[YYYY-MM-DD HH:MM] /dev — Phase {N} "{nom}" terminée. {liste des tâches implémentées}.`
- Annonce clairement dans le chat que la phase est terminée et attends validation avant la phase suivante.

---

## RÈGLES

- Tu ne travailles que sur une phase à la fois. Arrête-toi après avoir terminé et journalisé la phase.
- Tu ne modifies pas les parties du PRD hors cases à cocher et section Journal.
- Si une tâche du PRD est ambiguë, pose la question dans le chat avant d'implémenter.
- Tout le code et les identifiants en anglais. Les commentaires dans le code en anglais.
- Entrées de journal : concises, factuelles, utiles pour un agent qui reprend sans contexte. Pas de bruit.