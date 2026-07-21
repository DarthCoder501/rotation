import { FEATURE_DIM, extractFeatureVector } from "./feature-vector";
import type { RankingContext } from "./context-features";
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
import {
  recordRankerTelemetry,
  weightL2Norm,
} from "./telemetry";
import type { FragranceRow, RankedFragrance, UserProfile } from "./types";
import { queueRankerWeightSync } from "./weight-sync";

export const LEARNING_RATE = 0.05;
export const MIN_RATING = 3.8;
export const TOP_K = 15;

/** Below this L2 weight norm, rating/affinity cold-start priors still matter. */
export const COLD_START_NORM = 0.4;
const COLD_START_RATING_WEIGHT = 0.45;
const COLD_START_AFFINITY_WEIGHT = 0.28;

export class FragranceRanker {
  private weights: Float32Array;
  private readonly profileId: string;

  constructor(profileId: string, initialWeights?: Float32Array) {
    this.profileId = profileId;
    this.weights = initialWeights ?? loadWeights(profileId);
  }

  getWeights(): Float32Array {
    return new Float32Array(this.weights);
  }

  score(
    row: FragranceRow,
    profile: UserProfile,
    affinities?: AffinityMap,
    context?: RankingContext,
  ): number {
    if (row.ratingValue < MIN_RATING) return -Infinity;
    const features = extractFeatureVector(row, profile, context);
    const affinity = affinities?.[String(row.id)];
    return (
      dot(this.weights, features) +
      affinityPriorBonus(typeof affinity === "number" ? affinity : null) +
      this.coldStartBonus(row, affinities)
    );
  }

  rankAll(
    candidates: FragranceRow[],
    profile: UserProfile,
    topK = TOP_K,
    affinities?: AffinityMap,
    context?: RankingContext,
  ): RankedFragrance[] {
    return candidates
      .map((row) => ({
        row,
        score: this.score(row, profile, affinities, context),
      }))
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
    context?: RankingContext,
  ): void {
    const signal = preferenceToSignal(rating);
    if (Math.abs(signal) < PREFERENCE_DEAD_ZONE) {
      this.persist(`preference:${clampPreference(rating)}:noop`);
      return;
    }

    const features = extractFeatureVector(row, profile, context);
    for (let i = 0; i < FEATURE_DIM; i++) {
      this.weights[i] += LEARNING_RATE * signal * features[i];
    }
    this.persist(`preference:${clampPreference(rating)}`);
  }

  /** @deprecated Prefer recordPreference(0–100). */
  recordFeedback(
    row: FragranceRow,
    profile: UserProfile,
    label: 1 | -1,
    context?: RankingContext,
  ): void {
    this.recordPreference(row, profile, label === 1 ? 100 : 0, context);
  }

  /**
   * Pairwise preference with optional strength (0–100).
   */
  recordPairwiseChoice(
    winner: FragranceRow,
    loser: FragranceRow,
    profile: UserProfile,
    strength: number = 75,
    context?: RankingContext,
  ): void {
    const magnitude = Math.max(
      Math.abs(preferenceToSignal(clampPreference(strength))),
      0.25,
    );
    const winnerFeatures = extractFeatureVector(winner, profile, context);
    const loserFeatures = extractFeatureVector(loser, profile, context);
    for (let i = 0; i < FEATURE_DIM; i++) {
      this.weights[i] +=
        LEARNING_RATE * magnitude * (winnerFeatures[i] - loserFeatures[i]);
    }
    this.persist(`pairwise:${clampPreference(strength)}`);
  }

  private coldStartBonus(
    row: FragranceRow,
    affinities?: AffinityMap,
  ): number {
    const norm = weightL2Norm(this.weights);
    if (norm >= COLD_START_NORM) return 0;

    const fade = 1 - norm / COLD_START_NORM;
    const ratingPart = Math.max(
      0,
      (row.ratingValue - MIN_RATING) / (5 - MIN_RATING),
    );
    const affinity = affinities?.[String(row.id)];
    const affinityPart =
      typeof affinity === "number"
        ? (clampPreference(affinity) - 50) / 50
        : 0;

    return (
      fade *
      (COLD_START_RATING_WEIGHT * ratingPart +
        COLD_START_AFFINITY_WEIGHT * affinityPart)
    );
  }

  private persist(reason: string): void {
    saveWeights(this.profileId, this.weights);
    queueRankerWeightSync(this.profileId, this.weights);
    recordRankerTelemetry(reason, this.weights);
  }
}

function dot(a: Float32Array, b: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

/** How many daily options to present based on collection size. */
export function recommendationOptionCount(collectionSize: number): number {
  // Small collections show every bottle — hiding one of three felt broken.
  if (collectionSize <= 3) return collectionSize;
  if (collectionSize <= 8) return 3;
  if (collectionSize <= 20) return 4;
  return 5;
}
