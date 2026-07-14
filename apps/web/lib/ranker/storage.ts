import { FEATURE_DIM } from "./feature-vector";

export const STORAGE_KEY_PREFIX = "scent_ranker_weights";

export function weightsStorageKey(profileId: string): string {
  return `${STORAGE_KEY_PREFIX}:${profileId}`;
}

function getLocalStorage(): Storage | null {
  if (typeof globalThis.localStorage === "undefined") return null;
  return globalThis.localStorage;
}

export function loadWeights(profileId: string): Float32Array {
  const storage = getLocalStorage();
  if (!storage) return new Float32Array(FEATURE_DIM);

  try {
    const raw = storage.getItem(weightsStorageKey(profileId));
    if (!raw) {
      const legacy = loadLegacyWeights();
      if (legacy) {
        saveWeights(profileId, legacy);
        clearLegacyWeights();
        return legacy;
      }
      return new Float32Array(FEATURE_DIM);
    }

    const parsed = JSON.parse(raw) as number[];
    if (!Array.isArray(parsed) || parsed.length !== FEATURE_DIM) {
      return new Float32Array(FEATURE_DIM);
    }

    return new Float32Array(parsed);
  } catch {
    return new Float32Array(FEATURE_DIM);
  }
}

export function saveWeights(profileId: string, weights: Float32Array): void {
  const storage = getLocalStorage();
  if (!storage) return;
  storage.setItem(
    weightsStorageKey(profileId),
    JSON.stringify(Array.from(weights)),
  );
}

export function clearWeights(profileId: string): void {
  const storage = getLocalStorage();
  if (!storage) return;
  storage.removeItem(weightsStorageKey(profileId));
  storage.removeItem(`scent_active_profile_id:${profileId}:updated`);
}

/** Legacy global key from pre-auth ranker — migrated on hydrate. */
export function loadLegacyWeights(): Float32Array | null {
  const storage = getLocalStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(STORAGE_KEY_PREFIX);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as number[];
    if (!Array.isArray(parsed) || parsed.length !== FEATURE_DIM) return null;

    return new Float32Array(parsed);
  } catch {
    return null;
  }
}

export function clearLegacyWeights(): void {
  const storage = getLocalStorage();
  if (!storage) return;
  storage.removeItem(STORAGE_KEY_PREFIX);
}

export function migrateWeightsStorage(
  fromProfileId: string | null,
  toProfileId: string,
): void {
  if (!fromProfileId || fromProfileId === toProfileId) return;

  const existing = loadWeights(toProfileId);
  const hasTargetWeights = Array.from(existing).some((value) => value !== 0);
  if (hasTargetWeights) return;

  const source = loadWeights(fromProfileId);
  const hasSourceWeights = Array.from(source).some((value) => value !== 0);
  if (!hasSourceWeights) return;

  saveWeights(toProfileId, source);
  clearWeights(fromProfileId);
}
