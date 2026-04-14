# Initialisation du projet

> Séquences déclenchées par `chip init` et par le premier appel à la DB.  
> Implémentées dans `src/cli/init.ts`, `src/core/init-project.ts`, `src/utils/init.ts`, `src/db/client.ts`.

---

## `chip init` — séquence complète

```mermaid
sequenceDiagram
    actor Dev
    participant CLI as chip init (cli/init.ts)
    participant InitUtil as utils/init.ts
    participant DBClient as db/client.ts
    participant InstallCore as core/init-project.ts
    participant FS as Système de fichiers

    Dev->>CLI: chip init [--provider opencode] [--no-commands]

    Note over CLI,FS: 1. Initialisation de la DB
    CLI->>InitUtil: ensureInit()
    InitUtil->>FS: fs.existsSync(".chip/")
    alt .chip/ absent
        InitUtil->>FS: mkdirSync(".chip/", { recursive: true })
        InitUtil->>FS: console.log("Initialized .chip/ in <cwd>")
    end
    InitUtil->>FS: fs.existsSync(".gitignore")
    alt .gitignore présent et ne contient pas ".chip/"
        InitUtil->>FS: fs.appendFileSync(".gitignore", "\n.chip/\n")
        InitUtil->>FS: console.log("Added .chip/ to .gitignore")
    end

    CLI->>DBClient: getDb()
    DBClient->>FS: Localise dist/migrations/ (bundlées)
    DBClient->>FS: Ouvre .chip/chip.db
    DBClient->>FS: Applique les migrations en attente (drizzle-kit migrate)

    Note over CLI,FS: 2. Installation des commandes (sauf --no-commands)
    alt --no-commands non spécifié
        CLI->>InstallCore: installProviderCommands(providers, cwd)
        loop Pour chaque provider (ex. : opencode)
            InstallCore->>FS: Cherche dist/templates/opencode/ (prod)<br/>ou src/templates/opencode/ (dev)
            alt Répertoire templates trouvé
                InstallCore->>FS: mkdirSync(".opencode/commands/", { recursive: true })
                loop Pour chaque fichier .md
                    InstallCore->>FS: fs.copyFileSync(src, dest) — écrase si existant
                end
                InstallCore-->>CLI: { installed: [{ provider, files: [...] }] }
            else Répertoire absent
                InstallCore-->>CLI: { warnings: [{ provider, message }] }
            end
        end
        CLI->>FS: Affiche les fichiers installés (chalk vert) et avertissements (chalk jaune)
    end

    CLI-->>Dev: ✓ Initialisation terminée
```

---

## `getDb()` — ouverture de la DB en production (CLI)

```mermaid
sequenceDiagram
    participant Service as Service core
    participant DBClient as db/client.ts
    participant InitUtil as utils/init.ts
    participant FS as Système de fichiers
    participant DB as SQLite

    Service->>DBClient: getDb()
    Note right of DBClient: Singleton — n'ouvre qu'une fois par processus
    alt Première invocation
        DBClient->>InitUtil: ensureInit()
        Note right of InitUtil: Crée .chip/ et met à jour .gitignore si nécessaire
        DBClient->>FS: Résout __dirname + "/migrations" (bundlé dans dist/)
        DBClient->>DB: Ouvre .chip/chip.db via @libsql/client
        DBClient->>DB: Applique les migrations Drizzle
        DBClient-->>Service: instance db (singleton)
    else Invocations suivantes
        DBClient-->>Service: instance db (déjà ouverte)
    end
```

---

## `openDbForProject()` — ouverture par le plugin OpenCode

```mermaid
sequenceDiagram
    participant Plugin as plugin/index.ts
    participant DBClient as db/client.ts
    participant FS as Système de fichiers
    participant DB as SQLite

    Plugin->>DBClient: openDbForProject(input.directory, migrationsFolder)
    DBClient->>FS: Calcule <input.directory>/.chip/chip.db
    DBClient->>FS: mkdirSync("<input.directory>/.chip/", { recursive: true })
    DBClient->>DB: Ouvre la DB à cet emplacement
    DBClient->>DB: Applique les migrations
    DBClient-->>Plugin: instance db (non singleton — nouvelle instance par appel)
```

> Contrairement à `getDb()`, `openDbForProject()` crée une nouvelle instance à chaque appel. C'est le plugin qui gère le cycle de vie de la connexion.

---

## Résolution du répertoire templates

`installProviderCommands()` localise les templates par deux chemins successifs :

1. `__dirname + "/templates/<provider>"` — chemin de production (dans `dist/templates/`).
2. `__dirname + "/../templates/<provider>"` — chemin de développement (depuis `src/core/`).

Si aucun des deux chemins n'existe, un avertissement est retourné (pas d'erreur fatale).

---

## Récapitulatif : ce que crée `chip init`

| Élément | Emplacement | Condition |
|---|---|---|
| Répertoire `.chip/` | `<cwd>/.chip/` | Toujours |
| Base de données | `<cwd>/.chip/chip.db` | Toujours |
| Entrée `.gitignore` | `<cwd>/.gitignore` | Si `.gitignore` existe et ne contient pas `.chip/` |
| Commandes OpenCode | `<cwd>/.opencode/commands/*.md` | Sauf `--no-commands` |
