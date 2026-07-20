import { NextResponse } from "next/server";
import { toUserFacingMessage } from "@/lib/api/user-facing-error";
import { resolveAppProfile } from "@/lib/server/app-profile";
import { emailIsAdmin } from "@/lib/server/require-admin";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const appProfile = await resolveAppProfile();

    return NextResponse.json({
      isAuthenticated: appProfile.isAuthenticated,
      isAdmin: emailIsAdmin(appProfile.email),
      email: appProfile.email,
      profileId: appProfile.id,
      profile: appProfile.profile,
      rankerWeightsUpdatedAt: appProfile.ranker_weights_updated_at,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: toUserFacingMessage(
          error,
          "Couldn't load your session.",
        ),
      },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Failed to sign out",
      },
      { status: 500 },
    );
  }
}
