import { exports as workerExports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

describe("generation worker", () => {
  it("exposes a harmless health response", async () => {
    const response = await workerExports.default.fetch("https://worker.test/health");
    await expect(response.json()).resolves.toEqual({ status: "ok", service: "etymalia-generation" });
  });

  it("does not expose a public generation endpoint", async () => {
    const response = await workerExports.default.fetch("https://worker.test/generate", { method: "POST" });
    expect(response.status).toBe(404);
  });
});
