import { NextRequest, NextResponse } from "next/server";
import type { UserProfile } from "@/lib/ranker/types";
import { resolveAppProfile } from "@/lib/server/app-profile";
import { supabaseAdmin } from "@/lib/server/supabase-admin";
import { toUserFacingMessage } from "@/lib/api/user-facing-error";

/**
 * GET /api/profile — current taste profile JSON.
 * PATCH /api/profile — update liked/disliked accords & brands.
 */
export async function GET() {
  try {
    const appProfile = await resolveAppProfile();
    return NextResponse.json({
      profileId: appProfile.id,
      profile: appProfile.profile,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: toUserFacingMessage(
          error,
          "Could not load your taste profile.",
        ),
      },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { message: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const parsed = parseProfileBody(body);
  if ("error" in parsed) {
    return NextResponse.json({ message: parsed.error }, { status: 400 });
  }

  try {
    const appProfile = await resolveAppProfile();

    const { error } = await supabaseAdmin
      .from("user_profiles")
      .update({
        profile: parsed.data,
        updated_at: new Date().toISOString(),
      })
      .eq("id", appProfile.id);

    if (error) {
      return NextResponse.json(
        {
          message: toUserFacingMessage(
            error.message,
            "Could not save your taste preferences.",
          ),
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, profile: parsed.data });
  } catch (error) {
    return NextResponse.json(
      {
        message: toUserFacingMessage(
          error,
          "Could not save your taste preferences.",
        ),
      },
      { status: 500 },
    );
  }
}

function parseProfileBody(
  body: unknown,
): { data: UserProfile } | { error: string } {
  if (!body || typeof body !== "object") {
    return { error: "Request body must be a JSON object." };
  }

  const raw = body as Record<string, unknown>;
  const profileSource =
    raw.profile && typeof raw.profile === "object"
      ? (raw.profile as Record<string, unknown>)
      : raw;

  return {
    data: {
      likedAccords: sanitizeStringList(profileSource.likedAccords, 20),
      dislikedAccords: sanitizeStringList(profileSource.dislikedAccords, 20),
      likedBrands: sanitizeStringList(profileSource.likedBrands, 20),
      dislikedBrands: sanitizeStringList(profileSource.dislikedBrands, 20),
    },
  };
}

function sanitizeStringList(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: string[] = [];

  for (const entry of value) {
    if (typeof entry !== "string") continue;
    const trimmed = entry.trim();
    if (!trimmed || trimmed.length > 64) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
    if (result.length >= max) break;
  }

  return result;
}
