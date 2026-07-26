import { NextRequest, NextResponse } from "next/server";
import { toUserFacingMessage } from "@/lib/api/user-facing-error";
import { resolveAppProfile } from "@/lib/server/app-profile";
import { supabaseAdmin } from "@/lib/server/supabase-admin";
import { mapWearEvent, wearSelect, type WearEventRow } from "@/lib/server/wear-mapper";
import type { WearSource, WearWeather } from "@/lib/types/wear";

const SOURCES = new Set<WearSource>(["recommend", "collection", "search"]);

export async function GET(req: NextRequest) {
  try {
    const profile = await resolveAppProfile();
    const limit = Math.min(
      Number(req.nextUrl.searchParams.get("limit") ?? 50) || 50,
      100,
    );
    const offset = Math.max(
      Number(req.nextUrl.searchParams.get("offset") ?? 0) || 0,
      0,
    );

    const { data, error } = await supabaseAdmin
      .from("wear_events")
      .select(wearSelect)
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json(
        {
          wears: [],
          message: toUserFacingMessage(
            error.message,
            "Could not load wear history.",
          ),
        },
        { status: 500 },
      );
    }

    const wears = ((data ?? []) as WearEventRow[]).map(mapWearEvent);
    return NextResponse.json({ wears });
  } catch (error) {
    return NextResponse.json(
      {
        wears: [],
        message: toUserFacingMessage(error, "Could not load wear history."),
      },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { message: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const parsed = parseCreateBody(body);
  if ("error" in parsed) {
    return NextResponse.json({ message: parsed.error }, { status: 400 });
  }

  try {
    const profile = await resolveAppProfile();

    const { data: fragrance, error: fragranceError } = await supabaseAdmin
      .from("fragrances")
      .select("id")
      .eq("id", parsed.data.fragranceId)
      .maybeSingle();

    if (fragranceError) {
      return NextResponse.json(
        {
          message: toUserFacingMessage(
            fragranceError.message,
            "Could not verify fragrance.",
          ),
        },
        { status: 500 },
      );
    }
    if (!fragrance) {
      return NextResponse.json(
        { message: "Fragrance not found." },
        { status: 404 },
      );
    }

    // Ensure they own it (collection) — still allow recommend picks from shortlist
    // which should already be in collection.
    const { data: owned } = await supabaseAdmin
      .from("collection_items")
      .select("id")
      .eq("user_id", profile.id)
      .eq("fragrance_id", parsed.data.fragranceId)
      .maybeSingle();

    if (!owned) {
      return NextResponse.json(
        {
          message:
            "Add this fragrance to your collection before logging a wear.",
        },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from("wear_events")
      .insert({
        user_id: profile.id,
        fragrance_id: parsed.data.fragranceId,
        worn_on: parsed.data.wornOn,
        activity: parsed.data.activity,
        weather: parsed.data.weather,
        source: parsed.data.source,
        timezone: parsed.data.timezone,
      })
      .select(wearSelect)
      .single();

    if (error) {
      return NextResponse.json(
        {
          message: toUserFacingMessage(
            error.message,
            "Could not log this wear.",
          ),
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { ok: true, wear: mapWearEvent(data as WearEventRow) },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        message: toUserFacingMessage(error, "Could not log this wear."),
      },
      { status: 500 },
    );
  }
}

function parseCreateBody(body: unknown):
  | {
      data: {
        fragranceId: number;
        wornOn: string;
        activity: string | null;
        weather: WearWeather | null;
        source: WearSource;
        timezone: string | null;
      };
    }
  | { error: string } {
  if (!body || typeof body !== "object") {
    return { error: "Request body must be a JSON object." };
  }
  const raw = body as Record<string, unknown>;
  const fragranceId = Number(raw.fragranceId);
  if (!Number.isInteger(fragranceId) || fragranceId <= 0) {
    return { error: "fragranceId must be a positive integer." };
  }

  const wornOn =
    typeof raw.wornOn === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.wornOn)
      ? raw.wornOn
      : new Date().toISOString().slice(0, 10);

  const source =
    typeof raw.source === "string" && SOURCES.has(raw.source as WearSource)
      ? (raw.source as WearSource)
      : "recommend";

  const activity =
    typeof raw.activity === "string" && raw.activity.trim()
      ? raw.activity.trim().slice(0, 80)
      : null;

  const timezone =
    typeof raw.timezone === "string" && raw.timezone.trim()
      ? raw.timezone.trim().slice(0, 64)
      : null;

  let weather: WearWeather | null = null;
  if (raw.weather && typeof raw.weather === "object") {
    const w = raw.weather as Record<string, unknown>;
    const tempC = Number(w.tempC);
    const humidity = Number(w.humidity);
    const condition = typeof w.condition === "string" ? w.condition : "Unknown";
    if (Number.isFinite(tempC) && Number.isFinite(humidity)) {
      weather = { tempC, humidity, condition: condition.slice(0, 64) };
    }
  }

  return {
    data: {
      fragranceId,
      wornOn,
      activity,
      weather,
      source,
      timezone,
    },
  };
}
