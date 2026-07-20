import { resolveAppProfile } from "@/lib/server/app-profile";

export type AdminGateResult =
  | {
      ok: true;
      email: string;
      profileId: string;
    }
  | {
      ok: false;
      status: 401 | 403;
      message: string;
    };

function parseAdminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS?.trim() ?? "";
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAdminEmailConfigured(): boolean {
  return parseAdminEmails().size > 0;
}

export function emailIsAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return parseAdminEmails().has(email.trim().toLowerCase());
}

/**
 * Require a signed-in Google user whose email is listed in ADMIN_EMAILS.
 */
export async function requireAdmin(): Promise<AdminGateResult> {
  const allowlist = parseAdminEmails();
  if (allowlist.size === 0) {
    return {
      ok: false,
      status: 403,
      message: "Admin access is not configured (ADMIN_EMAILS).",
    };
  }

  const profile = await resolveAppProfile();
  if (!profile.isAuthenticated || !profile.email) {
    return {
      ok: false,
      status: 401,
      message: "Sign in with Google to access admin tools.",
    };
  }

  if (!allowlist.has(profile.email.trim().toLowerCase())) {
    return {
      ok: false,
      status: 403,
      message: "Your account is not allowed to administer submissions.",
    };
  }

  return {
    ok: true,
    email: profile.email,
    profileId: profile.id,
  };
}
