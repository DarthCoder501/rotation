import type { Fragrance } from "@/lib/types/fragrance";

/** Explicit taste signals synced to Supabase `user_profiles.profile` JSONB. */
export interface UserProfile {
  likedAccords: string[];
  dislikedAccords: string[];
  likedBrands: string[];
  dislikedBrands: string[];
}

export const EMPTY_PROFILE: UserProfile = {
  likedAccords: [],
  dislikedAccords: [],
  likedBrands: [],
  dislikedBrands: [],
};

/** Ranker input row — same shape as cached collection items. */
export type FragranceRow = Fragrance;

export interface RankedFragrance extends FragranceRow {
  score: number;
}

export interface MCPRecommendContext {
  userActivity: string;
  weather: { tempC: number; condition: string; humidity: number };
  profile: UserProfile;
  /** Continuous 0–100 affinity model used by the client ranker. */
  preferenceModel: {
    scale: "0-100";
    anchors: {
      dislike: 0;
      softDislike: 25;
      neutral: 50;
      like: 75;
      love: 100;
    };
  };
  shortlist: Array<{
    rank: number;
    score: number;
    perfume: string;
    brand: string;
    topNotes: string;
    middleNotes: string;
    baseNotes: string;
    mainAccord1: string;
    mainAccord2: string | null;
    ratingValue: number;
  }>;
}
