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
      // Image rollouts do not replace a named Container instance. Version the
      // name with the renderer contract so a new deployment never reattaches
      // a workflow to a stopped predecessor from an earlier image.
      const container = this.env.RENDERER_CONTAINER.getByName(`renderer-v12:${event.payload.jobId}`);
      await container.startAndWaitForPorts({
        startOptions: {
          envVars: {
            SUPABASE_URL: this.env.SUPABASE_URL,
            SUPABASE_SERVICE_ROLE_KEY: this.env.SUPABASE_SERVICE_ROLE_KEY,
            GEMINI_API_KEY: this.env.GEMINI_API_KEY,
            GOOGLE_VERTEX_SERVICE_ACCOUNT_JSON: this.env.GOOGLE_VERTEX_SERVICE_ACCOUNT_JSON,
            GOOGLE_VERTEX_LOCATION: this.env.GOOGLE_VERTEX_LOCATION ?? "global",
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
      if (!response.ok) {
        const failure = await response.json().catch(() => null) as { error?: unknown } | null;
        const message = typeof failure?.error === "string" ? failure.error : `status ${response.status}`;
        throw new Error(`Renderer request failed: ${message}`);
      }
      const payload = await response.json() as { count?: unknown; skipped?: unknown };
      if (typeof payload.count !== "number" || typeof payload.skipped !== "boolean") {
        throw new Error("Renderer returned an invalid completion result");
      }
      return { count: payload.count, skipped: payload.skipped };
    });

    return { ...accepted, result };
  }
}
