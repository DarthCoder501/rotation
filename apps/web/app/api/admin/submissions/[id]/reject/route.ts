import { NextResponse } from "next/server";
import { toUserFacingMessage } from "@/lib/api/user-facing-error";
import { rejectSubmission } from "@/lib/server/promote-submission";
import { requireAdmin } from "@/lib/server/require-admin";

export async function POST(
  _req: Request,
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

  try {
    const result = await rejectSubmission(id, gate.email);
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
          "Couldn't reject that submission.",
        ),
      },
      { status: 500 },
    );
  }
}
