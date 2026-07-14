import { NextResponse } from "next/server";
import {
  fragranceSelect,
  mapFragrance,
  type FragranceRow,
} from "@/lib/server/fragrance-mapper";
import { supabaseAdmin } from "@/lib/server/supabase-admin";
import { toUserFacingMessage } from "@/lib/api/user-facing-error";

/**
 * GET /api/catalog/[id] — single fragrance from the source catalog.
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

    return NextResponse.json({
      fragrance: mapFragrance(data as FragranceRow),
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
