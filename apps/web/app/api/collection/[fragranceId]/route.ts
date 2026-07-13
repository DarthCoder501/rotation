import { getOrCreateDeviceProfile } from "@/lib/server/device-profile";
import { toUserFacingMessage } from "@/lib/api/user-facing-error";
import { supabaseAdmin } from "@/lib/server/supabase-admin";
import { NextResponse } from "next/server";

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ fragranceId: string }> },
) {
  const { fragranceId } = await context.params;
  const id = Number(fragranceId);

  if (!Number.isInteger(id)) {
    return NextResponse.json({ message: "Invalid fragrance ID" }, { status: 400 });
  }

  try {
    const profile = await getOrCreateDeviceProfile();
    const { error } = await supabaseAdmin
      .from("collection_items")
      .delete()
      .eq("user_id", profile.id)
      .eq("fragrance_id", id);

    if (error) {
      return NextResponse.json(
        {
          message: toUserFacingMessage(
            error.message,
            "Couldn't remove that fragrance.",
          ),
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, fragranceId: id });
  } catch (error) {
    return NextResponse.json(
      {
        message: toUserFacingMessage(
          error,
          "Couldn't remove that fragrance.",
        ),
      },
      { status: 500 },
    );
  }
}
