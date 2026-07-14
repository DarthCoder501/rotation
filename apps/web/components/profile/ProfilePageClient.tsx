"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AuthSection } from "@/components/auth/AuthSection";
import { SubmissionsList } from "@/components/profile/SubmissionsList";
import { TastePreferencesPanel } from "@/components/profile/TastePreferencesPanel";

export function ProfilePageClient() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <header className="mb-6">
        <h1 className="font-(family-name:--font-display) text-2xl text-(--text-primary)">
          Profile
        </h1>
        <p className="mt-2 text-sm text-(--text-secondary)">
          Sign in to sync across devices, tune taste chips, and track
          submissions.
        </p>
      </header>

      <Suspense fallback={null}>
        <AuthErrorBanner />
      </Suspense>

      <AuthSection />

      <div className="mt-8">
        <TastePreferencesPanel />
      </div>

      <div className="mt-10">
        <SubmissionsList />
      </div>
    </div>
  );
}

function AuthErrorBanner() {
  const searchParams = useSearchParams();
  const authError = searchParams.get("auth_error");
  if (!authError) return null;

  return (
    <p className="mb-4 text-sm text-(--danger)" role="alert">
      Google sign-in did not complete. Check Supabase Auth redirect URLs and try
      again.
    </p>
  );
}
