import { NextResponse } from "next/server";
import { dtcgToCss, readColors } from "@etymalia/tokens";
import { buildBrandKit, type KitName } from "@etymalia/exporters";
import { loadBrand } from "@/lib/brand/load";
import { buildIdentity } from "@/lib/brand/identity";

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
