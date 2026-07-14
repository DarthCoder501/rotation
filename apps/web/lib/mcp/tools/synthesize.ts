import { fallbackRecommendation } from "@/lib/mcp/fallback";
import { buildRecommendPrompt } from "@/lib/mcp/prompt";
import type { RecommendationResult } from "@/lib/mcp/types";
import type { MCPRecommendContext } from "@/lib/ranker/types";

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export async function synthesizeRecommendation(
  context: MCPRecommendContext,
): Promise<RecommendationResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  if (!context.shortlist?.length) {
    throw new Error("shortlist must contain at least one fragrance");
  }

  const prompt = buildRecommendPrompt(context);

  const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Gemini request failed (${response.status})${detail ? `: ${detail.slice(0, 200)}` : ""}`,
    );
  }

  const payload = (await response.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };

  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini returned an empty response");
  }

  const parsed = parseRecommendationJson(text);
  return normalizeRecommendation(parsed, context);
}

function parseRecommendationJson(text: string): Partial<RecommendationResult> {
  try {
    return JSON.parse(text) as Partial<RecommendationResult>;
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("Gemini response was not valid JSON");
    }
    return JSON.parse(match[0]) as Partial<RecommendationResult>;
  }
}

function normalizeRecommendation(
  parsed: Partial<RecommendationResult>,
  context: MCPRecommendContext,
): RecommendationResult {
  const fallback = fallbackRecommendation(context);
  const shortlistNames = new Set(
    context.shortlist.map((item) => item.perfume.toLowerCase()),
  );

  const selectedPerfume =
    typeof parsed.selectedPerfume === "string" &&
    shortlistNames.has(parsed.selectedPerfume.toLowerCase())
      ? parsed.selectedPerfume
      : fallback.selectedPerfume;

  const matched = context.shortlist.find(
    (item) => item.perfume.toLowerCase() === selectedPerfume.toLowerCase(),
  );

  const palette = Array.isArray(parsed.palette)
    ? parsed.palette.filter(
        (value): value is string =>
          typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value),
      )
    : [];

  return {
    headline:
      typeof parsed.headline === "string" && parsed.headline.trim()
        ? parsed.headline.trim().slice(0, 80)
        : fallback.headline,
    narrative:
      typeof parsed.narrative === "string" && parsed.narrative.trim()
        ? parsed.narrative.trim()
        : fallback.narrative,
    selectedPerfume,
    selectedBrand: matched?.brand ?? fallback.selectedBrand,
    accentAccord:
      typeof parsed.accentAccord === "string" && parsed.accentAccord.trim()
        ? parsed.accentAccord.trim()
        : matched?.mainAccord1 || fallback.accentAccord,
    palette: [
      palette[0] ?? fallback.palette[0],
      palette[1] ?? fallback.palette[1],
      palette[2] ?? fallback.palette[2],
    ],
  };
}
