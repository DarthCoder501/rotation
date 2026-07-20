import { NextRequest, NextResponse } from "next/server";
import {
  buildCatalogSearchPatterns,
  mergeHybridCatalogResults,
  rankCatalogRows,
} from "@/lib/catalog-search";
import { embedSearchQuery } from "@/lib/server/embed-query";
import {
  fragranceSelect,
  mapFragrance,
  type FragranceRow,
} from "@/lib/server/fragrance-mapper";
import { supabaseAdmin } from "@/lib/server/supabase-admin";
import { toUserFacingMessage } from "@/lib/api/user-facing-error";

const MIN_QUERY_LENGTH = 2;
const TEXT_LIMIT = 40;
const SEMANTIC_LIMIT = 30;
const RESULT_LIMIT = 25;

type MatchFragranceRow = FragranceRow & { similarity: number };

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (q.length < MIN_QUERY_LENGTH) {
    return NextResponse.json(
      { results: [], message: "Query too short (min 2 characters)." },
      { status: 400 },
    );
  }

  try {
    const [textRows, semanticHits] = await Promise.all([
      fetchTextMatches(q),
      fetchSemanticMatches(q),
    ]);

    const hybrid = mergeHybridCatalogResults(
      q,
      textRows,
      semanticHits,
      RESULT_LIMIT,
    );

    // If merge produced nothing but text had filtered empties, keep ranked text.
    const ranked =
      hybrid.length > 0 ? hybrid : rankCatalogRows(q, textRows, RESULT_LIMIT);

    return NextResponse.json({
      results: ranked.map(mapFragrance),
      mode: semanticHits.length > 0 ? "hybrid" : "text",
    });
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

async function fetchTextMatches(q: string): Promise<FragranceRow[]> {
  const patterns = buildCatalogSearchPatterns(q);
  const baseQuery = () =>
    supabaseAdmin
      .from("fragrances")
      .select(fragranceSelect)
      .order("rating_value", { ascending: false })
      .limit(TEXT_LIMIT);

  const lookups = await Promise.all(
    patterns.flatMap((pattern) => [
      baseQuery().ilike("perfume", pattern),
      baseQuery().ilike("brand", pattern),
    ]),
  );

  const firstError = lookups.find((result) => result.error)?.error;
  if (firstError) {
    throw new Error(firstError.message);
  }

  const rowsById = new Map<number, FragranceRow>();
  for (const result of lookups) {
    for (const row of (result.data ?? []) as FragranceRow[]) {
      rowsById.set(Number(row.id), row);
    }
  }
  return [...rowsById.values()];
}

async function fetchSemanticMatches(
  q: string,
): Promise<Array<{ row: FragranceRow; similarity: number }>> {
  const embedding = await embedSearchQuery(q);
  if (!embedding) return [];

  const { data, error } = await supabaseAdmin.rpc("match_fragrances", {
    query_embedding: embedding,
    match_count: SEMANTIC_LIMIT,
    match_threshold: 0.32,
  });

  if (error) {
    // Migration not applied yet — degrade quietly to text-only.
    console.error("[catalog/search] match_fragrances RPC:", error.message);
    return [];
  }

  const rows = (data ?? []) as MatchFragranceRow[];
  return rows.map((row) => ({
    row: {
      id: Number(row.id),
      url: row.url,
      perfume: row.perfume,
      brand: row.brand,
      country: row.country,
      gender: row.gender,
      rating_value: row.rating_value,
      rating_count: row.rating_count,
      year: row.year,
      top_notes: row.top_notes,
      middle_notes: row.middle_notes,
      base_notes: row.base_notes,
      perfumer1: row.perfumer1,
      perfumer2: row.perfumer2,
      main_accord_1: row.main_accord_1,
      main_accord_2: row.main_accord_2,
      main_accord_3: row.main_accord_3,
      main_accord_4: row.main_accord_4,
      main_accord_5: row.main_accord_5,
    },
    similarity: Number(row.similarity),
  }));
}
