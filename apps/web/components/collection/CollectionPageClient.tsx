"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/shell/AppShell";
import {
  CollectionEmptyState,
  CollectionGrid,
  CollectionLoadingState,
} from "@/components/collection/CollectionGrid";
import { CollectionSearchBar } from "@/components/collection/CollectionSearchBar";
import {
  fetchCollection,
  removeFromCollection,
} from "@/lib/api/collection-client";
import {
  isInternalErrorMessage,
  toUserFacingMessage,
} from "@/lib/api/user-facing-error";
import { cacheCollection } from "@/lib/collection-cache";
import type { Fragrance } from "@/lib/types/fragrance";

export function CollectionPageClient() {
  const [items, setItems] = useState<Fragrance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { items: fetched } = await fetchCollection();
      setItems(fetched);
      await cacheCollection(fetched);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Failed to load collection";
      // Schema/profile internals — show empty state instead of a red banner
      if (!isInternalErrorMessage(message)) {
        setError(toUserFacingMessage(e, "Couldn't load your collection."));
      }
      setItems([]);
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
              onClick={load}
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
    </AppShell>
  );
}
