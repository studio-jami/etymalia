import { describe, expect, it } from "vitest";
import { FakeGenerationRunner, FakePersonalGenerationProvider, fullKitRequest } from "./index";

const input = {
  workspaceId: "11111111-1111-4111-8111-111111111111",
  brandId: "22222222-2222-4222-8222-222222222222",
  inputVersion: { tokenVersion: 1, brandUpdatedAt: "2026-07-15T12:00:00.000Z" },
  idempotencyKey: "full-kit:22222222-2222-4222-8222-222222222222:1",
};

describe("generation contract", () => {
  it("creates a bounded full-kit request", () => {
    expect(fullKitRequest(input)).toMatchObject({
      scope: "kit",
      priority: "background",
      requested: [{ kind: "full-kit" }],
    });
  });

  it("rejects provider invocation until a supported connection exists", async () => {
    const provider = new FakePersonalGenerationProvider({
      provider: "openai",
      connected: false,
      capabilities: ["text"],
      reconnectRequired: true,
    });

    await expect(provider.invoke({
      workspaceId: input.workspaceId,
      userId: "44444444-4444-4444-8444-444444444444",
      capability: "text",
      input: { prompt: "hello" },
    })).rejects.toThrow("reconnecting");
  });

  it("deduplicates runner enqueue by idempotency key", async () => {
    const runner = new FakeGenerationRunner();
    const reference = { jobId: "33333333-3333-4333-8333-333333333333", idempotencyKey: input.idempotencyKey };

    await expect(runner.enqueue(reference)).resolves.toEqual({ runId: `fake:${reference.jobId}` });
    await expect(runner.enqueue(reference)).resolves.toEqual({ runId: `fake:${reference.jobId}` });
    expect(runner.references).toEqual([reference]);
  });
});
