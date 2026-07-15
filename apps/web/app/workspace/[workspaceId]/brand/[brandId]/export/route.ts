import { NextResponse } from "next/server";
import { dtcgToCss, readColors } from "@etymalia/tokens";
import { buildBrandKit, type KitGeneratedAsset, type KitName } from "@etymalia/exporters";
import { loadBrand } from "@/lib/brand/load";
import { buildIdentity } from "@/lib/brand/identity";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function slugify(name: string): string {
  return name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "brand";
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string; brandId: string }> },
) {
  const { workspaceId, brandId } = await params;
  const loaded = await loadBrand(workspaceId, brandId);

  if (!loaded) {
    return NextResponse.json({ error: "Brand not found." }, { status: 404 });
  }

  if (!loaded.tokens) {
    const url = new URL(`/workspace/${workspaceId}/brand/${brandId}?error=export-needs-palette#palette`, request.url);
    return NextResponse.redirect(url, { status: 303 });
  }

  const { brand, tokens, candidates } = loaded;
  const slug = slugify(brand.name);
  const bundle = buildIdentity(brand.name, tokens);

  const shortlisted = candidates.filter((candidate) => candidate.isShortlisted);
  const included = shortlisted.length ? shortlisted : candidates;
  const names: KitName[] = included.map((candidate) => ({
    term: candidate.term,
    strategy: candidate.provenance?.strategy ?? "",
    note: candidate.provenance?.note ?? "",
    composite: candidate.scores?.composite ?? 0,
  }));

  const supabase = await createClient();
  let generatedAssets: KitGeneratedAsset[];
  try {
    generatedAssets = await Promise.all(
      loaded.assets
      .map((asset) => ({
        asset,
        directory: asset.kind === "social" ? "social" as const
          : asset.kind === "identity" ? "logo" as const
          : asset.kind === "favicon" ? "favicon" as const
          : null,
      }))
      .filter((entry): entry is { asset: typeof entry.asset; directory: "social" | "logo" | "favicon" } => entry.directory !== null)
      .map(async ({ asset, directory }) => {
        const { data, error } = await supabase.storage.from("etymalia").download(asset.storagePath);
        if (error || !data) {
          throw new Error(`Selected asset is unavailable: ${asset.id}`);
        }
        return {
          directory,
          filename: asset.storagePath.split("/").at(-1) ?? "",
          bytes: new Uint8Array(await data.arrayBuffer()),
        };
      }),
    );
  } catch {
    return NextResponse.json(
      { error: "A selected generated asset is unavailable. Regenerate the asset before exporting." },
      { status: 409 },
    );
  }

  const kit = buildBrandKit({
    brandName: brand.name,
    slug,
    generatedAt: new Date().toISOString().slice(0, 10),
    logos: bundle.identity.assets.map((asset) => ({
      filename: `${asset.id}.svg`,
      label: asset.label,
      svg: asset.svg,
    })),
    faviconSvg: bundle.faviconSvg,
    webManifest: bundle.webManifest,
    headSnippet: bundle.headSnippet,
    tokensJson: tokens,
    tokensCss: dtcgToCss(tokens),
    names,
    palette: readColors(tokens).map((color) => ({
      role: color.role,
      hex: color.hex,
      oklch: color.oklch,
    })),
    generatedAssets,
  });

  const body = new Blob([new Uint8Array(kit.bytes)], { type: "application/zip" });
  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="${kit.filename}"`,
      "cache-control": "no-store",
    },
  });
}
