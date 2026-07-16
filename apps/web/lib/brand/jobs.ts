import type { GenerationRequest } from "@etymalia/generation";
import type { SupabaseClient } from "@supabase/supabase-js";

export type GenerationJobStatus = "queued" | "running" | "completed" | "failed";

export interface QueuedGenerationJob {
  id: string;
  workspaceId: string;
  brandId: string;
  type: "full_kit";
  request: GenerationRequest;
}

export interface StoredGenerationJob {
  id: string;
  workspaceId: string;
  brandId: string;
  type: "full_kit";
  request: GenerationRequest;
}

const FAILURE_SUMMARY = "Generation could not be completed. Please try again.";

function now(): string {
  return new Date().toISOString();
}

function safeErrorType(error: unknown): string {
  const name = error instanceof Error ? error.name : "UnknownError";
  const normalized = name.replace(/[^A-Za-z0-9_.-]/g, "").slice(0, 80);
  return normalized || "UnknownError";
}

async function throwOnError(result: { error: { message: string } | null }): Promise<void> {
  if (result.error) throw new Error(`Unable to update generation job: ${result.error.message}`);
}

export async function createQueuedGenerationJob(
  supabase: SupabaseClient,
  job: QueuedGenerationJob,
): Promise<StoredGenerationJob> {
  await throwOnError(await supabase.from("generation_jobs").upsert({
    id: job.id,
    workspace_id: job.workspaceId,
    brand_id: job.brandId,
    type: job.type,
    status: "queued",
    idempotency_key: job.request.idempotencyKey,
    request_json: job.request,
    input_version: job.request.inputVersion,
    priority: job.request.priority,
  }, {
    onConflict: "workspace_id,idempotency_key",
    ignoreDuplicates: true,
  }));

  const { data, error } = await supabase
    .from("generation_jobs")
    .select("id, workspace_id, brand_id, type, request_json")
    .eq("workspace_id", job.workspaceId)
    .eq("idempotency_key", job.request.idempotencyKey)
    .maybeSingle();
  if (error || !data) throw new Error("Unable to load queued generation job.");

  return {
    id: data.id as string,
    workspaceId: data.workspace_id as string,
    brandId: data.brand_id as string,
    type: data.type as "full_kit",
    request: data.request_json as GenerationRequest,
  };
}

export async function loadGenerationJob(
  supabase: SupabaseClient,
  jobId: string,
): Promise<StoredGenerationJob> {
  const { data, error } = await supabase
    .from("generation_jobs")
    .select("id, workspace_id, brand_id, type, request_json")
    .eq("id", jobId)
    .maybeSingle();
  if (error || !data || !data.request_json) throw new Error("Generation job was not found.");

  return {
    id: data.id as string,
    workspaceId: data.workspace_id as string,
    brandId: data.brand_id as string,
    type: data.type as "full_kit",
    request: data.request_json as GenerationRequest,
  };
}

export async function attachRunnerRun(
  supabase: SupabaseClient,
  jobId: string,
  runner: "trigger" | "cloudflare" | "fake",
  runId: string,
): Promise<void> {
  await throwOnError(await supabase
    .from("generation_jobs")
    .update({ runner, runner_run_id: runId, trigger_run_id: runner === "trigger" ? runId : null })
    .eq("id", jobId));
}

export async function updateGenerationJob(
  supabase: SupabaseClient,
  jobId: string,
  status: Exclude<GenerationJobStatus, "queued">,
  error?: unknown,
): Promise<void> {
  const update = status === "failed"
    ? {
        status,
        // An enqueue failure can occur before the runner records `running`.
        // Failed jobs nevertheless satisfy the durable lifecycle invariant.
        started_at: now(),
        completed_at: now(),
        error_type: safeErrorType(error),
        error_summary: FAILURE_SUMMARY,
      }
    : status === "completed"
      ? {
          status,
          completed_at: now(),
          error_type: null,
          error_summary: null,
        }
      : {
          status,
          started_at: now(),
          completed_at: null,
          error_type: null,
          error_summary: null,
        };

  await throwOnError(await supabase
    .from("generation_jobs")
    .update(update)
    .eq("id", jobId));
}
