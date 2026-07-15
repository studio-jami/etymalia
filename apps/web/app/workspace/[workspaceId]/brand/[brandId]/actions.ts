"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fullKitRequest } from "@etymalia/generation";
import { generateNames as generateEtymariaNames } from "@etymalia/name-engine";
import { generatePalette, paletteToDtcg } from "@etymalia/tokens";
import { checkDomainAvailability, toDomain } from "@etymalia/availability";
import { attachRunnerRun, createQueuedGenerationJob, updateGenerationJob } from "@/lib/brand/jobs";
import { briefKeywords, parseBriefForm, parseBriefRecord } from "@/lib/brand/brief";
import { generationRunner } from "@/lib/generation/trigger-runner";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-fA-F-]{36}$/;

interface Ids {
  workspaceId: string;
  brandId: string;
}

interface EditableBrand {
  supabase: Awaited<ReturnType<typeof createClient>>;
  brand: { id: string; workspace_id: string; name: string; brief: unknown; updated_at: string };
}

function ids(formData: FormData): Ids {
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const brandId = String(formData.get("brandId") ?? "");
  if (!UUID.test(workspaceId) || !UUID.test(brandId)) throw new Error("Invalid brand reference.");
  return { workspaceId, brandId };
}

function brandPath({ workspaceId, brandId }: Ids, hash = ""): string {
  return `/workspace/${workspaceId}/brand/${brandId}${hash}`;
}

function done(target: Ids, hash: string): never {
  revalidatePath(brandPath(target));
  redirect(brandPath(target, hash));
}

async function requireEditableBrand(target: Ids): Promise<EditableBrand> {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) redirect("/");

  const [{ data: brand, error: brandError }, { data: membership, error: membershipError }] = await Promise.all([
    supabase
      .from("brands")
      .select("id, workspace_id, name, brief, updated_at")
      .eq("id", target.brandId)
      .eq("workspace_id", target.workspaceId)
      .maybeSingle(),
    supabase
      .from("memberships")
      .select("role")
      .eq("workspace_id", target.workspaceId)
      .eq("user_id", auth.user.id)
      .maybeSingle(),
  ]);

  if (brandError || !brand || membershipError || (membership?.role !== "owner" && membership?.role !== "editor")) {
    done(target, "?error=forbidden");
  }

  return { supabase, brand: brand as EditableBrand["brand"] };
}

async function requireCandidate(
  supabase: Awaited<ReturnType<typeof createClient>>,
  target: Ids,
  candidateId: string,
): Promise<{ id: string; term: string }> {
  if (!UUID.test(candidateId)) done(target, "?error=names#names");
  const { data: candidate, error } = await supabase
    .from("name_candidates")
    .select("id, term")
    .eq("id", candidateId)
    .eq("brand_id", target.brandId)
    .maybeSingle();
  if (error || !candidate) done(target, "?error=names#names");
  return candidate as { id: string; term: string };
}

export async function saveBrief(formData: FormData) {
  const target = ids(formData);
  const { supabase } = await requireEditableBrand(target);
  const brief = parseBriefForm(formData);

  const { error } = await supabase.from("brands").update({ brief }).eq("id", target.brandId).eq("workspace_id", target.workspaceId);
  if (error) done(target, "?error=brief#brief");
  done(target, "#brief");
}

export async function generateNames(formData: FormData) {
  const target = ids(formData);
  const { supabase, brand } = await requireEditableBrand(target);
  const brief = parseBriefRecord(brand.brief);
  const keywords = briefKeywords(brief);
  if (!keywords.length) done(target, "?error=brief-needed#names");

  const names = generateEtymariaNames({ keywords, tone: brief.tone, count: 12 });
  if (!names.length) done(target, "?error=names#names");

  const { error } = await supabase.rpc("replace_name_candidates", {
    target_brand_id: target.brandId,
    replacements: names.map((name) => ({
      term: name.term.slice(0, 160),
      provenance: name.provenance,
      scores: name.scores,
    })),
  });
  if (error) done(target, "?error=names#names");
  done(target, "#names");
}

