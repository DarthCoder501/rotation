/** Continuous affinity scale used by UI + FragranceRanker. */
export const PREFERENCE_MIN = 0;
export const PREFERENCE_MAX = 100;
export const PREFERENCE_NEUTRAL = 50;

export type PreferencePreset = {
  value: number;
  label: string;
  description: string;
};

/** Snap points — short labels on the control, longer text for SR users. */
export const PREFERENCE_PRESETS: PreferencePreset[] = [
  { value: 0, label: "Dislike", description: "Dislike — strongly avoid this scent" },
  { value: 25, label: "Soft no", description: "Soft dislike — not really for you" },
  { value: 50, label: "Neutral", description: "Neutral — neither love nor dislike" },
  { value: 75, label: "Like", description: "Like — a solid favorite" },
  { value: 100, label: "Love", description: "Love — one of your strongest likes" },
];

export function clampPreference(value: number): number {
  if (!Number.isFinite(value)) return PREFERENCE_NEUTRAL;
  return Math.max(PREFERENCE_MIN, Math.min(PREFERENCE_MAX, Math.round(value)));
}

/**
 * Map 0–100 UI rating onto a bipolar learning signal in [-1, 1].
 * 0 → -1 (strong negative), 50 → 0 (no update strength), 100 → +1.
 */
export function preferenceToSignal(rating: number): number {
  return (clampPreference(rating) - PREFERENCE_NEUTRAL) / PREFERENCE_NEUTRAL;
}

export function preferenceLabel(rating: number): string {
  const value = clampPreference(rating);
  const preset = PREFERENCE_PRESETS.find((item) => item.value === value);
  if (preset) return preset.label;
  if (value < 25) return "Dislike";
  if (value < 50) return "Soft no";
  if (value < 75) return "Neutral";
  if (value < 100) return "Like";
  return "Love";
}

/** Dead-zone so tiny slider noise around 50 does not thrash weights. */
export const PREFERENCE_DEAD_ZONE = 0.04;
