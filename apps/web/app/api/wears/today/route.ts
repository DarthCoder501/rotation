import { NextRequest, NextResponse } from "next/server";
import { toUserFacingMessage } from "@/lib/api/user-facing-error";
import { resolveAppProfile } from "@/lib/server/app-profile";
import { supabaseAdmin } from "@/lib/server/supabase-admin";
import { mapWearEvent, wearSelect, type WearEventRow } from "@/lib/server/wear-mapper";

export async function GET(req: NextRequest) {
  try {
    const profile = await resolveAppProfile();
    const wornOnParam = req.nextUrl.searchParams.get("wornOn");
    const wornOn =
      wornOnParam && /^\d{4}-\d{2}-\d{2}$/.test(wornOnParam)
        ? wornOnParam
        : new Date().toISOString().slice(0, 10);

    const { data, error } = await supabaseAdmin
      .from("wear_events")
      .select(wearSelect)
      .eq("user_id", profile.id)
      .eq("worn_on", wornOn)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        {
          wears: [],
          wornOn,
          message: toUserFacingMessage(
            error.message,
            "Could not load today's wears.",
          ),
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      wornOn,
      wears: ((data ?? []) as WearEventRow[]).map(mapWearEvent),
    });
  } catch (error) {
    return NextResponse.json(
      {
        wears: [],
        message: toUserFacingMessage(error, "Could not load today's wears."),
      },
      { status: 500 },
    );
  }
}
