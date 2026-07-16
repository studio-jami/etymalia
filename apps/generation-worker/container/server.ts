import { createServer } from "node:http";
import { createClient } from "@supabase/supabase-js";
import { renderFullKit } from "@etymalia/asset-forge/full-kit";
import { colorHex, colorOn, isDtcgDocument } from "@etymalia/tokens";

const url = process.env.SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const port = Number.parseInt(process.env.PORT ?? "8080", 10);

function client() {
  if (!url || !key) throw new Error("Supabase job credentials are not configured.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function storagePrefix(workspaceId: string, brandId: string, category: "social" | "logo" | "favicon") {
  return `workspace/${workspaceId}/brand/${brandId}/${category}`;
}

function errorType(error: unknown) {
  const name = error instanceof Error ? error.name : "UnknownError";
  return name.replace(/[^A-Za-z0-9_.-]/g, "").slice(0, 80) || "UnknownError";
}

async function updateJob(jobId: string, status: "running" | "completed" | "failed", error?: unknown) {
  const supabase = client();
  const now = new Date().toISOString();
  const update = status === "running"
    ? { status, started_at: now, completed_at: null, error_type: null, error_summary: null }
    : status === "completed"
      ? { status, completed_at: now, error_type: null, error_summary: null }
      : { status, completed_at: now, error_type: errorType(error), error_summary: "Generation could not be completed. Please try again." };
  const { error: updateError } = await supabase.from("generation_jobs").update(update).eq("id", jobId);
  if (updateError) throw new Error(`Unable to update generation job: ${updateError.message}`);
}

async function generate(jobId: string, idempotencyKey: string, runnerRunId: string) {
  const supabase = client();
  const { data: job, error: jobError } = await supabase
    .from("generation_jobs")
    .select("id, workspace_id, brand_id, type, status, idempotency_key")
    .eq("id", jobId)
    .maybeSingle();
  if (jobError || !job || job.type !== "full_kit" || job.idempotency_key !== idempotencyKey) {
    throw new Error("Generation job was not found or did not match its idempotency key.");
  }
  if (job.status === "completed") return { count: 0, skipped: true };

  const { error: runnerError } = await supabase.from("generation_jobs").update({
    runner: "cloudflare",
    runner_run_id: runnerRunId,
    trigger_run_id: null,
  }).eq("id", jobId);
  if (runnerError) throw new Error(`Unable to attach Cloudflare runner: ${runnerError.message}`);

  await updateJob(jobId, "running");
  try {
    const { data: brand, error: brandError } = await supabase.from("brands")
      .select("id, workspace_id, name, brief").eq("id", job.brand_id).eq("workspace_id", job.workspace_id).maybeSingle();
    if (brandError || !brand) throw new Error("Brand no longer exists in the requested workspace.");
    const { data: tokenRow, error: tokenError } = await supabase.from("brand_tokens")
      .select("dtcg_json").eq("brand_id", job.brand_id).maybeSingle();
    if (tokenError || !tokenRow || !isDtcgDocument(tokenRow.dtcg_json)) {
      throw new Error("A valid DTCG palette is required before a full kit can be generated.");
    }
    const brief = brand.brief && typeof brand.brief === "object" ? brand.brief as { description?: unknown } : {};
    const tokens = tokenRow.dtcg_json;
    const artifacts = await renderFullKit({
      name: brand.name,
      tagline: typeof brief.description === "string" ? brief.description : "",
      primary: colorHex(tokens, "primary", "#315d7c"), accent: colorHex(tokens, "accent", "#8fb8d3"),
      ink: colorHex(tokens, "ink", "#182028"), paper: colorHex(tokens, "paper", "#f3f1eb"), onPrimary: colorOn(tokens, "primary", "#ffffff"),
    });
    for (const artifact of artifacts) {
      const path = `${storagePrefix(job.workspace_id, job.brand_id, artifact.category)}/${artifact.filename}`;
      const { error: uploadError } = await supabase.storage.from("etymalia").upload(path, artifact.data, { contentType: artifact.contentType, upsert: true });
      if (uploadError) throw new Error(`Unable to store ${path}: ${uploadError.message}`);
      const { error: assetError } = await supabase.from("assets").upsert({ brand_id: job.brand_id, kind: artifact.kind, variant: artifact.variant ?? "", lockup: artifact.lockup ?? "", format: artifact.format, storage_path: path, meta: artifact.meta }, { onConflict: "brand_id,storage_path" });
      if (assetError) throw new Error(`Unable to register ${path}: ${assetError.message}`);
    }
    await updateJob(jobId, "completed");
    return { count: artifacts.length, skipped: false };
  } catch (error) {
    await updateJob(jobId, "failed", error).catch(() => undefined);
    throw error;
  }
}

createServer(async (request, response) => {
  try {
    if (request.method === "GET" && request.url === "/health") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ status: "ok", service: "etymalia-generation-renderer" }));
      return;
    }
    if (request.method !== "POST" || request.url !== "/render-full-kit") {
      response.writeHead(404, { "content-type": "application/json" }); response.end(JSON.stringify({ error: "Not found" })); return;
    }
    const body = await new Promise<string>((resolve, reject) => { let value = ""; request.on("data", (chunk) => { value += chunk; }); request.on("end", () => resolve(value)); request.on("error", reject); });
    const input = JSON.parse(body) as { jobId?: unknown; idempotencyKey?: unknown; runnerRunId?: unknown };
    if (typeof input.jobId !== "string" || typeof input.idempotencyKey !== "string" || typeof input.runnerRunId !== "string") throw new Error("Invalid render request.");
    const result = await generate(input.jobId, input.idempotencyKey, input.runnerRunId);
    response.writeHead(200, { "content-type": "application/json" }); response.end(JSON.stringify(result));
  } catch (error) {
    console.error("Renderer request failed", error);
    response.writeHead(500, { "content-type": "application/json" }); response.end(JSON.stringify({ error: "Renderer failed" }));
  }
}).listen(port, "0.0.0.0");
