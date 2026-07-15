import { isGenerationQueueMessage, type GenerationQueueMessage } from "./messages";

export { RendererContainer } from "./renderer-container";
export { FullKitWorkflow } from "./workflow";

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") {
      return Response.json({ status: "ok", service: "etymalia-generation" });
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
