import "server-only";

import { readFile } from "node:fs/promises";
import type {
  CredentialSource,
  CredentialStore,
  Lane,
  ProviderId,
} from "@etymalia/ai";

type Environment = Record<string, string | undefined>;

type ServiceAccount = {
  client_email?: unknown;
  private_key?: unknown;
  project_id?: unknown;
};

function required(environment: Environment, name: string): string {
  const value = environment[name]?.trim();
  if (!value) {
    throw new Error(`Missing required server environment variable: ${name}`);
  }
  return value;
}

async function readServiceAccount(path: string): Promise<ServiceAccount> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as ServiceAccount;
  } catch {
    throw new Error("Unable to read the configured Vertex service-account file.");
  }
}

/**
 * Resolves only pooled Studio credentials. Production credential retrieval will
 * be a separate Supabase Vault-backed store once the Vault schema is in place.
 */
export class StudioCredentialStore implements CredentialStore {
  constructor(private readonly environment: Environment = process.env) {}

  async getSource(args: {
    lane: Lane;
    provider: ProviderId;
    userId?: string;
  }): Promise<CredentialSource> {
    if (args.lane !== "studio") {
      throw new Error("Production credentials are not configured yet.");
    }

    if (args.provider === "google") {
      return {
        type: "apiKey",
        provider: "google",
        apiKey: required(this.environment, "GEMINI_API_KEY"),
      };
    }

    const serviceAccount = await readServiceAccount(
      required(this.environment, "GOOGLE_SA_JSON_KEY_PATH"),
    );

    if (
      typeof serviceAccount.client_email !== "string" ||
      typeof serviceAccount.private_key !== "string" ||
      typeof serviceAccount.project_id !== "string"
    ) {
      throw new Error("The configured Vertex service-account file is incomplete.");
    }

    return {
      type: "serviceAccount",
      provider: "google-vertex",
      clientEmail: serviceAccount.client_email,
      privateKey: serviceAccount.private_key,
      project: serviceAccount.project_id,
      location: this.environment.GOOGLE_VERTEX_LOCATION?.trim() || "us-central1",
    };
  }
}

export function isStudioUser(userId: string): boolean {
  const configuredIds = process.env.ETYMALIA_STUDIO_USER_IDS?.split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  return configuredIds?.includes(userId) ?? false;
}
