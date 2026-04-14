---
description: Mettre à jour la documentation après une branche feature
---

Tu es un développeur senior chargé de maintenir la documentation technique de l'API. Tu vas analyser ce qui a changé sur la branche courante et mettre à jour la documentation en conséquence.

**Attention à la langue :** tout le contenu produit est en français. Soigne les accents (é, è, ê, à, ù, ç, ô, î, û, etc.), les apostrophes typographiques, et la ponctuation. Un document mal orthographié n'est pas acceptable.

## PRD de référence

!`cat "_projects/$1.md" 2>/dev/null || cat "$1" 2>/dev/null || echo "(aucun PRD fourni — analyse basée uniquement sur le diff git)"`

## Changements sur la branche

!`git log --oneline $(git rev-list --max-parents=0 HEAD)..HEAD 2>/dev/null`

!`git diff $(git rev-list --max-parents=0 HEAD) HEAD -- . ':(exclude)pfm-palbank-api/docs/' 2>/dev/null`

## Documentation existante

!`find pfm-palbank-api/docs -name "*.md" | grep -v "dependencies" | sort`

---

## PROCESSUS

### 1. Analyse des changements

En croisant le diff git et le PRD, identifie précisément :
- Les entités créées, modifiées ou supprimées (modèles, schémas, types associés).
- Les règles métier nouvelles ou modifiées (statuts, transitions, conditions, comportements).
- Les flux nouveaux ou modifiés (séquences entre modules, déclencheurs, effets de bord).
- Les éléments supprimés qui rendraient une section de doc obsolète.

### 2. Décisions de mise à jour

Pour chaque élément identifié, détermine l'action à effectuer sur la documentation :
- **Créer** un nouveau fichier si le sujet n'a pas de home logique existant.
- **Mettre à jour** une section précise d'un fichier existant si le reste est toujours correct.
- **Refactoriser** un fichier existant si du contenu est mal classé (ex : règles métier dans `entities/`, schémas dans `metier/`).
- **Supprimer** un fichier si son sujet entier a disparu du code.
- **Déplacer** du contenu entre fichiers si l'architecture l'exige.

Tu as la liberté complète de réorganiser pour que la documentation reste cohérente avec l'architecture définie ci-dessous.

### 3. Mise à jour du README

Après toutes les modifications, mets à jour `pfm-palbank-api/docs/README.md` pour qu'il reflète exactement l'état courant de la documentation. Voir le format attendu ci-dessous.

---

## ARCHITECTURE DE RÉFÉRENCE

```
pfm-palbank-api/docs/
├── dependencies.mmd     ← NE PAS TOUCHER
├── dependencies.png     ← NE PAS TOUCHER
├── README.md            ← index de navigation, maintenu automatiquement
├── entities/            ← schémas de données uniquement
│   └── {groupe}.md
├── metier/              ← règles métier, cycles de vie, statuts
│   └── {domaine}.md
└── flux/                ← séquences entre modules
    └── {flux}.md
```

**Règle de classement :**
- `entities/` → modèles, schémas de champs, relations entre entités. Aucune règle métier, aucune logique applicative.
- `metier/` → règles métier, conditions, transitions de statuts, comportements attendus. Les routes peuvent y être mentionnées comme point d'entrée, mais l'angle est métier.
- `flux/` → séquences entre modules ou services (qui appelle qui, dans quel ordre, avec quels effets). Utilise des `sequenceDiagram` Mermaid.

---

## FORMAT PAR TYPE DE FICHIER

### entities/{groupe}.md

```markdown
# {Titre du groupe}

## Aperçu

- Modèles : {liste}
- Relations : {résumé des relations principales}

## Diagramme

```mermaid
erDiagram
  ...
```

## {NomDuModèle}

### Champs

| Champ | Type | Description |
|---|---|---|
| ... | ... | ... |
```

### metier/{domaine}.md

```markdown
# {Titre du domaine}

## Contexte

{Paragraphe décrivant le domaine métier et son rôle dans l'application.}

## États et transitions

```mermaid
stateDiagram-v2
  ...
```

## Règles métier

### {Règle ou groupe de règles}

{Description claire de la règle, de ses conditions et de ses effets.}

## Points d'entrée API

| Méthode | Route | Rôle |
|---|---|---|
| ... | ... | ... |
```

### flux/{flux}.md

```markdown
# {Titre du flux}

## Déclencheur

{Ce qui initie ce flux.}

## Diagramme

```mermaid
sequenceDiagram
  ...
```

## Étapes

1. {Étape 1}
2. {Étape 2}
...
```

### README.md

```markdown
# Documentation API PFM-Palbank

> Index de navigation. Maintenu automatiquement.

## Entités

| Fichier | Modèles couverts |
|---|---|
| [entities/sites-services.md](entities/sites-services.md) | Site, PalbankSite, OperationService, ... |

## Métier

| Fichier | Domaine |
|---|---|
| [metier/facturation.md](metier/facturation.md) | Cycle de vie des factures, statuts, ... |

## Flux

| Fichier | Description |
|---|---|
| [flux/generation-facture.md](flux/generation-facture.md) | Déclenchement et étapes de la génération |

---
Dernière mise à jour : YYYY-MM-DD
```

---

## RÈGLES

- `dependencies.mmd` et `dependencies.png` sont intouchables, quoi qu'il arrive.
- Tout le contenu est en français. Le code, les noms de champs, les routes et les identifiants techniques restent en anglais.
- Les accents, apostrophes et majuscules doivent être corrects. Relis chaque titre et chaque phrase.
- Les diagrammes Mermaid doivent être valides syntaxiquement. Préfère un diagramme simple et juste à un diagramme riche et cassé.
- Un fichier de documentation ne contient que ce qui est vérifié dans le code. Rien de spéculatif.
- Si un sujet est ambigu (métier ou flux ?), tranche selon ce qui apporte le plus de valeur au lecteur.