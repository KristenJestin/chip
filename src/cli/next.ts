import { Command } from "@commander-js/extra-typings";
import { getDb } from "../db/client";
import { die, errMsg } from "../utils/die";
import { sep } from "../utils/format";
import { getNext } from "../core/next";

// ── Commander registration ────────────────────────────────────────────────────

export function registerNextCommands(program: Command): void {
  program
    .command("next")
    .description("Show the next suggested action for a feature")
    .argument("<feature-id>", "Feature ID")
    .action(async (featureId) => {
      const db = await getDb();
      try {
        const diag = await getNext(db, featureId);
        console.log(`feature: ${diag.feature.id}  [${diag.stage}]`);
        console.log(sep());
        console.log(`next:    ${diag.nextAction}`);
        if (diag.activeSession) {
          console.log(
            `session: #${diag.activeSession.id} (${diag.activeSession.type}) — active`,
          );
        }
        if (diag.pendingTasks.length > 0) {
          console.log(`\npending tasks (${diag.pendingTasks.length}):`);
          for (const t of diag.pendingTasks) {
            const typeTag = t.type !== "feature" ? ` [${t.type}]` : "";
            console.log(`  [${t.status}]  ${t.title}${typeTag}`);
          }
        }
        if (diag.unresolvedFindings.length > 0) {
          console.log(`\nunresolved findings (${diag.unresolvedFindings.length}):`);
          for (const f of diag.unresolvedFindings) {
            console.log(`  [${f.severity}] ${f.description}`);
          }
        }
        if (diag.unsatisfiedCriteria.length > 0) {
          console.log(`\nunsatisfied criteria (${diag.unsatisfiedCriteria.length}):`);
          for (const c of diag.unsatisfiedCriteria) {
            console.log(`  [ ] ${c.description}`);
          }
        }
      } catch (err) {
        die(errMsg(err));
      }
    });
}
