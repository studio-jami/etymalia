import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import type { GenerationQueueMessage } from "./messages";

/**
 * Harmless durable foundation. Product work will load the request/job from
 * Supabase only after secret configuration and staging verification are complete.
 */
export class FullKitWorkflow extends WorkflowEntrypoint<Env, GenerationQueueMessage> {
  async run(event: WorkflowEvent<GenerationQueueMessage>, step: WorkflowStep) {
    const accepted = await step.do("accept generation job", async () => ({
      jobId: event.payload.jobId,
      acceptedAt: new Date().toISOString(),
    }));



    const result = await step.do("render full kit", async () => {
      const container = this.env.RENDERER_CONTAINER.getByName(event.payload.jobId);
      await container.startAndWaitForPorts({
        startOptions: {
          envVars: {
            SUPABASE_URL: this.env.SUPABASE_URL,
            SUPABASE_SERVICE_ROLE_KEY: this.env.SUPABASE_SERVICE_ROLE_KEY,
          },
        },
      });
      const response = await container.fetch("http://container/render-full-kit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jobId: event.payload.jobId,
          idempotencyKey: event.payload.idempotencyKey,
          runnerRunId: `cloudflare:${event.payload.idempotencyKey}`,
        }),
      });
      if (!response.ok) throw new Error(`Renderer request failed with status ${response.status}`);
      return await response.json() as { count: number; skipped: boolean };
    });

    return { ...accepted, result };
  }
}
