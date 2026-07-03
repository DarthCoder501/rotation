/** Matches Supabase `fragrances` row shape (camelCase for the app layer). */
export interface Fragrance {
  id: number;
  url: string | null;
  perfume: string;
  brand: string;
  country: string | null;
  gender: "men" | "women" | "unisex" | null;
  ratingValue: number;
  ratingCount: number;
  year: number | null;
  topNotes: string | null;
  middleNotes: string | null;
  baseNotes: string | null;
  perfumer1: string | null;
  perfumer2: string | null;
  mainAccord1: string | null;
  mainAccord2: string | null;
  mainAccord3: string | null;
  mainAccord4: string | null;
  mainAccord5: string | null;
}

export function getAccords(fragrance: Fragrance): string[] {
  const raw = [
    fragrance.mainAccord1,
    fragrance.mainAccord2,
    fragrance.mainAccord3,
    fragrance.mainAccord4,
    fragrance.mainAccord5,
  ];
  const seen = new Set<string>();
  const accords: string[] = [];
  for (const a of raw) {
    if (!a) continue;
    const key = a.trim().toLowerCase();
    if (key && !seen.has(key)) {
      seen.add(key);
      accords.push(a.trim());
    }
  }
  return accords;
}

export function formatGender(gender: Fragrance["gender"]): string | null {
  if (!gender) return null;
  return gender.charAt(0).toUpperCase() + gender.slice(1);
}
