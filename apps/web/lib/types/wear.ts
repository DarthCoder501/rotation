import type { Fragrance } from "@/lib/types/fragrance";

export type WearSource = "recommend" | "collection" | "search";

export interface WearWeather {
  tempC: number;
  condition: string;
  humidity: number;
}

export interface WearEvent {
  id: number;
  fragranceId: number;
  wornOn: string;
  activity: string | null;
  weather: WearWeather | null;
  source: WearSource;
  timezone: string | null;
  createdAt: string;
  fragrance: Fragrance | null;
}

export interface CreateWearBody {
  fragranceId: number;
  wornOn?: string;
  activity?: string;
  weather?: WearWeather | null;
  source?: WearSource;
  timezone?: string;
}

export interface WearInsights {
  totalWears: number;
  daysLogged: number;
  mostWorn: Array<{
    fragranceId: number;
    perfume: string;
    brand: string;
    count: number;
  }>;
  byActivity: Array<{ activity: string; count: number }>;
  byWeatherBucket: Array<{ bucket: string; count: number }>;
  bySeason: Array<{ season: string; count: number }>;
}
