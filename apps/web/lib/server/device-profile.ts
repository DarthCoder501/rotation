import { cookies } from "next/headers";
import { supabaseAdmin } from "./supabase-admin";

const DEVICE_COOKIE = "scent_device_id";

export async function getOrCreateDeviceProfile() {
  const cookieStore = await cookies();

  let deviceId = cookieStore.get(DEVICE_COOKIE)?.value;

  if (!deviceId) {
    deviceId = crypto.randomUUID();

    cookieStore.set(DEVICE_COOKIE, deviceId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });
  }

  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .upsert({ device_id: deviceId }, { onConflict: "device_id" })
    .select("id, device_id, profile")
    .single();

  if (error) {
    throw new Error(`Failed to load user profile: ${error.message}`);
  }

  return data;
}
