import { NextRequest, NextResponse } from "next/server";
import { toUserFacingMessage } from "@/lib/api/user-facing-error";
import { listSubmissionsForAdmin } from "@/lib/server/promote-submission";
import { requireAdmin } from "@/lib/server/require-admin";

export async function GET(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return NextResponse.json({ message: gate.message }, { status: gate.status });
  }

  const statusParam = req.nextUrl.searchParams.get("status") ?? "pending";
  const status =
    statusParam === "approved" ||
    statusParam === "rejected" ||
    statusParam === "all" ||
    statusParam === "pending"
      ? statusParam
      : "pending";

  try {
    const submissions = await listSubmissionsForAdmin(status);
    return NextResponse.json({ submissions });
  } catch (error) {
    return NextResponse.json(
      {
        submissions: [],
        message: toUserFacingMessage(
          error,
          "Couldn't load submissions.",
        ),
      },
      { status: 500 },
    );
  }
}
