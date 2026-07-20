-- Phase E: provisional catalog rows for Custom-until-published submissions.
-- Provisional fragrances live in `fragrances` so collection FKs work, but stay
-- out of public search until an admin publishes them in place.

ALTER TABLE fragrances
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'published'
    CHECK (visibility IN ('published', 'provisional'));

COMMENT ON COLUMN fragrances.visibility IS
  'published = shared catalog; provisional = user Custom scent pending review';

-- Existing seeded rows are published (default). Ensure explicitly:
UPDATE fragrances SET visibility = 'published' WHERE visibility IS NULL;

CREATE INDEX IF NOT EXISTS idx_fragrances_visibility
  ON fragrances (visibility);

ALTER TABLE fragrance_submissions
  ADD COLUMN IF NOT EXISTS promoted_fragrance_id BIGINT
    REFERENCES fragrances(id) ON DELETE SET NULL;

COMMENT ON COLUMN fragrance_submissions.promoted_fragrance_id IS
  'Provisional (then published) fragrance row created for this submission';

CREATE INDEX IF NOT EXISTS idx_submissions_promoted_fragrance
  ON fragrance_submissions (promoted_fragrance_id);

-- Semantic search must never return provisional / unembedded rows.
CREATE OR REPLACE FUNCTION match_fragrances(
  query_embedding vector(384),
  match_count integer DEFAULT 30,
  match_threshold double precision DEFAULT 0.32
)
RETURNS TABLE (
  id bigint,
  url text,
  perfume text,
  brand text,
  country text,
  gender text,
  rating_value real,
  rating_count integer,
  year integer,
  top_notes text,
  middle_notes text,
  base_notes text,
  perfumer1 text,
  perfumer2 text,
  main_accord_1 text,
  main_accord_2 text,
  main_accord_3 text,
  main_accord_4 text,
  main_accord_5 text,
  similarity double precision
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    f.id,
    f.url,
    f.perfume,
    f.brand,
    f.country,
    f.gender,
    f.rating_value,
    f.rating_count,
    f.year,
    f.top_notes,
    f.middle_notes,
    f.base_notes,
    f.perfumer1,
    f.perfumer2,
    f.main_accord_1,
    f.main_accord_2,
    f.main_accord_3,
    f.main_accord_4,
    f.main_accord_5,
    (1 - (f.embedding <=> query_embedding))::double precision AS similarity
  FROM fragrances f
  WHERE f.embedding IS NOT NULL
    AND f.visibility = 'published'
    AND 1 - (f.embedding <=> query_embedding) >= match_threshold
  ORDER BY f.embedding <=> query_embedding
  LIMIT greatest(match_count, 1);
$$;

COMMENT ON FUNCTION match_fragrances IS
  'Cosine-similarity search over published fragrance embeddings (MiniLM 384-d).';

GRANT EXECUTE ON FUNCTION match_fragrances TO service_role;
GRANT EXECUTE ON FUNCTION match_fragrances TO anon;
GRANT EXECUTE ON FUNCTION match_fragrances TO authenticated;
