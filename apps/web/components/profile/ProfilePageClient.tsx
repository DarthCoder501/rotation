"use client";

import { SubmissionsList } from "@/components/profile/SubmissionsList";

export function ProfilePageClient() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <header className="mb-6">
        <h1 className="font-(family-name:--font-display) text-2xl text-(--text-primary)">
          Profile
        </h1>
        <p className="mt-2 text-sm text-(--text-secondary)">
          Taste preferences and ranker controls arrive in a later phase. For now,
          track fragrances you&apos;ve submitted for catalog review here.
        </p>
      </header>

      <SubmissionsList />
    </div>
  );
}
