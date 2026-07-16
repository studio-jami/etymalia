"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

type AuthButtonProps = {
  email: string | null;
  avatarUrl?: string | null;
};

function initials(email: string): string {
  return email.slice(0, 2).toUpperCase();
}

export function AuthButton({ email, avatarUrl }: AuthButtonProps) {
  const router = useRouter();
  const supabase = createClient();
  const [busy, setBusy] = useState(false);

  async function signIn() {
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/workspace` },
    });
    if (error) setBusy(false);
  }

  async function signOut() {
    setBusy(true);
    await supabase.auth.signOut();
    router.refresh();
    setBusy(false);
  }

  if (!email) {
    return (
      <button className="btn google" onClick={signIn} disabled={busy} type="button">
        {busy ? "Redirecting…" : "Sign in with Google"}
      </button>
    );
  }

  return (
    <details className="profile-menu">
      <summary aria-label="Open account menu" className="profile-menu__trigger">
        {avatarUrl ? (
          <img alt="" className="profile-menu__avatar" referrerPolicy="no-referrer" src={avatarUrl} />
        ) : (
          <span aria-hidden="true" className="profile-menu__fallback">{initials(email)}</span>
        )}
      </summary>
      <div className="profile-menu__content">
        <p>{email}</p>
        <button className="profile-menu__signout" disabled={busy} onClick={signOut} type="button">
          Sign out
        </button>
      </div>
    </details>
  );
}
