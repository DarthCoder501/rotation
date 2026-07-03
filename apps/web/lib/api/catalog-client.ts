import type { Fragrance } from "@/lib/types/fragrance";

export interface CatalogSearchResponse {
  results: Fragrance[];
}

/**
 * Search the read-only source catalog.
 * Wire this to GET /api/catalog/search?q= once you implement the route.
 */
export async function searchCatalog(query: string): Promise<CatalogSearchResponse> {
  const q = query.trim();
  if (q.length < 2) {
    return { results: [] };
  }

  const res = await fetch(`/api/catalog/search?q=${encodeURIComponent(q)}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { message?: string }).message ??
        `Catalog search failed (${res.status})`,
    );
  }
  return res.json() as Promise<CatalogSearchResponse>;
}
