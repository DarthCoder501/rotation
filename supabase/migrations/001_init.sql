CREATE EXTENSION IF NOT EXISTS vector;

-- SOURCE CATALOG (read-only for users; seeded from fragrances.csv)
CREATE TABLE fragrances (
  id            BIGSERIAL PRIMARY KEY,
  url           TEXT,
  perfume       TEXT NOT NULL,
  brand         TEXT NOT NULL,
  country       TEXT,
  gender        TEXT CHECK (gender IN ('men', 'women', 'unisex')),
  rating_value  REAL NOT NULL,
  rating_count  INTEGER DEFAULT 0,
  year          INTEGER,
  top_notes     TEXT,
  middle_notes  TEXT,
  base_notes    TEXT,
  perfumer1     TEXT,
  perfumer2     TEXT,
  main_accord_1 TEXT,
  main_accord_2 TEXT,
  main_accord_3 TEXT,
  main_accord_4 TEXT,
  main_accord_5 TEXT,
  embedding     vector(384),
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (perfume, brand)
);

CREATE INDEX idx_fragrances_rating ON fragrances (rating_value DESC);
CREATE INDEX idx_fragrances_brand ON fragrances (brand);
CREATE INDEX idx_fragrances_search ON fragrances
  USING gin (to_tsvector('english', perfume || ' ' || brand || ' ' || coalesce(top_notes,'')));
CREATE INDEX idx_fragrances_embedding ON fragrances
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- USER PROFILES (preference signals: liked/disliked accords + brands)
CREATE TABLE user_profiles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id  TEXT UNIQUE NOT NULL,
  profile    JSONB NOT NULL DEFAULT '{"likedAccords":[],"dislikedAccords":[],"likedBrands":[],"dislikedBrands":[]}',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- USER COLLECTIONS (what they own — ML candidate pool)
CREATE TABLE collection_items (
  id            BIGSERIAL PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  fragrance_id  BIGINT NOT NULL REFERENCES fragrances(id) ON DELETE CASCADE,
  added_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, fragrance_id)
);

CREATE INDEX idx_collection_user ON collection_items (user_id);

-- SUBMISSION QUEUE (user-proposed fragrances — NOT in catalog until approved)
CREATE TYPE submission_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE fragrance_submissions (
  id            BIGSERIAL PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  perfume       TEXT NOT NULL,
  brand         TEXT NOT NULL,
  country       TEXT,
  gender        TEXT,
  top_notes     TEXT,
  middle_notes  TEXT,
  base_notes    TEXT,
  main_accord_1 TEXT,
  main_accord_2 TEXT,
  main_accord_3 TEXT,
  main_accord_4 TEXT,
  main_accord_5 TEXT,
  user_notes    TEXT,                -- why they want it added
  status        submission_status NOT NULL DEFAULT 'pending',
  reviewed_at   TIMESTAMPTZ,
  reviewed_by   TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_submissions_status ON fragrance_submissions (status);

-- RLS: users read catalog, manage own collection + submissions only
ALTER TABLE fragrances ENABLE ROW LEVEL SECURITY;
CREATE POLICY catalog_read ON fragrances FOR SELECT USING (true);

ALTER TABLE collection_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_collection ON collection_items
  USING (user_id = (SELECT id FROM user_profiles WHERE device_id = current_setting('app.device_id', true)::text));

ALTER TABLE fragrance_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_submissions ON fragrance_submissions
  FOR INSERT WITH CHECK (user_id = (SELECT id FROM user_profiles WHERE device_id = current_setting('app.device_id', true)::text));
CREATE POLICY read_own_submissions ON fragrance_submissions
  FOR SELECT USING (user_id = (SELECT id FROM user_profiles WHERE device_id = current_setting('app.device_id', true)::text));