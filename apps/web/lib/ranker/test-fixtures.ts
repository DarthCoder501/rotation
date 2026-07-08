import type { FragranceRow, UserProfile } from "./types";

export function makeFragrance(
  overrides: Partial<FragranceRow> & Pick<FragranceRow, "id" | "perfume" | "brand">,
): FragranceRow {
  return {
    url: null,
    country: null,
    gender: "unisex",
    ratingValue: 4.2,
    ratingCount: 1000,
    year: 2020,
    topNotes: "bergamot",
    middleNotes: "jasmine",
    baseNotes: "vanilla",
    perfumer1: null,
    perfumer2: null,
    mainAccord1: "vanilla",
    mainAccord2: "amber",
    mainAccord3: null,
    mainAccord4: null,
    mainAccord5: null,
    ...overrides,
  };
}

export const vanillaProfile: UserProfile = {
  likedAccords: ["vanilla", "amber"],
  dislikedAccords: ["smoky"],
  likedBrands: ["lattafa"],
  dislikedBrands: [],
};
