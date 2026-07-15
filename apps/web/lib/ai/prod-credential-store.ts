import "server-only";

import type {
  CredentialSource,
  CredentialStore,
  Lane,
  ProviderId,
} from "@etymalia/ai";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function authenticatedUserId(expectedUserId?: string): Promise<string> {
  const sessionClient = await createClient();
  const { data, error } = await sessionClient.auth.getUser();
  if (error || !data.user) {
    throw new Error("You must be signed in to use a production credential.");
  }
  if (expectedUserId && expectedUserId !== data.user.id) {
    throw new Error("Production credentials can only be resolved for the authenticated user.");
  }
  return data.user.id;
}

/**
 * Resolves a user-managed credential through the service-role-only Vault RPC.
 * The secret is never available to browser clients or authenticated Data API
 * callers; it exists in memory only for the provider request.
 */
export class ProductionCredentialStore implements CredentialStore {
  async getSource(args: {
    lane: Lane;
    provider: ProviderId;
    userId?: string;
  }): Promise<CredentialSource> {
    if (args.lane !== "prod") {
      throw new Error("ProductionCredentialStore only supports the production lane.");
    }
    if (args.provider !== "google") {
      throw new Error(`No production credential source is configured for ${args.provider}.`);
    }

    const { data, error } = await createAdminClient().rpc(
      "get_user_google_ai_credential",
      { target_user_id: await authenticatedUserId(args.userId) }
    );

    if (error) {
      throw new Error("Unable to resolve the user-managed Google credential.");
    }
    if (typeof data !== "string" || !data.trim()) {
      throw new Error("No Google AI credential is configured for this user.");
    }

    return { type: "apiKey", provider: "google", apiKey: data };
  }
}

/**
 * Persists a user-supplied Google key from an authenticated Server Action or
 * Route Handler. Do not call this from a Client Component or log its argument.
 */
export async function saveProductionGoogleCredential(apiKey: string): Promise<void> {
  const value = apiKey.trim();
  if (!value) {
    throw new Error("A Google API key is required.");
  }

  const sessionClient = await createClient();
  const { data, error } = await sessionClient.auth.getUser();
  if (error || !data.user) {
    throw new Error("You must be signed in to save an AI credential.");
  }

  const { error: saveError } = await createAdminClient().rpc(
    "set_user_google_ai_credential",
    { target_user_id: data.user.id, api_key: value },
  );
  if (saveError) {
    throw new Error("Unable to save the user-managed Google credential.");
  }
}
