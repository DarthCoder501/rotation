import { NextResponse } from "next/server";

/**
 * Lightweight readiness probe for Vercel / uptime checks.
 * Does not expose secret values — only whether required env vars are present.
 */
export async function GET() {
  const checks = {
    supabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()),
    supabaseAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()),
    supabaseServiceRole: Boolean(
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
    ),
    geminiApiKey: Boolean(process.env.GEMINI_API_KEY?.trim()),
  };

  const requiredOk =
    checks.supabaseUrl &&
    checks.supabaseAnonKey &&
    checks.supabaseServiceRole;

  return NextResponse.json(
    {
      ok: requiredOk,
      service: "rotation-web",
      checks,
      warnings: [
        ...(!checks.geminiApiKey
          ? ["GEMINI_API_KEY missing — narratives fall back to ranker pick"]
          : []),
      ],
    },
    {
      status: requiredOk ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
