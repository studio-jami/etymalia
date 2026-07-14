/**
 * @etymalia/ai — Credential Resolver (design sketch)
 * ---------------------------------------------------
 * Phase-0 contract for the AI port. NOT wired into a build yet — this is the
 * shape we implement in the `@etymalia/ai` package. Kept deliberately small.
 *
 * Concrete lanes (per current decisions, July 2026):
 *   - google       : API KEY primary — AI Studio (post-pay, Pro) OR Vertex SA key.
 *                    Both do text + image + video. Google OAuth kept but optional.
 *   - openai       : OAUTH only (Codex-style, auth.openai.com). No API-key lane.
 *   - xai (grok)   : OAUTH only — in-app OAuth login direct to auth.x.ai
 *                    (api:access). No API-key lane, no proxy.
 *
 * Two orthogonal ideas:
 *   1) PROVIDER   — which vendor/model family.
 *   2) CREDENTIAL — how we authenticate for a (provider, lane, user).
 * Feature code asks for a LOGICAL model; the resolver produces a fresh,
 * ready-to-use provider instance. Refresh/rotation lives behind the resolver.
 */

// ────────────────────────────────────────────────────────────────────────────
// 1. Identifiers
// ────────────────────────────────────────────────────────────────────────────

export type ProviderId = 'google' | 'google-vertex' | 'openai' | 'xai';

export type Lane = 'studio' | 'prod';

/**
 * Model discovery is provider-owned, not source-owned. The production port
 * queries each provider's model-list API at runtime, retains returned IDs and
 * capabilities in a short-lived server cache, then selects from candidates
 * matching the requested provider actions/token limits. Do not add a static
 * MODEL_REGISTRY or hardcode vendor model IDs here.
 */
export type ProviderAction = 'generateContent' | 'predict' | 'embedContent';

// ────────────────────────────────────────────────────────────────────────────
// 2. Stored credential SOURCE (what lives in Vault / server secrets)
// ────────────────────────────────────────────────────────────────────────────

export type CredentialSource =
  /** Google AI Studio key (Pro, post-pay) or any BYOK key. */
  | { type: 'apiKey'; provider: 'google'; apiKey: string }
  /** Vertex service-account key — google-auth-library mints tokens for us. */
  | {
      type: 'serviceAccount';
      provider: 'google-vertex';
      clientEmail: string;
      privateKey: string;
      project: string;
      location: string; // e.g. 'us-central1'
    }
  /** OAuth (openai, xai) — refreshable public-client token, PKCE-obtained. */
  | {
      type: 'oauth';
      provider: 'openai' | 'xai';
      accessToken: string;
      refreshToken?: string;
      expiresAt?: number;        // epoch ms; refresh when near
      tokenEndpoint: string;     // xai: https://auth.x.ai/oauth2/token
      clientId: string;          // public client
      baseURL?: string;          // optional endpoint override (normally unset)
      headers?: Record<string, string>;
    };

/**
 * Where sources come from.
 *  - studio lane: server-side secrets (our pooled accounts).
 *  - prod lane  : the user's Supabase Vault entry for that provider.
 * Implementations live server-side ONLY; never ship to the client.
 */
export interface CredentialStore {
  getSource(args: { lane: Lane; provider: ProviderId; userId?: string }): Promise<CredentialSource>;
  /** Persist a refreshed OAuth token back (rotation). */
  saveRefreshed(args: { lane: Lane; provider: ProviderId; userId?: string; token: RefreshedToken }): Promise<void>;
}

interface RefreshedToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}

// ────────────────────────────────────────────────────────────────────────────
// 3. Resolved credential (fresh, ready to attach to a provider)
// ────────────────────────────────────────────────────────────────────────────

export type ResolvedCredential =
  | { provider: 'google'; apiKey: string }
  | { provider: 'google-vertex'; project: string; location: string; clientEmail: string; privateKey: string }
  | { provider: 'openai' | 'xai'; bearerToken: string; baseURL?: string; headers?: Record<string, string> };

// ────────────────────────────────────────────────────────────────────────────
// 4. Resolver — turns a stored SOURCE into a fresh RESOLVED credential
// ────────────────────────────────────────────────────────────────────────────

const REFRESH_SKEW_MS = 60_000; // refresh a minute early

export class CredentialResolver {
  constructor(private store: CredentialStore) {}

