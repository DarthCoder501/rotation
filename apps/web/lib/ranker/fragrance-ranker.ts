import { FEATURE_DIM, extractFeatureVector } from "./feature-vector";
import { loadWeights, saveWeights } from "./storage";
import type { FragranceRow, RankedFragrance, UserProfile } from "./types";

export const LEARNING_RATE = 0.05;
export const MIN_RATING = 3.8;
export const TOP_K = 15;

export class FragranceRanker {
  private weights: Float32Array;

  constructor() {
    this.weights = loadWeights();
  }

  score(row: FragranceRow, profile: UserProfile): number {
    if (row.ratingValue < MIN_RATING) return -Infinity;
    const features = extractFeatureVector(row, profile);
    return dot(this.weights, features);
  }

  rankAll(
    candidates: FragranceRow[],
    profile: UserProfile,
    topK = TOP_K,
  ): RankedFragrance[] {
    return candidates
      .map((row) => ({ row, score: this.score(row, profile) }))
      .filter(({ score }) => score > -Infinity)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map(({ row, score }) => ({ ...row, score }));
  }

  /** Single-sided feedback: like (+1) or skip (-1). */
  recordFeedback(
    row: FragranceRow,
    profile: UserProfile,
    label: 1 | -1,
  ): void {
    const features = extractFeatureVector(row, profile);
    for (let i = 0; i < FEATURE_DIM; i++) {
      this.weights[i] += LEARNING_RATE * label * features[i];
    }
    this.persist();
  }

  /** Pairwise preference: winner preferred over loser. */
  recordPairwiseChoice(
    winner: FragranceRow,
    loser: FragranceRow,
    profile: UserProfile,
  ): void {
    const winnerFeatures = extractFeatureVector(winner, profile);
    const loserFeatures = extractFeatureVector(loser, profile);
    for (let i = 0; i < FEATURE_DIM; i++) {
      this.weights[i] +=
        LEARNING_RATE * (winnerFeatures[i] - loserFeatures[i]);
    }
    this.persist();
  }

  private persist(): void {
    saveWeights(this.weights);
  }
}

function dot(a: Float32Array, b: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}
