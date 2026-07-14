/**
 * Build catalog ILIKE patterns that tolerate space ↔ hyphen differences
 * (e.g. "ocean noir" ↔ "ocean-noir").
 *
 * For multi-word queries we intentionally do NOT emit lone common tokens like
 * "%extreme%" as primary DB patterns — those flood results with unrelated hits.
 * Token matching is handled in scoreCatalogMatch / filterCatalogRows.
 */
export function buildCatalogSearchPatterns(rawQuery: string): string[] {
  const query = rawQuery.trim().replace(/\s+/g, " ");
  if (!query) return [];

  const patterns = new Set<string>();

  function add(value: string) {
    const trimmed = value.trim();
    if (trimmed.length < 2) return;
    patterns.add(`%${trimmed}%`);
  }

  add(query);
  add(query.replace(/\s+/g, "-"));
  add(query.replace(/-/g, " "));
  add(query.replace(/[\s-]+/g, " "));
  add(query.replace(/[\s-]+/g, "-"));

  const tokens = tokenizeQuery(query);

  // Single-token queries: search that token directly.
  // Multi-token: also search the most distinctive token so we still find
  // "Spicebomb Extreme" via "%spicebomb%" when the exact phrase casing differs.
  if (tokens.length === 1) {
    add(tokens[0]);
  } else if (tokens.length > 1) {
    const distinctive = [...tokens].sort((a, b) => b.length - a.length)[0];
    if (distinctive.length >= 4) {
      add(distinctive);
    }
  }

  return [...patterns];
}

/** Split on spaces/hyphens; drop tiny fragments. */
export function tokenizeQuery(rawQuery: string): string[] {
  return rawQuery
    .trim()
    .toLowerCase()
    .split(/[\s-]+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 2);
}

function normalizeSearchText(value: string): string {
  return value.toLowerCase().replace(/[\s_-]+/g, " ").trim();
}

export type CatalogSearchable = {
  perfume: string;
  brand: string;
  rating_value?: number;
  ratingValue?: number;
};

/**
 * Higher is better. Phrase / all-token perfume matches outrank partial or brand-only hits.
 */
export function scoreCatalogMatch(
  rawQuery: string,
  row: CatalogSearchable,
): number {
  const query = rawQuery.trim().toLowerCase().replace(/\s+/g, " ");
  if (!query) return 0;

  const perfume = normalizeSearchText(row.perfume);
  const brand = normalizeSearchText(row.brand);
  const haystack = `${perfume} ${brand}`;
  const tokens = tokenizeQuery(query);
  const phraseSpaced = query.replace(/-/g, " ");
  const phraseHyphen = query.replace(/\s+/g, "-");

  let score = 0;

  if (perfume === phraseSpaced || perfume === phraseHyphen) {
    score += 1000;
  } else if (
    perfume.includes(phraseSpaced) ||
    perfume.includes(phraseHyphen) ||
    perfume.replace(/ /g, "-").includes(phraseHyphen)
  ) {
    score += 800;
  }

  if (
    brand === phraseSpaced ||
    brand.includes(phraseSpaced) ||
    brand.includes(phraseHyphen)
  ) {
    score += 200;
  }

  const tokensInPerfume = tokens.filter((token) => perfume.includes(token));
  const tokensInHaystack = tokens.filter((token) => haystack.includes(token));

  if (tokens.length > 1 && tokensInPerfume.length === tokens.length) {
    score += 500;
  } else if (tokens.length > 1 && tokensInHaystack.length === tokens.length) {
    score += 300;
  }

  score += tokensInPerfume.length * 40;
  score += tokensInHaystack.length * 15;

  // Soft rating boost so true equals prefer higher-rated bottles,
  // without letting rating drown relevance.
  const rating = row.rating_value ?? row.ratingValue ?? 0;
  score += Math.min(rating, 5) * 2;

  return score;
}

/**
 * Drop weak false positives for multi-word searches
 * (e.g. "spicebomb extreme" must not keep a bottle that only matches "extreme").
 */
export function filterCatalogRows<T extends CatalogSearchable>(
  rawQuery: string,
  rows: T[],
): T[] {
  const tokens = tokenizeQuery(rawQuery);
  if (tokens.length <= 1) return rows;

  return rows.filter((row) => {
    const haystack = `${normalizeSearchText(row.perfume)} ${normalizeSearchText(row.brand)}`;
    // Require every token ≥3 chars, or all tokens if shorter.
    const required = tokens.filter((token) => token.length >= 3);
    const check = required.length > 0 ? required : tokens;
    return check.every((token) => haystack.includes(token));
  });
}

export function rankCatalogRows<T extends CatalogSearchable>(
  rawQuery: string,
  rows: T[],
  limit = 25,
): T[] {
  const filtered = filterCatalogRows(rawQuery, rows);

  return [...filtered]
    .map((row) => ({ row, score: scoreCatalogMatch(rawQuery, row) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const ratingA = a.row.rating_value ?? a.row.ratingValue ?? 0;
      const ratingB = b.row.rating_value ?? b.row.ratingValue ?? 0;
      return ratingB - ratingA;
    })
    .slice(0, limit)
    .map(({ row }) => row);
}
