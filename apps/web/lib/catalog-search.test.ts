import { describe, expect, it } from "vitest";
import {
  buildCatalogSearchPatterns,
  filterCatalogRows,
  mergeHybridCatalogResults,
  rankCatalogRows,
  scoreCatalogMatch,
} from "./catalog-search";

describe("buildCatalogSearchPatterns", () => {
  it("includes space and hyphen variants for multi-word queries", () => {
    const patterns = buildCatalogSearchPatterns("ocean noir");
    expect(patterns).toContain("%ocean noir%");
    expect(patterns).toContain("%ocean-noir%");
    // Distinctive token, not every short token dump
    expect(patterns).toContain("%ocean%");
    expect(patterns).not.toContain("%noir%");
  });

  it("normalizes hyphenated queries to spaced variants", () => {
    const patterns = buildCatalogSearchPatterns("ocean-noir");
    expect(patterns).toContain("%ocean-noir%");
    expect(patterns).toContain("%ocean noir%");
  });

  it("uses the longest token for multi-word spicebomb queries", () => {
    const patterns = buildCatalogSearchPatterns("spicebomb extreme");
    expect(patterns).toContain("%spicebomb extreme%");
    expect(patterns).toContain("%spicebomb-extreme%");
    expect(patterns).toContain("%spicebomb%");
    expect(patterns).not.toContain("%extreme%");
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
  ];

  it("requires all meaningful tokens for multi-word queries", () => {
    const filtered = filterCatalogRows("spicebomb extreme", rows);
    expect(filtered.map((r) => r.perfume)).toEqual(["Spicebomb Extreme"]);
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
});
