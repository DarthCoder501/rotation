import { getAccords } from "@/lib/types/fragrance";
import { clampPreference } from "./preference";
import type { FragranceRow, UserProfile } from "./types";

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

const LIKE_THRESHOLD = 75;
const DISLIKE_THRESHOLD = 25;
const MAX_ACCORDS = 12;
const MAX_BRANDS = 12;

function uniquePush(list: string[], value: string, max: number): string[] {
  const key = normalize(value);
  if (!key) return list;
  if (list.some((item) => normalize(item) === key)) return list;
  return [...list, value.trim()].slice(0, max);
}

function withoutValue(list: string[], value: string): string[] {
  const key = normalize(value);
  return list.filter((item) => normalize(item) !== key);
}

/**
 * High affinity seeds liked accords/brands; low affinity soft-dislikes primary accord.
 * Returns the same profile reference when nothing changes.
 */
export function applyAffinityToProfile(
  profile: UserProfile,
  fragrance: FragranceRow,
  affinityRaw: number,
): { profile: UserProfile; changed: boolean } {
  const affinity = clampPreference(affinityRaw);
  const accords = getAccords(fragrance);
  const primary = accords[0];
  const brand = fragrance.brand?.trim();

  let likedAccords = [...profile.likedAccords];
  let dislikedAccords = [...profile.dislikedAccords];
  let likedBrands = [...profile.likedBrands];
  let dislikedBrands = [...profile.dislikedBrands];
  let changed = false;

  if (affinity >= LIKE_THRESHOLD) {
    for (const accord of accords.slice(0, 3)) {
      const before = likedAccords.length;
      likedAccords = uniquePush(likedAccords, accord, MAX_ACCORDS);
      dislikedAccords = withoutValue(dislikedAccords, accord);
      if (likedAccords.length !== before) changed = true;
    }
    if (brand) {
      const before = likedBrands.length;
      likedBrands = uniquePush(likedBrands, brand, MAX_BRANDS);
      dislikedBrands = withoutValue(dislikedBrands, brand);
      if (likedBrands.length !== before) changed = true;
    }
  } else if (affinity <= DISLIKE_THRESHOLD && primary) {
    const before = dislikedAccords.length;
    dislikedAccords = uniquePush(dislikedAccords, primary, MAX_ACCORDS);
    likedAccords = withoutValue(likedAccords, primary);
    if (dislikedAccords.length !== before) changed = true;
  }

  if (!changed) {
    return { profile, changed: false };
  }

  return {
    profile: {
      likedAccords,
      dislikedAccords,
      likedBrands,
      dislikedBrands,
    },
    changed: true,
  };
}