  async resolve(args: { lane: Lane; provider: ProviderId; userId?: string }): Promise<ResolvedCredential> {
    const source = await this.store.getSource(args);

    switch (source.type) {
      case 'apiKey':
        return { provider: 'google', apiKey: source.apiKey };

      case 'serviceAccount':
        // No manual token minting: hand SA fields to the Vertex adapter,
        // which uses google-auth-library to mint/rotate access tokens.
        return {
          provider: 'google-vertex',
          project: source.project,
          location: source.location,
          clientEmail: source.clientEmail,
          privateKey: source.privateKey,
        };

      case 'oauth': {
        let { accessToken, expiresAt } = source;
        if (!expiresAt || expiresAt - Date.now() < REFRESH_SKEW_MS) {
          const fresh = await refreshOAuth(source);
          accessToken = fresh.accessToken;
          await this.store.saveRefreshed({ ...args, token: fresh });
        }
        return {
          provider: source.provider,
          bearerToken: accessToken,
          baseURL: source.baseURL,
          headers: source.headers,
        };
      }
    }
  }
}

/** RFC 6749 refresh_token grant for public clients (no secret; PKCE was used at login). */
async function refreshOAuth(s: Extract<CredentialSource, { type: 'oauth' }>): Promise<RefreshedToken> {
  if (!s.refreshToken) throw new Error(`No refresh_token for ${s.provider}; user must re-auth.`);
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: s.refreshToken,
    client_id: s.clientId,
  });
  const res = await fetch(s.tokenEndpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error(`OAuth refresh failed for ${s.provider}: ${res.status}`);
  const j = (await res.json()) as { access_token: string; refresh_token?: string; expires_in?: number };
  return {
    accessToken: j.access_token,
    refreshToken: j.refresh_token ?? s.refreshToken, // some providers rotate
    expiresAt: j.expires_in ? Date.now() + j.expires_in * 1000 : undefined,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// 5. Provider factory — ResolvedCredential → Vercel AI SDK provider
//    (Both OpenAI and xAI send `Authorization: Bearer <apiKey>`, so an OAuth
//     access token simply *is* the `apiKey` for those adapters.)
// ────────────────────────────────────────────────────────────────────────────

// import { createGoogleGenerativeAI } from '@ai-sdk/google';
// import { createVertex }             from '@ai-sdk/google-vertex';
// import { createOpenAI }             from '@ai-sdk/openai';
// import { createXai }                from '@ai-sdk/xai';

export function buildProvider(rc: ResolvedCredential) {
  switch (rc.provider) {
    case 'google':
      // return createGoogleGenerativeAI({ apiKey: rc.apiKey });
      return stub('google', rc);
    case 'google-vertex':
      // return createVertex({
      //   project: rc.project,
      //   location: rc.location,
      //   googleAuthOptions: { credentials: { client_email: rc.clientEmail, private_key: rc.privateKey } },
      // });
      return stub('google-vertex', rc);
    case 'openai':
      // return createOpenAI({ apiKey: rc.bearerToken, baseURL: rc.baseURL, headers: rc.headers });
      return stub('openai', rc);
    case 'xai':
      // return createXai({ apiKey: rc.bearerToken, baseURL: rc.baseURL, headers: rc.headers });
      return stub('xai', rc);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// 6. Public API — the one call feature code makes
// ────────────────────────────────────────────────────────────────────────────

export interface AiContext {
  lane: Lane;       // 'studio' (our pool) | 'prod' (user)
  userId?: string;  // required for prod
}

export class AiPort {
  constructor(private resolver: CredentialResolver) {}

  /** Get a ready provider + concrete model id for a logical model. */
  async model(logical: LogicalModel, ctx: AiContext) {
    const binding = MODEL_REGISTRY[logical];
    const rc = await this.resolver.resolve({ lane: ctx.lane, provider: binding.provider, userId: ctx.userId });
    const provider = buildProvider(rc);
    // Caller picks modality with the installed AI SDK, e.g.:
    //   binding.modality === 'image' ? provider.imageModel(binding.modelId)
    //                                : provider.languageModel(binding.modelId)
    return { provider, modelId: binding.modelId, modality: binding.modality };
  }
}

// Placeholder so the sketch type-checks without the @ai-sdk deps installed.
function stub(kind: string, rc: ResolvedCredential) {
  return { __kind: kind, __credential: rc } as const;
}

/*
 * Out of scope for this sketch (belongs to the login/setup flow, not the resolver):
 *   • The interactive PKCE authorize step that first obtains OAuth tokens
 *     (device flow for xai; loopback-redirect for openai). The resolver only
 *     *refreshes* and *attaches*.
 *   • Supabase Vault read/write behind CredentialStore.
 *   • Per-provider entitlement checks (what each OAuth sub actually grants) —
 *     tracked in master plan §17 "OAuth-API entitlements".
 */

