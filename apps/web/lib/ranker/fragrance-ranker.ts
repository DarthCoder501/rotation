import { FEATURE_DIM, extractFeatureVector } from "./feature-vector";
import {
  affinityPriorBonus,
  type AffinityMap,
} from "./affinity-store";
import {
  PREFERENCE_DEAD_ZONE,
  clampPreference,
  preferenceToSignal,
} from "./preference";
import { loadWeights, saveWeights } from "./storage";
import type { FragranceRow, RankedFragrance, UserProfile } from "./types";
import { queueRankerWeightSync } from "./weight-sync";

export const LEARNING_RATE = 0.05;
export const MIN_RATING = 3.8;
export const TOP_K = 15;

export class FragranceRanker {
  private weights: Float32Array;
  private readonly profileId: string;

  constructor(profileId: string, initialWeights?: Float32Array) {
    this.profileId = profileId;
    this.weights = initialWeights ?? loadWeights(profileId);
  }

  score(
    row: FragranceRow,
    profile: UserProfile,
    affinities?: AffinityMap,
  ): number {
    if (row.ratingValue < MIN_RATING) return -Infinity;
    const features = extractFeatureVector(row, profile);
    const affinity = affinities?.[String(row.id)];
    return (
      dot(this.weights, features) +
      affinityPriorBonus(typeof affinity === "number" ? affinity : null)
    );
  }

  rankAll(
    candidates: FragranceRow[],
    profile: UserProfile,
    topK = TOP_K,
    affinities?: AffinityMap,
  ): RankedFragrance[] {
    return candidates
      .map((row) => ({ row, score: this.score(row, profile, affinities) }))
      .filter(({ score }) => score > -Infinity)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map(({ row, score }) => ({ ...row, score }));
  }

  /**
   * Continuous affinity feedback on a 0–100 scale.
   * Used when adding to collection and when choosing among recommendations.
   */
  recordPreference(
    row: FragranceRow,
    profile: UserProfile,
    rating: number,
  ): void {
    const signal = preferenceToSignal(rating);
    if (Math.abs(signal) < PREFERENCE_DEAD_ZONE) {
      this.persist();
      return;
    }

    const features = extractFeatureVector(row, profile);
    for (let i = 0; i < FEATURE_DIM; i++) {
      this.weights[i] += LEARNING_RATE * signal * features[i];
    }
    this.persist();
  }

  /** @deprecated Prefer recordPreference(0–100). */
  recordFeedback(
    row: FragranceRow,
    profile: UserProfile,
    label: 1 | -1,
  ): void {
    this.recordPreference(row, profile, label === 1 ? 100 : 0);
  }

  /**
   * Pairwise preference with optional strength (0–100).
   */
  recordPairwiseChoice(
    winner: FragranceRow,
    loser: FragranceRow,
    profile: UserProfile,
    strength: number = 75,
  ): void {
    const magnitude = Math.max(
      Math.abs(preferenceToSignal(clampPreference(strength))),
      0.25,
    );
    const winnerFeatures = extractFeatureVector(winner, profile);
    const loserFeatures = extractFeatureVector(loser, profile);
    for (let i = 0; i < FEATURE_DIM; i++) {
      this.weights[i] +=
        LEARNING_RATE * magnitude * (winnerFeatures[i] - loserFeatures[i]);
    }
    this.persist();
  }

  private persist(): void {
    saveWeights(this.profileId, this.weights);
    queueRankerWeightSync(this.profileId, this.weights);
  }
}

function dot(a: Float32Array, b: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

/** How many daily options to present based on collection size. */
export function recommendationOptionCount(collectionSize: number): number {
  if (collectionSize <= 1) return collectionSize;
  if (collectionSize <= 3) return Math.min(2, collectionSize);
  if (collectionSize <= 8) return 3;
  if (collectionSize <= 20) return 4;
  return 5;
}
