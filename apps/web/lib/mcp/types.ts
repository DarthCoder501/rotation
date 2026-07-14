import type { MCPRecommendContext } from "@/lib/ranker/types";

export type MCPToolName = "get_weather" | "synthesize_recommendation";

export type WeatherResult = {
  tempC: number;
  condition: string;
  humidity: number;
};

export type RecommendationResult = {
  headline: string;
  narrative: string;
  selectedPerfume: string;
  selectedBrand: string;
  accentAccord: string;
  palette: [string, string, string];
};

export type MCPToolArgs = {
  get_weather: { lat: number; lon: number };
  synthesize_recommendation: MCPRecommendContext;
};

export type MCPToolResult = {
  get_weather: WeatherResult;
  synthesize_recommendation: RecommendationResult;
};
