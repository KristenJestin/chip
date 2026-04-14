import { Command } from "@commander-js/extra-typings";
import { registerInitCommands } from "./init";
import { registerFeatureCommands } from "./feature";
import { registerPhaseCommands } from "./phase";
import { registerTaskCommands } from "./task";
import { registerDependencyCommands } from "./dependency";
import { registerLogCommands } from "./log";
import { registerSessionCommands } from "./session";
import { registerFindingCommands } from "./finding";
import { registerCriteriaCommands } from "./criterion";
import { registerNextCommands } from "./next";
import { registerBatchCommands } from "./batch";
import { registerSummaryCommands } from "./summary";

const program = new Command()
  .name("chip")
  .description("CLI for managing features, phases and tasks")
  .version("1.0.0");

registerInitCommands(program);
registerFeatureCommands(program);
registerPhaseCommands(program);
registerTaskCommands(program);
registerDependencyCommands(program);
registerLogCommands(program);
registerSessionCommands(program);
registerFindingCommands(program);
registerCriteriaCommands(program);
registerNextCommands(program);
registerBatchCommands(program);
registerSummaryCommands(program);

program.parseAsync(process.argv);
