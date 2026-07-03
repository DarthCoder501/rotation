"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
import type { Fragrance } from "@/lib/types/fragrance";

const DEBOUNCE_MS = 300;
const MIN_QUERY = 2;

export function CatalogSearchPageClient() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<Fragrance[]>([]);
  const [ownedIds, setOwnedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<number | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(query.trim()), DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [query]);

  const loadOwned = useCallback(async () => {
    try {
      const { items } = await fetchCollection();
      setOwnedIds(new Set(items.map((f) => f.id)));
    } catch {
      /* collection API may still be a stub */
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

  async function handleAdd(fragrance: Fragrance) {
    setAddingId(fragrance.id);
    try {
      await addToCollection(fragrance.id);
      setOwnedIds((prev) => new Set(prev).add(fragrance.id));
      const { items } = await fetchCollection();
      await cacheCollection(items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add to collection");
    } finally {
      setAddingId(null);
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
            : "Search by fragrance name or brand"}
        </p>

        <div className="mt-4">
          {loading && <SearchLoadingState />}
          {!loading && error && (
            <SearchErrorState message={error} onRetry={() => runSearch(debouncedQuery)} />
          )}
          {!loading && !error && debouncedQuery.length >= MIN_QUERY && results.length === 0 && (
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
                    isAdding={addingId === f.id}
                    onAdd={() => handleAdd(f)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  );
}
