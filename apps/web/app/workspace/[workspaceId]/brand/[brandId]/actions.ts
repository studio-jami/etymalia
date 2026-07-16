"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertGenerationRequest, fullKitRequest } from "@etymalia/generation";
import { generateNames as generateEtymariaNames, type NameStrategy } from "@etymalia/name-engine";
import { generatePalette, paletteFromHexes, paletteToDtcg, type ColorRole } from "@etymalia/tokens";
import { checkDomainAvailability, toDomain } from "@etymalia/availability";
import { attachRunnerRun, createQueuedGenerationJob, updateGenerationJob } from "@/lib/brand/jobs";
import { briefKeywords, parseBriefForm, parseBriefRecord } from "@/lib/brand/brief";
import { generationRunner } from "@/lib/generation/trigger-runner";
import { configuredCloudflareRunner } from "@/lib/generation/cloudflare-runner";
import { createAdminClient } from "@/lib/supabase/admin";
import { consumeGenerationCredit, refundGenerationCredit } from "@/lib/billing/entitlements";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-fA-F-]{36}$/;

interface Ids {
  workspaceId: string;
  brandId: string;
}

interface EditableBrand {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  brand: { id: string; workspace_id: string; name: string; brief: unknown; identity_recipe: unknown; updated_at: string };
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
      .select("id, workspace_id, name, brief, identity_recipe, updated_at")
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

  return { supabase, userId: auth.user.id, brand: brand as EditableBrand["brand"] };
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

