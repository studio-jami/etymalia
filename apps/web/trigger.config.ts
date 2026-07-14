import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { defineConfig } from "@trigger.dev/sdk/v3";
import { additionalFiles, syncEnvVars } from "@trigger.dev/build/extensions/core";

loadEnv({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../../.env") });

function requiredEnv(name: "SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY"): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name} for Trigger.dev deployment.`);
  return value;
}

export default defineConfig({
  project: "proj_wcurzuyxcrbsvfaxoymh",
  dirs: ["./trigger"],
  runtime: "node",
  maxDuration: 300,
  logLevel: "log",
  retries: { enabledInDev: false, default: { maxAttempts: 3 } },
  build: {
    external: ["@resvg/resvg-js", "ws"],
    extensions: [
      additionalFiles({ files: ["./trigger/fonts/**"] }),
      syncEnvVars(async () => [
        { name: "SUPABASE_URL", value: requiredEnv("SUPABASE_URL") },
        { name: "SUPABASE_SERVICE_ROLE_KEY", value: requiredEnv("SUPABASE_SERVICE_ROLE_KEY") },
      ]),
    ],
  },
});
