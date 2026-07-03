import { getOrCreateDeviceProfile } from "@/lib/server/device-profile";
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
        { message: `Failed to remove fragrance: ${error.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, fragranceId: id });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unexpected error removing fragrance",
      },
      { status: 500 },
    );
  }
}
