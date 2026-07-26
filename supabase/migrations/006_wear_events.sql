-- Wear log: multiple wears per day allowed (append). Powers "today" strip + history/insights.

CREATE TABLE IF NOT EXISTS wear_events (
  id            BIGSERIAL PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  fragrance_id  BIGINT NOT NULL REFERENCES fragrances(id) ON DELETE CASCADE,
  worn_on       DATE NOT NULL,
  activity      TEXT,
  weather       JSONB,
  source        TEXT NOT NULL DEFAULT 'recommend'
                  CHECK (source IN ('recommend', 'collection', 'search')),
  timezone      TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wear_events_user_worn_on
  ON wear_events (user_id, worn_on DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wear_events_user_fragrance
  ON wear_events (user_id, fragrance_id);

ALTER TABLE wear_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS own_wear_events ON wear_events;
CREATE POLICY own_wear_events ON wear_events
  FOR ALL USING (
    user_id IN (
      SELECT id FROM user_profiles
      WHERE auth_user_id = auth.uid()
         OR device_id = NULLIF(current_setting('app.device_id', true), '')::text
    )
  );

COMMENT ON TABLE wear_events IS
  'Logged wears — multiple rows per user/day allowed. Analytics + today strip.';
