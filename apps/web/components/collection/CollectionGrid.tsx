"use client";

import Link from "next/link";
import { AccordBubbles } from "@/components/collection/AccordBubbles";
import { GlassCard } from "@/components/ui/GlassCard";
import { getAccords, type Fragrance } from "@/lib/types/fragrance";

interface CollectionGridProps {
  items: Fragrance[];
  onRemove?: (fragranceId: number) => void;
  removingId?: number | null;
}

export function CollectionGrid({
  items,
  onRemove,
  removingId = null,
}: CollectionGridProps) {
  if (items.length === 0) {
    return <CollectionEmptyState />;
  }

  return (
    <ul
      className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3"
      aria-label="Your fragrance collection"
    >
      {items.map((f) => (
        <CollectionGridItem
          key={f.id}
          fragrance={f}
          onRemove={onRemove}
          isRemoving={removingId === f.id}
        />
      ))}
    </ul>
  );
}

function CollectionGridItem({
  fragrance,
  onRemove,
  isRemoving,
}: {
  fragrance: Fragrance;
  onRemove?: (id: number) => void;
  isRemoving: boolean;
}) {
  const accords = getAccords(fragrance).slice(0, 3);

  return (
    <li>
      <GlassCard className="flex h-full flex-col p-3 transition-transform hover:scale-[1.02] motion-reduce:transition-none">
        <Link
          href={`/fragrance/${fragrance.id}`}
          className="flex flex-1 flex-col focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring) rounded-(--radius-sm)"
        >
          <h2 className="font-(family-name:--font-display) text-base leading-snug line-clamp-2">
            {fragrance.perfume}
          </h2>
          <p className="mt-0.5 text-xs text-(--text-secondary) truncate">
            {fragrance.brand}
          </p>
          <div className="mt-2 flex-1">
            <AccordBubbles accords={accords} size="sm" maxVisible={3} />
          </div>
          <p className="mt-2 text-xs text-(--accent-gold) tabular-nums">
            ★ {fragrance.ratingValue.toFixed(2)}
          </p>
        </Link>
        {onRemove && (
          <button
            type="button"
            onClick={() => onRemove(fragrance.id)}
            disabled={isRemoving}
            className="mt-2 w-full min-h-9 rounded-(--radius-sm) border border-(--glass-border) text-xs text-(--text-secondary) hover:border-(--danger)/50 hover:text-(--danger) disabled:opacity-50"
            aria-label={`Remove ${fragrance.perfume} from collection`}
          >
            {isRemoving ? "Removing…" : "Remove"}
          </button>
        )}
      </GlassCard>
    </li>
  );
}

export function CollectionEmptyState() {
  return (
    <div className="flex flex-col items-center py-16 text-center px-4">
      <p className="font-(family-name:--font-display) text-2xl text-(--text-primary)">
        Your collection is empty
      </p>
      <p className="mt-2 max-w-sm text-sm text-(--text-secondary)">
        Search the catalog and add fragrances you own. Recommendations run only
        against your collection.
      </p>
      <Link
        href="/collection/search"
        className="mt-8 inline-flex min-h-(--space-touch) items-center justify-center rounded-full bg-(--accent-gold) px-8 text-sm font-medium text-(--bg-deep) hover:opacity-90"
      >
        Search the catalog
      </Link>
    </div>
  );
}

export function CollectionLoadingState() {
  return (
    <div
      className="grid grid-cols-2 gap-3 md:grid-cols-3"
      aria-busy="true"
      aria-label="Loading collection"
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-36 animate-pulse rounded-(--radius-md) border border-(--glass-border) bg-(--glass-bg)"
        />
      ))}
    </div>
  );
}
