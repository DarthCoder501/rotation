"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";

export function AuthSection() {
  const { isAuthenticated, email, loading, signInWithGoogle, signOut } =
    useAuth();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSignIn() {
    setBusy(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed");
      setBusy(false);
    }
  }

  async function handleSignOut() {
    setBusy(true);
    setError(null);
    try {
      await signOut();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-out failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <section
        aria-label="Account"
        className="rounded-md border border-(--glass-border) bg-(--glass-bg) p-4"
      >
        <p className="text-sm text-(--text-secondary)">Loading account…</p>
      </section>
    );
  }

  return (
    <section
      aria-label="Account"
      className="rounded-md border border-(--glass-border) bg-(--glass-bg) p-4"
    >
      <h2 className="font-(family-name:--font-display) text-lg text-(--text-primary)">
        Account
      </h2>

      {isAuthenticated ? (
        <>
          <p className="mt-2 text-sm text-(--text-secondary)">
            Signed in as{" "}
            <span className="text-(--text-primary)">{email ?? "Google user"}</span>
          </p>
          <p className="mt-1 text-xs text-(--text-secondary)">
            Your collection and taste model sync across devices.
          </p>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            disabled={busy}
            className="mt-4 inline-flex min-h-(--space-touch) items-center justify-center rounded-full border border-(--glass-border) px-5 text-sm text-(--text-primary) hover:border-(--accent-gold) focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring) disabled:opacity-50"
          >
            Sign out
          </button>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm text-(--text-secondary)">
            Browse anonymously — your collection works on this device. Sign in
            with Google to sync your collection and taste model everywhere.
          </p>
          <button
            type="button"
            onClick={() => void handleSignIn()}
            disabled={busy}
            className="mt-4 inline-flex min-h-(--space-touch) w-full items-center justify-center rounded-full bg-(--accent-gold) px-6 text-sm font-medium text-(--text-on-accent) hover:bg-(--accent-gold-hover) focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring) disabled:opacity-50 sm:w-auto"
          >
            Continue with Google
          </button>
        </>
      )}

      {error && (
        <p className="mt-3 text-sm text-(--danger)" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
