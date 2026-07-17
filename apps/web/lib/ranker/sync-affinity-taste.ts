import { updateTasteProfile } from "@/lib/api/profile-client";
import { applyAffinityToProfile } from "@/lib/ranker/affinity-profile";
import type { FragranceRow, UserProfile } from "@/lib/ranker/types";

/**
 * Fire-and-forget: seed liked/disliked taste chips from a strong affinity signal.
 */
export async function syncAffinityTasteProfile(
  profile: UserProfile,
  fragrance: FragranceRow,
  affinity: number,
): Promise<UserProfile | null> {
  const { profile: next, changed } = applyAffinityToProfile(
    profile,
    fragrance,
    affinity,
  );
  if (!changed) return null;
  try {
    return await updateTasteProfile(next);
  } catch {
    return null;
  }
}
