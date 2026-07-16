import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import WebSocket from "ws";
import { task } from "@trigger.dev/sdk/v3";
import { renderFullKit } from "@etymalia/asset-forge/full-kit";
import { colorHex, colorOn, isDtcgDocument } from "@etymalia/tokens";
import {
  attachRunnerRun,
  loadGenerationJob,
  updateGenerationJob,
} from "../lib/brand/jobs";

interface FullKitPayload {
  jobId: string;
}

function adminClient() {
  if (!globalThis.WebSocket) {
    globalThis.WebSocket = WebSocket as unknown as typeof globalThis.WebSocket;
  }

  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) throw new Error("Supabase job credentials are not configured.");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function storagePrefix(workspaceId: string, brandId: string, category: "social" | "logo" | "favicon"): string {
  return `workspace/${workspaceId}/brand/${brandId}/${category}`;
}

async function storeAsset(
  supabase: ReturnType<typeof adminClient>,
  records: Array<Record<string, unknown>>,
  input: {
    brandId: string;
    path: string;
    data: Uint8Array;
    contentType: string;
    kind: string;
    variant?: string;
    lockup?: string;
    format: "svg" | "png" | "ico" | "html" | "other";
    meta: Record<string, unknown>;
  },
): Promise<void> {
  const { error } = await supabase.storage.from("etymalia").upload(input.path, input.data, {
    contentType: input.contentType,
    upsert: true,
  });
  if (error) throw new Error(`Unable to store ${input.path}: ${error.message}`);
  const record = {
    brand_id: input.brandId,
    kind: input.kind,
    variant: input.variant ?? "",
    lockup: input.lockup ?? "",
    format: input.format,
    storage_path: input.path,
    meta: input.meta,
  };
  const { error: assetError } = await supabase.from("assets").upsert(record, {
    onConflict: "brand_id,storage_path",
  });
  if (assetError) throw new Error(`Unable to register ${input.path}: ${assetError.message}`);
  records.push(record);
}

export const generateFullKit = task({
  id: "generate-full-kit",
  retry: { maxAttempts: 3 },
  run: async ({ jobId }: FullKitPayload, { ctx }) => {
    const supabase = adminClient();
    const job = await loadGenerationJob(supabase, jobId);
    const { workspaceId, brandId } = job;

    await attachRunnerRun(supabase, jobId, "trigger", ctx.run.id);

    try {
      await updateGenerationJob(supabase, jobId, "running");
      const { data: brand, error: brandError } = await supabase
        .from("brands")
        .select("id, workspace_id, name, brief")
        .eq("id", brandId)
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      if (brandError || !brand) throw new Error("Brand no longer exists in the requested workspace.");

      const { data: tokenRow, error: tokenError } = await supabase
        .from("brand_tokens")
        .select("dtcg_json")
        .eq("brand_id", brandId)
        .maybeSingle();
      if (tokenError || !tokenRow || !isDtcgDocument(tokenRow.dtcg_json)) {
        throw new Error("A valid DTCG palette is required before a full kit can be generated.");
      }

      const tokens = tokenRow.dtcg_json;
      const brief = brand.brief && typeof brand.brief === "object" ? brand.brief as { description?: unknown } : {};
      const fontData = await readFile(join(process.cwd(), "trigger", "fonts", "inter-latin-400-normal.woff"));
      const artifacts = await renderFullKit({
        name: brand.name,
        tagline: typeof brief.description === "string" ? brief.description : "",
        primary: colorHex(tokens, "primary", "#315d7c"),
        accent: colorHex(tokens, "accent", "#8fb8d3"),
        ink: colorHex(tokens, "ink", "#182028"),
        paper: colorHex(tokens, "paper", "#f3f1eb"),
        onPrimary: colorOn(tokens, "primary", "#ffffff"),
        fontData,
      });

      const records: Array<Record<string, unknown>> = [];
      for (const artifact of artifacts) {
        await storeAsset(supabase, records, {
          brandId,
          path: `${storagePrefix(workspaceId, brandId, artifact.category)}/${artifact.filename}`,
          data: artifact.data,
          contentType: artifact.contentType,
          kind: artifact.kind,
          variant: artifact.variant,
          lockup: artifact.lockup,
          format: artifact.format,
          meta: artifact.meta,
        });
      }

      const prefixes = ["social", "logo", "favicon"].map((category) => storagePrefix(workspaceId, brandId, category as "social" | "logo" | "favicon"));

      await updateGenerationJob(supabase, jobId, "completed");
      return { count: records.length, prefixes };
    } catch (error) {
      await updateGenerationJob(supabase, jobId, "failed", error).catch(() => undefined);
      throw error;
    }
  },
});
