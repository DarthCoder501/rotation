import { NextResponse } from "next/server";
import { toUserFacingMessage } from "@/lib/api/user-facing-error";
import { getOrCreateDeviceProfile } from "@/lib/server/device-profile";
import {
  fragranceSelect,
  mapFragrance,
  type FragranceRow,
} from "@/lib/server/fragrance-mapper";
import { emailIsAdmin } from "@/lib/server/require-admin";
import { resolveAppProfile } from "@/lib/server/app-profile";
import { supabaseAdmin } from "@/lib/server/supabase-admin";

/**
 * GET /api/catalog/[id] — published catalog rows are public;
 * provisional (Custom) rows only for owner or admin.
 */
export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await context.params;
  const id = Number(rawId);

  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json(
      { message: "Invalid fragrance id." },
      { status: 400 },
    );
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("fragrances")
      .select(fragranceSelect)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        {
          message: toUserFacingMessage(
            error.message,
            "Could not load this fragrance right now.",
          ),
        },
        { status: 500 },
      );
    }

    if (!data) {
      return NextResponse.json(
        { message: "Fragrance not found." },
        { status: 404 },
      );
    }

    const row = data as FragranceRow;
    const visibility = row.visibility ?? "published";

    if (visibility === "provisional") {
      const appProfile = await resolveAppProfile();
      const isAdmin = emailIsAdmin(appProfile.email);

      if (!isAdmin) {
        const profile = await getOrCreateDeviceProfile();
        const { data: owned } = await supabaseAdmin
          .from("collection_items")
          .select("id")
          .eq("user_id", profile.id)
          .eq("fragrance_id", id)
          .maybeSingle();

        if (!owned) {
          return NextResponse.json(
            { message: "Fragrance not found." },
            { status: 404 },
          );
        }
      }
    }

    return NextResponse.json({
      fragrance: mapFragrance(row),
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: toUserFacingMessage(
          error,
          "Could not load this fragrance right now.",
        ),
      },
      { status: 500 },
    );
  }
}
