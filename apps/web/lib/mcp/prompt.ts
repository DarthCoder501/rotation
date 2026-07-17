import type { MCPRecommendContext } from "@/lib/ranker/types";
import { formatTemperature } from "@/lib/temperature";

export function buildRecommendPrompt(ctx: MCPRecommendContext): string {
  const anchors = ctx.preferenceModel?.anchors ?? {
    dislike: 0,
    softDislike: 25,
    neutral: 50,
    like: 75,
    love: 100,
  };

  const unit = ctx.tempUnit === "F" ? "F" : "C";
  const tempLabel = formatTemperature(ctx.weather.tempC, unit);

  const blocks = ctx.shortlist
    .map(
      (f) => `
### #${f.rank}: ${f.perfume} by ${f.brand} (personalized ranker score: ${f.score.toFixed(2)})
- Primary Accord: ${f.mainAccord1}${f.mainAccord2 ? `, ${f.mainAccord2}` : ""}
- Top: ${f.topNotes} | Heart: ${f.middleNotes} | Base: ${f.baseNotes}
- Catalog rating: ${f.ratingValue}
`,
    )
    .join("\n");

  return `You are a master perfumer. Select the best fragrance for today from the ML-pre-ranked candidates below.

## Context
- Activity/Mood: ${ctx.userActivity}
- Weather: ${tempLabel}, ${ctx.weather.condition}, ${ctx.weather.humidity}% humidity
- Temperature unit preference: ${unit === "F" ? "Fahrenheit" : "Celsius"} (use this unit if you mention temperature)
- Explicit likes: ${ctx.profile.likedAccords.join(", ") || "none yet"}
- Explicit dislikes: ${ctx.profile.dislikedAccords.join(", ") || "none yet"}

## Preference model
The shortlist order comes from a client-side online ranker trained on a continuous affinity scale (0–100):
- ${anchors.dislike} = dislike
- ${anchors.softDislike} = soft dislike
- ${anchors.neutral} = neutral
- ${anchors.like} = like
- ${anchors.love} = love
Higher personalized ranker scores already encode stronger affinity from how much the user likes each bottle (set when adding to collection) plus choices of what they wear.
Prefer bottles that suit today's weather and activity among the shortlist.

## Ranker Shortlist (pre-sorted by personalized score)
${blocks}

## Instructions
1. Pick the SINGLE best match for today's activity and weather from these candidates only.
2. Prefer higher personalized ranker scores unless weather/activity clearly favors another shortlist entry.
3. Write 2-3 evocative sentences — sensory, not salesy. If you mention temperature, use ${unit === "F" ? "°F" : "°C"} (e.g. ${tempLabel}).
4. Return valid JSON only:
{
  "headline": "string (max 8 words)",
  "narrative": "string (2-3 sentences)",
  "selectedPerfume": "string",
  "selectedBrand": "string",
  "accentAccord": "string",
  "palette": ["#hex1", "#hex2", "#hex3"]
}`;
}
