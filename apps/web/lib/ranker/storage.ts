import { FEATURE_DIM } from "./feature-vector";

export const STORAGE_KEY = "scent_ranker_weights";

function getLocalStorage(): Storage | null {
  if (typeof globalThis.localStorage === "undefined") return null;
  return globalThis.localStorage;
}

export function loadWeights(): Float32Array {
  const storage = getLocalStorage();
  if (!storage) return new Float32Array(FEATURE_DIM);

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return new Float32Array(FEATURE_DIM);

    const parsed = JSON.parse(raw) as number[];
    if (!Array.isArray(parsed) || parsed.length !== FEATURE_DIM) {
      return new Float32Array(FEATURE_DIM);
    }

    return new Float32Array(parsed);
  } catch {
    return new Float32Array(FEATURE_DIM);
  }
}

export function saveWeights(weights: Float32Array): void {
  const storage = getLocalStorage();
  if (!storage) return;
  storage.setItem(STORAGE_KEY, JSON.stringify(Array.from(weights)));
}

export function clearWeights(): void {
  const storage = getLocalStorage();
  if (!storage) return;
  storage.removeItem(STORAGE_KEY);
}
