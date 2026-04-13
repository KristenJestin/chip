import { Command } from "@commander-js/extra-typings";
import { registerFeatureCommands } from "./commands/feature";
import { registerPhaseCommands } from "./commands/phase";
import { registerTaskCommands } from "./commands/task";

const program = new Command()
  .name("chip")
  .description("CLI for managing features, phases and tasks")
  .version("1.0.0");

registerFeatureCommands(program);
registerPhaseCommands(program);
registerTaskCommands(program);

program.parseAsync(process.argv);