export async function useName(formData: FormData) {
  const target = ids(formData);
  const { supabase } = await requireEditableBrand(target);
  const term = String(formData.get("term") ?? "").trim().slice(0, 160);
  if (!term) done(target, "?error=select#names");

  const { data: candidate, error: candidateError } = await supabase
    .from("name_candidates")
    .select("term")
    .eq("brand_id", target.brandId)
    .eq("term", term)
    .maybeSingle();
  if (candidateError || !candidate) done(target, "?error=select#names");

  const { error } = await supabase.from("brands").update({ name: term }).eq("id", target.brandId).eq("workspace_id", target.workspaceId);
  if (error) done(target, "?error=select#names");
  done(target, "#names");
}

export async function toggleShortlist(formData: FormData) {
  const target = ids(formData);
  const { supabase } = await requireEditableBrand(target);
  const candidate = await requireCandidate(supabase, target, String(formData.get("candidateId") ?? ""));
  const shortlist = String(formData.get("shortlist") ?? "") === "true";

  const { error } = await supabase.from("name_candidates").update({ is_shortlisted: shortlist }).eq("id", candidate.id).eq("brand_id", target.brandId);
  if (error) done(target, "?error=names#names");
  done(target, "#names");
}

export async function checkDomain(formData: FormData) {
  const target = ids(formData);
  const { supabase } = await requireEditableBrand(target);
  const candidate = await requireCandidate(supabase, target, String(formData.get("candidateId") ?? ""));
  const availability = await checkDomainAvailability(toDomain(candidate.term, "com"));

  const { error } = await supabase.from("name_candidates").update({ availability_json: availability }).eq("id", candidate.id).eq("brand_id", target.brandId);
  if (error) done(target, "?error=names#names");
  done(target, "#names");
}

export async function generateFullKit(formData: FormData) {
  const target = ids(formData);
  const { supabase, brand } = await requireEditableBrand(target);
  const { data: tokenRow, error: tokenError } = await supabase
    .from("brand_tokens")
    .select("version")
    .eq("brand_id", target.brandId)
    .maybeSingle();
  if (tokenError || !tokenRow) done(target, "?error=export-needs-palette#identity");

  const request = fullKitRequest({
    workspaceId: target.workspaceId,
    brandId: target.brandId,
    inputVersion: { tokenVersion: tokenRow.version as number, brandUpdatedAt: brand.updated_at },
    idempotencyKey: `full-kit:${target.brandId}:${tokenRow.version}:${brand.updated_at}`,
  });

  const admin = createAdminClient();
  const job = await createQueuedGenerationJob(admin, {
    id: crypto.randomUUID(),
    workspaceId: target.workspaceId,
    brandId: target.brandId,
    type: "full_kit",
    request,
  });

  try {
    const { runId } = await generationRunner().enqueue({ jobId: job.id, idempotencyKey: request.idempotencyKey });
    await attachRunnerRun(admin, job.id, "trigger", runId);
  } catch (error) {
    await updateGenerationJob(admin, job.id, "failed", error).catch(() => undefined);
    done(target, "?error=full-kit#identity");
  }

  done(target, `?job=${job.id}#identity`);
}

export async function generateBrandPalette(formData: FormData) {
  const target = ids(formData);
  const { supabase, brand } = await requireEditableBrand(target);
  const brief = parseBriefRecord(brand.brief);
  const seed = [brand.name, brief.industry, ...brief.keywords, ...brief.tone].filter(Boolean).join(" ") || brand.name;
  const palette = generatePalette({ seed });
  const dtcg = paletteToDtcg(palette);

  const { data: current, error: currentError } = await supabase
    .from("brand_tokens")
    .select("version")
    .eq("brand_id", target.brandId)
    .maybeSingle();
  if (currentError) done(target, "?error=palette#palette");

  const { error } = await supabase
    .from("brand_tokens")
    .upsert({ brand_id: target.brandId, dtcg_json: dtcg, version: (current?.version as number | undefined ?? 0) + 1 }, { onConflict: "brand_id" });
  if (error) done(target, "?error=palette#palette");
  done(target, "#palette");
}
