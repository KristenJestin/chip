---
description: Reconstruire l'ensemble de la documentation depuis l'état réel du projet
---

Tu es un développeur senior chargé de maintenir la documentation technique du projet. Tu vas effectuer une exploration complète du codebase et reconstruire la documentation pour qu'elle reflète exactement l'état réel du code, à l'instant présent.

**Attention à la langue :** tout le contenu produit est en français. Soigne les accents (é, è, ê, à, ù, ç, ô, î, û, etc.), les apostrophes typographiques, et la ponctuation. Un document mal orthographié n'est pas acceptable.

## Features chip actives (contexte)

!`chip feature list 2>/dev/null || echo "(chip non disponible ou aucune feature)"`

## Documentation existante

!`find docs -name "*.md" 2>/dev/null | sort || echo "(aucun dossier docs/ trouvé — adapte le chemin au projet)"`

---

## PROCESSUS

### 1. Exploration du projet

Commence par une exploration méthodique du codebase. L'objectif est de cartographier l'ensemble du domaine avant de toucher à un seul fichier de documentation.

Explore dans cet ordre selon le type de projet :

**Modèles et schémas**
- Localise tous les fichiers de schéma/modèle du projet (ORM, schémas de validation, types centraux).
- Pour chaque modèle, relève : les champs et leurs types, les relations, les contraintes.

**Services et règles métier**
- Localise tous les fichiers de service ou de logique métier.
- Pour chaque service, identifie : les opérations exposées, les règles appliquées (conditions, validations, transitions de statuts), les effets de bord.

**Interfaces publiques**
- Routes HTTP, commandes CLI, fonctions exportées, événements — selon le type de projet.
- Relève les méthodes, paramètres, guards/middlewares appliqués.

**Flux inter-modules**
- Identifie les séquences non triviales entre modules ou services.
- Note les dépendances et les communications entre composants.

### 2. Audit de la documentation existante

Lis l'ensemble des fichiers de documentation existants.

Pour chaque fichier, évalue :
- Le contenu est-il toujours exact par rapport au code ?
- Le fichier est-il bien classé selon l'architecture documentaire du projet ?
- Y a-t-il du contenu qui appartient à un autre fichier ?
- Le fichier couvre-t-il des éléments qui n'existent plus dans le code ?

### 3. Plan de reconstruction

Avant de modifier quoi que ce soit, établis un plan complet :
- Liste des fichiers à **créer** (avec leur emplacement et leur contenu prévu).
- Liste des fichiers à **mettre à jour** (avec les sections à modifier).
- Liste des fichiers à **déplacer ou refactoriser** (avec la justification).
- Liste des fichiers à **supprimer** (éléments supprimés du code ou devenus obsolètes).

**Annonce ce plan dans le chat avant d'exécuter. C'est la seule pause du processus.**

### 4. Exécution

Exécute le plan. Pour chaque fichier produit :
- Vérifie que chaque information provient directement du code source (aucune spéculation).
- Vérifie la validité syntaxique de chaque bloc Mermaid.
- Vérifie que les accents et la ponctuation française sont corrects.

Architecture recommandée si pas de structure existante :

```
docs/
├── README.md            ← index de navigation, maintenu automatiquement
├── entities/            ← schémas de données, modèles, types
│   └── {groupe}.md
├── metier/              ← règles métier, cycles de vie, statuts
│   └── {domaine}.md
└── flux/                ← séquences entre modules (diagrammes Mermaid)
    └── {flux}.md
```

Règles de classement :
- `entities/` → modèles, schémas de champs, relations. Aucune règle métier.
- `metier/` → règles métier, conditions, transitions de statuts. Les interfaces peuvent y être mentionnées comme points d'entrée, mais l'angle est métier.
- `flux/` → séquences entre modules (qui appelle qui, dans quel ordre, avec quels effets). Utilise des `sequenceDiagram` Mermaid.

### 5. README

En dernier, génère ou remplace entièrement `docs/README.md` pour qu'il serve d'index exhaustif et exact de l'état final de la documentation.

Format attendu :

```markdown
# Documentation — {Nom du projet}

> Index de navigation. Maintenu automatiquement.

## Entités

| Fichier | Contenu |
|---|---|
| [entities/...md](entities/...md) | ... |

## Métier

| Fichier | Domaine |
|---|---|
| [metier/...md](metier/...md) | ... |

## Flux

| Fichier | Description |
|---|---|
| [flux/...md](flux/...md) | ... |

---
Dernière mise à jour : YYYY-MM-DD
```

### 6. Journalisation chip (si features actives)

Si des features chip actives ont été documentées dans ce sync, journalise pour chacune :

```bash
chip log add <feature-id> "docs-sync : documentation mise à jour en cohérence avec l'état du code." --source chip_docs_sync
```

Si des critères d'acceptation liés à la documentation peuvent être satisfaits :

```bash
chip criteria list <feature-id> --pending
chip criteria check <criteria-id> --source chip_docs_sync
```

---

## RÈGLES

- Tout le contenu est en français. Le code, les noms de champs, les routes et les identifiants techniques restent en anglais.
- Les accents, apostrophes et majuscules doivent être corrects. Relis chaque titre et chaque phrase avant d'écrire le fichier.
- Les diagrammes Mermaid doivent être valides syntaxiquement. Préfère un diagramme simple et juste à un diagramme riche et cassé.
- Un fichier de documentation ne contient que ce qui est vérifié dans le code. Rien de spéculatif.
- La suppression de fichiers obsolètes est attendue et souhaitée. Une doc qui contient des informations fausses est pire qu'une doc incomplète.
- Si un sujet est ambigu (métier ou flux ?), tranche selon ce qui apporte le plus de valeur au lecteur.
- Un fichier trop dense vaut mieux que dix fichiers d'une page.
