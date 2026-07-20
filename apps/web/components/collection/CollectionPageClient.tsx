"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/shell/AppShell";
import { AffinityCaptureModal } from "@/components/collection/AffinityCaptureModal";
import {
  CollectionEmptyState,
  CollectionGrid,
  CollectionLoadingState,
} from "@/components/collection/CollectionGrid";
import { CollectionSearchBar } from "@/components/collection/CollectionSearchBar";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  addToCollection,
  fetchCollection,
  removeFromCollection,
} from "@/lib/api/collection-client";
import {
  isInternalErrorMessage,
  toUserFacingMessage,
} from "@/lib/api/user-facing-error";
import { cacheCollection } from "@/lib/collection-cache";
import { FragranceRanker } from "@/lib/ranker/fragrance-ranker";
import { saveAffinity } from "@/lib/ranker/affinity-store";
import { syncAffinityTasteProfile } from "@/lib/ranker/sync-affinity-taste";
import type { Fragrance } from "@/lib/types/fragrance";

export function CollectionPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profileId, profile, refresh } = useAuth();
  const [items, setItems] = useState<Fragrance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [affinityTarget, setAffinityTarget] = useState<Fragrance | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { items: fetched } = await fetchCollection();
      setItems(fetched);
      await cacheCollection(fetched);
      return fetched;
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Failed to load collection";
      // Schema/profile internals — show empty state instead of a red banner
      if (!isInternalErrorMessage(message)) {
        setError(toUserFacingMessage(e, "Couldn't load your collection."));
      }
      setItems([]);
      return [] as Fragrance[];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void (async () => {
        const fetched = await load();
        const raw = searchParams.get("affinity");
        const affinityId = raw ? Number(raw) : NaN;
        if (Number.isInteger(affinityId) && affinityId > 0) {
          const target = fetched.find((f) => f.id === affinityId) ?? null;
          if (target) setAffinityTarget(target);
        }
      })();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [load, searchParams]);

  async function handleRemove(fragranceId: number) {
    setRemovingId(fragranceId);
    try {
      await removeFromCollection(fragranceId);
      const next = items.filter((f) => f.id !== fragranceId);
      setItems(next);
      await cacheCollection(next);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Failed to remove fragrance";
      if (!isInternalErrorMessage(message)) {
        setError(toUserFacingMessage(e, "Couldn't remove that fragrance."));
      }
    } finally {
      setRemovingId(null);
    }
  }

  async function handleAffinityConfirm(affinity: number) {
    if (!affinityTarget || !profileId) return;
    try {
      await addToCollection(affinityTarget.id, affinity);
      saveAffinity(profileId, affinityTarget.id, affinity);
      new FragranceRanker(profileId).recordPreference(
        affinityTarget,
        profile,
        affinity,
      );
      const saved = await syncAffinityTasteProfile(
        profile,
        affinityTarget,
        affinity,
      );
      if (saved) await refresh({ silent: true });
    } catch (e) {
      setError(
        toUserFacingMessage(e, "Couldn't save how much you like this scent."),
      );
    } finally {
      setAffinityTarget(null);
      router.replace("/collection");
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 pt-6 pb-4">
        <header className="mb-4 flex items-baseline justify-between gap-2">
          <h1 className="font-(family-name:--font-display) text-2xl text-(--text-primary)">
            My Collection
          </h1>
          {!loading && items.length > 0 && (
            <span
              className="rounded-full bg-(--glass-bg) border border-(--glass-border) px-2.5 py-0.5 text-xs text-(--text-secondary) tabular-nums"
              aria-label={`${items.length} fragrances`}
            >
              {items.length}
            </span>
          )}
        </header>

        <CollectionSearchBar value="" onChange={() => {}} href="/collection/search" />

        {error && (
          <p className="mt-4 text-sm text-(--danger)" role="alert">
            {error}{" "}
            <button
              type="button"
              onClick={() => void load()}
              className="text-(--accent-gold) underline-offset-2 hover:underline"
            >
              Retry
            </button>
          </p>
        )}

        <div className="mt-6">
          {loading ? (
            <CollectionLoadingState />
          ) : items.length === 0 && !error ? (
            <CollectionEmptyState />
          ) : (
            <CollectionGrid
              items={items}
              onRemove={handleRemove}
              removingId={removingId}
            />
          )}
        </div>
      </div>

      {affinityTarget && (
        <AffinityCaptureModal
          open
          fragrance={affinityTarget}
          onConfirm={(affinity) => void handleAffinityConfirm(affinity)}
          onClose={() => {
            setAffinityTarget(null);
            router.replace("/collection");
          }}
        />
      )}
    </AppShell>
  );
}
