import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createVertex } from "@ai-sdk/google-vertex";
import { GoogleAuth } from "google-auth-library";
import { z } from "zod";

export type ProviderId = "google" | "google-vertex";
export type Lane = "studio" | "prod";

export type CredentialSource =
  | { type: "apiKey"; provider: "google"; apiKey: string }
  | {
      type: "serviceAccount";
      provider: "google-vertex";
      clientEmail: string;
      privateKey: string;
      project: string;
      location: string;
    };

export type ResolvedCredential =
  | { provider: "google"; apiKey: string }
  | {
      provider: "google-vertex";
      clientEmail: string;
      privateKey: string;
      project: string;
      location: string;
    };

export interface CredentialStore {
  getSource(args: { lane: Lane; provider: ProviderId; userId?: string }): Promise<CredentialSource>;
}

export class CredentialResolver {
  constructor(private readonly store: CredentialStore) {}

  async resolve(args: { lane: Lane; provider: ProviderId; userId?: string }): Promise<ResolvedCredential> {
    if (args.lane === "prod" && !args.userId) {
      throw new Error("A user ID is required for production credentials.");
    }
    const source = await this.store.getSource(args);
    if (source.provider !== args.provider) {
      throw new Error(`Credential store returned ${source.provider} for ${args.provider}.`);
    }
    return source.type === "apiKey"
      ? { provider: "google", apiKey: source.apiKey }
      : {
          provider: "google-vertex",
          clientEmail: source.clientEmail,
          privateKey: source.privateKey,
          project: source.project,
          location: source.location,
        };
  }
}

export function buildProvider(credential: ResolvedCredential) {
  if (credential.provider === "google") {
    return createGoogleGenerativeAI({ apiKey: credential.apiKey });
  }
  return createVertex({
    project: credential.project,
    location: credential.location,
    googleAuthOptions: {
      credentials: { client_email: credential.clientEmail, private_key: credential.privateKey },
    },
  });
}

/** A provider-returned model record. No model IDs are maintained in source. */
export interface ProviderModel {
  provider: ProviderId;
  id: string;
  displayName: string;
  version?: string;
  inputTokenLimit?: number;
  outputTokenLimit?: number;
  supports: string[];
  thinking?: boolean;
  discoveredAt: string;
}

export interface ModelSelectionRequest {
  provider: ProviderId;
  requiredActions: string[];
  preferThinking?: boolean;
  minimumInputTokens?: number;
  minimumOutputTokens?: number;
}

interface GeminiModelResponse {
  models?: Array<{
    name?: string;
    baseModelId?: string;
    displayName?: string;
    version?: string;
    inputTokenLimit?: number;
    outputTokenLimit?: number;
    supportedGenerationMethods?: string[];
    thinking?: boolean;
  }>;
  nextPageToken?: string;
}

interface VertexModelResponse {
  models?: Array<{
    name?: string;
    displayName?: string;
    versionId?: string;
    supportedActions?: string[];
  }>;
  publisherModels?: Array<{
    name?: string;
    displayName?: string;
    versionId?: string;
    supportedActions?: string[];
  }>;
  nextPageToken?: string;
}

const cache = new Map<string, { expiresAt: number; models: ProviderModel[] }>();

export class LiveProviderModelCatalog {
  constructor(
    private readonly resolver: CredentialResolver,
    private readonly options: { cacheTtlMs?: number; fetch?: typeof fetch } = {},
  ) {}

  async list(context: AiContext, provider: ProviderId): Promise<ProviderModel[]> {
    const key = `${context.lane}:${context.userId ?? ""}:${provider}`;
    const cached = cache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.models;

    const credential = await this.resolver.resolve({ ...context, provider });
    const models = credential.provider === "google"
      ? await this.listGemini(credential)
      : await this.listVertex(credential);

    cache.set(key, { models, expiresAt: Date.now() + (this.options.cacheTtlMs ?? 300_000) });
    return models;
  }

  async select(context: AiContext, request: ModelSelectionRequest): Promise<ProviderModel> {
    const candidates = (await this.list(context, request.provider)).filter((model) =>
      request.requiredActions.every((action) => model.supports.includes(action)) &&
      (request.minimumInputTokens === undefined || (model.inputTokenLimit ?? 0) >= request.minimumInputTokens) &&
      (request.minimumOutputTokens === undefined || (model.outputTokenLimit ?? 0) >= request.minimumOutputTokens),
    );

    if (!candidates.length) {
      throw new Error(`No current ${request.provider} model meets the requested provider capabilities.`);
    }

    return candidates.sort((left, right) => {
      const thinking = Number(Boolean(right.thinking) === Boolean(request.preferThinking)) - Number(Boolean(left.thinking) === Boolean(request.preferThinking));
      if (thinking) return thinking;
      const version = compareVersion(right.version, left.version);
      if (version) return version;
      return (right.outputTokenLimit ?? 0) - (left.outputTokenLimit ?? 0);
    })[0];
  }

