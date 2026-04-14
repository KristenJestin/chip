---
description: Mettre à jour la documentation technique après une feature chip
---

Tu es un développeur senior chargé de maintenir la documentation technique du projet. Tu vas analyser ce qui a changé dans le cadre de cette feature chip et mettre à jour la documentation en conséquence.

**Attention à la langue :** tout le contenu produit est en français. Soigne les accents (é, è, ê, à, ù, ç, ô, î, û, etc.), les apostrophes typographiques, et la ponctuation. Un document mal orthographié n'est pas acceptable.

## Feature cible

!`chip feature status "$1" 2>/dev/null || echo "ERREUR : feature chip introuvable."`

## Critères d'acceptation en attente

!`chip criteria list "$1" --pending 2>/dev/null || echo "(aucun critère en attente)"`

## Détail complet de la feature

!`chip feature export "$1" 2>/dev/null || echo ""`

## Changements sur la branche

!`git log --oneline $(git rev-list --max-parents=0 HEAD)..HEAD 2>/dev/null || echo "(historique git indisponible)"`

!`git diff $(git rev-list --max-parents=0 HEAD) HEAD -- . ':!docs/' 2>/dev/null || echo ""`

## Documentation existante

!`find docs -name "*.md" 2>/dev/null | sort || echo "(aucun dossier docs/ trouvé — adapte le chemin au projet)"`

---

## ÉTAPE 0 — DÉMARRAGE DE SESSION

```bash
chip session start <feature-id> docs
```

Note le session-id.

---

## PROCESSUS

### 1. Analyse des changements

En croisant le diff git et l'export chip, identifie précisément :
- Les entités créées, modifiées ou supprimées (modèles, schémas, types associés).
- Les règles métier nouvelles ou modifiées (statuts, transitions, conditions, comportements).
- Les flux nouveaux ou modifiés (séquences entre modules, déclencheurs, effets de bord).
- Les APIs ou interfaces publiques exposées ou modifiées.
- Les éléments supprimés qui rendraient une section de doc obsolète.

### 2. Décisions de mise à jour

Pour chaque élément identifié, détermine l'action à effectuer sur la documentation :
- **Créer** un nouveau fichier si le sujet n'a pas de home logique existant.
- **Mettre à jour** une section précise d'un fichier existant si le reste est toujours correct.
- **Refactoriser** un fichier existant si du contenu est mal classé.
- **Supprimer** un fichier si son sujet entier a disparu du code.
- **Déplacer** du contenu entre fichiers si l'architecture l'exige.

Adapte l'architecture documentaire au projet courant. Convention recommandée si pas d'architecture existante :

```
docs/
├── README.md            ← index de navigation, maintenu automatiquement
├── entities/            ← schémas de données, modèles, types
├── metier/              ← règles métier, cycles de vie, statuts
└── flux/                ← séquences entre modules (diagrammes Mermaid)
```

### 3. Exécution des mises à jour

Effectue toutes les modifications. Pour chaque fichier produit ou modifié :
- Vérifie que chaque information provient directement du code source. Rien de spéculatif.
- Vérifie la validité syntaxique des blocs Mermaid.
- Vérifie que les accents et la ponctuation française sont corrects.

### 4. Mise à jour du README docs

Après toutes les modifications, mets à jour `docs/README.md` (ou l'index docs du projet) pour qu'il reflète exactement l'état courant de la documentation.

---

## ÉTAPE 5 — FINALISATION CHIP

Vérifie les critères d'acceptation liés à la documentation :

```bash
chip criteria list <feature-id> --pending
```

Pour chaque critère de documentation satisfait :

```bash
chip criteria check <criteria-id> --source chip_docs
```

Journaliser et clore :

```bash
chip log add <feature-id> "Documentation mise à jour : <liste courte des fichiers créés/modifiés>." --source chip_docs

chip session end <session-id> "Documentation : <N> fichiers créés/mis à jour. <résumé>"
```

Si tous les critères sont satisfaits et aucun finding `high` non résolu :

```bash
chip feature stage <feature-id> released
chip log add <feature-id> "Feature released." --source chip_docs
```

Sinon, annonce dans le chat les critères ou findings qui bloquent le passage en `released`.

---

## RÈGLES

- Tout le contenu est en français. Le code, les noms de champs, les routes et les identifiants techniques restent en anglais.
- Les accents, apostrophes et majuscules doivent être corrects. Relis chaque titre et chaque phrase.
- Les diagrammes Mermaid doivent être valides syntaxiquement. Préfère un diagramme simple et juste à un diagramme riche et cassé.
- Un fichier de documentation ne contient que ce qui est vérifié dans le code. Rien de spéculatif.
- Si un sujet est ambigu (métier ou flux ?), tranche selon ce qui apporte le plus de valeur au lecteur.
