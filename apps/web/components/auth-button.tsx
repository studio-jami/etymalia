"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AuthButton({ email }: { email: string | null }) {
  const router = useRouter();
  const supabase = createClient();
  const [busy, setBusy] = useState(false);

  async function signIn() {
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setBusy(false); // otherwise we navigate away to Google
  }

  async function signOut() {
    setBusy(true);
    await supabase.auth.signOut();
    router.refresh();
    setBusy(false);
  }

  if (email) {
    return (
      <div className="authrow">
        <span className="who">Signed in as {email}</span>
        <button className="btn ghost" onClick={signOut} disabled={busy}>
          Sign out
        </button>
      </div>
    );
  }

  return (
    <button className="btn google" onClick={signIn} disabled={busy}>
      {busy ? "Redirecting…" : "Sign in with Google"}
    </button>
  );
}

