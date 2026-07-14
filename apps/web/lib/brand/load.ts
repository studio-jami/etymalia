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

export interface LoadedBrand {
  userId: string;
  brand: BrandRecord;
  tokens: DtcgDocument | null;
  candidates: NameCandidateRecord[];
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

  const [{ data: tokenRow }, { data: candidateRows }] = await Promise.all([
    supabase.from("brand_tokens").select("dtcg_json").eq("brand_id", brandId).maybeSingle(),
    supabase
      .from("name_candidates")
      .select("id, term, provenance, scores, availability_json, is_shortlisted")
      .eq("brand_id", brandId)
      .order("created_at", { ascending: true }),
  ]);

  const workspace = brand.workspaces as { name?: string } | { name?: string }[] | null;
  const workspaceName = Array.isArray(workspace) ? workspace[0]?.name : workspace?.name;

  const tokens = tokenRow && isDtcgDocument(tokenRow.dtcg_json)
    ? (tokenRow.dtcg_json as DtcgDocument)
    : null;

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

  return {
    userId: auth.user.id,
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
  };
}

function hasAvailability(value: unknown): boolean {
  return Boolean(value && typeof value === "object" && "status" in (value as object));
}
