import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";
import { task } from "@trigger.dev/sdk/v3";
import { faviconSvg, synthesizeIdentity } from "@etymalia/asset-forge";
import { createFaviconSet } from "@etymalia/asset-forge/favicon";
import { renderPngDerivatives } from "@etymalia/asset-forge/raster";
import { renderSocialKit } from "@etymalia/asset-forge/social";
import { colorHex, colorOn, isDtcgDocument } from "@etymalia/tokens";
import {
  createQueuedGenerationJob,
  updateGenerationJob,
} from "../lib/brand/jobs";

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
  records.push({
    brand_id: input.brandId,
    kind: input.kind,
    variant: input.variant ?? "",
    lockup: input.lockup ?? "",
    format: input.format,
    storage_path: input.path,
    meta: input.meta,
  });
}

export const generateFullKit = task({
  id: "generate-full-kit",
  retry: { maxAttempts: 3 },
  run: async ({ workspaceId, brandId }: FullKitPayload, { ctx }) => {
    const supabase = adminClient();
    const job = {
      workspaceId,
      brandId,
      type: "full_kit" as const,
      triggerRunId: ctx.run.id,
      attempt: ctx.attempt.number,
    };

    await createQueuedGenerationJob(supabase, job);

    try {
      await updateGenerationJob(supabase, job, "running");
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
      const identityInput = {
        name: brand.name,
        primary: colorHex(tokens, "primary", "#315d7c"),
        accent: colorHex(tokens, "accent", "#8fb8d3"),
        ink: colorHex(tokens, "ink", "#182028"),
        paper: colorHex(tokens, "paper", "#f3f1eb"),
        onPrimary: colorOn(tokens, "primary", "#ffffff"),
      };
      const identity = synthesizeIdentity(identityInput);
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

      const records: Array<Record<string, unknown>> = [];
      const socialPrefix = storagePrefix(workspaceId, brandId, "social");
      for (const asset of assets) {
        await storeAsset(supabase, records, {
          brandId,
          path: `${socialPrefix}/${asset.id}.png`,
          data: asset.png,
          contentType: "image/png",
          kind: "social",
          variant: asset.platform.toLowerCase(),
          lockup: asset.kind,
          format: "png",
          meta: { width: asset.width, height: asset.height, source: "satori-resvg" },
        });
      }

      const logoPrefix = storagePrefix(workspaceId, brandId, "logo");
      for (const asset of identity.assets) {
        await storeAsset(supabase, records, {
          brandId,
          path: `${logoPrefix}/${asset.id}.svg`,
          data: new TextEncoder().encode(asset.svg),
          contentType: "image/svg+xml",
          kind: "identity",
          variant: asset.variant,
          lockup: asset.kind,
          format: "svg",
          meta: { width: asset.width, height: asset.height, source: "deterministic-svg", sourceAssetId: asset.id },
        });
        for (const derivative of renderPngDerivatives(asset.svg, asset.id, [asset.width, asset.width * 2, asset.width * 3])) {
          await storeAsset(supabase, records, {
            brandId,
            path: `${logoPrefix}/${derivative.filename}`,
            data: derivative.png,
            contentType: derivative.contentType,
            kind: "identity",
            variant: asset.variant,
            lockup: asset.kind,
            format: "png",
            meta: { width: derivative.width, height: derivative.height, source: derivative.source, sourceAssetId: asset.id },
          });
        }
      }

      const faviconPrefix = storagePrefix(workspaceId, brandId, "favicon");
      const favicons = createFaviconSet(faviconSvg(identityInput), {
        name: brand.name,
        shortName: brand.name.slice(0, 12),
        themeColor: identityInput.primary,
        backgroundColor: identityInput.paper,
      });
      for (const artifact of favicons.artifacts) {
        const format = artifact.filename.endsWith(".svg") ? "svg"
          : artifact.filename.endsWith(".png") ? "png"
          : artifact.filename.endsWith(".ico") ? "ico" : "other";
        await storeAsset(supabase, records, {
          brandId,
          path: `${faviconPrefix}/${artifact.filename}`,
          data: artifact.data,
          contentType: artifact.contentType,
          kind: "favicon",
          variant: artifact.purpose,
          format,
          meta: { width: artifact.width, height: artifact.height, source: "deterministic-favicon" },
        });
      }

      const { error: assetError } = await supabase.from("assets").upsert(records, { onConflict: "brand_id,storage_path" });
      if (assetError) throw new Error(`Unable to register full-kit assets: ${assetError.message}`);

      await updateGenerationJob(supabase, job, "completed");
      return { count: records.length, prefixes: [socialPrefix, logoPrefix, faviconPrefix] };
    } catch (error) {
      await updateGenerationJob(supabase, job, "failed", error).catch(() => undefined);
      throw error;
    }
  },
});
