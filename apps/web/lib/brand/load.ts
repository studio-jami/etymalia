import "server-only";

import {
  isDtcgDocument,
  type DtcgDocument,
} from "@etymalia/tokens";
import type { NameProvenance, NameScores } from "@etymalia/name-engine";
import type { DomainAvailability } from "@etymalia/availability";
import { createClient } from "@/lib/supabase/server";
import { parseBriefRecord, type BrandBriefData } from "./brief";

export interface BrandRecord {
  id: string;
  workspaceId: string;
  workspaceName: string;
  name: string;
  status: string;
  brief: BrandBriefData;
}

export interface NameCandidateRecord {
  id: string;
  term: string;
  provenance: NameProvenance;
  scores: NameScores;
  availability: DomainAvailability | null;
  isShortlisted: boolean;
}

export interface BrandAssetRecord {
  id: string;
  kind: string;
  variant: string;
  lockup: string;
  format: string;
  storagePath: string;
  meta: { width?: number; height?: number; source?: string };
  createdAt: string;
  signedUrl: string | null;
}

export interface BrandGenerationJobRecord {
  id: string;
  status: "queued" | "running" | "completed" | "failed";
  errorSummary: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface LoadedBrand {
  userId: string;
  workspaceRole: "owner" | "editor" | "viewer";
  brand: BrandRecord;
  tokens: DtcgDocument | null;
  candidates: NameCandidateRecord[];
  assets: BrandAssetRecord[];
  jobs: BrandGenerationJobRecord[];
}

const UUID = /^[0-9a-fA-F-]{36}$/;

/**
 * Load a brand with its tokens and name candidates, scoped by RLS to the
 * signed-in user. Returns null when unauthenticated, when the identifiers are
 * malformed, or when the brand is not visible to the user.
 */
export async function loadBrand(
  workspaceId: string,
  brandId: string,
): Promise<LoadedBrand | null> {
  if (!UUID.test(workspaceId) || !UUID.test(brandId)) return null;

  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return null;

  const { data: brand, error: brandError } = await supabase
    .from("brands")
    .select("id, workspace_id, name, status, brief, workspaces(name)")
    .eq("id", brandId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (brandError || !brand) return null;

  const [{ data: tokenRow }, { data: candidateRows }, { data: assetRows }, { data: jobRows }, { data: membership }] = await Promise.all([
    supabase.from("brand_tokens").select("dtcg_json").eq("brand_id", brandId).maybeSingle(),
    supabase
      .from("name_candidates")
      .select("id, term, provenance, scores, availability_json, is_shortlisted")
      .eq("brand_id", brandId)
      .order("created_at", { ascending: true }),
    supabase
      .from("assets")
      .select("id, kind, variant, lockup, format, storage_path, meta, created_at")
      .eq("brand_id", brandId)
      .order("created_at", { ascending: false }),
    supabase
      .from("generation_jobs")
      .select("id, status, error_summary, created_at, started_at, completed_at")
      .eq("brand_id", brandId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("memberships")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", auth.user.id)
      .maybeSingle(),
  ]);

  const workspace = brand.workspaces as { name?: string } | { name?: string }[] | null;
  const workspaceName = Array.isArray(workspace) ? workspace[0]?.name : workspace?.name;

  const tokens = tokenRow && isDtcgDocument(tokenRow.dtcg_json)
    ? (tokenRow.dtcg_json as DtcgDocument)
    : null;

  const assets = await toBrandAssets(supabase, assetRows ?? []);

  const candidates: NameCandidateRecord[] = (candidateRows ?? []).map((row) => ({
    id: row.id as string,
    term: row.term as string,
    provenance: row.provenance as NameProvenance,
    scores: row.scores as NameScores,
    availability: hasAvailability(row.availability_json)
      ? (row.availability_json as DomainAvailability)
      : null,
    isShortlisted: Boolean(row.is_shortlisted),
  }));

  const workspaceRole = membership?.role;
  if (workspaceRole !== "owner" && workspaceRole !== "editor" && workspaceRole !== "viewer") return null;

  const jobs: BrandGenerationJobRecord[] = (jobRows ?? []).map((row) => ({
    id: row.id as string,
    status: row.status as BrandGenerationJobRecord["status"],
    errorSummary: typeof row.error_summary === "string" ? row.error_summary : null,
    createdAt: row.created_at as string,
    startedAt: typeof row.started_at === "string" ? row.started_at : null,
    completedAt: typeof row.completed_at === "string" ? row.completed_at : null,
  }));

  return {
    userId: auth.user.id,
    workspaceRole,
    brand: {
      id: brand.id as string,
      workspaceId: brand.workspace_id as string,
      workspaceName: workspaceName ?? "Workspace",
      name: brand.name as string,
      status: brand.status as string,
      brief: parseBriefRecord(brand.brief),
    },
    tokens,
    candidates,
    assets,
    jobs,
  };
}

async function toBrandAssets(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rows: Array<Record<string, unknown>>,
): Promise<BrandAssetRecord[]> {
  const paths = rows.map((row) => row.storage_path).filter((path): path is string => typeof path === "string");
  const { data: signed } = paths.length
    ? await supabase.storage.from("etymalia").createSignedUrls(paths, 60 * 10)
    : { data: [] };
  const urls = new Map((signed ?? []).map((entry) => [entry.path, entry.signedUrl ?? null]));

  return rows.map((row) => ({
    id: row.id as string,
    kind: row.kind as string,
    variant: row.variant as string,
    lockup: row.lockup as string,
    format: row.format as string,
    storagePath: row.storage_path as string,
    meta: isAssetMeta(row.meta) ? row.meta : {},
    createdAt: row.created_at as string,
    signedUrl: urls.get(row.storage_path as string) ?? null,
  }));
}

function isAssetMeta(value: unknown): value is BrandAssetRecord["meta"] {
  return Boolean(value && typeof value === "object");
}

function hasAvailability(value: unknown): boolean {
  return Boolean(value && typeof value === "object" && "status" in (value as object));
}
