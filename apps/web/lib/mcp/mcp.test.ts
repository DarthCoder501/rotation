import { describe, expect, it } from "vitest";
import { fallbackRecommendation } from "./fallback";
import { buildRecommendPrompt } from "./prompt";
import type { MCPRecommendContext } from "@/lib/ranker/types";

const sampleContext: MCPRecommendContext = {
  userActivity: "Relax",
  weather: { tempC: 22, condition: "Clear", humidity: 55 },
  profile: {
    likedAccords: ["vanilla"],
    dislikedAccords: [],
    likedBrands: [],
    dislikedBrands: [],
  },
  preferenceModel: {
    scale: "0-100",
    anchors: {
      dislike: 0,
      softDislike: 25,
      neutral: 50,
      like: 75,
      love: 100,
    },
  },
  shortlist: [
    {
      rank: 1,
      score: 1.2,
      perfume: "Yara",
      brand: "Lattafa",
      topNotes: "orange",
      middleNotes: "jasmine",
      baseNotes: "vanilla",
      mainAccord1: "vanilla",
      mainAccord2: "sweet",
      ratingValue: 4.6,
    },
  ],
};

describe("MCP prompt", () => {
  it("includes shortlist perfume and activity context", () => {
    const prompt = buildRecommendPrompt(sampleContext);
    expect(prompt).toContain("Yara");
    expect(prompt).toContain("Relax");
    expect(prompt).toContain("vanilla");
    expect(prompt).toContain("0–100");
    expect(prompt).toContain("22°C");
  });

  it("mentions Fahrenheit when tempUnit is F", () => {
    const prompt = buildRecommendPrompt({ ...sampleContext, tempUnit: "F" });
    expect(prompt).toContain("72°F");
    expect(prompt).toContain("Fahrenheit");
  });
});

describe("fallbackRecommendation", () => {
  it("returns top shortlist pick when Gemini is unavailable", () => {
    const result = fallbackRecommendation(sampleContext);
    expect(result.selectedPerfume).toBe("Yara");
    expect(result.selectedBrand).toBe("Lattafa");
    expect(result.palette).toHaveLength(3);
  });
});
