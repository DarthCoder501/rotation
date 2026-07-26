"use client";

import { useCallback, useEffect, useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { SlideshowNav } from "@/components/ui/SlideshowNav";
import { fetchSubmissions } from "@/lib/api/submissions-client";
import {
  isInternalErrorMessage,
  toUserFacingMessage,
} from "@/lib/api/user-facing-error";
import type { FragranceSubmission, SubmissionStatus } from "@/lib/types/submission";

export function SubmissionsList({
  slideshow = false,
}: {
  slideshow?: boolean;
}) {
  const [submissions, setSubmissions] = useState<FragranceSubmission[]>([]);
  const [slideIndex, setSlideIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { submissions: rows } = await fetchSubmissions();
      setSubmissions(rows);
      setSlideIndex(0);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Failed to load submissions";
      if (!isInternalErrorMessage(message)) {
        setError(toUserFacingMessage(e, "Couldn't load your submissions."));
      }
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [load]);

  const safeIndex =
    submissions.length === 0
      ? 0
      : Math.min(slideIndex, submissions.length - 1);
  const active = submissions[safeIndex] ?? null;

  return (
    <section aria-labelledby="submissions-heading">
      <h2
        id="submissions-heading"
        className="font-(family-name:--font-display) text-xl text-(--text-primary)"
      >
        Your submissions
      </h2>
      <p className="mt-1 text-sm text-(--text-secondary)">
        Pending items stay in your collection as Custom until approved for the
        shared catalog.
      </p>

      {error && (
        <p className="mt-4 text-sm text-(--danger)" role="alert">
          {error}{" "}
          <button
            type="button"
            onClick={load}
            className="text-(--accent-gold) underline-offset-2 hover:underline"
          >
            Retry
          </button>
        </p>
      )}

      <div className="mt-4 space-y-3">
        {loading ? (
          <div
            className="space-y-3"
            aria-busy="true"
            aria-label="Loading submissions"
          >
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-md border border-(--glass-border) bg-(--glass-bg)"
              />
            ))}
          </div>
        ) : submissions.length === 0 && !error ? (
          <p className="text-sm text-(--text-secondary)">
            No submissions yet. Search the catalog and propose a missing
            fragrance.
          </p>
        ) : slideshow ? (
          <>
            <SlideshowNav
              label="Submission"
              itemNoun="submission"
              options={submissions.map((row) => ({
                id: String(row.id),
                label: `${row.perfume} · ${row.status}`,
              }))}
              activeId={String(active?.id ?? "")}
              onSelect={(id) => {
                const next = submissions.findIndex(
                  (row) => String(row.id) === id,
                );
                if (next >= 0) setSlideIndex(next);
              }}
            />
            {active && <SubmissionRow submission={active} />}
          </>
        ) : (
          submissions.map((submission) => (
            <SubmissionRow key={submission.id} submission={submission} />
          ))
        )}
      </div>
    </section>
  );
}

function SubmissionRow({ submission }: { submission: FragranceSubmission }) {
  return (
    <GlassCard className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-(family-name:--font-display) text-lg leading-tight text-(--text-primary)">
            {submission.perfume}
          </h3>
          <p className="mt-0.5 text-sm text-(--text-secondary)">
            {submission.brand}
          </p>
          <p className="mt-2 text-xs text-(--text-secondary)">
            Submitted {formatDate(submission.createdAt)}
          </p>
        </div>
        <StatusBadge status={submission.status} />
      </div>
      {submission.userNotes && (
        <p className="mt-3 text-sm text-(--text-secondary)">
          {submission.userNotes}
        </p>
      )}
      {submission.sourceUrl && (
        <a
          href={submission.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex min-h-6 items-center text-xs text-(--accent-gold) underline underline-offset-2 hover:text-(--accent-gold-hover) focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
        >
          Reference link
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      )}
    </GlassCard>
  );
}

function StatusBadge({ status }: { status: SubmissionStatus }) {
  const styles: Record<SubmissionStatus, string> = {
    pending:
      "border-(--accent-gold)/40 bg-(--accent-gold)/10 text-(--accent-gold)",
    approved: "border-(--success)/40 bg-(--success)/10 text-(--success)",
    rejected: "border-(--danger)/40 bg-(--danger)/10 text-(--danger)",
  };

  return (
    <span
      className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium capitalize ${styles[status]}`}
    >
      {status}
    </span>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
