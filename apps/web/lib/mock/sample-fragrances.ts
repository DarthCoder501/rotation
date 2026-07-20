import type { Fragrance } from "@/lib/types/fragrance";

/**
 * Dev-only sample rows for UI preview before /api/* routes are implemented.
 * Import in a page temporarily, or delete once catalog search works.
 */
export const SAMPLE_FRAGRANCES: Fragrance[] = [
  {
    id: 1,
    url: null,
    perfume: "Khamrah",
    brand: "Lattafa",
    country: "UAE",
    gender: "unisex",
    ratingValue: 4.32,
    ratingCount: 1200,
    year: 2022,
    topNotes: "Cinnamon, Nutmeg, Bergamot",
    middleNotes: "Dates, Praline, Tuberose",
    baseNotes: "Vanilla, Amber, Myrrh",
    perfumer1: null,
    perfumer2: null,
    mainAccord1: "warm spicy",
    mainAccord2: "cinnamon",
    mainAccord3: "amber",
    mainAccord4: "vanilla",
    mainAccord5: null,
    visibility: "published",
  },
  {
    id: 2,
    url: null,
    perfume: "9 PM",
    brand: "Afnan",
    country: "UAE",
    gender: "men",
    ratingValue: 4.1,
    ratingCount: 890,
    year: 2020,
    topNotes: "Apple, Cinnamon, Wild Lavender, Bergamot",
    middleNotes: "Orange Blossom, Lily-of-the-Valley",
    baseNotes: "Vanilla, Tonka Bean, Amber, Patchouli",
    perfumer1: null,
    perfumer2: null,
    mainAccord1: "vanilla",
    mainAccord2: "amber",
    mainAccord3: "warm spicy",
    mainAccord4: "fruity",
    mainAccord5: null,
    visibility: "published",
  },
];
