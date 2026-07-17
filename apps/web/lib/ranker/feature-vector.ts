import { getAccords } from "@/lib/types/fragrance";
import { writeContextFeatures, type RankingContext } from "./context-features";
import type { FragranceRow, UserProfile } from "./types";

export const FEATURE_DIM = 32;

// Indices 0–9:   liked accord matches
// Indices 10–19: disliked accord matches
// Index 20:      liked brand match
// Index 21:      disliked brand match
// Index 22:      normalized rating_value
// Index 23:      log-normalized rating_count
// Index 24:      primary accord in liked set
// Indices 25–31: weather/activity × fragrance family hooks

export type { RankingContext };

export function normalize(value: string): string {
  return value.trim().toLowerCase();
}

export function extractFeatureVector(
  row: FragranceRow,
  profile: UserProfile,
  context?: RankingContext,
): Float32Array {
  const x = new Float32Array(FEATURE_DIM);
  const accords = getAccords(row).map(normalize);
  const brand = normalize(row.brand);
  const likedAccords = profile.likedAccords.map(normalize);
  const likedBrands = profile.likedBrands.map(normalize);
  const dislikedBrands = profile.dislikedBrands.map(normalize);

  profile.likedAccords.slice(0, 10).forEach((accord, i) => {
    if (accords.includes(normalize(accord))) x[i] = 1;
  });
  profile.dislikedAccords.slice(0, 10).forEach((accord, i) => {
    if (accords.includes(normalize(accord))) x[10 + i] = 1;
  });
  if (likedBrands.includes(brand)) x[20] = 1;
  if (dislikedBrands.includes(brand)) x[21] = 1;
  x[22] = Math.min(row.ratingValue / 5, 1);
  x[23] = Math.min(Math.log10(row.ratingCount + 1) / 4, 1);
  if (
    row.mainAccord1 &&
    likedAccords.includes(normalize(row.mainAccord1))
  ) {
    x[24] = 1;
  }

  writeContextFeatures(x, row, context);
  return x;
}
