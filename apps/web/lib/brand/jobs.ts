import type { SupabaseClient } from "@supabase/supabase-js";

export type GenerationJobStatus = "queued" | "running" | "completed" | "failed";
export type GenerationJobType = "full_kit";

export interface GenerationJobIdentity {
  workspaceId: string;
  brandId: string;
  triggerRunId: string;
  attempt: number;
  type: GenerationJobType;
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
  job: GenerationJobIdentity,
): Promise<void> {
  await throwOnError(await supabase.from("generation_jobs").upsert({
    workspace_id: job.workspaceId,
    brand_id: job.brandId,
    type: job.type,
    status: "queued",
    trigger_run_id: job.triggerRunId,
    attempt: job.attempt,
  }, {
    onConflict: "trigger_run_id",
    ignoreDuplicates: true,
  }));
}

export async function updateGenerationJob(
  supabase: SupabaseClient,
  job: GenerationJobIdentity,
  status: Exclude<GenerationJobStatus, "queued">,
  error?: unknown,
): Promise<void> {
  const update = status === "failed"
    ? {
        status,
        attempt: job.attempt,
        completed_at: now(),
        error_type: safeErrorType(error),
        error_summary: FAILURE_SUMMARY,
      }
    : status === "completed"
      ? {
          status,
          attempt: job.attempt,
          completed_at: now(),
          error_type: null,
          error_summary: null,
        }
      : {
          status,
          attempt: job.attempt,
          started_at: now(),
          completed_at: null,
          error_type: null,
          error_summary: null,
        };

  await throwOnError(await supabase
    .from("generation_jobs")
    .update(update)
    .eq("trigger_run_id", job.triggerRunId));
}
