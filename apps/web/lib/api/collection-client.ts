import type { Fragrance } from "@/lib/types/fragrance";

export interface CollectionResponse {
  items: Fragrance[];
}

/**
 * Fetch the signed-in user's collection (fragrances they own).
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
 * @param affinity optional 0–100 like rating captured at add time
 */
export async function addToCollection(
  fragranceId: number,
  affinity?: number,
): Promise<void> {
  const res = await fetch("/api/collection", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fragranceId,
      ...(typeof affinity === "number" ? { affinity } : {}),
    }),
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
