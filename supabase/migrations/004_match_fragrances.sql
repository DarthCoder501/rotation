-- Phase C: semantic catalog search via pgvector.
-- Requires fragrances.embedding (seeded by scripts/seed.py with all-MiniLM-L6-v2).
-- Run in Supabase SQL Editor after 001–003.

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
    AND 1 - (f.embedding <=> query_embedding) >= match_threshold
  ORDER BY f.embedding <=> query_embedding
  LIMIT greatest(match_count, 1);
$$;

COMMENT ON FUNCTION match_fragrances IS
  'Cosine-similarity search over fragrance embeddings (MiniLM 384-d).';

GRANT EXECUTE ON FUNCTION match_fragrances TO service_role;
GRANT EXECUTE ON FUNCTION match_fragrances TO anon;
GRANT EXECUTE ON FUNCTION match_fragrances TO authenticated;
