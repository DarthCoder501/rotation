import { NextResponse } from "next/server";
import { toUserFacingMessage } from "@/lib/api/user-facing-error";
import { approveSubmission } from "@/lib/server/promote-submission";
import { requireAdmin } from "@/lib/server/require-admin";
import { normalizeExternalUrl } from "@/lib/url";

export async function POST(
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

  // Body is optional — approving without a link keeps the submitter's value.
  const body = (await req.json().catch(() => null)) as {
    url?: unknown;
  } | null;
  const rawUrl = typeof body?.url === "string" ? body.url.trim() : "";
  const url = rawUrl ? normalizeExternalUrl(rawUrl) : null;
  if (rawUrl && !url) {
    return NextResponse.json(
      {
        message:
          "Link must be a valid web address, e.g. https://www.fragrantica.com/perfume/…",
      },
      { status: 400 },
    );
  }

  try {
    const result = await approveSubmission(id, gate.email, { url });
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
          "Couldn't approve that submission.",
        ),
      },
      { status: 500 },
    );
  }
}
