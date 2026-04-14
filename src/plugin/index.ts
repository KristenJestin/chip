import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { PluginModule } from "@opencode-ai/plugin";
import { openDbForProject } from "../db/client";
import { featureTools } from "./tools/feature";
import { sessionTools } from "./tools/session";
import { phaseTools } from "./tools/phase";
import { taskTools } from "./tools/task";
import { logTools } from "./tools/log";
import { findingTools } from "./tools/finding";
import { criteriaTools } from "./tools/criteria";
import { agentTools } from "./tools/agent";
import { dependencyTools } from "./tools/dependency";
import { eventTools } from "./tools/event";

const _dirname = dirname(fileURLToPath(import.meta.url));

export const plugin: PluginModule = {
  id: "chip",
  server: async (input) => {
    const migrationsFolder = join(_dirname, "migrations");
    const db = await openDbForProject(input.directory, migrationsFolder);

    return {
      tool: {
        ...featureTools(db),
        ...sessionTools(db),
        ...phaseTools(db),
        ...taskTools(db),
        ...logTools(db),
        ...findingTools(db),
        ...criteriaTools(db),
        ...agentTools(db),
        ...dependencyTools(db),
        ...eventTools(db),
      },
    };
  },
};

export default plugin;
