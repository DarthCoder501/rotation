/**
 * Catalog text search helpers.
 *
 * Retrieval (ILIKE patterns) casts a wide net; ranking + AND filtering
 * (with light typo forgiveness) decide what the user actually sees.
 */

/** Max edit distance for typo forgiveness (Damerau-Levenshtein). */
function maxTypoDistance(tokenLength: number): number {
  if (tokenLength < 5) return 0; // too short — exact only
  if (tokenLength < 8) return 1; // covers dynatsy ↔ dynasty (transposition)
  return 2;
}

/**
 * Damerau-Levenshtein distance (insert/delete/substitute + adjacent transpose).
 * Caps work for short fragrance tokens; returns Infinity if over `limit`.
 */
export function editDistance(
  a: string,
  b: string,
  limit = Number.POSITIVE_INFINITY,
): number {
  if (a === b) return 0;
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > limit) return Number.POSITIVE_INFINITY;

  // Two-row DP with transposition tracking.
  let prev = new Array<number>(lb + 1);
  let curr = new Array<number>(lb + 1);
  let prevPrev = new Array<number>(lb + 1);
  for (let j = 0; j <= lb; j++) prev[j] = j;

  for (let i = 1; i <= la; i++) {
    curr[0] = i;
    let rowMin = curr[0];
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let dist = Math.min(
        prev[j] + 1, // delete
        curr[j - 1] + 1, // insert
        prev[j - 1] + cost, // substitute
      );
      if (
        i > 1 &&
        j > 1 &&
        a[i - 1] === b[j - 2] &&
        a[i - 2] === b[j - 1]
      ) {
        dist = Math.min(dist, prevPrev[j - 2] + 1); // transpose
      }
      curr[j] = dist;
      rowMin = Math.min(rowMin, dist);
    }
    if (rowMin > limit) return Number.POSITIVE_INFINITY;
    const swap = prevPrev;
    prevPrev = prev;
    prev = curr;
    curr = swap;
  }
  return prev[lb] <= limit ? prev[lb] : Number.POSITIVE_INFINITY;
}

/**
 * True when `token` appears in haystack exactly, or fuzzily matches a word
 * (typo forgiveness for tokens ≥ 5 chars).
 */
export function tokenMatchesText(token: string, haystack: string): boolean {
  if (!token) return true;
  if (haystack.includes(token)) return true;

  const maxDist = maxTypoDistance(token.length);
  if (maxDist === 0) return false;

  const words = haystack.split(/[^a-z0-9]+/).filter((w) => w.length >= 2);
  return words.some((word) => {
    if (word.includes(token) || token.includes(word)) return true;
    return editDistance(token, word, maxDist) <= maxDist;
  });
}

/**
 * Build catalog ILIKE patterns that tolerate space ↔ hyphen differences
 * and cast a net wide enough for brand + name (+ light typo prefixes).
 *
 * Multi-word: emit every meaningful token (≥3) so "lattafa dynasty" hits
 * both brand and name — not just the longest brand token.
 * Typo soft-net: for tokens ≥5, also emit a 4-char prefix so "dynatsy"
 * can still retrieve rows containing "dynasty" via "%dyna%".
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

  for (const token of tokens) {
    if (token.length >= 3) {
      add(token);
    }
    // Soft typo retrieval: prefix catches near-misses without pg_trgm.
    if (token.length >= 5) {
      add(token.slice(0, 4));
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
  id?: number;
  perfume: string;
  brand: string;
  rating_value?: number;
  ratingValue?: number;
};

export type SemanticCatalogHit<T extends CatalogSearchable> = {
  row: T;
  similarity: number;
};

function rowId(row: CatalogSearchable, fallback: number): number {
  return typeof row.id === "number" ? row.id : fallback;
}

function haystackFor(row: CatalogSearchable): {
  perfume: string;
  brand: string;
  haystack: string;
} {
  const perfume = normalizeSearchText(row.perfume);
  const brand = normalizeSearchText(row.brand);
  return { perfume, brand, haystack: `${perfume} ${brand}` };
}

/**
 * Merge keyword hits with pgvector semantic hits.
 * Exact / phrase text matches stay on top; vibe queries surface via similarity.
 * Multi-word text hits must satisfy token AND (exact or fuzzy).
 */
