import type { Fragrance } from "@/lib/types/fragrance";
import {
  mapFragrance,
  type FragranceRow,
} from "@/lib/server/fragrance-mapper";
import type {
  WearEvent,
  WearSource,
  WearWeather,
} from "@/lib/types/wear";

export type WearEventRow = {
  id: number;
  fragrance_id: number;
  worn_on: string;
  activity: string | null;
  weather: WearWeather | null;
  source: WearSource;
  timezone: string | null;
  created_at: string;
  fragrances?: FragranceRow | FragranceRow[] | null;
};

export const wearSelect = `
  id,
  fragrance_id,
  worn_on,
  activity,
  weather,
  source,
  timezone,
  created_at,
  fragrances (
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
  )
`;

function normalizeFragrance(
  value: FragranceRow | FragranceRow[] | null | undefined,
): Fragrance | null {
  if (!value) return null;
  const row = Array.isArray(value) ? value[0] : value;
  return row ? mapFragrance(row) : null;
}

export function mapWearEvent(row: WearEventRow): WearEvent {
  return {
    id: Number(row.id),
    fragranceId: Number(row.fragrance_id),
    wornOn: String(row.worn_on).slice(0, 10),
    activity: row.activity,
    weather: row.weather ?? null,
    source: row.source,
    timezone: row.timezone,
    createdAt: row.created_at,
    fragrance: normalizeFragrance(row.fragrances),
  };
}
