import { getAccords } from "@/lib/types/fragrance";
import type { FragranceRow } from "./types";

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

/** Session context fed into feature dims 25–31.
 * Weather thresholds always use Celsius (API canonical unit).
 * °C/°F is a display preference only — see `lib/temperature.ts`.
 */
export type RankingContext = {
  activity?: string;
  weather?: {
    tempC: number;
    humidity: number;
    condition?: string;
  };
};

export const FEATURE_LABELS: string[] = [
  ...Array.from({ length: 10 }, (_, i) => `likedAccord[${i}]`),
  ...Array.from({ length: 10 }, (_, i) => `dislikedAccord[${i}]`),
  "likedBrand",
  "dislikedBrand",
  "rating",
  "ratingCount",
  "primaryLikedAccord",
  "warm×fresh",
  "cold×cozy",
  "humid×airy",
  "work×polished",
  "date×romantic",
  "gym×sporty",
  "relax×comfort",
];

const FRESH = [
  "citrus",
  "aquatic",
  "fresh",
  "green",
  "fruity",
  "aromatic",
  "ozonic",
];
const COZY = [
  "vanilla",
  "amber",
  "woody",
  "warm spicy",
  "spicy",
  "oriental",
  "oud",
  "gourmand",
  "balsamic",
  "tobacco",
];
const AIRY = ["citrus", "aquatic", "fresh", "green", "floral", "white floral"];
const POLISHED = [
  "woody",
  "fresh",
  "aromatic",
  "citrus",
  "spicy",
  "warm spicy",
  "iris",
  "leather",
];
const ROMANTIC = [
  "vanilla",
  "sweet",
  "floral",
  "amber",
  "musk",
  "rose",
  "powdery",
  "gourmand",
];
const SPORTY = ["citrus", "aquatic", "fresh", "green", "aromatic", "ozonic"];
const COMFORT = [
  "vanilla",
  "amber",
  "woody",
  "musk",
  "powdery",
  "gourmand",
  "sweet",
  "warm spicy",
];

function familyStrength(accords: string[], family: string[]): number {
  if (accords.length === 0) return 0;
  const normalized = accords.map(normalize);
  let hits = 0;
  for (const token of family) {
    const t = normalize(token);
    if (normalized.some((a) => a === t || a.includes(t) || t.includes(a))) {
      hits += 1;
    }
  }
  return Math.min(1, hits / 2);
}

function warmStrength(tempC: number): number {
  if (tempC >= 28) return 1;
  if (tempC >= 24) return 0.75;
  if (tempC >= 20) return 0.4;
  if (tempC >= 17) return 0.15;
  return 0;
}

function coldStrength(tempC: number): number {
  if (tempC <= 8) return 1;
  if (tempC <= 12) return 0.75;
  if (tempC <= 16) return 0.45;
  if (tempC <= 19) return 0.2;
  return 0;
}

function humidStrength(humidity: number): number {
  if (humidity >= 80) return 1;
  if (humidity >= 70) return 0.7;
  if (humidity >= 60) return 0.35;
  return 0;
}

function normalizeActivity(activity: string | undefined): string {
  if (!activity) return "";
  const value = normalize(activity);
  if (value === "work" || value.includes("office") || value.includes("meeting")) {
    return "work";
  }
  if (value === "date" || value.includes("dinner") || value.includes("night out")) {
    return "date";
  }
  if (value === "gym" || value.includes("workout") || value.includes("run")) {
    return "gym";
  }
  if (value === "relax" || value.includes("home") || value.includes("chill")) {
    return "relax";
  }
  // Custom "Other" activities lean comfort/relax
  return "relax";
}

/**
 * Fill indices 25–31: context × fragrance family matches.
 * Zero when no ranking context is provided (e.g. collection add).
 */
export function writeContextFeatures(
  target: Float32Array,
  row: FragranceRow,
  context?: RankingContext,
): void {
  if (!context?.weather && !context?.activity) return;

  const accords = getAccords(row);
  const tempC = context.weather?.tempC;
  const humidity = context.weather?.humidity;
  const activity = normalizeActivity(context.activity);

  if (typeof tempC === "number" && Number.isFinite(tempC)) {
    target[25] = warmStrength(tempC) * familyStrength(accords, FRESH);
    target[26] = coldStrength(tempC) * familyStrength(accords, COZY);
  }
  if (typeof humidity === "number" && Number.isFinite(humidity)) {
    target[27] = humidStrength(humidity) * familyStrength(accords, AIRY);
  }

  if (activity === "work") {
    target[28] = familyStrength(accords, POLISHED);
  } else if (activity === "date") {
    target[29] = familyStrength(accords, ROMANTIC);
  } else if (activity === "gym") {
    target[30] = familyStrength(accords, SPORTY);
  } else if (activity === "relax") {
    target[31] = familyStrength(accords, COMFORT);
  }
}