  const strategies = formData.getAll("strategies").filter(isNameStrategy);
  const preferredLayers = formData.getAll("eras").filter(isEraLayer);
  const count = clampInteger(formData.get("count"), 12, 6, 40);
  const maxSyllables = clampInteger(formData.get("maxSyllables"), 4, 2, 6);
  const names = generateEtymariaNames({
    keywords,
    tone: brief.tone,
    count,
    maxSyllables,
    strategies,
    preferredLayers,
    exclusions: String(formData.get("exclusions") ?? "").split(/[\n,]/).map((value) => value.trim()).filter(Boolean).slice(0, 20),
  });
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

export async function addManualName(formData: FormData) {
  const target = ids(formData);
  const { supabase } = await requireEditableBrand(target);
  const term = String(formData.get("term") ?? "").replace(/\s+/g, " ").trim().slice(0, 160);
  if (!term) done(target, "?error=names#names");
  const { error } = await supabase.from("name_candidates").insert({
    brand_id: target.brandId,
    term,
    provenance: { strategy: "curated", roots: [], note: "Added manually in the naming studio.", sources: [] },
    scores: { meaningFit: 0, pronounceability: 0, brevity: 0, distinctiveness: 0, composite: 0 },
  });
  if (error) done(target, "?error=names#names");
  done(target, "#names");
}

export async function saveDirection(formData: FormData) {
  const target = ids(formData);
  const { supabase, userId, brand } = await requireEditableBrand(target);
  const name = String(formData.get("name") ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
  if (!name) done(target, "?error=direction#directions");

  const [{ data: tokens }, { data: candidates }] = await Promise.all([
    supabase.from("brand_tokens").select("dtcg_json, version").eq("brand_id", target.brandId).maybeSingle(),
    supabase.from("name_candidates").select("term, provenance, scores, availability_json, is_shortlisted").eq("brand_id", target.brandId).order("created_at", { ascending: true }),
  ]);
  if (!tokens?.dtcg_json) done(target, "?error=export-needs-palette#directions");

  const snapshot = {
    name: brand.name,
    brief: parseBriefRecord(brand.brief),
    tokens: tokens.dtcg_json,
    tokenVersion: tokens.version,
    identityRecipe: brand.identity_recipe,
    candidates: (candidates ?? []).map((candidate) => ({
      term: candidate.term,
      provenance: candidate.provenance,
      scores: candidate.scores,
      availability: candidate.availability_json,
      isShortlisted: candidate.is_shortlisted,
    })),
  };
  const { error } = await supabase.from("brand_directions").insert({
    brand_id: target.brandId,
    name,
    snapshot,
    created_by: userId,
  });
  if (error) done(target, "?error=direction#directions");
  done(target, "#directions");
}

export async function activateDirection(formData: FormData) {
  const target = ids(formData);
  const { supabase } = await requireEditableBrand(target);
  const directionId = String(formData.get("directionId") ?? "");
  if (!UUID.test(directionId)) done(target, "?error=direction#directions");
  const { error } = await supabase.rpc("activate_brand_direction", { target_direction_id: directionId });
  if (error) done(target, "?error=direction#directions");
  done(target, "#directions");
}

export async function archiveDirection(formData: FormData) {
  const target = ids(formData); const { supabase } = await requireEditableBrand(target);
  const directionId = String(formData.get("directionId") ?? ""); if (!UUID.test(directionId)) done(target, "?error=direction#directions");
  const { error } = await supabase.from("brand_directions").update({ status: "archived", is_active: false }).eq("id", directionId).eq("brand_id", target.brandId);
  if (error) done(target, "?error=direction#directions"); done(target, "#directions");
}

export async function duplicateDirection(formData: FormData) {
  const target = ids(formData); const { supabase, userId } = await requireEditableBrand(target);
  const directionId = String(formData.get("directionId") ?? ""); if (!UUID.test(directionId)) done(target, "?error=direction#directions");
  const { data } = await supabase.from("brand_directions").select("name, snapshot").eq("id", directionId).eq("brand_id", target.brandId).maybeSingle();
  if (!data) done(target, "?error=direction#directions");
  const { error } = await supabase.from("brand_directions").insert({ brand_id: target.brandId, name: `${String(data.name).slice(0, 110)} copy`, snapshot: data.snapshot, created_by: userId });
  if (error) done(target, "?error=direction#directions"); done(target, "#directions");
}

export async function renameDirection(formData: FormData) {
  const target = ids(formData); const { supabase } = await requireEditableBrand(target);
  const directionId = String(formData.get("directionId") ?? ""); const name = String(formData.get("name") ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
  if (!UUID.test(directionId) || !name) done(target, "?error=direction#directions");
  const { error } = await supabase.from("brand_directions").update({ name }).eq("id", directionId).eq("brand_id", target.brandId);
  if (error) done(target, "?error=direction#directions"); done(target, "#directions");
}

const REFERENCE_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_REFERENCE_BYTES = 10 * 1024 * 1024;

export async function uploadReference(formData: FormData) {
  const target = ids(formData); const { supabase } = await requireEditableBrand(target);
  const file = formData.get("reference");
  if (!(file instanceof File) || !REFERENCE_MIME.has(file.type) || file.size < 1 || file.size > MAX_REFERENCE_BYTES) done(target, "?error=reference#references");
  const { count } = await supabase.from("brand_references").select("id", { count: "exact", head: true }).eq("brand_id", target.brandId);
  if ((count ?? 0) >= 12) done(target, "?error=reference#references");
  const extension = file.type.split("/")[1]; const path = `workspace/${target.workspaceId}/brand/${target.brandId}/references/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage.from("etymalia").upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false });
  if (uploadError) done(target, "?error=reference#references");
  const { error } = await supabase.from("brand_references").insert({ brand_id: target.brandId, storage_path: path, kind: "image", title: file.name.slice(0, 160), mime_type: file.type, byte_size: file.size });
  if (error) { await supabase.storage.from("etymalia").remove([path]); done(target, "?error=reference#references"); } done(target, "#references");
}

export async function deleteReference(formData: FormData) {
  const target = ids(formData); const { supabase } = await requireEditableBrand(target); const referenceId = String(formData.get("referenceId") ?? "");
  if (!UUID.test(referenceId)) done(target, "?error=reference#references");
  const { data } = await supabase.from("brand_references").select("storage_path").eq("id", referenceId).eq("brand_id", target.brandId).maybeSingle();
  if (!data) done(target, "?error=reference#references");
  const { error } = await supabase.storage.from("etymalia").remove([data.storage_path]);
  if (error) done(target, "?error=reference#references");
  const { error: deleteError } = await supabase.from("brand_references").delete().eq("id", referenceId).eq("brand_id", target.brandId);
  if (deleteError) done(target, "?error=reference#references"); done(target, "#references");
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
  const { supabase, brand, userId } = await requireEditableBrand(target);
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

  if (!await consumeGenerationCredit(supabase, job.id)) {
    await admin.from("generation_jobs").delete().eq("id", job.id);
    done(target, "?error=credits-needed#identity");
  }

  try {
    const { runId } = await generationRunner().enqueue({ jobId: job.id, idempotencyKey: request.idempotencyKey });
    await attachRunnerRun(admin, job.id, "trigger", runId);
  } catch (error) {
    await updateGenerationJob(admin, job.id, "failed", error).catch(() => undefined);
    await refundGenerationCredit(admin, userId, job.id).catch(() => undefined);
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

export async function generateSelection(formData: FormData) {
  const target = ids(formData);
  const { supabase, brand, userId } = await requireEditableBrand(target);
  const selection = String(formData.get("selection") ?? "");
  const requested = selection === "identity" ? [{ kind: "identity" }] : selection === "social" ? [{ kind: "social" }] : selection === "favicon" ? [{ kind: "favicon" }] : null;
  if (!requested) done(target, "?error=full-kit#identity");
  const { data: tokenRow } = await supabase.from("brand_tokens").select("version").eq("brand_id", target.brandId).maybeSingle();
  if (!tokenRow) done(target, "?error=export-needs-palette#identity");
  const request = assertGenerationRequest({
    workspaceId: target.workspaceId, brandId: target.brandId,
    scope: requested.length === 1 ? "collection" : "asset", requested,
    inputVersion: { tokenVersion: tokenRow.version as number, brandUpdatedAt: brand.updated_at }, priority: "interactive",
    idempotencyKey: `selection:${selection}:${target.brandId}:${tokenRow.version}:${brand.updated_at}`,
  });
  const admin = createAdminClient();
  const job = await createQueuedGenerationJob(admin, { id: crypto.randomUUID(), workspaceId: target.workspaceId, brandId: target.brandId, type: "full_kit", request });
  if (!await consumeGenerationCredit(supabase, job.id)) { await admin.from("generation_jobs").delete().eq("id", job.id); done(target, "?error=credits-needed#identity"); }
  try { const { runId } = await generationRunner().enqueue({ jobId: job.id, idempotencyKey: request.idempotencyKey }); await attachRunnerRun(admin, job.id, configuredCloudflareRunner() ? "cloudflare" : "trigger", runId); }
  catch (error) { await updateGenerationJob(admin, job.id, "failed", error).catch(() => undefined); await refundGenerationCredit(admin, userId, job.id).catch(() => undefined); done(target, "?error=full-kit#identity"); }
  done(target, `?job=${job.id}#identity`);
}

export async function savePalette(formData: FormData) {
  const target = ids(formData);
  const { supabase, brand } = await requireEditableBrand(target);
  const roles: ColorRole[] = ["primary", "secondary", "accent", "ink", "paper", "muted"];
  const colors = Object.fromEntries(roles.map((role) => [role, String(formData.get(role) ?? "")])) as Partial<Record<ColorRole, string>>;
  let dtcg;
  try {
    dtcg = paletteToDtcg(paletteFromHexes(colors, brand.name));
  } catch {
    done(target, "?error=palette#palette");
  }
  const { data: current, error: currentError } = await supabase.from("brand_tokens").select("version").eq("brand_id", target.brandId).maybeSingle();
  if (currentError) done(target, "?error=palette#palette");
  const { error } = await supabase.from("brand_tokens").upsert({ brand_id: target.brandId, dtcg_json: dtcg, version: (current?.version as number | undefined ?? 0) + 1 }, { onConflict: "brand_id" });
  if (error) done(target, "?error=palette#palette");
  done(target, "#palette");
}

export async function saveIdentityRecipe(formData: FormData) {
  const target = ids(formData);
  const { supabase } = await requireEditableBrand(target);
  const pick = (field: string, allowed: readonly string[], fallback: string) => {
    const value = String(formData.get(field) ?? "");
    return allowed.includes(value) ? value : fallback;
  };
  const identity_recipe = {
    mark: pick("mark", ["rounded", "square", "circle"], "rounded"),
    lockup: pick("lockup", ["horizontal", "stacked"], "horizontal"),
    type: pick("type", ["editorial", "modern", "grotesk"], "editorial"),
    tracking: pick("tracking", ["tight", "normal", "wide"], "tight"),
  };
  const { error } = await supabase.from("brands").update({ identity_recipe }).eq("id", target.brandId).eq("workspace_id", target.workspaceId);
  if (error) done(target, "?error=identity#identity");
  done(target, "#identity");
}

const ERA_LAYERS = new Set([
  "ancientGreek", "classicalLatin", "sanskrit", "oldFrench", "pie", "vulgarLatin",
  "persian", "arabic", "oldNorse", "oldEnglish", "middleEnglish", "protoGermanic", "celtic", "hebrew",
]);
const NAME_STRATEGIES = new Set<NameStrategy>(["curated", "affixation", "portmanteau", "compound", "truncation"]);

function isEraLayer(value: FormDataEntryValue): value is string {
  return typeof value === "string" && ERA_LAYERS.has(value);
}

function isNameStrategy(value: FormDataEntryValue): value is NameStrategy {
  return typeof value === "string" && NAME_STRATEGIES.has(value as NameStrategy);
}

function clampInteger(value: FormDataEntryValue | null, fallback: number, minimum: number, maximum: number): number {
  const parsed = typeof value === "string" ? Number.parseInt(value, 10) : Number.NaN;
  return Number.isInteger(parsed) ? Math.max(minimum, Math.min(maximum, parsed)) : fallback;
}
