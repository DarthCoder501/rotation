import type {
  FragranceRow,
  MCPRecommendContext,
  RankedFragrance,
  UserProfile,
} from "./types";

export const DEFAULT_PREFERENCE_MODEL: MCPRecommendContext["preferenceModel"] =
  {
    scale: "0-100",
    anchors: {
      dislike: 0,
      softDislike: 25,
      neutral: 50,
      like: 75,
      love: 100,
    },
  };

export function buildMCPContext(params: {
  userActivity: string;
  weather: MCPRecommendContext["weather"];
  profile: UserProfile;
  shortlist: RankedFragrance[] | (FragranceRow & { score: number })[];
  tempUnit?: MCPRecommendContext["tempUnit"];
}): MCPRecommendContext {
  return {
    userActivity: params.userActivity,
    weather: params.weather,
    tempUnit: params.tempUnit ?? "C",
    profile: params.profile,
    preferenceModel: DEFAULT_PREFERENCE_MODEL,
    shortlist: params.shortlist.map((fragrance, index) => ({
      rank: index + 1,
      score: fragrance.score,
      perfume: fragrance.perfume,
      brand: fragrance.brand,
      topNotes: fragrance.topNotes ?? "",
      middleNotes: fragrance.middleNotes ?? "",
      baseNotes: fragrance.baseNotes ?? "",
      mainAccord1: fragrance.mainAccord1 ?? "",
      mainAccord2: fragrance.mainAccord2,
      ratingValue: fragrance.ratingValue,
    })),
  };
}
