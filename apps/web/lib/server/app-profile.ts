import { cookies } from "next/headers";
import type { UserProfile } from "@/lib/ranker/types";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "./supabase-admin";

const DEVICE_COOKIE = "scent_device_id";

export type AppProfileRow = {
  id: string;
  device_id: string | null;
  auth_user_id: string | null;
  profile: UserProfile;
  ranker_weights: number[] | null;
  ranker_weights_updated_at: string | null;
};

export type ResolvedAppProfile = AppProfileRow & {
  isAuthenticated: boolean;
  email: string | null;
};

const defaultProfileJson: UserProfile = {
  likedAccords: [],
  dislikedAccords: [],
  likedBrands: [],
  dislikedBrands: [],
};

/** Resolves the active app profile for API routes — anonymous or signed-in. */
export async function resolveAppProfile(): Promise<ResolvedAppProfile> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    return ensureAuthenticatedProfile(user.id, user.email ?? null);
  }

  return resolveAnonymousProfile();
}

/**
 * Link/create an app profile for a known auth user.
 * Prefer this after OAuth code exchange — cookies may not be readable yet in the same request.
 */
export async function ensureAuthenticatedProfile(
  authUserId: string,
  email: string | null,
): Promise<ResolvedAppProfile> {
  const deviceId = await getDeviceIdFromCookie();
  const deviceProfile = deviceId
    ? await getProfileByDeviceId(deviceId)
    : null;
  const authProfile = await getProfileByAuthUserId(authUserId);

  if (authProfile && deviceProfile && authProfile.id !== deviceProfile.id) {
    await mergeProfilesIntoTarget(authProfile.id, deviceProfile.id);
    await supabaseAdmin
      .from("user_profiles")
      .delete()
      .eq("id", deviceProfile.id);

    const refreshed = await getProfileByAuthUserId(authUserId);
    if (!refreshed) {
      throw new Error("Failed to reload profile after merge");
    }
    return { ...refreshed, isAuthenticated: true, email };
  }

  if (authProfile) {
    return { ...authProfile, isAuthenticated: true, email };
  }

  if (deviceProfile) {
    const linked = await linkAuthUserToProfile(deviceProfile.id, authUserId);
    return { ...linked, isAuthenticated: true, email };
  }

  const created = await createAuthProfile(authUserId);
  return { ...created, isAuthenticated: true, email };
}

async function resolveAnonymousProfile(): Promise<ResolvedAppProfile> {
  const deviceId = await getOrCreateDeviceId();
  const profile = await upsertDeviceProfile(deviceId);
  return { ...profile, isAuthenticated: false, email: null };
}

