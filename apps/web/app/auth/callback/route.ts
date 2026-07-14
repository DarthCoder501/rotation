import { NextResponse } from "next/server";
import { ensureAuthenticatedProfile } from "@/lib/server/app-profile";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = sanitizeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      try {
        // Use the user from the exchange directly — a fresh getUser() in the
        // same request can miss the brand-new session cookies.
        await ensureAuthenticatedProfile(
          data.user.id,
          data.user.email ?? null,
        );
      } catch (profileError) {
        console.error("Failed to link app profile after Google sign-in", profileError);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/profile?auth_error=1`);
}

function sanitizeNextPath(path: string | null): string {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return "/profile";
  }
  return path;
}
