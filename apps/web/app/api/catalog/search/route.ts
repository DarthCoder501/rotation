import { supabaseAdmin } from "@/lib/server/supabase-admin";
import { NextRequest, NextResponse } from "next/server";
import { buildCatalogSearchPatterns, rankCatalogRows } from "@/lib/catalog-search";
import {
  fragranceSelect,
  mapFragrance,
  type FragranceRow,
} from "@/lib/server/fragrance-mapper";
import { toUserFacingMessage } from "@/lib/api/user-facing-error";

const MIN_QUERY_LENGTH = 2;

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (q.length < MIN_QUERY_LENGTH) {
    return NextResponse.json(
      { results: [], message: "Query too short (min 2 characters)." },
      { status: 400 },
    );
  }

  const patterns = buildCatalogSearchPatterns(q);

  const baseQuery = () =>
    supabaseAdmin
      .from("fragrances")
      .select(fragranceSelect)
      .order("rating_value", { ascending: false })
      .limit(40);

  try {
    const lookups = await Promise.all(
      patterns.flatMap((pattern) => [
        baseQuery().ilike("perfume", pattern),
        baseQuery().ilike("brand", pattern),
      ]),
    );

    const firstError = lookups.find((result) => result.error)?.error;
    if (firstError) {
      return NextResponse.json(
        {
          results: [],
          message: toUserFacingMessage(
            firstError.message,
            "Search is unavailable right now. Try again in a moment.",
          ),
        },
        { status: 500 },
      );
    }

    const rowsById = new Map<number, FragranceRow>();
    for (const result of lookups) {
      for (const row of (result.data ?? []) as FragranceRow[]) {
        rowsById.set(Number(row.id), row);
      }
    }

    const ranked = rankCatalogRows(q, [...rowsById.values()], 25);
    const results = ranked.map(mapFragrance);

    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json(
      {
        results: [],
        message: toUserFacingMessage(
          error,
          "Search is unavailable right now. Try again in a moment.",
        ),
      },
      { status: 500 },
    );
  }
}
