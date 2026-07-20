# Supabase Auth + Ranker Sync Setup

Run these after deploying. Google OAuth is configured in the Supabase Dashboard (not `.env`).
Full production checklist: [`apps/web/DEPLOY.md`](../apps/web/DEPLOY.md).

## 1. Run the SQL migrations

Open **Supabase Dashboard → SQL → New query**, paste and run:

1. `supabase/migrations/001_init.sql` (if the project is new)
2. `supabase/migrations/002_auth_and_ranker_weights.sql`

Migration `002` adds:

- `auth_user_id` — links `user_profiles` to `auth.users`
- `ranker_weights` / `ranker_weights_updated_at` — server backup for hybrid ranker sync
- nullable `device_id` — anonymous users keep a device profile until sign-in
- updated RLS policies for auth-aware access

## 1b. Optional affinity column (collection likes)

Also run `supabase/migrations/003_collection_affinity.sql` so "how much do you like it?" on add is stored server-side. The app keeps a local affinity cache either way.

## 1c. Catalog semantic search (Phase C)

Run `supabase/migrations/004_match_fragrances.sql` and set `HF_TOKEN` on the web app (same MiniLM model as `scripts/seed.py`). Without both, catalog search stays keyword-only and `/api/health` warns about missing `HF_TOKEN`.

## 2. Enable Google OAuth

1. **Authentication → Providers → Google** → Enable
2. Add your Google Cloud OAuth client ID and secret
3. **Authentication → URL Configuration → Redirect URLs** — add:
   - `http://localhost:3000/auth/callback`
   - `https://YOUR_PRODUCTION_DOMAIN/auth/callback`

## 3. Site URL (URL Configuration)

Set **Site URL** to your primary app URL (production domain, or `http://localhost:3000` for local).

## 4. Verify

1. Start the app: `pnpm --filter web dev`
2. Visit `/api/health` — expect `{ "ok": true }`
3. Visit `/profile` — **Continue with Google** while signed out
4. Add fragrances anonymously, then sign in — collection should remain
5. Second device after login — collection and ranker weights should sync

## Architecture choices implemented

| Choice | Behavior |
|--------|----------|
| **Anonymous-first UX** | No sign-in required; device cookie creates a profile automatically |
| **Merge on login** | Anonymous collection/submissions/ranker weights merge into the Google account |
| **Hybrid ranker (Option C)** | Weights write to localStorage immediately; debounced sync to Supabase |
| **Cross-device sync** | On login, newer timestamp wins between local and server weights |

## Known gotcha after first Google sign-in

If you signed in before the OAuth callback profile-link fix, you may have an
`auth.users` row with **no** `user_profiles.auth_user_id`. Fix by either:

1. Sign out and sign in again (preferred — callback now calls `ensureAuthenticatedProfile`), or
2. Run this in the SQL editor (replace the UUID with your auth user id):

```sql
INSERT INTO public.user_profiles (auth_user_id, profile)
VALUES (
  'YOUR_AUTH_USER_UUID',
  '{"likedAccords":[],"dislikedAccords":[],"likedBrands":[],"dislikedBrands":[]}'::jsonb
)
ON CONFLICT (auth_user_id) DO NOTHING;
```
