import type { Fragrance } from "@/lib/types/fragrance";
import { toUserFacingMessage } from "@/lib/api/user-facing-error";

export interface CatalogSearchResponse {
  results: Fragrance[];
  /** "hybrid" when pgvector matches contributed; otherwise keyword-only. */
  mode?: "hybrid" | "text";
}

export interface CatalogFragranceResponse {
  fragrance: Fragrance;
}

/**
 * Search the read-only source catalog.
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
      toUserFacingMessage(
        (body as { message?: string }).message ??
          `Catalog search failed (${res.status})`,
        "Search is unavailable right now. Try again in a moment.",
      ),
    );
  }
  return res.json() as Promise<CatalogSearchResponse>;
}

/** Fetch one fragrance by catalog id. */
export async function fetchFragranceById(
  id: number,
): Promise<CatalogFragranceResponse> {
  const res = await fetch(`/api/catalog/${id}`, { cache: "no-store" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    if (res.status === 404) {
      throw new Error("Fragrance not found.");
    }
    throw new Error(
      toUserFacingMessage(
        (body as { message?: string }).message ??
          `Fetch fragrance failed (${res.status})`,
        "Could not load this fragrance right now.",
      ),
    );
  }
  return res.json() as Promise<CatalogFragranceResponse>;
}
