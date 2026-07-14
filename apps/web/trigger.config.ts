import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
  project: "etymalia",
  dirs: ["./trigger"],
  runtime: "node",
  maxDuration: 300,
  logLevel: "log",
  retries: { enabledInDev: false, default: { maxAttempts: 3 } },
});
