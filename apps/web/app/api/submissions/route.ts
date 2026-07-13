import { NextRequest, NextResponse } from "next/server";
import { toUserFacingMessage } from "@/lib/api/user-facing-error";
import { getOrCreateDeviceProfile } from "@/lib/server/device-profile";
import {
  mapSubmission,
  submissionSelect,
  type SubmissionRow,
} from "@/lib/server/submission-mapper";
import { supabaseAdmin } from "@/lib/server/supabase-admin";
import type { CreateSubmissionBody } from "@/lib/types/submission";

export async function GET() {
  try {
    const profile = await getOrCreateDeviceProfile();

    const { data, error } = await supabaseAdmin
      .from("fragrance_submissions")
      .select(submissionSelect)
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        {
          submissions: [],
          message: toUserFacingMessage(
            error.message,
            "Couldn't load your submissions.",
          ),
        },
        { status: 500 },
      );
    }

    const submissions = ((data ?? []) as SubmissionRow[]).map(mapSubmission);
    return NextResponse.json({ submissions });
  } catch (error) {
    return NextResponse.json(
      {
        submissions: [],
        message: toUserFacingMessage(
          error,
          "Couldn't load your submissions.",
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

  const parsed = parseCreateSubmissionBody(body);
  if ("error" in parsed) {
    return NextResponse.json({ message: parsed.error }, { status: 400 });
  }

  try {
    const profile = await getOrCreateDeviceProfile();
    const { mainAccords, ...fields } = parsed.data;

    const { data, error } = await supabaseAdmin
      .from("fragrance_submissions")
      .insert({
        user_id: profile.id,
        perfume: fields.perfume,
        brand: fields.brand,
        country: fields.country ?? null,
        gender: fields.gender ?? null,
        top_notes: fields.topNotes ?? null,
        middle_notes: fields.middleNotes ?? null,
        base_notes: fields.baseNotes ?? null,
        main_accord_1: mainAccords[0] ?? null,
        main_accord_2: mainAccords[1] ?? null,
        main_accord_3: mainAccords[2] ?? null,
        main_accord_4: mainAccords[3] ?? null,
        main_accord_5: mainAccords[4] ?? null,
        user_notes: fields.userNotes ?? null,
      })
      .select(submissionSelect)
      .single();

    if (error) {
      return NextResponse.json(
        {
          message: toUserFacingMessage(
            error.message,
            "Couldn't create that submission.",
          ),
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { ok: true, submission: mapSubmission(data as SubmissionRow) },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        message: toUserFacingMessage(
          error,
          "Couldn't create that submission.",
        ),
      },
      { status: 500 },
    );
  }
}

function parseCreateSubmissionBody(
  body: unknown,
): { data: CreateSubmissionBody & { mainAccords: string[] } } | { error: string } {
  if (!body || typeof body !== "object") {
    return { error: "Request body must be a JSON object." };
  }

  const raw = body as Record<string, unknown>;
  const perfume = trimString(raw.perfume);
  const brand = trimString(raw.brand);

  if (!perfume) {
    return { error: "perfume is required." };
  }
  if (!brand) {
    return { error: "brand is required." };
  }

  const gender = raw.gender;
  if (
    gender !== undefined &&
    gender !== null &&
    gender !== "men" &&
    gender !== "women" &&
    gender !== "unisex"
  ) {
    return { error: "gender must be men, women, or unisex." };
  }

  const mainAccords = Array.isArray(raw.mainAccords)
    ? raw.mainAccords
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter(Boolean)
        .slice(0, 5)
    : [];

  return {
    data: {
      perfume,
      brand,
      country: optionalString(raw.country),
      gender: gender ?? undefined,
      topNotes: optionalString(raw.topNotes),
      middleNotes: optionalString(raw.middleNotes),
      baseNotes: optionalString(raw.baseNotes),
      userNotes: optionalString(raw.userNotes),
      mainAccords,
    },
  };
}

function trimString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function optionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
