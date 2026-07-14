"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function value(formData: FormData, field: string, maximum: number): string {
  const raw = formData.get(field);
  const result = typeof raw === "string" ? raw.trim() : "";
  if (!result || result.length > maximum) {
    throw new Error(`Invalid ${field}.`);
  }
  return result;
}

async function currentUserId(): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/");
  return data.user.id;
}

export async function createWorkspace(formData: FormData) {
  const name = value(formData, "name", 120);
  const userId = await currentUserId();
  const supabase = await createClient();
  const { error } = await supabase.from("workspaces").insert({
    owner_id: userId,
    name,
  });

  if (error) {
    redirect("/workspace?error=workspace");
  }

  revalidatePath("/workspace");
  redirect("/workspace");
}

export async function createBrand(formData: FormData) {
  const name = value(formData, "name", 160);
  const workspaceId = value(formData, "workspaceId", 36);
  await currentUserId();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("brands")
    .insert({
      workspace_id: workspaceId,
      name,
    })
    .select("id")
    .single();

  if (error || !data) {
    redirect("/workspace?error=brand");
  }

  revalidatePath("/workspace");
  redirect(`/workspace/${workspaceId}/brand/${data.id}`);
}
