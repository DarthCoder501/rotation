import { NextResponse } from "next/server";
import { toUserFacingMessage } from "@/lib/api/user-facing-error";
import { updateApprovedSubmission } from "@/lib/server/promote-submission";
import { requireAdmin } from "@/lib/server/require-admin";
import { normalizeExternalUrl } from "@/lib/url";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return NextResponse.json({ message: gate.message }, { status: gate.status });
  }

  const { id: rawId } = await context.params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ message: "Invalid submission id." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { message: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const parsed = parseUpdateBody(body);
  if ("error" in parsed) {
    return NextResponse.json({ message: parsed.error }, { status: 400 });
  }

  try {
    const result = await updateApprovedSubmission(id, parsed.data);
    if (!result.ok) {
      return NextResponse.json(
        { message: result.message },
        { status: result.status },
      );
    }
    return NextResponse.json({
      ok: true,
      submission: result.submission,
      fragrance: result.fragrance,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: toUserFacingMessage(
          error,
          "Couldn't update that submission.",
        ),
      },
      { status: 500 },
    );
  }
}

function parseUpdateBody(
  body: unknown,
):
  | {
      data: {
        perfume: string;
        brand: string;
        country: string | null;
        gender: string | null;
        topNotes: string | null;
        middleNotes: string | null;
        baseNotes: string | null;
        mainAccords: string[];
        url: string | null;
      };
    }
  | { error: string } {
  if (!body || typeof body !== "object") {
    return { error: "Request body must be a JSON object." };
  }
  const raw = body as Record<string, unknown>;

  const perfume = typeof raw.perfume === "string" ? raw.perfume.trim() : "";
  const brand = typeof raw.brand === "string" ? raw.brand.trim() : "";
  if (!perfume) return { error: "perfume is required." };
  if (!brand) return { error: "brand is required." };

  const gender = raw.gender;
  if (
    gender !== undefined &&
    gender !== null &&
    gender !== "" &&
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

  const rawUrl =
    typeof raw.sourceUrl === "string"
      ? raw.sourceUrl.trim()
      : typeof raw.url === "string"
        ? raw.url.trim()
        : "";
  const url = rawUrl ? normalizeExternalUrl(rawUrl) : null;
  if (rawUrl && !url) {
    return {
      error:
        "Link must be a valid web address, e.g. https://www.fragrantica.com/perfume/…",
    };
  }

  return {
    data: {
      perfume,
      brand,
      country: optionalNullString(raw.country),
      gender:
        gender === "" || gender === undefined || gender === null
          ? null
          : String(gender),
      topNotes: optionalNullString(raw.topNotes),
      middleNotes: optionalNullString(raw.middleNotes),
      baseNotes: optionalNullString(raw.baseNotes),
      mainAccords,
      url,
    },
  };
}

function optionalNullString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
