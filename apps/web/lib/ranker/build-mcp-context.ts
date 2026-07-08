import type {
  FragranceRow,
  MCPRecommendContext,
  RankedFragrance,
  UserProfile,
} from "./types";

export function buildMCPContext(params: {
  userActivity: string;
  weather: MCPRecommendContext["weather"];
  profile: UserProfile;
  shortlist: RankedFragrance[] | (FragranceRow & { score: number })[];
}): MCPRecommendContext {
  return {
    userActivity: params.userActivity,
    weather: params.weather,
    profile: params.profile,
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
