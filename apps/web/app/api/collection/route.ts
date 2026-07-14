import { NextRequest, NextResponse } from "next/server";
import { toUserFacingMessage } from "@/lib/api/user-facing-error";
import { getOrCreateDeviceProfile } from "@/lib/server/device-profile";
import {
  fragranceSelect,
  mapFragrance,
  type FragranceRow,
} from "@/lib/server/fragrance-mapper";
import { supabaseAdmin } from "@/lib/server/supabase-admin";

type CollectionItemRow = {
  added_at: string | null;
  fragrances: FragranceRow | FragranceRow[] | null;
};

export async function GET() {
  try {
    const profile = await getOrCreateDeviceProfile();

    const { data, error } = await supabaseAdmin
      .from("collection_items")
      .select(
        `
          added_at,
          fragrances (${fragranceSelect})
        `,
      )
      .eq("user_id", profile.id)
      .order("added_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        {
          items: [],
          message: toUserFacingMessage(
            error.message,
            "Couldn't load your collection.",
          ),
        },
        { status: 500 },
      );
    }

    const rows = (data ?? []) as CollectionItemRow[];
    const items = rows
      .map((row) => normalizeFragrance(row.fragrances))
      .filter((fragrance): fragrance is FragranceRow => fragrance !== null)
      .map(mapFragrance);

    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json(
      {
        items: [],
        message: toUserFacingMessage(
          error,
          "Couldn't load your collection.",
        ),
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

  const fragranceId = getFragranceId(body);
  const affinity = getAffinity(body);

  if (!Number.isInteger(fragranceId) || fragranceId <= 0) {
    return NextResponse.json(
      { message: "fragranceId must be a positive integer." },
      { status: 400 },
    );
  }

  if (affinity !== null && (affinity < 0 || affinity > 100)) {
    return NextResponse.json(
      { message: "affinity must be between 0 and 100." },
      { status: 400 },
    );
  }

  try {
    const profile = await getOrCreateDeviceProfile();

    const { data: fragrance, error: fragranceError } = await supabaseAdmin
      .from("fragrances")
      .select("id, rating_value")
      .eq("id", fragranceId)
      .maybeSingle();

    if (fragranceError) {
      return NextResponse.json(
        {
          message: toUserFacingMessage(
            fragranceError.message,
            "Couldn't verify that fragrance.",
          ),
        },
        { status: 500 },
      );
    }

    if (!fragrance) {
      return NextResponse.json({ status: 404 });
    }

    const payload: Record<string, unknown> = {
      user_id: profile.id,
      fragrance_id: fragranceId,
    };
    if (affinity !== null) {
      payload.affinity = affinity;
    }

    let { error: upsertError } = await supabaseAdmin
      .from("collection_items")
      .upsert(payload, { onConflict: "user_id,fragrance_id" });

    // Affinity column may not exist until migration 003 — retry without it.
    if (
      upsertError &&
      affinity !== null &&
      /affinity|column/i.test(upsertError.message)
    ) {
      const retry = await supabaseAdmin.from("collection_items").upsert(
        {
          user_id: profile.id,
          fragrance_id: fragranceId,
        },
        { onConflict: "user_id,fragrance_id" },
      );
      upsertError = retry.error;
    }

    if (upsertError) {
      return NextResponse.json(
        {
          message: toUserFacingMessage(
            upsertError.message,
            "Couldn't add that fragrance.",
          ),
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { ok: true, fragranceId, affinity },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        message: toUserFacingMessage(
          error,
          "Couldn't add that fragrance.",
        ),
      },
      { status: 500 },
    );
  }
}

function getFragranceId(body: unknown): number {
  if (!body || typeof body !== "object" || !("fragranceId" in body)) {
    return NaN;
  }

  return Number((body as { fragranceId: unknown }).fragranceId);
}

function getAffinity(body: unknown): number | null {
  if (!body || typeof body !== "object" || !("affinity" in body)) {
    return null;
  }
  const value = Number((body as { affinity: unknown }).affinity);
  if (!Number.isFinite(value)) return null;
  return Math.round(value);
}

function normalizeFragrance(
  fragrance: FragranceRow | FragranceRow[] | null,
): FragranceRow | null {
  if (Array.isArray(fragrance)) {
    return fragrance[0] ?? null;
  }

  return fragrance;
}
