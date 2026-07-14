import type { UserProfile } from "@/lib/ranker/types";
import { toUserFacingMessage } from "@/lib/api/user-facing-error";

export async function updateTasteProfile(
  profile: UserProfile,
): Promise<UserProfile> {
  const res = await fetch("/api/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profile }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      toUserFacingMessage(
        (body as { message?: string }).message ??
          `Update profile failed (${res.status})`,
        "Could not save your taste preferences.",
      ),
    );
  }

  const payload = (await res.json()) as { profile: UserProfile };
  return payload.profile;
}

export async function clearLearnedPreferences(): Promise<void> {
  const res = await fetch("/api/profile/ranker-weights", {
    method: "DELETE",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      toUserFacingMessage(
        (body as { message?: string }).message ??
          `Clear preferences failed (${res.status})`,
        "Could not clear learned preferences.",
      ),
    );
  }
}
