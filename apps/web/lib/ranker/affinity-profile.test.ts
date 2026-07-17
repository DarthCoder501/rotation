import { describe, expect, it } from "vitest";
import { applyAffinityToProfile } from "./affinity-profile";
import { EMPTY_PROFILE } from "./types";
import { makeFragrance } from "./test-fixtures";

describe("applyAffinityToProfile", () => {
  it("seeds liked accords and brand on love", () => {
    const fragrance = makeFragrance({
      id: 1,
      perfume: "Yara",
      brand: "Lattafa",
      mainAccord1: "vanilla",
      mainAccord2: "amber",
    });

    const { profile, changed } = applyAffinityToProfile(
      EMPTY_PROFILE,
      fragrance,
      100,
    );

    expect(changed).toBe(true);
    expect(profile.likedAccords.map((a) => a.toLowerCase())).toEqual(
      expect.arrayContaining(["vanilla", "amber"]),
    );
    expect(profile.likedBrands.map((b) => b.toLowerCase())).toContain(
      "lattafa",
    );
  });

  it("soft-dislikes primary accord on strong dislike", () => {
    const fragrance = makeFragrance({
      id: 2,
      perfume: "Smoky",
      brand: "X",
      mainAccord1: "smoky",
    });

    const { profile, changed } = applyAffinityToProfile(
      {
        ...EMPTY_PROFILE,
        likedAccords: ["smoky"],
      },
      fragrance,
      0,
    );

    expect(changed).toBe(true);
    expect(profile.dislikedAccords.map((a) => a.toLowerCase())).toContain(
      "smoky",
    );
    expect(profile.likedAccords.map((a) => a.toLowerCase())).not.toContain(
      "smoky",
    );
  });

  it("no-ops near neutral affinity", () => {
    const fragrance = makeFragrance({
      id: 3,
      perfume: "Mid",
      brand: "Y",
      mainAccord1: "citrus",
    });
    const { changed, profile } = applyAffinityToProfile(
      EMPTY_PROFILE,
      fragrance,
      50,
    );
    expect(changed).toBe(false);
    expect(profile).toBe(EMPTY_PROFILE);
  });
});
