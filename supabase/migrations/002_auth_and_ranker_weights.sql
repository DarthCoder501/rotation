-- Run this in the Supabase SQL Editor (Dashboard → SQL → New query).
-- Enables Google OAuth profiles + hybrid ranker weight sync.
-- Configure Google provider separately in Authentication → Providers.

-- 1. Link app profiles to Supabase Auth users
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS ranker_weights JSONB,
  ADD COLUMN IF NOT EXISTS ranker_weights_updated_at TIMESTAMPTZ;

-- 2. device_id is optional once a user signs in (auth-only profiles allowed)
ALTER TABLE user_profiles ALTER COLUMN device_id DROP NOT NULL;

-- Replace table-level UNIQUE on device_id with a partial unique index
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_device_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_device_id
  ON user_profiles (device_id)
  WHERE device_id IS NOT NULL;

-- 3. RLS on user_profiles (service-role API routes still work; enables future direct client access)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select_own ON user_profiles;
CREATE POLICY profiles_select_own ON user_profiles
  FOR SELECT USING (auth_user_id = auth.uid());

DROP POLICY IF EXISTS profiles_update_own ON user_profiles;
CREATE POLICY profiles_update_own ON user_profiles
  FOR UPDATE USING (auth_user_id = auth.uid());

-- 4. Update collection/submission RLS to support auth users (keep device fallback for anon)
DROP POLICY IF EXISTS own_collection ON collection_items;
CREATE POLICY own_collection ON collection_items
  FOR ALL USING (
    user_id IN (
      SELECT id FROM user_profiles
      WHERE auth_user_id = auth.uid()
         OR device_id = NULLIF(current_setting('app.device_id', true), '')::text
    )
  );

DROP POLICY IF EXISTS own_submissions ON fragrance_submissions;
CREATE POLICY own_submissions ON fragrance_submissions
  FOR INSERT WITH CHECK (
    user_id IN (
      SELECT id FROM user_profiles
      WHERE auth_user_id = auth.uid()
         OR device_id = NULLIF(current_setting('app.device_id', true), '')::text
    )
  );

DROP POLICY IF EXISTS read_own_submissions ON fragrance_submissions;
CREATE POLICY read_own_submissions ON fragrance_submissions
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM user_profiles
      WHERE auth_user_id = auth.uid()
         OR device_id = NULLIF(current_setting('app.device_id', true), '')::text
    )
  );
