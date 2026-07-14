"use client";

import { FEATURE_DIM } from "./feature-vector";
import {
  clearLegacyWeights,
  clearWeights,
  loadLegacyWeights,
  loadWeights,
  migrateWeightsStorage,
  saveWeights,
} from "./storage";

const ACTIVE_PROFILE_KEY = "scent_active_profile_id";
const SYNC_DEBOUNCE_MS = 1500;

let syncTimer: ReturnType<typeof setTimeout> | null = null;
let lastSyncedProfileId: string | null = null;

export function getActiveProfileId(): string | null {
  if (typeof globalThis.localStorage === "undefined") return null;
  return globalThis.localStorage.getItem(ACTIVE_PROFILE_KEY);
}

export function setActiveProfileId(profileId: string): void {
  if (typeof globalThis.localStorage === "undefined") return;

  const previousProfileId = getActiveProfileId();
  migrateWeightsStorage(previousProfileId, profileId);

  const legacy = loadLegacyWeights();
  if (legacy && !Array.from(loadWeights(profileId)).some((value) => value !== 0)) {
    saveWeights(profileId, legacy);
    clearLegacyWeights();
  }

  globalThis.localStorage.setItem(ACTIVE_PROFILE_KEY, profileId);
}

export async function hydrateRankerWeights(
  profileId: string,
): Promise<Float32Array> {
  setActiveProfileId(profileId);

  const local = loadWeights(profileId);
  const hasLocal = Array.from(local).some((value) => value !== 0);

  try {
    const response = await fetch("/api/profile/ranker-weights", {
      cache: "no-store",
    });

    if (!response.ok) {
      return local;
    }

    const payload = (await response.json()) as {
      weights: number[] | null;
      updatedAt: string | null;
    };

    if (!payload.weights || payload.weights.length !== FEATURE_DIM) {
      return local;
    }

    const remote = new Float32Array(payload.weights);
    const hasRemote = Array.from(remote).some((value) => value !== 0);

    if (!hasLocal && hasRemote) {
      saveWeights(profileId, remote);
      return remote;
    }

    if (hasLocal && !hasRemote) {
      queueRankerWeightSync(profileId, local);
      return local;
    }

    if (hasLocal && hasRemote && payload.updatedAt) {
      const localUpdated = getLocalUpdatedAt(profileId);
      const remoteUpdated = Date.parse(payload.updatedAt);

      if (remoteUpdated > localUpdated) {
        saveWeights(profileId, remote);
        setLocalUpdatedAt(profileId, payload.updatedAt);
        return remote;
      }
    }

    return local;
  } catch {
    return local;
  }
}

export async function clearLearnedPreferencesLocal(
  profileId: string,
): Promise<void> {
  const zeros = new Float32Array(FEATURE_DIM);
  clearWeights(profileId);
  saveWeights(profileId, zeros);
  setLocalUpdatedAt(profileId, new Date().toISOString());
}

export function queueRankerWeightSync(
  profileId: string,
  weights: Float32Array,
): void {
  saveWeights(profileId, weights);
  setLocalUpdatedAt(profileId, new Date().toISOString());

  if (syncTimer) clearTimeout(syncTimer);

  syncTimer = setTimeout(() => {
    void syncRankerWeights(profileId, weights);
  }, SYNC_DEBOUNCE_MS);
}

async function syncRankerWeights(
  profileId: string,
  weights: Float32Array,
): Promise<void> {
  if (lastSyncedProfileId === profileId) {
    const current = loadWeights(profileId);
    if (!arraysEqual(current, weights)) {
      weights = current;
    }
  }

  try {
    const response = await fetch("/api/profile/ranker-weights", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weights: Array.from(weights) }),
    });

    if (response.ok) {
      const payload = (await response.json()) as { updatedAt?: string };
      if (payload.updatedAt) {
        setLocalUpdatedAt(profileId, payload.updatedAt);
      }
      lastSyncedProfileId = profileId;
    }
  } catch {
    // Offline or transient failure — local cache remains source of truth this session.
  }
}

function getLocalUpdatedAt(profileId: string): number {
  if (typeof globalThis.localStorage === "undefined") return 0;
  const raw = globalThis.localStorage.getItem(`${ACTIVE_PROFILE_KEY}:${profileId}:updated`);
  return raw ? Date.parse(raw) : 0;
}

function setLocalUpdatedAt(profileId: string, iso: string): void {
  if (typeof globalThis.localStorage === "undefined") return;
  globalThis.localStorage.setItem(
    `${ACTIVE_PROFILE_KEY}:${profileId}:updated`,
    iso,
  );
}

function arraysEqual(a: Float32Array, b: Float32Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
