import { beforeEach, describe, expect, it } from "vitest";
import { buildMCPContext } from "./build-mcp-context";
import { extractFeatureVector, FEATURE_DIM } from "./feature-vector";
import {
  FragranceRanker,
  MIN_RATING,
  TOP_K,
  recommendationOptionCount,
} from "./fragrance-ranker";
import {
  clearLegacyWeights,
  clearWeights,
  loadWeights,
  STORAGE_KEY_PREFIX,
  weightsStorageKey,
} from "./storage";
import { EMPTY_PROFILE } from "./types";
import { makeFragrance, vanillaProfile } from "./test-fixtures";

const TEST_PROFILE_ID = "test-profile-00000000-0000-0000-0000-000000000001";

function mockLocalStorage() {
  const store = new Map<string, string>();

  const localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };

  Object.defineProperty(globalThis, "localStorage", {
    value: localStorage,
    configurable: true,
  });

  return localStorage;
}

describe("extractFeatureVector", () => {
  it("encodes liked accord and brand matches", () => {
    const row = makeFragrance({
      id: 1,
      perfume: "Yara",
      brand: "Lattafa",
      mainAccord1: "vanilla",
      mainAccord2: "amber",
      ratingValue: 4.5,
      ratingCount: 999,
    });

    const features = extractFeatureVector(row, vanillaProfile);

    expect(features[0]).toBe(1);
    expect(features[1]).toBe(1);
    expect(features[20]).toBe(1);
    expect(features[22]).toBeCloseTo(0.9);
    expect(features[24]).toBe(1);
    expect(features.length).toBe(FEATURE_DIM);
  });
});

