import type { Fragrance } from "@/lib/types/fragrance";

export interface CollectionResponse {
  items: Fragrance[];
}

/**
 * Fetch the signed-in user's collection (fragrances they own).
 * Wire this to GET /api/collection once you implement the route.
 */
export async function fetchCollection(): Promise<CollectionResponse> {
  const res = await fetch("/api/collection");
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { message?: string }).message ??
        `Fetch collection failed (${res.status})`,
    );
  }
  return res.json() as Promise<CollectionResponse>;
}

/**
 * Add a fragrance from the source catalog to the user's collection.
 * Wire this to POST /api/collection { fragranceId }.
 */
export async function addToCollection(fragranceId: number): Promise<void> {
  const res = await fetch("/api/collection", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fragranceId }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { message?: string }).message ??
        `Add to collection failed (${res.status})`,
    );
  }
}

/**
 * Remove a fragrance from the user's collection.
 * Wire this to DELETE /api/collection/[fragranceId].
 */
export async function removeFromCollection(fragranceId: number): Promise<void> {
  const res = await fetch(`/api/collection/${fragranceId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { message?: string }).message ??
        `Remove from collection failed (${res.status})`,
    );
  }
}
