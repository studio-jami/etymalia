export interface GenerationQueueMessage {
  jobId: string;
  idempotencyKey: string;
}

export function isGenerationQueueMessage(value: unknown): value is GenerationQueueMessage {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<GenerationQueueMessage>;
  return typeof candidate.jobId === "string"
    && /^[0-9a-fA-F-]{36}$/.test(candidate.jobId)
    && typeof candidate.idempotencyKey === "string"
    && candidate.idempotencyKey.length > 0
    && candidate.idempotencyKey.length <= 200;
}
