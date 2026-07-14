import { accordColor } from "@/lib/accord-colors";
import type { RecommendationResult } from "@/lib/mcp/types";
import type { MCPRecommendContext } from "@/lib/ranker/types";

export function fallbackRecommendation(
  context: MCPRecommendContext,
): RecommendationResult {
  const top = context.shortlist[0];
  const accent = top?.mainAccord1 || "amber";
  const hue = accordColor(accent);

  return {
    headline: top ? `${top.perfume}` : "Your scent for today",
    narrative: top
      ? `${top.perfume} by ${top.brand} tops your personal ranking for ${context.userActivity.toLowerCase()} today.`
      : "Add fragrances to your collection to unlock recommendations.",
    selectedPerfume: top?.perfume ?? "",
    selectedBrand: top?.brand ?? "",
    accentAccord: accent,
    palette: [hue, "#121110", "#d4af58"],
  };
}
