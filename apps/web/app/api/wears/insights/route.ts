import { NextResponse } from "next/server";
import { toUserFacingMessage } from "@/lib/api/user-facing-error";
import { resolveAppProfile } from "@/lib/server/app-profile";
import { supabaseAdmin } from "@/lib/server/supabase-admin";
import type { WearInsights, WearWeather } from "@/lib/types/wear";

type RawWear = {
  fragrance_id: number;
  worn_on: string;
  activity: string | null;
  weather: WearWeather | null;
  fragrances:
    | { perfume: string; brand: string }
    | { perfume: string; brand: string }[]
    | null;
};

function seasonForMonth(month: number): string {
  // Northern hemisphere meteorological seasons
  if (month === 12 || month <= 2) return "Winter";
  if (month <= 5) return "Spring";
  if (month <= 8) return "Summer";
  return "Fall";
}

function weatherBucket(weather: WearWeather | null): string {
  if (!weather) return "Unknown";
  const t = weather.tempC;
  if (t < 10) return "Cold (<10°C)";
  if (t < 20) return "Mild (10–20°C)";
  if (t < 28) return "Warm (20–28°C)";
  return "Hot (≥28°C)";
}

function fragranceMeta(
  value: RawWear["fragrances"],
): { perfume: string; brand: string } | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function GET() {
  try {
    const profile = await resolveAppProfile();

    const { data, error } = await supabaseAdmin
      .from("wear_events")
      .select(
        `
        fragrance_id,
        worn_on,
        activity,
        weather,
        fragrances ( perfume, brand )
      `,
      )
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      return NextResponse.json(
        {
          message: toUserFacingMessage(
            error.message,
            "Could not load wear insights.",
          ),
        },
        { status: 500 },
      );
    }

    const rows = (data ?? []) as RawWear[];
    const days = new Set(rows.map((r) => String(r.worn_on).slice(0, 10)));

    const byFragrance = new Map<
      number,
      { perfume: string; brand: string; count: number }
    >();
    const byActivity = new Map<string, number>();
    const byWeather = new Map<string, number>();
    const bySeason = new Map<string, number>();

    for (const row of rows) {
      const meta = fragranceMeta(row.fragrances);
      const existing = byFragrance.get(row.fragrance_id);
      if (existing) {
        existing.count += 1;
      } else {
        byFragrance.set(row.fragrance_id, {
          perfume: meta?.perfume ?? `Fragrance #${row.fragrance_id}`,
          brand: meta?.brand ?? "",
          count: 1,
        });
      }

      const activity = row.activity?.trim() || "Unspecified";
      byActivity.set(activity, (byActivity.get(activity) ?? 0) + 1);

      const bucket = weatherBucket(row.weather);
      byWeather.set(bucket, (byWeather.get(bucket) ?? 0) + 1);

      const month = Number(String(row.worn_on).slice(5, 7));
      const season = seasonForMonth(month);
      bySeason.set(season, (bySeason.get(season) ?? 0) + 1);
    }

    const insights: WearInsights = {
      totalWears: rows.length,
      daysLogged: days.size,
      mostWorn: [...byFragrance.entries()]
        .map(([fragranceId, value]) => ({
          fragranceId,
          perfume: value.perfume,
          brand: value.brand,
          count: value.count,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8),
      byActivity: [...byActivity.entries()]
        .map(([activity, count]) => ({ activity, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8),
      byWeatherBucket: [...byWeather.entries()]
        .map(([bucket, count]) => ({ bucket, count }))
        .sort((a, b) => b.count - a.count),
      bySeason: ["Winter", "Spring", "Summer", "Fall"]
        .map((season) => ({
          season,
          count: bySeason.get(season) ?? 0,
        }))
        .filter((row) => row.count > 0),
    };

    return NextResponse.json(insights);
  } catch (error) {
    return NextResponse.json(
      {
        message: toUserFacingMessage(error, "Could not load wear insights."),
      },
      { status: 500 },
    );
  }
}
