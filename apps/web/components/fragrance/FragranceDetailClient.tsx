"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AccordBubbles } from "@/components/collection/AccordBubbles";
import { AffinityCaptureModal } from "@/components/collection/AffinityCaptureModal";
import { GlassCard } from "@/components/ui/GlassCard";
import { fetchFragranceById } from "@/lib/api/catalog-client";
import {
  addToCollection,
  fetchCollection,
  removeFromCollection,
} from "@/lib/api/collection-client";
import { toUserFacingMessage } from "@/lib/api/user-facing-error";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  cacheCollection,
  getCachedCollection,
} from "@/lib/collection-cache";
import { FragranceRanker } from "@/lib/ranker/fragrance-ranker";
import { saveAffinity } from "@/lib/ranker/affinity-store";
import { syncAffinityTasteProfile } from "@/lib/ranker/sync-affinity-taste";
import {
  formatGender,
  getAccords,
  type Fragrance,
} from "@/lib/types/fragrance";

interface FragranceDetailClientProps {
  fragranceId: number;
}

export function FragranceDetailClient({
  fragranceId,
}: FragranceDetailClientProps) {
  const router = useRouter();
  const { profileId, profile, refresh } = useAuth();

  const [fragrance, setFragrance] = useState<Fragrance | null>(null);
  const [owned, setOwned] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [affinityOpen, setAffinityOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [{ fragrance: row }, ownedIds] = await Promise.all([
        fetchFragranceById(fragranceId),
        resolveOwnedIds(),
      ]);
      setFragrance(row);
      setOwned(ownedIds.has(fragranceId));
    } catch (e) {
      setFragrance(null);
      setError(
        toUserFacingMessage(e, "Could not load this fragrance right now."),
      );
    } finally {
      setLoading(false);
    }
  }, [fragranceId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [load]);

  async function handleAddConfirm(affinity: number) {
    if (!fragrance || !profileId) return;
    setBusy(true);
    setActionMessage(null);
    try {
      await addToCollection(fragrance.id, affinity);
      saveAffinity(profileId, fragrance.id, affinity);
      new FragranceRanker(profileId).recordPreference(
        fragrance,
        profile,
        affinity,
      );
      const saved = await syncAffinityTasteProfile(
        profile,
        fragrance,
        affinity,
      );
      if (saved) await refresh({ silent: true });

      const cached = await getCachedCollection();
      const next =
        cached.some((item) => item.id === fragrance.id)
          ? cached
          : [...cached, fragrance];
      await cacheCollection(next);

      setOwned(true);
      setAffinityOpen(false);
      setActionMessage("Added to your collection.");
    } catch (e) {
      setError(
        toUserFacingMessage(e, "Could not add this fragrance to your collection."),
      );
      setAffinityOpen(false);
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    if (!fragrance) return;
    setBusy(true);
    setActionMessage(null);
    try {
      await removeFromCollection(fragrance.id);
      const cached = await getCachedCollection();
      await cacheCollection(cached.filter((item) => item.id !== fragrance.id));
      setOwned(false);
      setActionMessage("Removed from your collection.");
    } catch (e) {
      setError(
        toUserFacingMessage(
          e,
          "Could not remove this fragrance from your collection.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6" aria-busy="true">
        <div className="h-8 w-40 animate-pulse rounded-md bg-(--glass-bg)" />
        <div className="mt-6 h-64 animate-pulse rounded-md border border-(--glass-border) bg-(--glass-bg)" />
      </div>
    );
  }

  if (error && !fragrance) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6">
        <Link
          href="/collection"
          className="text-sm text-(--accent-gold) hover:underline focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
        >
          ← Back to collection
        </Link>
        <GlassCard className="mt-6 p-6" role="alert">
          <p className="text-sm text-(--danger)">{error}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex min-h-(--space-touch) items-center text-(--accent-gold) underline-offset-4 hover:underline"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => router.push("/collection/search")}
              className="inline-flex min-h-(--space-touch) items-center text-(--text-secondary) underline-offset-4 hover:underline"
            >
              Search catalog
            </button>
          </div>
        </GlassCard>
      </div>
    );
  }

  if (!fragrance) return null;

  const accords = getAccords(fragrance);
  const gender = formatGender(fragrance.gender);
  const meta = [fragrance.brand, gender, fragrance.year]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Link
        href="/collection"
        className="text-sm text-(--accent-gold) hover:underline focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
      >
        ← Back to collection
      </Link>

      <GlassCard as="article" className="mt-4 p-5 sm:p-6">
        <h1 className="font-(family-name:--font-display) text-3xl text-(--text-primary)">
          {fragrance.perfume}
        </h1>
        {meta && (
          <p className="mt-1 text-sm text-(--text-secondary)">{meta}</p>
        )}
        <p className="mt-2 text-sm tabular-nums text-(--accent-gold)">
          ★ {fragrance.ratingValue.toFixed(2)}
          {fragrance.ratingCount > 0
            ? ` · ${fragrance.ratingCount.toLocaleString()} ratings`
            : null}
        </p>

        <div className="mt-4">
          <AccordBubbles accords={accords} size="md" />
        </div>

        <NotePyramid fragrance={fragrance} />

        {(fragrance.perfumer1 || fragrance.perfumer2) && (
          <p className="mt-4 text-sm text-(--text-secondary)">
            Perfumer:{" "}
            {[fragrance.perfumer1, fragrance.perfumer2]
              .filter(Boolean)
              .join(", ")}
          </p>
        )}

        {error && (
          <p className="mt-4 text-sm text-(--danger)" role="alert">
            {error}
          </p>
        )}
        {actionMessage && (
          <p className="mt-4 text-sm text-(--success)" role="status">
            {actionMessage}
          </p>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          {owned ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleRemove()}
              className="inline-flex min-h-(--space-touch) flex-1 items-center justify-center rounded-full border border-(--danger)/40 px-5 text-sm text-(--danger) hover:bg-(--danger)/10 disabled:opacity-50 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
            >
              {busy ? "Removing…" : "Remove from collection"}
            </button>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => setAffinityOpen(true)}
              className="inline-flex min-h-(--space-touch) flex-1 items-center justify-center rounded-full bg-(--accent-gold) px-5 text-sm font-medium text-(--text-on-accent) hover:bg-(--accent-gold-hover) disabled:opacity-50 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
            >
              Add to collection
            </button>
          )}

          {fragrance.url && (
            <a
              href={fragrance.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-(--space-touch) flex-1 items-center justify-center rounded-full border border-(--glass-border) px-5 text-sm text-(--text-primary) hover:border-(--accent-gold)/50 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
            >
              View on Fragrantica ↗
            </a>
          )}
        </div>
      </GlassCard>

      <AffinityCaptureModal
        open={affinityOpen}
        fragrance={fragrance}
        busy={busy}
        onClose={() => setAffinityOpen(false)}
        onConfirm={(affinity) => void handleAddConfirm(affinity)}
      />
    </div>
  );
}

