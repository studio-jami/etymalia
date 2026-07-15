import { createFaviconSet } from "./favicon";
import { faviconSvg, synthesizeIdentity, type IdentityInput } from "./index";
import { renderPngDerivatives } from "./raster";
import { renderSocialKit } from "./social";

export type FullKitArtifactCategory = "social" | "logo" | "favicon";
export type FullKitArtifactFormat = "svg" | "png" | "ico" | "other";

export interface FullKitRenderInput extends IdentityInput {
  tagline: string;
}

/** A persisted-artifact-ready value with no runner, storage, or database concern. */
export interface FullKitArtifact {
  category: FullKitArtifactCategory;
  filename: string;
  data: Uint8Array;
  contentType: string;
  kind: string;
  variant?: string;
  lockup?: string;
  format: FullKitArtifactFormat;
  meta: Record<string, unknown>;
}

/**
 * Render the complete deterministic brand kit in memory. Callers own job
 * lifecycle, storage paths, and artifact persistence so this remains portable
 * between Trigger and the Cloudflare Container runtime.
 */
export async function renderFullKit(input: FullKitRenderInput): Promise<FullKitArtifact[]> {
  const identity = synthesizeIdentity(input);
  const artifacts: FullKitArtifact[] = [];

  const socialAssets = await renderSocialKit({
    name: input.name,
    tagline: input.tagline,
    primary: input.primary,
    accent: input.accent,
    ink: input.ink,
    paper: input.paper,
    monogram: identity.monogram,
  });

  for (const asset of socialAssets) {
    artifacts.push({
      category: "social",
      filename: `${asset.id}.png`,
      data: asset.png,
      contentType: "image/png",
      kind: "social",
      variant: asset.platform.toLowerCase(),
      lockup: asset.kind,
      format: "png",
      meta: { width: asset.width, height: asset.height, source: "satori-resvg" },
    });
  }

  for (const asset of identity.assets) {
    artifacts.push({
      category: "logo",
      filename: `${asset.id}.svg`,
      data: new TextEncoder().encode(asset.svg),
      contentType: "image/svg+xml",
      kind: "identity",
      variant: asset.variant,
      lockup: asset.kind,
      format: "svg",
      meta: { width: asset.width, height: asset.height, source: "deterministic-svg", sourceAssetId: asset.id },
    });

    for (const derivative of renderPngDerivatives(asset.svg, asset.id, [asset.width, asset.width * 2, asset.width * 3])) {
      artifacts.push({
        category: "logo",
        filename: derivative.filename,
        data: derivative.png,
        contentType: derivative.contentType,
        kind: "identity",
        variant: asset.variant,
        lockup: asset.kind,
        format: "png",
        meta: {
          width: derivative.width,
          height: derivative.height,
          source: derivative.source,
          sourceAssetId: asset.id,
        },
      });
    }
  }

  const favicons = createFaviconSet(faviconSvg(input), {
    name: input.name,
    shortName: input.name.slice(0, 12),
    themeColor: input.primary,
    backgroundColor: input.paper,
  });

  for (const artifact of favicons.artifacts) {
    const format: FullKitArtifactFormat = artifact.filename.endsWith(".svg")
      ? "svg"
      : artifact.filename.endsWith(".png")
        ? "png"
        : artifact.filename.endsWith(".ico")
          ? "ico"
          : "other";
    artifacts.push({
      category: "favicon",
      filename: artifact.filename,
      data: artifact.data,
      contentType: artifact.contentType,
      kind: "favicon",
      variant: artifact.purpose,
      format,
      meta: { width: artifact.width, height: artifact.height, source: "deterministic-favicon" },
    });
  }

  return artifacts;
}
