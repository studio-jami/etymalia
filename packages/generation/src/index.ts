export const generationScopes = ["asset", "collection", "kit"] as const;
export type GenerationScope = (typeof generationScopes)[number];

export const generationPriorities = ["interactive", "standard", "background"] as const;
export type GenerationPriority = (typeof generationPriorities)[number];

export interface RequestedArtifact {
  kind: string;
  variant?: string;
  lockup?: string;
  format?: string;
}

export interface GenerationInputVersion {
  tokenVersion: number;
  brandUpdatedAt: string;
  briefVersion?: number;
  referenceIds?: string[];
}

export interface GenerationRequest {
  workspaceId: string;
  brandId: string;
  scope: GenerationScope;
  requested: RequestedArtifact[];
  inputVersion: GenerationInputVersion;
  priority: GenerationPriority;
  idempotencyKey: string;
}

export interface GenerationJobReference {
  jobId: string;
  idempotencyKey: string;
}

export const providerCapabilities = ["text", "image", "video"] as const;
export type ProviderCapability = (typeof providerCapabilities)[number];
export type PersonalProviderId = "openai" | "xai";

export interface ProviderConnection {
  provider: PersonalProviderId;
  connected: boolean;
  capabilities: ProviderCapability[];
  reconnectRequired?: boolean;
}

export interface ProviderInvocation {
  workspaceId: string;
  userId: string;
  capability: ProviderCapability;
  input: Record<string, unknown>;
}

/**
 * Provider-neutral boundary for personal OAuth-backed generation. Implementations
 * own OAuth tokens and provider calls; product code sees only capabilities.
 */
export interface PersonalGenerationProvider {
  connection(userId: string): Promise<ProviderConnection>;
  invoke(invocation: ProviderInvocation): Promise<{ providerRequestId: string }>;
}

export interface GenerationRunner {
  enqueue(reference: GenerationJobReference): Promise<{ runId: string }>;
  getState?(jobId: string): Promise<"queued" | "running" | "completed" | "failed">;
  cancel?(jobId: string): Promise<void>;
  supersede?(jobId: string, replacementJobId: string): Promise<void>;
}

const UUID = /^[0-9a-fA-F-]{36}$/;
const SAFE_IDENTIFIER = /^[a-z][a-z0-9_-]{0,79}$/i;

export function assertGenerationRequest(request: GenerationRequest): GenerationRequest {
  if (!UUID.test(request.workspaceId) || !UUID.test(request.brandId)) {
    throw new Error("Generation requests require valid workspace and brand IDs.");
  }
  if (!generationScopes.includes(request.scope)) throw new Error("Unsupported generation scope.");
  if (!generationPriorities.includes(request.priority)) throw new Error("Unsupported generation priority.");
  if (!request.requested.length || request.requested.length > 64) {
    throw new Error("Generation requests must select between one and 64 artifacts.");
  }
  for (const artifact of request.requested) {
    if (!SAFE_IDENTIFIER.test(artifact.kind)) throw new Error("Generation request contains an invalid artifact kind.");
    for (const value of [artifact.variant, artifact.lockup, artifact.format]) {
      if (value !== undefined && !SAFE_IDENTIFIER.test(value)) {
        throw new Error("Generation request contains an invalid artifact option.");
      }
    }
  }
  if (!Number.isInteger(request.inputVersion.tokenVersion) || request.inputVersion.tokenVersion < 1) {
    throw new Error("Generation requests require a positive token version.");
  }
  if (!request.inputVersion.brandUpdatedAt || Number.isNaN(Date.parse(request.inputVersion.brandUpdatedAt))) {
    throw new Error("Generation requests require a valid brand input version.");
  }
  if (!request.idempotencyKey || request.idempotencyKey.length > 200) {
    throw new Error("Generation requests require a bounded idempotency key.");
  }
  return request;
}

export function fullKitRequest(input: Omit<GenerationRequest, "scope" | "requested" | "priority">): GenerationRequest {
  return assertGenerationRequest({
    ...input,
    scope: "kit",
    requested: [{ kind: "full-kit" }],
    priority: "background",
  });
}

export class FakePersonalGenerationProvider implements PersonalGenerationProvider {
  readonly invocations: ProviderInvocation[] = [];

  constructor(private readonly state: ProviderConnection) {}

  async connection(): Promise<ProviderConnection> {
    return this.state;
  }

  async invoke(invocation: ProviderInvocation): Promise<{ providerRequestId: string }> {
    if (!this.state.connected || this.state.reconnectRequired) {
      throw new Error("Provider connection requires reconnecting before invocation.");
    }
    if (!this.state.capabilities.includes(invocation.capability)) {
      throw new Error("Provider does not support the requested capability.");
    }
    this.invocations.push(invocation);
    return { providerRequestId: `fake:${this.state.provider}:${this.invocations.length}` };
  }
}

export class FakeGenerationRunner implements GenerationRunner {
  readonly references: GenerationJobReference[] = [];
  private readonly runs = new Map<string, string>();

  async enqueue(reference: GenerationJobReference): Promise<{ runId: string }> {
    const prior = this.runs.get(reference.idempotencyKey);
    if (prior) return { runId: prior };
    const runId = `fake:${reference.jobId}`;
    this.runs.set(reference.idempotencyKey, runId);
    this.references.push(reference);
    return { runId };
  }
}
