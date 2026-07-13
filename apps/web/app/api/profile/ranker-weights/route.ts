import { NextRequest, NextResponse } from "next/server";
import { FEATURE_DIM } from "@/lib/ranker/feature-vector";
import { resolveAppProfile } from "@/lib/server/app-profile";
import { supabaseAdmin } from "@/lib/server/supabase-admin";

export async function GET() {
  try {
    const appProfile = await resolveAppProfile();

    return NextResponse.json({
      profileId: appProfile.id,
      weights: appProfile.ranker_weights,
      updatedAt: appProfile.ranker_weights_updated_at,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Failed to load ranker weights",
      },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { message: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const weights = parseWeights(body);
  if ("error" in weights) {
    return NextResponse.json({ message: weights.error }, { status: 400 });
  }

  try {
    const appProfile = await resolveAppProfile();
    const now = new Date().toISOString();

    const { error } = await supabaseAdmin
      .from("user_profiles")
      .update({
        ranker_weights: weights.data,
        ranker_weights_updated_at: now,
      })
      .eq("id", appProfile.id);

    if (error) {
      return NextResponse.json(
        { message: `Failed to save ranker weights: ${error.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, updatedAt: now });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Failed to save ranker weights",
      },
      { status: 500 },
    );
  }
}

function parseWeights(
  body: unknown,
): { data: number[] } | { error: string } {
  if (!body || typeof body !== "object" || !("weights" in body)) {
    return { error: "weights array is required." };
  }

  const raw = (body as { weights: unknown }).weights;
  if (!Array.isArray(raw) || raw.length !== FEATURE_DIM) {
    return { error: `weights must be an array of length ${FEATURE_DIM}.` };
  }

  if (!raw.every((value) => typeof value === "number" && Number.isFinite(value))) {
    return { error: "weights must contain only finite numbers." };
  }

  return { data: raw.map(Number) };
}