function NotePyramid({ fragrance }: { fragrance: Fragrance }) {
  const rows = [
    { label: "Top notes", symbol: "▲", value: fragrance.topNotes },
    { label: "Heart notes", symbol: "◆", value: fragrance.middleNotes },
    { label: "Base notes", symbol: "▼", value: fragrance.baseNotes },
  ].filter((row) => row.value);

  if (rows.length === 0) {
    return (
      <p className="mt-6 text-sm text-(--text-secondary)">
        Note details aren&apos;t available for this bottle yet.
      </p>
    );
  }

  return (
    <div className="mt-6 space-y-4 border-t border-(--glass-border) pt-5">
      {rows.map((row) => (
        <div key={row.label}>
          <p className="text-xs uppercase tracking-wide text-(--accent-gold)">
            <span aria-hidden="true">{row.symbol} </span>
            {row.label}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-(--text-secondary)">
            {row.value}
          </p>
        </div>
      ))}
    </div>
  );
}

async function resolveOwnedIds(): Promise<Set<number>> {
  try {
    const cached = await getCachedCollection();
    if (cached.length > 0) {
      return new Set(cached.map((item) => item.id));
    }
  } catch {
    /* fall through */
  }

  try {
    const { items } = await fetchCollection();
    await cacheCollection(items);
    return new Set(items.map((item) => item.id));
  } catch {
    return new Set();
  }
}