describe("FragranceRanker", () => {
  beforeEach(() => {
    mockLocalStorage();
    clearWeights(TEST_PROFILE_ID);
    clearLegacyWeights();
  });

  it("scales recommendation option count with collection size", () => {
    expect(recommendationOptionCount(1)).toBe(1);
    expect(recommendationOptionCount(3)).toBe(2);
    expect(recommendationOptionCount(8)).toBe(3);
    expect(recommendationOptionCount(25)).toBe(5);
  });

  it("excludes fragrances rated below MIN_RATING", () => {
    const ranker = new FragranceRanker(TEST_PROFILE_ID);
    const lowRated = makeFragrance({
      id: 1,
      perfume: "Low",
      brand: "Test",
      ratingValue: MIN_RATING - 0.1,
    });

    expect(ranker.score(lowRated, EMPTY_PROFILE)).toBe(-Infinity);
  });

  it("rankAll returns at most TOP_K candidates", () => {
    const ranker = new FragranceRanker(TEST_PROFILE_ID);
    const candidates = Array.from({ length: 30 }, (_, index) =>
      makeFragrance({
        id: index + 1,
        perfume: `Scent ${index + 1}`,
        brand: "House",
        ratingValue: 4 + (index % 5) * 0.1,
      }),
    );

    const ranked = ranker.rankAll(candidates, EMPTY_PROFILE);

    expect(ranked.length).toBe(TOP_K);
  });

  it("filters out low-rated items from rankAll", () => {
    const ranker = new FragranceRanker(TEST_PROFILE_ID);
    const candidates = [
      makeFragrance({
        id: 1,
        perfume: "Good",
        brand: "A",
        ratingValue: 4.5,
      }),
      makeFragrance({
        id: 2,
        perfume: "Bad",
        brand: "B",
        ratingValue: 3.0,
      }),
    ];

    const ranked = ranker.rankAll(candidates, EMPTY_PROFILE);

    expect(ranked).toHaveLength(1);
    expect(ranked[0]?.perfume).toBe("Good");
  });

  it("recordPreference scales continuous affinity into weights", () => {
    const liked = makeFragrance({
      id: 1,
      perfume: "Liked",
      brand: "Lattafa",
      mainAccord1: "vanilla",
      ratingValue: 4.6,
    });
    const similar = makeFragrance({
      id: 2,
      perfume: "Similar",
      brand: "Other",
      mainAccord1: "vanilla",
      ratingValue: 4.4,
    });

    const mild = new FragranceRanker(`${TEST_PROFILE_ID}-mild`);
    mild.recordPreference(liked, vanillaProfile, 75);
    const mildScore = mild.score(similar, vanillaProfile);

    const strong = new FragranceRanker(`${TEST_PROFILE_ID}-strong`);
    strong.recordPreference(liked, vanillaProfile, 100);
    const strongScore = strong.score(similar, vanillaProfile);

    expect(strongScore).toBeGreaterThan(mildScore);
  });

  it("recordFeedback increases score for similar fragrances", () => {
    const liked = makeFragrance({
      id: 1,
      perfume: "Liked",
      brand: "Lattafa",
      mainAccord1: "vanilla",
      ratingValue: 4.6,
    });
    const similar = makeFragrance({
      id: 2,
      perfume: "Similar",
      brand: "Other",
      mainAccord1: "vanilla",
      ratingValue: 4.4,
    });
    const different = makeFragrance({
      id: 3,
      perfume: "Different",
      brand: "Other",
      mainAccord1: "citrus",
      ratingValue: 4.4,
    });

    const ranker = new FragranceRanker(TEST_PROFILE_ID);
    const before = ranker.score(similar, vanillaProfile);

    ranker.recordPreference(liked, vanillaProfile, 100);

    expect(ranker.score(similar, vanillaProfile)).toBeGreaterThan(before);
    expect(ranker.score(different, vanillaProfile)).toBeLessThanOrEqual(
      ranker.score(similar, vanillaProfile),
    );
  });

  it("recordPairwiseChoice ranks the winner above the loser", () => {
    const winner = makeFragrance({
      id: 1,
      perfume: "Winner",
      brand: "Lattafa",
      mainAccord1: "vanilla",
      ratingValue: 4.5,
    });
    const loser = makeFragrance({
      id: 2,
      perfume: "Loser",
      brand: "Other",
      mainAccord1: "citrus",
      ratingValue: 4.5,
    });

    const ranker = new FragranceRanker(TEST_PROFILE_ID);
    ranker.recordPairwiseChoice(winner, loser, vanillaProfile);

    const ranked = ranker.rankAll([winner, loser], vanillaProfile);
    expect(ranked[0]?.perfume).toBe("Winner");
    expect(ranked[0]?.score).toBeGreaterThan(ranked[1]?.score ?? -Infinity);
  });

  it("persists weights to profile-scoped localStorage", () => {
    const row = makeFragrance({
      id: 1,
      perfume: "Persist",
      brand: "Lattafa",
      mainAccord1: "vanilla",
    });

    const ranker = new FragranceRanker(TEST_PROFILE_ID);
    ranker.recordPreference(row, vanillaProfile, 100);

    expect(
      globalThis.localStorage.getItem(weightsStorageKey(TEST_PROFILE_ID)),
    ).toBeTruthy();

    const reloaded = new FragranceRanker(TEST_PROFILE_ID);
    expect(reloaded.score(row, vanillaProfile)).toBeGreaterThan(0);
    expect(
      Array.from(loadWeights(TEST_PROFILE_ID)).some((weight) => weight !== 0),
    ).toBe(true);
  });

  it("migrates legacy global storage key on profile-scoped load", () => {
    const legacy = new Float32Array(FEATURE_DIM);
    legacy[0] = 0.5;
    globalThis.localStorage.setItem(
      STORAGE_KEY_PREFIX,
      JSON.stringify(Array.from(legacy)),
    );

    const ranker = new FragranceRanker(TEST_PROFILE_ID);
    expect(ranker.score(
      makeFragrance({
        id: 1,
        perfume: "Test",
        brand: "B",
        mainAccord1: "vanilla",
        ratingValue: 4.5,
      }),
      vanillaProfile,
    )).not.toBe(0);
  });
});

describe("buildMCPContext", () => {
  it("serializes shortlist ranks and note fields for MCP", () => {
    const shortlist = [
      {
        ...makeFragrance({
          id: 1,
          perfume: "Yara",
          brand: "Lattafa",
          topNotes: "orange",
          middleNotes: "jasmine",
          baseNotes: "vanilla",
          mainAccord1: "vanilla",
          mainAccord2: "sweet",
          ratingValue: 4.6,
        }),
        score: 1.25,
      },
    ];

    const context = buildMCPContext({
      userActivity: "Relax",
      weather: { tempC: 22, condition: "Clear", humidity: 55 },
      profile: vanillaProfile,
      shortlist,
    });

    expect(context.shortlist).toHaveLength(1);
    expect(context.preferenceModel.scale).toBe("0-100");
    expect(context.preferenceModel.anchors.love).toBe(100);
    expect(context.shortlist[0]).toMatchObject({
      rank: 1,
      score: 1.25,
      perfume: "Yara",
      brand: "Lattafa",
      topNotes: "orange",
      middleNotes: "jasmine",
      baseNotes: "vanilla",
      mainAccord1: "vanilla",
      mainAccord2: "sweet",
      ratingValue: 4.6,
    });
  });
});
