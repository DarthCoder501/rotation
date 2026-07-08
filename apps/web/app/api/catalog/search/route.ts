import { supabaseAdmin } from "@/lib/server/supabase-admin";
import { NextRequest, NextResponse } from "next/server";
import {
  fragranceSelect,
  mapFragrance,
  type FragranceRow,
} from "@/lib/server/fragrance-mapper";

const MIN_QUERY_LENGTH = 2;

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (q.length < MIN_QUERY_LENGTH) {
    return NextResponse.json(
      { results: [], message: "Query too short (min 2 characters)." },
      { status: 400 },
    );
  }

  const pattern = `%${q}%`;

  const baseQuery = () =>
    supabaseAdmin
      .from("fragrances")
      .select(fragranceSelect)
      .order("rating_value", { ascending: false })
      .limit(25);

  const [byPerfume, byBrand] = await Promise.all([
    baseQuery().ilike("perfume", pattern),
    baseQuery().ilike("brand", pattern),
  ]);

  if (byPerfume.error || byBrand.error) {
    return NextResponse.json(
      {
        results: [],
        message:
          byPerfume.error?.message ??
          byBrand.error?.message ??
          "Failed to search catalog.",
      },
      { status: 500 },
    );
  }

  const rowsById = new Map<number, FragranceRow>();

  for (const row of [
    ...((byPerfume.data ?? []) as FragranceRow[]),
    ...((byBrand.data ?? []) as FragranceRow[]),
  ]) {
    rowsById.set(Number(row.id), row);
  }

  const results = [...rowsById.values()]
    .sort((a, b) => b.rating_value - a.rating_value)
    .slice(0, 25)
    .map(mapFragrance);

  return NextResponse.json({ results });
}
