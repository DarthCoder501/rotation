import { clampPreference, PREFERENCE_NEUTRAL } from "@/lib/ranker/preference";

const STORAGE_PREFIX = "scent_collection_affinity";

function storageKey(profileId: string): string {
  return `${STORAGE_PREFIX}:${profileId}`;
}

function getStorage(): Storage | null {
  if (typeof globalThis.localStorage === "undefined") return null;
  return globalThis.localStorage;
}

export type AffinityMap = Record<string, number>;

export function loadAffinities(profileId: string): AffinityMap {
  const storage = getStorage();
  if (!storage || !profileId) return {};

  try {
    const raw = storage.getItem(storageKey(profileId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as AffinityMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function getAffinity(
  profileId: string,
  fragranceId: number,
): number | null {
  const map = loadAffinities(profileId);
  const value = map[String(fragranceId)];
  return typeof value === "number" ? clampPreference(value) : null;
}

export function saveAffinity(
  profileId: string,
  fragranceId: number,
  rating: number,
): void {
  const storage = getStorage();
  if (!storage || !profileId) return;

  const map = loadAffinities(profileId);
  map[String(fragranceId)] = clampPreference(rating);
  storage.setItem(storageKey(profileId), JSON.stringify(map));
}

export function removeAffinity(profileId: string, fragranceId: number): void {
  const storage = getStorage();
  if (!storage || !profileId) return;
  const map = loadAffinities(profileId);
  delete map[String(fragranceId)];
  storage.setItem(storageKey(profileId), JSON.stringify(map));
}

/** Soft prior so high affinity bottles score a bit higher before online learning converges. */
export const AFFINITY_PRIOR_WEIGHT = 0.35;

export function affinityPriorBonus(rating: number | null | undefined): number {
  if (rating == null) return 0;
  return ((clampPreference(rating) - PREFERENCE_NEUTRAL) / PREFERENCE_NEUTRAL) *
    AFFINITY_PRIOR_WEIGHT;
}
