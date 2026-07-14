import { describe, expect, it } from "vitest";
import {
  buildCatalogSearchPatterns,
  filterCatalogRows,
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
