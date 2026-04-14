import { defineConfig } from "tsup";

export default defineConfig([
  // ── CLI (CJS, with shebang) ────────────────────────────────────────────────
  {
    entry: { index: "src/cli/index.ts" },
    format: ["cjs"],
    outDir: "dist",
    splitting: false,
    sourcemap: false,
    clean: true,
    banner: {
      js: "#!/usr/bin/env node",
    },
    platform: "node",
    target: "node18",
    noExternal: ["commander", "@commander-js/extra-typings", "drizzle-orm", "chalk"],
    external: ["@libsql/client"],
    minify: false,
  },
  // ── Plugin (ESM, no shebang) ───────────────────────────────────────────────
  {
    entry: { plugin: "src/plugin/index.ts" },
    format: ["esm"],
    outDir: "dist",
    splitting: false,
    sourcemap: false,
    platform: "node",
    target: "node18",
    noExternal: ["drizzle-orm", "zod"],
    external: ["@libsql/client", "@opencode-ai/plugin", "@opencode-ai/sdk"],
    minify: false,
    dts: false,
  },
]);
