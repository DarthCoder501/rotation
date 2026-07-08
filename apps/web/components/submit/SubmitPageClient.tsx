"use client";

import Link from "next/link";
import { SubmitFragranceForm } from "@/components/submit/SubmitFragranceForm";

interface SubmitPageClientProps {
  initialQuery?: string;
}

export function SubmitPageClient({ initialQuery = "" }: SubmitPageClientProps) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <header className="mb-4">
        <Link
          href="/collection/search"
          className="text-sm text-(--accent-gold) hover:underline"
        >
          ← Back to search
        </Link>
        <h1 className="mt-3 font-(family-name:--font-display) text-2xl text-(--text-primary)">
          Submit a fragrance
        </h1>
        <p className="mt-2 text-sm text-(--text-secondary)">
          Propose a missing scent for review. Approved submissions are added to
          the catalog later — never directly from this form.
        </p>
      </header>

      <SubmitFragranceForm initialQuery={initialQuery} />
    </div>
  );
}