export function mergeHybridCatalogResults<T extends CatalogSearchable>(
  rawQuery: string,
  textRows: T[],
  semanticHits: SemanticCatalogHit<T>[],
  limit = 25,
): T[] {
  const scores = new Map<number, { row: T; score: number }>();
  let syntheticId = -1;

  for (const row of textRows) {
    const id = rowId(row, syntheticId--);
    const textScore = scoreCatalogMatch(rawQuery, row);
    if (textScore <= 0) continue;
    scores.set(id, { row, score: textScore });
  }

  for (const { row, similarity } of semanticHits) {
    if (!Number.isFinite(similarity) || similarity <= 0) continue;
    const id = rowId(row, syntheticId--);
    const rating = row.rating_value ?? row.ratingValue ?? 0;
    // ~0.75 similarity ≈ 337 pts — competitive with brand matches, below exact perfume
    const semanticScore = similarity * 450 + Math.min(rating, 5) * 2;
    const existing = scores.get(id);
    if (!existing) {
      scores.set(id, { row, score: semanticScore });
    } else {
      scores.set(id, {
        row: existing.row,
        score: Math.max(existing.score, semanticScore) + 80,
      });
    }
  }

  return [...scores.values()]
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const ratingA = a.row.rating_value ?? a.row.ratingValue ?? 0;
      const ratingB = b.row.rating_value ?? b.row.ratingValue ?? 0;
      return ratingB - ratingA;
    })
    .slice(0, limit)
    .map(({ row }) => row);
}

/**
 * Higher is better. Phrase / all-token perfume matches outrank partial or brand-only hits.
 * Multi-word queries that miss a token (even with typo forgiveness) score 0.
 */
export function scoreCatalogMatch(
  rawQuery: string,
  row: CatalogSearchable,
): number {
  const query = rawQuery.trim().toLowerCase().replace(/\s+/g, " ");
  if (!query) return 0;

  const { perfume, brand, haystack } = haystackFor(row);
  const tokens = tokenizeQuery(query);
  const phraseSpaced = query.replace(/-/g, " ");
  const phraseHyphen = query.replace(/\s+/g, "-");

  // AND gate for multi-word (exact or fuzzy).
  if (tokens.length > 1) {
    const required = tokens.filter((token) => token.length >= 3);
    const check = required.length > 0 ? required : tokens;
    if (!check.every((token) => tokenMatchesText(token, haystack))) {
      return 0;
    }
  }

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

  const exactInPerfume = tokens.filter((token) => perfume.includes(token));
  const fuzzyOnlyInPerfume = tokens.filter(
    (token) =>
      !perfume.includes(token) && tokenMatchesText(token, perfume),
  );
  const exactInHaystack = tokens.filter((token) => haystack.includes(token));
  const fuzzyInHaystack = tokens.filter((token) =>
    tokenMatchesText(token, haystack),
  );

  if (tokens.length > 1 && exactInPerfume.length === tokens.length) {
    score += 500;
  } else if (tokens.length > 1 && fuzzyOnlyInPerfume.length > 0) {
    // All tokens cover perfume with at least one fuzzy — still strong.
    const perfumeCovered = tokens.every((token) =>
      tokenMatchesText(token, perfume),
    );
    if (perfumeCovered) score += 420;
  } else if (tokens.length > 1 && fuzzyInHaystack.length === tokens.length) {
    score += exactInHaystack.length === tokens.length ? 300 : 240;
  }

  score += exactInPerfume.length * 40;
  score += fuzzyOnlyInPerfume.length * 25;
  score += exactInHaystack.length * 15;

  const rating = row.rating_value ?? row.ratingValue ?? 0;
  score += Math.min(rating, 5) * 2;

  return score;
}

/**
 * Drop weak false positives for multi-word searches
 * (e.g. "spicebomb extreme" must not keep a bottle that only matches "extreme").
 * Allows light typo forgiveness on tokens ≥ 5 chars.
 */
export function filterCatalogRows<T extends CatalogSearchable>(
  rawQuery: string,
  rows: T[],
): T[] {
  const tokens = tokenizeQuery(rawQuery);
  if (tokens.length <= 1) return rows;

  return rows.filter((row) => {
    const { haystack } = haystackFor(row);
    const required = tokens.filter((token) => token.length >= 3);
    const check = required.length > 0 ? required : tokens;
    return check.every((token) => tokenMatchesText(token, haystack));
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
