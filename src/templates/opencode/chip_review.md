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

## ÉTAPE 0 — PREFLIGHT

**Lancer les tests avant toute analyse :**

```bash
bun run test
```

Note le résultat (succès / nombre d'échecs). Des tests cassés = finding `critical` automatique.

**Évaluer l'étendue du diff :**

```bash
git diff --stat
```

**Edge cases :**
- **Diff vide** : informer l'utilisateur, demander s'il veut review les staged changes ou un commit range précis.
- **Diff > 500 lignes** : résumer par fichier en premier, puis analyser par module/zone fonctionnelle.

**Démarrer la session review :**

```bash
chip session start <feature-id> review
```

Note le session-id. Toutes les commandes `chip finding add` de cette review utilisent ce session-id.

**Détecter le mode de correction :**

```bash
chip session current <feature-id>
```

- Si une session dev active existe : **mode auto-correction** — les findings seront corrigés directement (code produit par un agent).
- Si aucune session active : **mode confirmation** — les findings seront présentés groupés avant toute modification (code écrit manuellement).

---

## Niveaux de sévérité

| Sévérité | Description | Action |
|----------|-------------|--------|
| `critical` | Sécurité, perte de données, bug de correction | Bloque l'avancement de stage — correction obligatoire |
| `major` | Erreur logique, violation architecturale, régression, absence de tests sur logique risquée | Doit être corrigé dans cette session |
| `minor` | Code smell, maintenabilité, convention | À corriger dans cette session ou tâche de suivi |
| `suggestion` | Style, nommage, amélioration optionnelle | Non bloquant |

---

## PASSE 1 — REVUE MÉTIER

Annonce le début de la passe métier dans le chat.

Vérifie que le code correspond aux critères d'acceptation chip et aux spécifications de la feature.

Pour chaque écart ou comportement manquant :
- Le comportement implémenté correspond-il aux tâches `done` dans chip ?
- Les critères d'acceptation listés ci-dessus sont-ils réellement satisfaits ?
- Y a-t-il des cas métier non couverts implicitement attendus ?
- Y a-t-il du code livré hors périmètre (over-engineering, features non demandées) ?

Pour chaque problème constaté, crée un finding **avant** de le corriger. Inclure `[file:line]` dans la description pour précision :

```bash
chip finding add <feature-id> "[file:line] <description précise du problème>" \
  --pass business \
  --severity <critical|major|minor|suggestion> \
  --session <session-id> \
  --category "<security|convention|quality|test|scope|correctness>"
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
- Questions de bords : que se passe-t-il en cas d'échec ? Que faire si vide/null ? Quelles sont les limites numériques ?

**Tests**
- Couverture suffisante des cas nominaux et cas limites — verdict : `SUFFICIENT / PARTIAL / MISSING`.
- Tests qui ne valident aucun comportement réel (assertions triviales, mocks sans vérification).
- Absence de tests sur logique risquée = finding `major`, catégorie `test`.

Pour chaque problème, crée un finding **avant** de le corriger. Inclure `[file:line]` dans la description :

```bash
chip finding add <feature-id> "[file:line] <description précise>" \
  --pass technical \
  --severity <critical|major|minor|suggestion> \
  --session <session-id> \
  --category "<security|convention|quality|test|scope|correctness>"
```

---

## ÉTAPE 3 — CORRECTIONS

Consulte tous les findings non résolus :

```bash
chip finding list <feature-id> --unresolved
```

**Détermine le mode de correction selon l'étape 0 :**

### Mode auto-correction (session dev active — code d'agent)

Pour chaque finding, choisis l'action adaptée :

**Correction localisée** (un fichier, sans impact architectural) : corrige directement, puis :

```bash
chip finding resolve <finding-id> "Corrigé inline — <description de la correction>"
```

**Correction significative** (refactor, multi-fichiers, impact sur d'autres modules) : crée une tâche de type `fix`, puis :

```bash
chip task add <feature-id> <phase-id> "Fix: <titre court>" "<description>" --type fix
chip finding resolve <finding-id> "Tâche fix créée : task <task-id>" --task <task-id>
```

**Point soumis à validation** : présente les options avec leur impact dans le chat. Ne résous pas tant que non validé.

### Mode confirmation (aucune session active — code manuel)

Présente tous les findings groupés par sévérité dans le chat :

```
## Résultat de la review

N findings (critical: _, major: _, minor: _, suggestion: _)

### Critical
- [id] [file:line] description

### Major
- [id] [file:line] description

### Minor / Suggestion
- [id] [file:line] description

---
Comment souhaitez-vous procéder ?

1. Tout corriger
2. Critical + Major uniquement
3. Items spécifiques (préciser les IDs)
4. Aucune correction — review terminée
```

Attends la confirmation utilisateur avant toute modification. Applique ensuite le choix.

---

## ÉTAPE 4 — CLÔTURE

Vérifie l'état final des findings :

```bash
chip finding list <feature-id> --unresolved
```

**Review propre (aucun finding) :** si aucun problème trouvé, déclare explicitement dans le chat :
- Ce qui a été vérifié (passe métier, passe technique, zones couvertes)
- Le verdict de couverture de tests : `SUFFICIENT / PARTIAL / MISSING`
- Les zones non couvertes par cette review (ex. "migrations non vérifiées")
- Les risques résiduels ou tests de suivi recommandés

Clore la session :

```bash
chip session end <session-id> "Passe métier : <résumé>. Passe technique : <résumé>. <N> findings, <N> résolus, <N> en attente."
```

Si aucun finding `critical` non résolu :

```bash
chip log add <feature-id> "Review terminée. <N> findings résolus. Feature prête pour documentation." --source chip_review
chip feature stage <feature-id> documentation
```

Si des findings `critical` restent ouverts : ne pas avancer le stage. Annonce les blocages dans le chat.

---

## RÈGLES

- Les deux passes s'effectuent dans le même run, séquentiellement. Ne t'arrête pas entre les deux.
- Tout finding est tracé dans chip **avant** d'être traité — jamais après.
- Findings `critical` bloquent l'avancement de stage.
- Inclure `[file:line]` dans chaque description de finding pour référence précise.
- Mode auto-correction si session dev active (code d'agent) ; mode confirmation si code manuel.
- Tout le code et les identifiants en anglais.
