import fs from "fs";
import path from "path";

export const SUPPORTED_PROVIDERS = ["opencode"] as const;
export type Provider = (typeof SUPPORTED_PROVIDERS)[number];

interface ProviderConfig {
  label: string;
  /** Target directory relative to cwd where command files are installed. */
  targetDir: string;
}

const PROVIDER_CONFIG: Record<Provider, ProviderConfig> = {
  opencode: {
    label: "OpenCode",
    targetDir: path.join(".opencode", "commands"),
  },
};

export interface InstallResult {
  provider: Provider;
  label: string;
  targetDir: string;
  files: string[];
}

export interface InstallWarning {
  provider: Provider;
  message: string;
}

export interface InstallCommandsResult {
  installed: InstallResult[];
  warnings: InstallWarning[];
}

/**
 * Resolves the bundled templates directory for a given provider.
 *
 * In production (dist/index.js):  __dirname = dist/  → dist/templates/<provider>/
 * In development (src/core/*.ts): __dirname = src/core/ → src/templates/<provider>/
 */
function getTemplatesDir(provider: Provider): string {
  const fromDist = path.join(__dirname, "templates", provider);
  if (fs.existsSync(fromDist)) return fromDist;
  return path.join(__dirname, "..", "templates", provider);
}

/**
 * Copies bundled command template files for the given providers into their
 * respective target directories under `cwd`. Existing files are overwritten.
 *
 * Pure function — no process.exit, no console.log. Throw on unexpected errors.
 */
export function installProviderCommands(
  providers: Provider[],
  cwd: string
): InstallCommandsResult {
  const installed: InstallResult[] = [];
  const warnings: InstallWarning[] = [];

  for (const provider of providers) {
    const config = PROVIDER_CONFIG[provider];
    const templatesDir = getTemplatesDir(provider);

    if (!fs.existsSync(templatesDir)) {
      warnings.push({
        provider,
        message: `Templates not found at ${templatesDir} — skipped.`,
      });
      continue;
    }

    const targetDir = path.join(cwd, config.targetDir);
    fs.mkdirSync(targetDir, { recursive: true });

    const files = fs
      .readdirSync(templatesDir)
      .filter((f) => f.endsWith(".md"))
      .sort();

    for (const file of files) {
      fs.copyFileSync(path.join(templatesDir, file), path.join(targetDir, file));
    }

    installed.push({
      provider,
      label: config.label,
      targetDir: path.join(cwd, config.targetDir),
      files,
    });
  }

  return { installed, warnings };
}
