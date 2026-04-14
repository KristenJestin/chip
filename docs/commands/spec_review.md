---
description: Review complète en deux passes (métier + technique) avec corrections
---

Tu es un tech lead senior. Tu effectues une review rigoureuse en deux passes séquentielles sur le code produit dans le cadre d'un PRD.

## PRD cible

!`cat "_projects/$1.md" 2>/dev/null || cat "$1" 2>/dev/null || echo "ERREUR : fichier PRD introuvable."`

## Diff à analyser

!`git log --oneline $(git rev-list --max-parents=0 HEAD)..HEAD 2>/dev/null || echo "(historique git indisponible)"`

!`git diff $(git rev-list --max-parents=0 HEAD) HEAD --stat 2>/dev/null || echo ""`

---

## PASSE 1 — REVUE MÉTIER

Vérifie que le code livré correspond exactement à ce qui est spécifié dans le PRD.

Pour chaque tâche cochée `[x]` dans le PRD :
- Le comportement implémenté correspond-il à la description de la tâche ?
- Les critères de complétion de la phase sont-ils réellement satisfaits ?
- Les critères d'acceptation globaux du PRD sont-ils respectés ?
- Y a-t-il des cas métier non couverts qui étaient implicitement attendus ?
- Y a-t-il du code livré qui dépasse le périmètre défini (over-engineering, features non demandées) ?

Pour chaque écart constaté : corrige directement si c'est localisé et clair. Si la correction implique un refactor significatif (plusieurs fichiers, changement d'architecture, impact sur d'autres modules), présente les options avec leur impact et attends validation avant de toucher quoi que ce soit.

---

## PASSE 2 — REVUE TECHNIQUE

Analyse le code produit sur les axes suivants, dans cet ordre :

**Sécurité**
- Injections, exposition de données sensibles, inputs non validés, authentification/autorisation manquante, dépendances vulnérables ajoutées.

**Conventions & cohérence**
- Le nouveau code respecte-t-il les conventions du projet existant (nommage, structure des fichiers, patterns architecturaux, style d'import, organisation des modules) ?
- Les tests suivent-ils le même schéma que les tests existants ?
- Aucune nouvelle dépendance introduite sans justification claire.

**Qualité du code**
- Code mort ou inutile (variables non utilisées, imports orphelins, branches inaccessibles, fonctions jamais appelées).
- Duplication évitable avec de l'existant dans le projet.
- Lisibilité : logique trop dense, absence de nommage explicite sur du code complexe.
- Gestion des erreurs : cas d'erreur ignorés, Promise sans catch, exceptions avalées.

**Tests**
- Couverture suffisante des cas nominaux et cas limites.
- Tests qui ne testent rien (assertions triviales, mocks qui ne valident aucun comportement réel).

Pour chaque problème : corrige directement si c'est localisé. Si la correction est large ou structurelle, propose les options et attends validation.

---

## JOURNALISATION

Une fois les deux passes terminées, ajoute dans la section **Journal** du fichier PRD :

```
[YYYY-MM-DD HH:MM] /review — Passe métier : {résumé en une ligne}. Passe technique : {résumé en une ligne}. {N} corrections appliquées. {N} points soumis à validation.
```

---

## RÈGLES

- Les deux passes s'effectuent dans le même run, séquentiellement. Ne t'arrête pas entre les deux.
- Tu annonces clairement le début de chaque passe dans le chat.
- Tu corriges sans demander pour tout ce qui est localisé et sans ambiguïté.
- Tu poses la question avec options pour tout ce qui est large, structurel, ou avec plusieurs solutions valables.
- Entrée de journal : une seule ligne, factuelle, utile pour un agent qui reprend sans contexte.
- Tout le code et les identifiants en anglais.