import { NextResponse } from "next/server";
import {
  AiPort,
  BrandBriefSchema,
  CredentialResolver,
  generateBrandDirection,
} from "@etymalia/ai";
import { isStudioUser, StudioCredentialStore } from "@/lib/ai/studio-credential-store";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const smokeBrief = BrandBriefSchema.parse({
  description: "A precise bookkeeping studio for independent creative businesses.",
  industry: "Professional services",
  audience: "Independent creative businesses",
  keywords: ["clarity", "trust", "craft"],
  tone: ["editorial", "calm", "credible"],
});

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user || !isStudioUser(data.user.id)) {
    return NextResponse.json({ error: "Not authorized for Studio AI." }, { status: 403 });
  }

  try {
    const port = new AiPort(new CredentialResolver(new StudioCredentialStore()));
    const direction = await generateBrandDirection(port, smokeBrief, {
      lane: "studio",
      userId: data.user.id,
    });

    return NextResponse.json({ direction });
  } catch (cause) {
    console.error("Studio AI smoke test failed", cause);
    return NextResponse.json(
      { error: "Studio AI smoke test failed." },
      { status: 502 },
    );
  }
}
