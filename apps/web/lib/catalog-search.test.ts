import { describe, expect, it } from "vitest";
import {
  buildCatalogSearchPatterns,
  editDistance,
  filterCatalogRows,
  mergeHybridCatalogResults,
  rankCatalogRows,
  scoreCatalogMatch,
  tokenMatchesText,
} from "./catalog-search";

describe("buildCatalogSearchPatterns", () => {
  it("includes space and hyphen variants for multi-word queries", () => {
    const patterns = buildCatalogSearchPatterns("ocean noir");
    expect(patterns).toContain("%ocean noir%");
    expect(patterns).toContain("%ocean-noir%");
    // Every meaningful token (≥3), not only the longest
    expect(patterns).toContain("%ocean%");
    expect(patterns).toContain("%noir%");
  });

  it("normalizes hyphenated queries to spaced variants", () => {
    const patterns = buildCatalogSearchPatterns("ocean-noir");
    expect(patterns).toContain("%ocean-noir%");
    expect(patterns).toContain("%ocean noir%");
  });

  it("emits both brand and name tokens for lattafa dynasty", () => {
    const patterns = buildCatalogSearchPatterns("lattafa dynasty");
    expect(patterns).toContain("%lattafa%");
    expect(patterns).toContain("%dynasty%");
    // Soft typo prefixes
    expect(patterns).toContain("%latt%");
    expect(patterns).toContain("%dyna%");
  });

  it("emits spicebomb and extreme for multi-word spicebomb queries", () => {
    const patterns = buildCatalogSearchPatterns("spicebomb extreme");
    expect(patterns).toContain("%spicebomb extreme%");
    expect(patterns).toContain("%spicebomb%");
    expect(patterns).toContain("%extreme%");
  });
});

describe("editDistance / tokenMatchesText typo forgiveness", () => {
  it("treats adjacent transposition as distance 1 (dynatsy ↔ dynasty)", () => {
    expect(editDistance("dynatsy", "dynasty", 1)).toBe(1);
  });

  it("matches typo tokens against haystack words", () => {
    expect(tokenMatchesText("dynatsy", "dynasty lattafa")).toBe(true);
    expect(tokenMatchesText("lattafa", "dynasty lattafa")).toBe(true);
    expect(tokenMatchesText("dynatsy", "asdasd lattafa")).toBe(false);
  });

  it("does not fuzzy-match short near-misses (exact substring only)", () => {
    // "di" is a substring of "dior" — exact path, allowed
    expect(tokenMatchesText("di", "dior homme")).toBe(true);
    // "xyz" is short and not present — no fuzzy rescue
    expect(tokenMatchesText("xyz", "dior homme")).toBe(false);
    // 4-char near-miss still below fuzzy threshold (< 5)
    expect(tokenMatchesText("diar", "dior homme")).toBe(false);
  });
});

describe("filterCatalogRows / rankCatalogRows", () => {
  const rows = [
    {
      perfume: "Spicebomb Extreme",
      brand: "Viktor&Rolf",
      rating_value: 4.2,
    },
    {
      perfume: "Bvlgari Tygar",
      brand: "Bvlgari",
      rating_value: 4.6,
    },
    {
      perfume: "Aventus",
      brand: "Creed",
      rating_value: 4.5,
    },
    {
      perfume: "Dior Homme Extreme",
      brand: "Dior",
      rating_value: 4.4,
    },
    {
      perfume: "Dynasty",
      brand: "Lattafa",
      rating_value: 3.9,
    },
    {
      perfume: "Asad",
      brand: "Lattafa",
      rating_value: 4.7,
    },
  ];

  it("requires all meaningful tokens for multi-word queries", () => {
    const filtered = filterCatalogRows("spicebomb extreme", rows);
    expect(filtered.map((r) => r.perfume)).toEqual(["Spicebomb Extreme"]);
  });

  it("finds lattafa dynasty among other lattafas", () => {
    const ranked = rankCatalogRows("lattafa dynasty", rows, 5);
    expect(ranked[0]?.perfume).toBe("Dynasty");
    expect(ranked.some((r) => r.perfume === "Asad")).toBe(false);
  });

  it("forgives a single transposition typo in the name token", () => {
    const ranked = rankCatalogRows("lattafa dynatsy", rows, 5);
    expect(ranked[0]?.perfume).toBe("Dynasty");
  });

  it("ranks the phrase match above unrelated high-rated bottles", () => {
    const ranked = rankCatalogRows("spicebomb extreme", rows, 5);
    expect(ranked[0]?.perfume).toBe("Spicebomb Extreme");
    expect(ranked.some((r) => r.perfume.includes("Tygar"))).toBe(false);
  });

  it("scores exact perfume phrase highest", () => {
    const spice = scoreCatalogMatch("spicebomb extreme", rows[0]);
    const diorExtreme = scoreCatalogMatch("spicebomb extreme", rows[3]);
    expect(spice).toBeGreaterThan(diorExtreme);
    expect(diorExtreme).toBe(0);
  });
});

describe("mergeHybridCatalogResults", () => {
  it("keeps strong text matches ahead of weak semantic hits", () => {
    const textRows = [
      { id: 1, perfume: "Spicebomb Extreme", brand: "Viktor&Rolf", rating_value: 4.2 },
    ];
    const semanticHits = [
      {
        row: {
          id: 2,
          perfume: "Random Gourmand",
          brand: "House",
          rating_value: 4.8,
        },
        similarity: 0.4,
      },
    ];

    const merged = mergeHybridCatalogResults(
      "spicebomb extreme",
      textRows,
      semanticHits,
      5,
    );
    expect(merged[0]?.perfume).toBe("Spicebomb Extreme");
  });

  it("surfaces semantic-only vibe matches when text finds nothing", () => {
    const merged = mergeHybridCatalogResults(
      "vanilla gourmand",
      [],
      [
        {
          row: {
            id: 9,
            perfume: "Yara",
            brand: "Lattafa",
            rating_value: 4.5,
          },
          similarity: 0.78,
        },
      ],
      5,
    );
    expect(merged).toHaveLength(1);
    expect(merged[0]?.perfume).toBe("Yara");
  });

  it("boosts rows found by both text and semantic paths", () => {
    const row = {
      id: 3,
      perfume: "Angel's Share",
      brand: "Kilian",
      rating_value: 4.4,
    };
    const merged = mergeHybridCatalogResults(
      "cognac vanilla",
      [row],
      [{ row, similarity: 0.7 }],
      5,
    );
    expect(merged[0]?.id).toBe(3);
  });

  it("drops brand-only text hits for multi-word queries", () => {
    const merged = mergeHybridCatalogResults(
      "lattafa dynasty",
      [
        { id: 1, perfume: "Asad", brand: "Lattafa", rating_value: 4.7 },
        { id: 2, perfume: "Dynasty", brand: "Lattafa", rating_value: 3.9 },
      ],
      [],
      5,
    );
    expect(merged.map((r) => r.perfume)).toEqual(["Dynasty"]);
  });
});
