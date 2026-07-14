"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { generateNames as generateEtymariaNames } from "@etymalia/name-engine";
import { generatePalette, paletteToDtcg } from "@etymalia/tokens";
import { checkDomainAvailability, toDomain } from "@etymalia/availability";
import { createClient } from "@/lib/supabase/server";
import {
  briefKeywords,
  parseBriefForm,
  parseBriefRecord,
} from "@/lib/brand/brief";

const UUID = /^[0-9a-fA-F-]{36}$/;

interface Ids {
  workspaceId: string;
  brandId: string;
}

function ids(formData: FormData): Ids {
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const brandId = String(formData.get("brandId") ?? "");
  if (!UUID.test(workspaceId) || !UUID.test(brandId)) {
    throw new Error("Invalid brand reference.");
  }
  return { workspaceId, brandId };
}

function brandPath({ workspaceId, brandId }: Ids, hash = ""): string {
  return `/workspace/${workspaceId}/brand/${brandId}${hash}`;
}

async function requireSession() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/");
  return supabase;
}

function done(target: Ids, hash: string): never {
  revalidatePath(brandPath(target));
  redirect(brandPath(target, hash));
}

export async function saveBrief(formData: FormData) {
  const target = ids(formData);
  const supabase = await requireSession();
  const brief = parseBriefForm(formData);

  const { error } = await supabase
    .from("brands")
    .update({ brief })
    .eq("id", target.brandId);

  if (error) done(target, "?error=brief#brief");
  done(target, "#brief");
}

export async function generateNames(formData: FormData) {
  const target = ids(formData);
  const supabase = await requireSession();

  const { data: brand, error: brandError } = await supabase
    .from("brands")
    .select("brief")
    .eq("id", target.brandId)
    .maybeSingle();

  if (brandError || !brand) done(target, "?error=names#names");

  const brief = parseBriefRecord(brand.brief);
  const keywords = briefKeywords(brief);
  if (!keywords.length) done(target, "?error=brief-needed#names");

  const names = generateEtymariaNames({ keywords, tone: brief.tone, count: 12 });
  if (!names.length) done(target, "?error=names#names");

  // Regenerate the full candidate set for this brand.
  await supabase.from("name_candidates").delete().eq("brand_id", target.brandId);
  const { error: insertError } = await supabase.from("name_candidates").insert(
    names.map((name) => ({
      brand_id: target.brandId,
      term: name.term.slice(0, 160),
      provenance: name.provenance,
      scores: name.scores,
      is_shortlisted: false,
    })),
  );

  if (insertError) done(target, "?error=names#names");
  done(target, "#names");
}

export async function useName(formData: FormData) {
  const target = ids(formData);
  const supabase = await requireSession();
  const term = String(formData.get("term") ?? "").trim().slice(0, 160);
  if (!term) done(target, "?error=select#names");

  const { error } = await supabase
    .from("brands")
    .update({ name: term })
    .eq("id", target.brandId);

  if (error) done(target, "?error=select#names");
  done(target, "#names");
}

export async function toggleShortlist(formData: FormData) {
  const target = ids(formData);
  const supabase = await requireSession();
  const candidateId = String(formData.get("candidateId") ?? "");
  const shortlist = String(formData.get("shortlist") ?? "") === "true";
  if (!UUID.test(candidateId)) done(target, "?error=names#names");

  const { error } = await supabase
    .from("name_candidates")
    .update({ is_shortlisted: shortlist })
    .eq("id", candidateId);

  if (error) done(target, "?error=names#names");
  done(target, "#names");
}

export async function checkDomain(formData: FormData) {
  const target = ids(formData);
  const supabase = await requireSession();
  const candidateId = String(formData.get("candidateId") ?? "");
  const term = String(formData.get("term") ?? "");
  if (!UUID.test(candidateId) || !term) done(target, "?error=names#names");

  const availability = await checkDomainAvailability(toDomain(term, "com"));

  const { error } = await supabase
    .from("name_candidates")
    .update({ availability_json: availability })
    .eq("id", candidateId);

  if (error) done(target, "?error=names#names");
  done(target, "#names");
}

export async function generateBrandPalette(formData: FormData) {
  const target = ids(formData);
  const supabase = await requireSession();

  const { data: brand, error: brandError } = await supabase
    .from("brands")
    .select("name, brief")
    .eq("id", target.brandId)
    .maybeSingle();

  if (brandError || !brand) done(target, "?error=palette#palette");

  const brief = parseBriefRecord(brand.brief);
  const seed = [brand.name, brief.industry, ...brief.keywords, ...brief.tone]
    .filter(Boolean)
    .join(" ") || (brand.name as string);

  const palette = generatePalette({ seed });
  const dtcg = paletteToDtcg(palette);

  const { error } = await supabase
    .from("brand_tokens")
    .upsert({ brand_id: target.brandId, dtcg_json: dtcg }, { onConflict: "brand_id" });

  if (error) done(target, "?error=palette#palette");
  done(target, "#palette");
}
