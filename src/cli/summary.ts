import { Command } from "@commander-js/extra-typings";
import { getDb } from "../db/client";
import { die, errMsg } from "../utils/die";
import { sep } from "../utils/format";
import { getSummary } from "../core/summary";

// ── Commander registration ────────────────────────────────────────────────────

export function registerSummaryCommands(program: Command): void {
  program
    .command("summary")
    .description("Show a summary dashboard for a feature")
    .argument("<feature-id>", "Feature ID")
    .action(async (featureId) => {
      const db = await getDb();
      try {
        const s = await getSummary(db, featureId);
        console.log(`${s.title}  [${s.stage}]  ${s.status}`);
        console.log(sep());
        console.log(
          `progress:  ${s.progress}%  (${s.taskStats.done}/${s.totalTasks} tasks done)`,
        );
        console.log(
          `tasks:     todo:${s.taskStats.todo}  in-progress:${s.taskStats["in-progress"]}  review:${s.taskStats.review}  done:${s.taskStats.done}`,
        );
        if (s.totalTasks > 0) {
          console.log(
            `types:     feature:${s.typeStats.feature}  fix:${s.typeStats.fix}  docs:${s.typeStats.docs}  test:${s.typeStats.test}`,
          );
        }
        console.log(
          `findings:  ${s.findingsUnresolved} unresolved / ${s.findingsResolved + s.findingsUnresolved} total`,
        );
        console.log(`criteria:  ${s.criteriaSatisfied}/${s.criteriaTotal} satisfied`);
        console.log(`sessions:  ${s.sessionCount}`);
      } catch (err) {
        die(errMsg(err));
      }
    });
}