async function getOrCreateDeviceId(): Promise<string> {
  const cookieStore = await cookies();
  let deviceId = cookieStore.get(DEVICE_COOKIE)?.value;

  if (!deviceId) {
    deviceId = crypto.randomUUID();
    cookieStore.set(DEVICE_COOKIE, deviceId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  return deviceId;
}

async function getDeviceIdFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(DEVICE_COOKIE)?.value ?? null;
}

async function upsertDeviceProfile(deviceId: string): Promise<AppProfileRow> {
  // Select-or-insert: PostgREST onConflict can't target our partial unique index on device_id.
  const existing = await getProfileByDeviceId(deviceId);
  if (existing) return existing;

  const { data, error } = await queryProfileRow((columns) =>
    supabaseAdmin
      .from("user_profiles")
      .insert({ device_id: deviceId, profile: defaultProfileJson })
      .select(columns)
      .single(),
  );

  if (error || !data) {
    // Concurrent create: another request may have inserted the same device_id.
    const raced = await getProfileByDeviceId(deviceId);
    if (raced) return raced;
    throw new Error(`Failed to load user profile: ${error?.message}`);
  }

  return normalizeProfileRow(data);
}

async function getProfileByDeviceId(
  deviceId: string,
): Promise<AppProfileRow | null> {
  const { data, error } = await queryProfileRow((columns) =>
    supabaseAdmin
      .from("user_profiles")
      .select(columns)
      .eq("device_id", deviceId)
      .maybeSingle(),
  );

  if (error) {
    throw new Error(`Failed to load device profile: ${error.message}`);
  }

  return data ? normalizeProfileRow(data) : null;
}

async function getProfileByAuthUserId(
  authUserId: string,
): Promise<AppProfileRow | null> {
  if (!(await authColumnsAvailable())) {
    return null;
  }

  const { data, error } = await queryProfileRow((columns) =>
    supabaseAdmin
      .from("user_profiles")
      .select(columns)
      .eq("auth_user_id", authUserId)
      .maybeSingle(),
  );

  if (error) {
    if (isMissingColumnError(error)) {
      markAuthColumnsUnavailable();
      return null;
    }
    throw new Error(`Failed to load auth profile: ${error.message}`);
  }

  return data ? normalizeProfileRow(data) : null;
}

async function linkAuthUserToProfile(
  profileId: string,
  authUserId: string,
): Promise<AppProfileRow> {
  if (!(await authColumnsAvailable())) {
    const deviceId = await getOrCreateDeviceId();
    return upsertDeviceProfile(deviceId);
  }

  const { data, error } = await queryProfileRow((columns) =>
    supabaseAdmin
      .from("user_profiles")
      .update({ auth_user_id: authUserId })
      .eq("id", profileId)
      .select(columns)
      .single(),
  );

  if (error || !data) {
    if (error && isMissingColumnError(error)) {
      markAuthColumnsUnavailable();
      const deviceId = await getOrCreateDeviceId();
      return upsertDeviceProfile(deviceId);
    }
    throw new Error(`Failed to link auth user: ${error?.message}`);
  }

  return normalizeProfileRow(data);
}

async function createAuthProfile(authUserId: string): Promise<AppProfileRow> {
  if (!(await authColumnsAvailable())) {
    const deviceId = await getOrCreateDeviceId();
    return upsertDeviceProfile(deviceId);
  }

  const { data, error } = await queryProfileRow((columns) =>
    supabaseAdmin
      .from("user_profiles")
      .insert({ auth_user_id: authUserId, profile: defaultProfileJson })
      .select(columns)
      .single(),
  );

  if (error || !data) {
    if (error && isMissingColumnError(error)) {
      markAuthColumnsUnavailable();
      const deviceId = await getOrCreateDeviceId();
      return upsertDeviceProfile(deviceId);
    }
    throw new Error(`Failed to create auth profile: ${error?.message}`);
  }

  return normalizeProfileRow(data);
}

/** Merge anonymous device data into an existing signed-in account. */
async function mergeProfilesIntoTarget(
  targetProfileId: string,
  sourceProfileId: string,
): Promise<void> {
  if (targetProfileId === sourceProfileId) return;

  const columns =
    (await authColumnsAvailable())
      ? PROFILE_SELECT_FULL
      : PROFILE_SELECT_LEGACY;

  const { data: rows, error } = await supabaseAdmin
    .from("user_profiles")
    .select(columns)
    .in("id", [targetProfileId, sourceProfileId]);

  if (error || !rows || rows.length !== 2) {
    throw new Error(`Failed to load profiles for merge: ${error?.message}`);
  }

  const typedRows = rows as unknown as Record<string, unknown>[];
  const target = normalizeProfileRow(
    typedRows.find((row) => String(row.id) === targetProfileId)!,
  );
  const source = normalizeProfileRow(
    typedRows.find((row) => String(row.id) === sourceProfileId)!,
  );

  await mergeCollectionItems(targetProfileId, sourceProfileId);

  await supabaseAdmin
    .from("fragrance_submissions")
    .update({ user_id: targetProfileId })
    .eq("user_id", sourceProfileId);

  const mergedProfile = mergeProfileJson(target.profile, source.profile);
  const updatePayload: Record<string, unknown> = {
    profile: mergedProfile,
  };

  if (await authColumnsAvailable()) {
    const mergedWeights = pickNewerRankerWeights(target, source);
    updatePayload.ranker_weights = mergedWeights.weights;
    updatePayload.ranker_weights_updated_at = mergedWeights.updatedAt;
  }

  await supabaseAdmin
    .from("user_profiles")
    .update(updatePayload)
    .eq("id", targetProfileId);
}

function mergeProfileJson(
  target: UserProfile,
  source: UserProfile,
): UserProfile {
  return {
    likedAccords: uniqueStrings([
      ...target.likedAccords,
      ...source.likedAccords,
    ]),
    dislikedAccords: uniqueStrings([
      ...target.dislikedAccords,
      ...source.dislikedAccords,
    ]),
    likedBrands: uniqueStrings([...target.likedBrands, ...source.likedBrands]),
    dislikedBrands: uniqueStrings([
      ...target.dislikedBrands,
      ...source.dislikedBrands,
    ]),
  };
}

function pickNewerRankerWeights(
  target: AppProfileRow,
  source: AppProfileRow,
): { weights: number[] | null; updatedAt: string | null } {
  const targetTime = target.ranker_weights_updated_at
    ? Date.parse(target.ranker_weights_updated_at)
    : 0;
  const sourceTime = source.ranker_weights_updated_at
    ? Date.parse(source.ranker_weights_updated_at)
    : 0;

  if (sourceTime > targetTime && source.ranker_weights) {
    return {
      weights: source.ranker_weights,
      updatedAt: source.ranker_weights_updated_at,
    };
  }

  return {
    weights: target.ranker_weights,
    updatedAt: target.ranker_weights_updated_at,
  };
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}

async function mergeCollectionItems(
  targetProfileId: string,
  sourceProfileId: string,
): Promise<void> {
  const { data: targetItems, error: targetError } = await supabaseAdmin
    .from("collection_items")
    .select("fragrance_id")
    .eq("user_id", targetProfileId);

  if (targetError) {
    throw new Error(`Failed to load target collection: ${targetError.message}`);
  }

  const duplicateIds = (targetItems ?? []).map((row) => row.fragrance_id);

  if (duplicateIds.length > 0) {
    const { error: deleteError } = await supabaseAdmin
      .from("collection_items")
      .delete()
      .eq("user_id", sourceProfileId)
      .in("fragrance_id", duplicateIds);

    if (deleteError) {
      throw new Error(
        `Failed to dedupe collection on merge: ${deleteError.message}`,
      );
    }
  }

  const { error: moveError } = await supabaseAdmin
    .from("collection_items")
    .update({ user_id: targetProfileId })
    .eq("user_id", sourceProfileId);

  if (moveError) {
    throw new Error(`Failed to merge collection items: ${moveError.message}`);
  }
}

const PROFILE_SELECT_FULL =
  "id, device_id, auth_user_id, profile, ranker_weights, ranker_weights_updated_at";
const PROFILE_SELECT_LEGACY = "id, device_id, profile";

/** Cached probe: null = unknown, true/false after first successful path. */
let authSchemaReady: boolean | null = null;

function markAuthColumnsUnavailable() {
  authSchemaReady = false;
}

function isMissingColumnError(error: {
  message?: string;
  code?: string;
}): boolean {
  const message = error.message?.toLowerCase() ?? "";
  return (
    error.code === "42703" ||
    message.includes("does not exist") ||
    message.includes("auth_user_id") ||
    message.includes("ranker_weights")
  );
}

async function authColumnsAvailable(): Promise<boolean> {
  if (authSchemaReady === true) return true;
  if (authSchemaReady === false) return false;

  const { error } = await supabaseAdmin
    .from("user_profiles")
    .select("auth_user_id")
    .limit(1);

  if (error && isMissingColumnError(error)) {
    authSchemaReady = false;
    return false;
  }

  if (!error) {
    authSchemaReady = true;
    return true;
  }

  // Transient/unknown error — try full columns this request
  return true;
}

type ProfileQueryResult = {
  data: Record<string, unknown> | null;
  error: { message?: string; code?: string } | null;
};

/**
 * Run a profile query with full columns, falling back to the pre-auth schema
 * when migration 002 has not been applied yet.
 */
async function queryProfileRow(
  run: (columns: string) => PromiseLike<{
    data: unknown;
    error: { message?: string; code?: string } | null;
  }>,
): Promise<ProfileQueryResult> {
  const preferred =
    authSchemaReady === false ? PROFILE_SELECT_LEGACY : PROFILE_SELECT_FULL;
  const first = await run(preferred);

  if (!first.error) {
    if (preferred === PROFILE_SELECT_FULL) authSchemaReady = true;
    return {
      data: (first.data as Record<string, unknown> | null) ?? null,
      error: null,
    };
  }

  if (
    preferred === PROFILE_SELECT_FULL &&
    isMissingColumnError(first.error)
  ) {
    markAuthColumnsUnavailable();
    const fallback = await run(PROFILE_SELECT_LEGACY);
    return {
      data: (fallback.data as Record<string, unknown> | null) ?? null,
      error: fallback.error,
    };
  }

  return {
    data: (first.data as Record<string, unknown> | null) ?? null,
    error: first.error,
  };
}

function normalizeProfileRow(row: Record<string, unknown>): AppProfileRow {
  const profile = (row.profile ?? defaultProfileJson) as UserProfile;

  return {
    id: String(row.id),
    device_id: row.device_id ? String(row.device_id) : null,
    auth_user_id: row.auth_user_id ? String(row.auth_user_id) : null,
    profile: {
      likedAccords: profile.likedAccords ?? [],
      dislikedAccords: profile.dislikedAccords ?? [],
      likedBrands: profile.likedBrands ?? [],
      dislikedBrands: profile.dislikedBrands ?? [],
    },
    ranker_weights: Array.isArray(row.ranker_weights)
      ? row.ranker_weights.map(Number)
      : null,
    ranker_weights_updated_at: row.ranker_weights_updated_at
      ? String(row.ranker_weights_updated_at)
      : null,
  };
}

/** @deprecated Use resolveAppProfile — kept for gradual migration. */
export async function getOrCreateDeviceProfile() {
  const resolved = await resolveAppProfile();
  return {
    id: resolved.id,
    device_id: resolved.device_id ?? "",
    profile: resolved.profile,
  };
}
