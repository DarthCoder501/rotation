"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { AffinityCaptureModal } from "@/components/collection/AffinityCaptureModal";
import { AppShell } from "@/components/shell/AppShell";
import { CollectionSearchBar } from "@/components/collection/CollectionSearchBar";
import {
  EmptySearchState,
  FragranceSearchResult,
  SearchErrorState,
  SearchLoadingState,
} from "@/components/collection/FragranceSearchResult";
import { searchCatalog } from "@/lib/api/catalog-client";
import { addToCollection, fetchCollection } from "@/lib/api/collection-client";
import { cacheCollection } from "@/lib/collection-cache";
import { saveAffinity } from "@/lib/ranker/affinity-store";
import { FragranceRanker } from "@/lib/ranker/fragrance-ranker";
import { syncAffinityTasteProfile } from "@/lib/ranker/sync-affinity-taste";
import type { Fragrance } from "@/lib/types/fragrance";

const DEBOUNCE_MS = 300;
const MIN_QUERY = 2;

export function CatalogSearchPageClient() {
  const { profileId, profile, refresh } = useAuth();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<Fragrance[]>([]);
  const [ownedIds, setOwnedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingFragrance, setPendingFragrance] = useState<Fragrance | null>(
    null,
  );
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(
      () => setDebouncedQuery(query.trim()),
      DEBOUNCE_MS,
    );
    return () => window.clearTimeout(t);
  }, [query]);

  const loadOwned = useCallback(async () => {
    try {
      const { items } = await fetchCollection();
      setOwnedIds(new Set(items.map((f) => f.id)));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadOwned();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadOwned]);

  const runSearch = useCallback(async (q: string) => {
    if (q.length < MIN_QUERY) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { results: found } = await searchCatalog(q);
      setResults(found);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void runSearch(debouncedQuery);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [debouncedQuery, runSearch]);

  async function handleConfirmAffinity(affinity: number) {
    if (!pendingFragrance) return;
    setAdding(true);
    try {
      await addToCollection(pendingFragrance.id, affinity);
      if (profileId) {
        saveAffinity(profileId, pendingFragrance.id, affinity);
        const ranker = new FragranceRanker(profileId);
        ranker.recordPreference(pendingFragrance, profile, affinity);
        const saved = await syncAffinityTasteProfile(
          profile,
          pendingFragrance,
          affinity,
        );
        if (saved) await refresh({ silent: true });
      }
      setOwnedIds((prev) => new Set(prev).add(pendingFragrance.id));
      const { items } = await fetchCollection();
      await cacheCollection(items);
      setPendingFragrance(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add to collection");
    } finally {
      setAdding(false);
    }
  }

  const listLabel = useMemo(
    () =>
      debouncedQuery.length >= MIN_QUERY
        ? `Search results for ${debouncedQuery}`
        : "Search results",
    [debouncedQuery],
  );

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 pt-4 pb-4">
        <header className="mb-4 flex items-center gap-3">
          <Link
            href="/collection"
            className="flex min-h-(--space-touch) min-w-(--space-touch) items-center justify-center text-(--text-secondary) hover:text-(--text-primary)"
            aria-label="Back to collection"
          >
            ←
          </Link>
          <h1 className="font-(family-name:--font-display) text-xl text-(--text-primary)">
            Search Catalog
          </h1>
        </header>

        <CollectionSearchBar
          value={query}
          onChange={setQuery}
          autoFocus
          ariaControls="catalog-search-results"
        />

        <p className="mt-2 text-xs text-(--text-secondary)">
          {query.length > 0 && query.length < MIN_QUERY
            ? `Type ${MIN_QUERY - query.length} more character${MIN_QUERY - query.length === 1 ? "" : "s"}…`
            : "Search by fragrance name or brand — spaces and hyphens both work"}
        </p>

        <div className="mt-4">
          {loading && <SearchLoadingState />}
          {!loading && error && (
            <SearchErrorState
              message={error}
              onRetry={() => runSearch(debouncedQuery)}
            />
          )}
          {!loading &&
            !error &&
            debouncedQuery.length >= MIN_QUERY &&
            results.length === 0 && (
              <EmptySearchState query={debouncedQuery} />
            )}
          {!loading && !error && results.length > 0 && (
            <ul
              id="catalog-search-results"
              role="listbox"
              aria-label={listLabel}
              className="space-y-3"
            >
              {results.map((f) => (
                <li key={f.id} role="option" aria-selected={false}>
                  <FragranceSearchResult
                    fragrance={f}
                    isOwned={ownedIds.has(f.id)}
                    isAdding={adding && pendingFragrance?.id === f.id}
                    onAdd={() => setPendingFragrance(f)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <AffinityCaptureModal
        open={pendingFragrance != null}
        fragrance={pendingFragrance}
        busy={adding}
        onClose={() => {
          if (!adding) setPendingFragrance(null);
        }}
        onConfirm={(affinity) => void handleConfirmAffinity(affinity)}
      />
    </AppShell>
  );
}
