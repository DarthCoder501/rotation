import type { Fragrance } from "@/lib/types/fragrance";

const CACHE_KEY = "scent_collection_v1";

/**
 * Client-side collection cache for offline ranker input (Phase 3+).
 * Replace localStorage stub with IndexedDB (`idb`) when you wire collection sync.
 */
export async function cacheCollection(items: Fragrance[]): Promise<void> {
  if (typeof window === "undefined") return;
  localStorage.setItem(CACHE_KEY, JSON.stringify(items));
}

export async function getCachedCollection(): Promise<Fragrance[]> {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Fragrance[];
  } catch {
    return [];
  }
}

export async function clearCollectionCache(): Promise<void> {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CACHE_KEY);
}
