"use client";

import { useState } from "react";
import Link from "next/link";
import { AccordBubbles } from "@/components/collection/AccordBubbles";
import { GlassCard } from "@/components/ui/GlassCard";
import {
  formatGender,
  getAccords,
  type Fragrance,
} from "@/lib/types/fragrance";

interface FragranceSearchResultProps {
  fragrance: Fragrance;
  isOwned: boolean;
  isAdding?: boolean;
  onAdd: () => void;
}

export function FragranceSearchResult({
  fragrance,
  isOwned,
  isAdding = false,
  onAdd,
}: FragranceSearchResultProps) {
  const [expanded, setExpanded] = useState(false);
  const accords = getAccords(fragrance);
  const gender = formatGender(fragrance.gender);
  const meta = [fragrance.brand, gender, fragrance.year]
    .filter(Boolean)
    .join(" · ");

  return (
    <GlassCard as="article" className="overflow-hidden p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="font-(family-name:--font-display) text-lg leading-tight text-(--text-primary) truncate">
            {fragrance.perfume}
          </h2>
          {meta && (
            <p className="mt-0.5 text-sm text-(--text-secondary) truncate">
              {meta}
            </p>
          )}
        </div>
        <RatingBadge
          value={fragrance.ratingValue}
          count={fragrance.ratingCount}
        />
      </div>

      <div className="mt-2.5">
        <AccordBubbles accords={accords} size="md" />
      </div>

      {(expanded || fragrance.topNotes) && (
        <div
          id={`notes-${fragrance.id}`}
          className={`mt-3 space-y-1.5 text-sm text-(--text-secondary) border-t border-(--glass-border) pt-3 ${
            expanded ? "" : "hidden sm:block"
          }`}
        >
          <NoteRow label="Top" value={fragrance.topNotes} />
          <NoteRow label="Heart" value={fragrance.middleNotes} />
          <NoteRow label="Base" value={fragrance.baseNotes} />
          {(fragrance.perfumer1 || fragrance.perfumer2) && (
            <p className="text-xs pt-1">
              Perfumer:{" "}
              {[fragrance.perfumer1, fragrance.perfumer2]
                .filter(Boolean)
                .join(", ")}
            </p>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="sm:hidden text-xs text-(--accent-gold) underline-offset-2 hover:underline min-h-(--space-touch) px-1"
          aria-expanded={expanded}
          aria-controls={`notes-${fragrance.id}`}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Hide notes" : "Show notes"}
        </button>

        <div className="flex-1" />

        {isOwned ? (
          <span
            className="inline-flex min-h-(--space-touch) items-center rounded-full border border-(--success)/40 bg-(--success)/10 px-4 text-sm text-(--success)"
            aria-label="Already in your collection"
          >
            In collection ✓
          </span>
        ) : (
          <button
            type="button"
            onClick={onAdd}
            disabled={isAdding}
            className="inline-flex min-h-(--space-touch) items-center justify-center rounded-full bg-(--accent-gold) px-5 text-sm font-medium text-(--bg-deep) transition-opacity hover:opacity-90 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
          >
            {isAdding ? "Adding…" : "+ Add to collection"}
          </button>
        )}
      </div>
    </GlassCard>
  );
}

function RatingBadge({ value, count }: { value: number; count: number }) {
  return (
    <div
      className="shrink-0 text-right text-sm"
      aria-label={`Rating ${value.toFixed(2)} from ${count} reviews`}
    >
      <span className="text-(--accent-gold)">★</span>{" "}
      <span className="font-medium tabular-nums">{value.toFixed(2)}</span>
      {count > 0 && (
        <span className="block text-xs text-(--text-secondary) tabular-nums">
          ({count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count})
        </span>
      )}
    </div>
  );
}

function NoteRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <p>
      <span className="text-(--text-primary)/80">{label}:</span> {value}
    </p>
  );
}

interface EmptySearchStateProps {
  query: string;
}

export function EmptySearchState({ query }: EmptySearchStateProps) {
  return (
    <div className="py-12 text-center">
      <p className="font-(family-name:--font-display) text-xl text-(--text-primary)">
        No matches for &ldquo;{query}&rdquo;
      </p>
      <p className="mt-2 text-sm text-(--text-secondary)">
        Try a different spelling or brand name.
      </p>
      <Link
        href={`/submit?q=${encodeURIComponent(query)}`}
        className="mt-6 inline-flex min-h-(--space-touch) items-center text-(--accent-gold) underline-offset-4 hover:underline"
      >
        Submit this fragrance for review →
      </Link>
    </div>
  );
}

export function SearchLoadingState() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading search results">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-36 animate-pulse rounded-(--radius-md) border border-(--glass-border) bg-(--glass-bg)"
        />
      ))}
    </div>
  );
}

export function SearchErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="py-8 text-center" role="alert">
      <p className="text-(--danger)">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 min-h-(--space-touch) text-(--accent-gold) underline-offset-4 hover:underline"
        >
          Try again
        </button>
      )}
    </div>
  );
}
