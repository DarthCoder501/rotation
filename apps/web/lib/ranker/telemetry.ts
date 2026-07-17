import { FEATURE_DIM } from "./feature-vector";
import { FEATURE_LABELS } from "./context-features";

export type RankerTelemetryEvent = {
  at: string;
  reason: string;
  weightNorm: number;
  topWeights: Array<{ index: number; label: string; value: number }>;
};

const MAX_EVENTS = 8;
const events: RankerTelemetryEvent[] = [];

export function weightL2Norm(weights: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < weights.length; i++) {
    sum += weights[i] * weights[i];
  }
  return Math.sqrt(sum);
}

export function topWeightEntries(
  weights: Float32Array,
  limit = 6,
): Array<{ index: number; label: string; value: number }> {
  return Array.from(weights)
    .map((value, index) => ({
      index,
      label: FEATURE_LABELS[index] ?? `f${index}`,
      value,
    }))
    .filter((entry) => Math.abs(entry.value) > 1e-6)
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, limit);
}

export function recordRankerTelemetry(
  reason: string,
  weights: Float32Array,
): void {
  if (weights.length !== FEATURE_DIM) return;
  events.unshift({
    at: new Date().toISOString(),
    reason,
    weightNorm: weightL2Norm(weights),
    topWeights: topWeightEntries(weights),
  });
  if (events.length > MAX_EVENTS) {
    events.length = MAX_EVENTS;
  }
}

export function getRankerTelemetry(): RankerTelemetryEvent[] {
  return [...events];
}

export function clearRankerTelemetry(): void {
  events.length = 0;
}
