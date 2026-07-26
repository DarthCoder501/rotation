import { NextRequest, NextResponse } from "next/server";
import { toUserFacingMessage } from "@/lib/api/user-facing-error";
import { getOrCreateDeviceProfile } from "@/lib/server/device-profile";
import {
  fragranceSelect,
  mapFragrance,
  type FragranceRow,
} from "@/lib/server/fragrance-mapper";
import {
  mapSubmission,
  submissionSelect,
  type SubmissionRow,
} from "@/lib/server/submission-mapper";
import { supabaseAdmin } from "@/lib/server/supabase-admin";
import type { CreateSubmissionBody } from "@/lib/types/submission";
import { normalizeExternalUrl } from "@/lib/url";

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
    const perfumeKey = fields.perfume;
    const brandKey = fields.brand;

    const { data: existingRows, error: existingError } = await supabaseAdmin
      .from("fragrances")
      .select(fragranceSelect)
      .ilike("perfume", perfumeKey)
      .ilike("brand", brandKey)
      .limit(10);

    if (existingError) {
      return NextResponse.json(
        {
          message: toUserFacingMessage(
            existingError.message,
            "Couldn't check the catalog for that fragrance.",
          ),
        },
        { status: 500 },
      );
    }

    const exact = ((existingRows ?? []) as FragranceRow[]).find(
      (row) =>
        row.perfume.trim().toLowerCase() === perfumeKey.toLowerCase() &&
        row.brand.trim().toLowerCase() === brandKey.toLowerCase(),
    );

    if (exact && (exact.visibility ?? "published") === "published") {
      return NextResponse.json(
        {
          message:
            "That fragrance is already in the catalog. Search for it instead.",
          fragranceId: Number(exact.id),
        },
        { status: 409 },
      );
    }

    let fragranceRow: FragranceRow;

    if (exact && exact.visibility === "provisional") {
      const { data: owned } = await supabaseAdmin
        .from("collection_items")
        .select("id")
        .eq("user_id", profile.id)
        .eq("fragrance_id", exact.id)
        .maybeSingle();

      if (owned) {
        return NextResponse.json(
          {
            message:
              "You already have this Custom fragrance in your collection.",
            fragranceId: Number(exact.id),
          },
          { status: 409 },
        );
      }
      fragranceRow = exact;
    } else {
      const { data: inserted, error: insertError } = await supabaseAdmin
        .from("fragrances")
        .insert({
          perfume: fields.perfume,
          brand: fields.brand,
          url: fields.sourceUrl ?? null,
          country: fields.country ?? null,
          gender: fields.gender ?? null,
          rating_value: 4.0,
          rating_count: 0,
          top_notes: fields.topNotes ?? null,
          middle_notes: fields.middleNotes ?? null,
          base_notes: fields.baseNotes ?? null,
          main_accord_1: mainAccords[0] ?? null,
          main_accord_2: mainAccords[1] ?? null,
          main_accord_3: mainAccords[2] ?? null,
          main_accord_4: mainAccords[3] ?? null,
          main_accord_5: mainAccords[4] ?? null,
          visibility: "provisional",
        })
        .select(fragranceSelect)
        .single();

      if (insertError || !inserted) {
        // Unique constraint race — surface as conflict when possible.
        if (/duplicate|unique/i.test(insertError?.message ?? "")) {
          return NextResponse.json(
            {
              message:
                "That fragrance already exists. Search the catalog or try again.",
            },
            { status: 409 },
          );
        }
        return NextResponse.json(
          {
            message: toUserFacingMessage(
              insertError?.message,
              "Couldn't create that Custom fragrance.",
            ),
          },
          { status: 500 },
        );
      }
      fragranceRow = inserted as FragranceRow;
    }

    const fragranceId = Number(fragranceRow.id);

    const { data: submissionData, error: submissionError } = await supabaseAdmin
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
        source_url: fields.sourceUrl ?? null,
        promoted_fragrance_id: fragranceId,
      })
      .select(submissionSelect)
      .single();

    if (submissionError || !submissionData) {
      return NextResponse.json(
        {
          message: toUserFacingMessage(
            submissionError?.message,
            "Couldn't create that submission.",
          ),
        },
        { status: 500 },
      );
    }

    const { error: collectionError } = await supabaseAdmin
      .from("collection_items")
      .upsert(
        {
          user_id: profile.id,
          fragrance_id: fragranceId,
        },
        { onConflict: "user_id,fragrance_id" },
      );

    if (collectionError) {
      return NextResponse.json(
        {
          message: toUserFacingMessage(
            collectionError.message,
            "Submission saved, but couldn't add it to your collection.",
          ),
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        submission: mapSubmission(submissionData as SubmissionRow),
        fragrance: mapFragrance(fragranceRow),
      },
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

  const rawSourceUrl = optionalString(raw.sourceUrl);
  const sourceUrl = rawSourceUrl ? normalizeExternalUrl(rawSourceUrl) : null;
  if (rawSourceUrl && !sourceUrl) {
    return {
      error:
        "Link must be a valid web address, e.g. https://www.fragrantica.com/perfume/…",
    };
  }

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
      sourceUrl: sourceUrl ?? undefined,
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
