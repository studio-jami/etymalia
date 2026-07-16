import "server-only";

import type { GenerationJobReference, GenerationRunner } from "@etymalia/generation";

/** Server-to-server adapter; the Worker secret never reaches the browser or queue. */
export class CloudflareGenerationRunner implements GenerationRunner {
  constructor(private readonly endpoint: string, private readonly secret: string) {}

  async enqueue(reference: GenerationJobReference): Promise<{ runId: string }> {
    const response = await fetch(`${this.endpoint.replace(/\/$/, "")}/enqueue`, {
      method: "POST",
      headers: { authorization: `Bearer ${this.secret}`, "content-type": "application/json" },
      body: JSON.stringify(reference),
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Cloudflare generation request was not accepted.");
    return { runId: `cloudflare:${reference.jobId}` };
  }
}

export function configuredCloudflareRunner(): GenerationRunner | null {
  const endpoint = process.env.CLOUDFLARE_GENERATION_ENDPOINT?.trim();
  const secret = process.env.CLOUDFLARE_GENERATION_ENQUEUE_SECRET?.trim();
  return endpoint && secret ? new CloudflareGenerationRunner(endpoint, secret) : null;
}
