import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";
import { task } from "@trigger.dev/sdk/v3";
import { synthesizeIdentity } from "@etymalia/asset-forge";
import { renderSocialKit } from "@etymalia/asset-forge/social";
import { colorHex, colorOn, isDtcgDocument } from "@etymalia/tokens";

interface FullKitPayload {
  workspaceId: string;
  brandId: string;
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

function storagePrefix(workspaceId: string, brandId: string): string {
  return `workspace/${workspaceId}/brand/${brandId}/social`;
}

export const generateFullKit = task({
  id: "generate-full-kit",
  retry: { maxAttempts: 3 },
  run: async ({ workspaceId, brandId }: FullKitPayload) => {
    const supabase = adminClient();
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
    const identity = synthesizeIdentity({
      name: brand.name,
      primary: colorHex(tokens, "primary", "#315d7c"),
      accent: colorHex(tokens, "accent", "#8fb8d3"),
      ink: colorHex(tokens, "ink", "#182028"),
      paper: colorHex(tokens, "paper", "#f3f1eb"),
      onPrimary: colorOn(tokens, "primary", "#ffffff"),
    });
    const brief = brand.brief && typeof brand.brief === "object" ? brand.brief as { description?: unknown } : {};
    const taskFont = await readFile(
      resolve(process.cwd(), "trigger/fonts/inter-latin-400-normal.woff"),
    );
    const assets = await renderSocialKit({
      name: brand.name,
      tagline: typeof brief.description === "string" ? brief.description : "",
      primary: colorHex(tokens, "primary", "#315d7c"),
      accent: colorHex(tokens, "accent", "#8fb8d3"),
      ink: colorHex(tokens, "ink", "#182028"),
      paper: colorHex(tokens, "paper", "#f3f1eb"),
      monogram: identity.monogram,
    }, taskFont);

    const prefix = storagePrefix(workspaceId, brandId);
    const records: Array<Record<string, unknown>> = [];
    for (const asset of assets) {
      const path = `${prefix}/${asset.id}.png`;
      const { error: uploadError } = await supabase.storage.from("etymalia").upload(path, asset.png, {
        contentType: "image/png",
        upsert: true,
      });
      if (uploadError) throw new Error(`Unable to store ${asset.id}: ${uploadError.message}`);
      records.push({
        brand_id: brandId,
        kind: "social",
        variant: asset.platform.toLowerCase(),
        lockup: asset.kind,
        format: "png",
        storage_path: path,
        meta: { width: asset.width, height: asset.height, source: "satori-resvg" },
      });
    }

    const { error: assetError } = await supabase.from("assets").upsert(records, { onConflict: "brand_id,storage_path" });
    if (assetError) throw new Error(`Unable to register full-kit assets: ${assetError.message}`);
    return { count: assets.length, prefix };
  },
});
