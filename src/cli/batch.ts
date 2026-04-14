import { readFile } from "fs/promises";
import { Command } from "@commander-js/extra-typings";
import { getDb } from "../db/client";
import { die, errMsg } from "../utils/die";
import { executeBatch } from "../core/batch";

// ── Commander registration ────────────────────────────────────────────────────

export function registerBatchCommands(program: Command): void {
  program
    .command("batch")
    .description("Create phases and tasks in bulk from a JSON file or stdin")
    .argument("<feature-id>", "Feature ID")
    .option("--json <file>", "Path to JSON file (use - for stdin)")
    .action(async (featureId, options) => {
      const db = await getDb();
      try {
        let raw: string;
        if (options.json && options.json !== "-") {
          raw = await readFile(options.json, "utf-8");
        } else {
          raw = await new Promise<string>((resolve, reject) => {
            let data = "";
            process.stdin.setEncoding("utf-8");
            process.stdin.on("data", (chunk) => {
              data += chunk;
            });
            process.stdin.on("end", () => resolve(data));
            process.stdin.on("error", reject);
          });
        }
        const payload = JSON.parse(raw) as unknown;
        const result = await executeBatch(db, featureId, payload);
        console.log(
          `Batch complete: ${result.phasesCreated} phase(s), ${result.tasksCreated} task(s) created`,
        );
      } catch (err) {
        die(errMsg(err));
      }
    });
}