  private async listGemini(credential: Extract<ResolvedCredential, { provider: "google" }>) {
    const models: ProviderModel[] = [];
    let pageToken: string | undefined;
    do {
      const url = new URL("https://generativelanguage.googleapis.com/v1beta/models");
      url.searchParams.set("key", credential.apiKey);
      url.searchParams.set("pageSize", "1000");
      if (pageToken) url.searchParams.set("pageToken", pageToken);
      const response = await this.request(url);
      const body = (await response.json()) as GeminiModelResponse;
      models.push(...(body.models ?? []).flatMap((model) => {
        const id = model.baseModelId ?? model.name?.replace(/^models\//, "");
        return id ? [{
          provider: "google" as const,
          id,
          displayName: model.displayName ?? id,
          version: model.version,
          inputTokenLimit: model.inputTokenLimit,
          outputTokenLimit: model.outputTokenLimit,
          supports: model.supportedGenerationMethods ?? [],
          thinking: model.thinking,
          discoveredAt: new Date().toISOString(),
        }] : [];
      }));
      pageToken = body.nextPageToken;
    } while (pageToken);
    return models;
  }

  private async listVertex(credential: Extract<ResolvedCredential, { provider: "google-vertex" }>) {
    const auth = new GoogleAuth({
      credentials: { client_email: credential.clientEmail, private_key: credential.privateKey },
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });
    const token = await auth.getAccessToken();
    if (!token) throw new Error("Unable to authenticate the Vertex model catalog request.");

    const models: ProviderModel[] = [];
    let pageToken: string | undefined;
    do {
      const url = new URL(`https://${credential.location}-aiplatform.googleapis.com/v1beta1/publishers/google/models`);
      if (pageToken) url.searchParams.set("pageToken", pageToken);
      const response = await this.request(url, { headers: { authorization: `Bearer ${token}` } });
      const body = (await response.json()) as VertexModelResponse;
      for (const model of [...(body.models ?? []), ...(body.publisherModels ?? [])]) {
        const id = model.name?.split("/").at(-1);
        if (id) models.push({
          provider: "google-vertex",
          id,
          displayName: model.displayName ?? id,
          version: model.versionId,
          supports: model.supportedActions ?? [],
          discoveredAt: new Date().toISOString(),
        });
      }
      pageToken = body.nextPageToken;
    } while (pageToken);
    return models;
  }

  private async request(url: URL, init?: RequestInit): Promise<Response> {
    const response = await (this.options.fetch ?? fetch)(url, init);
    if (!response.ok) throw new Error(`Provider model catalog request failed: ${response.status}`);
    return response;
  }
}

function compareVersion(left?: string, right?: string): number {
  return (left ?? "").localeCompare(right ?? "", undefined, { numeric: true, sensitivity: "base" });
}

export interface AiContext { lane: Lane; userId?: string; }

export class AiPort {
  private readonly catalog: LiveProviderModelCatalog;
  constructor(private readonly resolver: CredentialResolver, catalog?: LiveProviderModelCatalog) {
    this.catalog = catalog ?? new LiveProviderModelCatalog(resolver);
  }

  async resolveModel(context: AiContext, request: ModelSelectionRequest) {
    const model = await this.catalog.select(context, request);
    const credential = await this.resolver.resolve({ ...context, provider: model.provider });
    return { model, provider: buildProvider(credential) };
  }
}

export const BrandBriefSchema = z.object({
  description: z.string().min(1).max(2_000), industry: z.string().min(1).max(160), audience: z.string().max(500).optional(),
  keywords: z.array(z.string().min(1).max(80)).min(1).max(12), tone: z.array(z.string().min(1).max(80)).max(8).default([]), avoid: z.array(z.string().min(1).max(80)).max(12).default([]),
});
export const NameCandidateSchema = z.object({
  term: z.string().min(1).max(160), pronunciation: z.string().max(160).optional(), meaning: z.string().min(1).max(500),
  provenance: z.array(z.object({ language: z.string().min(1).max(80), root: z.string().min(1).max(160), gloss: z.string().min(1).max(300) })), rationale: z.string().min(1).max(500),
});
export const BrandDirectionSchema = z.object({
  summary: z.string().min(1).max(1_000), nameCandidates: z.array(NameCandidateSchema).min(1).max(12),
  palette: z.array(z.object({ name: z.string().min(1).max(80), hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/), role: z.enum(["primary", "secondary", "accent", "background", "text"]) })).min(3).max(8),
  typography: z.object({ display: z.string().min(1).max(160), body: z.string().min(1).max(160), rationale: z.string().min(1).max(500) }),
});
export type BrandBrief = z.infer<typeof BrandBriefSchema>;
export type BrandDirection = z.infer<typeof BrandDirectionSchema>;

export async function generateBrandDirection(port: AiPort, brief: BrandBrief, context: AiContext): Promise<BrandDirection> {
  const { generateObject } = await import("ai");
  const { model, provider } = await port.resolveModel(context, { provider: "google", requiredActions: ["generateContent"], preferThinking: true });
  const result = await generateObject({
    model: provider.languageModel(model.id as never), schema: BrandDirectionSchema,
    prompt: ["Create a concise, credible first brand direction.", "Use real, explainable etymology for name candidates; do not invent provenance.", "Return only values matching the supplied schema.", `Brief: ${JSON.stringify(brief)}`].join("\n\n"),
  });
  return result.object;
}
