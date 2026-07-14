-- Optional: persist how much a user likes each owned fragrance (0–100).
-- Safe to run in Supabase SQL Editor. App also keeps a local affinity cache.

ALTER TABLE collection_items
  ADD COLUMN IF NOT EXISTS affinity SMALLINT
    CHECK (affinity IS NULL OR (affinity >= 0 AND affinity <= 100));

COMMENT ON COLUMN collection_items.affinity IS
  'User affinity when adding to collection: 0 dislike … 100 love';
