import { isGenerationQueueMessage, type GenerationQueueMessage } from "./messages";

export { RendererContainer } from "./renderer-container";
export { FullKitWorkflow } from "./workflow";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") {
      return Response.json({ status: "ok", service: "etymalia-generation", enqueueSecretLength: env.GENERATION_ENQUEUE_SECRET?.length ?? 0 });
    }
    if (request.method === "POST" && url.pathname === "/enqueue") {
      const authorization = request.headers.get("authorization");
      if (!env.GENERATION_ENQUEUE_SECRET || authorization !== `Bearer ${env.GENERATION_ENQUEUE_SECRET}`) {
        return new Response("Unauthorized", { status: 401 });
      }
      const body = await request.json().catch(() => null);
      if (!isGenerationQueueMessage(body)) return new Response("Invalid generation request", { status: 400 });
      await env.GENERATION_QUEUE.send(body);
      return Response.json({ accepted: true, jobId: body.jobId }, { status: 202 });
    }
    return new Response("Not found", { status: 404 });
  },

  async queue(batch, env) {
    for (const message of batch.messages) {
      if (!isGenerationQueueMessage(message.body)) {
        message.ack();
        continue;
      }
      await env.FULL_KIT_WORKFLOW.create({ params: message.body });
      message.ack();
    }
  },
} satisfies ExportedHandler<Env, GenerationQueueMessage>;
