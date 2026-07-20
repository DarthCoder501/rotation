import type {
  Fragrance,
  FragranceVisibility,
} from "@/lib/types/fragrance";

export type FragranceRow = {
  id: number;
  url: string | null;
  perfume: string;
  brand: string;
  country: string | null;
  gender: "men" | "women" | "unisex" | null;
  rating_value: number;
  rating_count: number | null;
  year: number | null;
  top_notes: string | null;
  middle_notes: string | null;
  base_notes: string | null;
  perfumer1: string | null;
  perfumer2: string | null;
  main_accord_1: string | null;
  main_accord_2: string | null;
  main_accord_3: string | null;
  main_accord_4: string | null;
  main_accord_5: string | null;
  visibility?: FragranceVisibility | null;
};

export const fragranceSelect = `
  id,
  url,
  perfume,
  brand,
  country,
  gender,
  rating_value,
  rating_count,
  year,
  top_notes,
  middle_notes,
  base_notes,
  perfumer1,
  perfumer2,
  main_accord_1,
  main_accord_2,
  main_accord_3,
  main_accord_4,
  main_accord_5,
  visibility
`;

export function mapFragrance(row: FragranceRow): Fragrance {
  const visibility: FragranceVisibility =
    row.visibility === "provisional" ? "provisional" : "published";

  return {
    id: Number(row.id),
    url: row.url,
    perfume: row.perfume,
    brand: row.brand,
    country: row.country,
    gender: row.gender,
    ratingValue: row.rating_value,
    ratingCount: row.rating_count ?? 0,
    year: row.year,
    topNotes: row.top_notes,
    middleNotes: row.middle_notes,
    baseNotes: row.base_notes,
    perfumer1: row.perfumer1,
    perfumer2: row.perfumer2,
    mainAccord1: row.main_accord_1,
    mainAccord2: row.main_accord_2,
    mainAccord3: row.main_accord_3,
    mainAccord4: row.main_accord_4,
    mainAccord5: row.main_accord_5,
    visibility,
  };
}
