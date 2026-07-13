"use client";

import { useSearchParams } from "next/navigation";
import { AuthSection } from "@/components/auth/AuthSection";
import { SubmissionsList } from "@/components/profile/SubmissionsList";
import { InProgressPanel } from "@/components/ui/InProgressPanel";

export function ProfilePageClient() {
  const searchParams = useSearchParams();
  const authError = searchParams.get("auth_error");

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <header className="mb-6">
        <h1 className="font-(family-name:--font-display) text-2xl text-(--text-primary)">
          Profile
        </h1>
        <p className="mt-2 text-sm text-(--text-secondary)">
          Sign in to sync your collection and personalized ranker across devices.
        </p>
      </header>

      {authError && (
        <p className="mb-4 text-sm text-(--danger)" role="alert">
          Google sign-in did not complete. Check Supabase Auth redirect URLs and
          try again.
        </p>
      )}

      <AuthSection />

      <div className="mt-6">
        <InProgressPanel
          title="Taste preferences in progress"
          description="Controls for how we weight notes, accords, and wear context are still landing. Sign-in and submissions work today — taste tuning comes next."
          className="max-w-none"
        />
      </div>

      <div className="mt-8">
        <SubmissionsList />
      </div>
    </div>
  );
}
