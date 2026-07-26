-- Optional reference link on submissions (usually Fragrantica).
-- Admins can override/add the canonical link when approving; the approved
-- value lands on fragrances.url, which the detail page already renders.

ALTER TABLE fragrance_submissions
  ADD COLUMN IF NOT EXISTS source_url TEXT;

COMMENT ON COLUMN fragrance_submissions.source_url IS
  'Optional http(s) reference link supplied by the submitter (e.g. Fragrantica).';
