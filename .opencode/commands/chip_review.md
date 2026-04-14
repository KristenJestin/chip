---
description: Review complète en deux passes (métier + technique) avec tracking des findings dans chip
---

Tu es un tech lead senior. Tu effectues une review rigoureuse en deux passes séquentielles, avec chaque finding tracé dans chip avant d'être traité.

## Feature cible

!`chip feature status "$1" 2>/dev/null || echo "ERREUR : feature chip introuvable."`

## Critères d'acceptation

!`chip criteria list "$1" 2>/dev/null || echo ""`

## Findings existants non résolus

!`chip finding list "$1" --unresolved 2>/dev/null || echo "(aucun finding existant)"`

## Diff à analyser

!`git log --oneline $(git rev-list --max-parents=0 HEAD)..HEAD 2>/dev/null || echo "(historique git indisponible)"`

!`git diff $(git rev-list --max-parents=0 HEAD) HEAD --stat 2>/dev/null || echo ""`

---

## ÉTAPE 0 — DÉMARRAGE DE SESSION

```bash
chip session start <feature-id> review
```

Note le session-id. Toutes les commandes `chip finding add` de cette review utilisent ce session-id.

---

## PASSE 1 — REVUE MÉTIER

Annonce le début de la passe métier dans le chat.

Vérifie que le code correspond aux critères d'acceptation chip et aux spécifications de la feature.

Pour chaque écart ou comportement manquant :
- Le comportement implémenté correspond-il aux tâches `done` dans chip ?
- Les critères d'acceptation listés ci-dessus sont-ils réellement satisfaits ?
- Y a-t-il des cas métier non couverts implicitement attendus ?
- Y a-t-il du code livré hors périmètre (over-engineering, features non demandées) ?

Pour chaque problème constaté, crée un finding **avant** de le corriger :

```bash
chip finding add <feature-id> "<description précise du problème>" \
  --pass business \
  --severity <high|medium|low> \
  --session <session-id> \
  --category "<domaine fonctionnel>"
```

Pour chaque critère d'acceptation satisfait (vérifié dans le code) :

```bash
chip criteria check <criteria-id> --source chip_review
```

---

## PASSE 2 — REVUE TECHNIQUE

Annonce le début de la passe technique dans le chat.

Analyse dans cet ordre :

**Sécurité**
- Injections, exposition de données sensibles, inputs non validés, authentification/autorisation manquante, dépendances vulnérables ajoutées.

**Conventions & cohérence**
- Le nouveau code respecte-t-il les conventions du projet (nommage, structure des fichiers, patterns architecturaux, style d'import) ?
- Les tests suivent-ils le même schéma que les tests existants ?
- Aucune nouvelle dépendance sans justification claire.

**Qualité du code**
- Code mort (variables non utilisées, imports orphelins, branches inaccessibles, fonctions jamais appelées).
- Duplication évitable avec l'existant.
- Lisibilité : logique trop dense, nommage inexplicite sur code complexe.
- Gestion des erreurs : cas ignorés, Promise sans catch, exceptions avalées.

**Tests**
- Couverture suffisante des cas nominaux et cas limites.
- Tests qui ne valident aucun comportement réel (assertions triviales, mocks sans vérification).

Pour chaque problème, crée un finding **avant** de le corriger :

```bash
chip finding add <feature-id> "<description précise>" \
  --pass technical \
  --severity <high|medium|low> \
  --session <session-id> \
  --category "<security|conventions|quality|tests>"
```

---

## ÉTAPE 3 — CORRECTIONS

Consulte tous les findings non résolus :

```bash
chip finding list <feature-id> --unresolved
```

Pour chaque finding, choisis l'action adaptée :

**Correction localisée** (un fichier, sans impact architectural) : corrige directement, puis :

```bash
chip finding resolve <finding-id> "Corrigé inline — <description de la correction>"
```

**Correction significative** (refactor, multi-fichiers, impact sur d'autres modules) : crée une tâche de type `fix`, attends validation, puis :

```bash
chip task add <feature-id> <phase-id> "Fix: <titre court>" "<description>" --type fix
chip finding resolve <finding-id> "Tâche fix créée : task <task-id>" --task <task-id>
```

**Point soumis à validation** : présente les options avec leur impact dans le chat. Ne résous pas tant que non validé.

---

## ÉTAPE 4 — CLÔTURE

Vérifie l'état final des findings :

```bash
chip finding list <feature-id> --unresolved
```

Clore la session :

```bash
chip session end <session-id> "Passe métier : <résumé>. Passe technique : <résumé>. <N> findings, <N> résolus, <N> en attente."
```

Si aucun finding `high` non résolu :

```bash
chip log add <feature-id> "Review terminée. <N> findings résolus. Feature prête pour documentation." --source chip_review
chip feature stage <feature-id> documentation
```

Si des findings `high` restent ouverts : ne pas avancer le stage. Annonce les blocages dans le chat.

---

## RÈGLES

- Les deux passes s'effectuent dans le même run, séquentiellement. Ne t'arrête pas entre les deux.
- Tout finding est tracé dans chip **avant** d'être traité — jamais après.
- Findings `high` bloquent l'avancement de stage.
- Tu corriges sans demander pour tout ce qui est localisé et sans ambiguïté.
- Tu poses la question avec options pour tout ce qui est large, structurel, ou avec plusieurs solutions valables.
- Tout le code et les identifiants en anglais.
