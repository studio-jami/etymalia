import "server-only";

import { tasks } from "@trigger.dev/sdk/v3";
import type { GenerationJobReference, GenerationRunner } from "@etymalia/generation";
import { configuredCloudflareRunner } from "./cloudflare-runner";

export class TriggerGenerationRunner implements GenerationRunner {
  async enqueue(reference: GenerationJobReference): Promise<{ runId: string }> {
    const run = await tasks.trigger("generate-full-kit", { jobId: reference.jobId }, {
      idempotencyKey: reference.idempotencyKey,
    });
    return { runId: run.id };
  }
}

export function generationRunner(): GenerationRunner {
  return configuredCloudflareRunner() ?? new TriggerGenerationRunner();
}
