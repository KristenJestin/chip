import { Command } from "@commander-js/extra-typings";
import chalk from "chalk";
import { ensureInit } from "../utils/init";
import { die } from "../utils/die";
import {
  SUPPORTED_PROVIDERS,
  installProviderCommands,
  type Provider,
} from "../core/init-project";

export function registerInitCommands(program: Command): void {
  program
    .command("init")
    .description("Initialize chip in the current project and install provider command files")
    .option(
      "--provider <provider>",
      `provider to set up (${SUPPORTED_PROVIDERS.join(", ")})`,
    )
    .option("--no-commands", "skip installing command files, only set up the database")
    .action((opts) => {
      // Validate provider
      let providers: Provider[] = [...SUPPORTED_PROVIDERS];
      if (opts.provider) {
        if (!(SUPPORTED_PROVIDERS as readonly string[]).includes(opts.provider)) {
          die(
            `Unknown provider '${opts.provider}'. Supported: ${SUPPORTED_PROVIDERS.join(", ")}`,
          );
        }
        providers = [opts.provider as Provider];
      }

      // Init DB (prints "Initialized .chip/" on first run)
      ensureInit();

      if (!opts.commands) {
        console.log(chalk.green("✓") + " Database ready. Command files skipped (--no-commands).");
        return;
      }

      // Install command files
      const { installed, warnings } = installProviderCommands(providers, process.cwd());

      for (const w of warnings) {
        console.log(chalk.yellow("⚠") + `  ${w.provider}: ${w.message}`);
      }

      for (const r of installed) {
        console.log(
          chalk.green("✓") +
            `  ${r.label}: ${r.files.length} command file${r.files.length !== 1 ? "s" : ""} → ${r.targetDir}`,
        );
        for (const f of r.files) {
          console.log("   " + chalk.dim(f));
        }
      }

      if (installed.length === 0 && warnings.length === 0) {
        console.log(chalk.yellow("⚠") + "  No providers installed.");
      }
    });
}
