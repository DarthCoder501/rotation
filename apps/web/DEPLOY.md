# Production checklist (Vercel + Supabase)

Use this after deploying `apps/web` to Vercel.

## 1. Vercel environment variables

In the Vercel project → **Settings → Environment Variables** (Production + Preview):

| Variable                        | Required             | Notes                                                    |
| ------------------------------- | -------------------- | -------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Yes                  | Supabase project URL                                     |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes                  | Anon/public key                                          |
| `SUPABASE_SERVICE_ROLE_KEY`     | Yes                  | Server routes only — never expose to client              |
| `GEMINI_API_KEY`                | Strongly recommended | Without it, home still ranks but narratives use fallback |
| `GEMINI_MODEL`                  | Optional             | Default `gemini-3.5-flash`                               |
| `MCP_GATEWAY_URL`               | Optional             | Only if proxying to a remote Python MCP gateway          |

Redeploy after changing env vars.

## 2. Supabase SQL migrations

In **Supabase → SQL → New query**, run in order if not already applied:

1. `supabase/migrations/001_init.sql` (base schema + pgvector)
2. `supabase/migrations/002_auth_and_ranker_weights.sql` (Google auth link + ranker sync)
3. `supabase/migrations/003_collection_affinity.sql` (collection liking 0–100)

Affinity still works locally without `003`; server persistence needs the column.

## 3. Auth redirect URLs

**Supabase → Authentication → URL Configuration**

- **Site URL:** `https://YOUR_DOMAIN`
- **Redirect URLs:**
  - `https://YOUR_DOMAIN/auth/callback`
  - `http://localhost:3000/auth/callback` (dev)

Enable **Google** under Authentication → Providers.

## 4. Smoke test

1. `GET https://YOUR_DOMAIN/api/health` → `{ "ok": true, ... }`
2. Open `/` — recommendation or onboarding loads
3. Search catalog → add fragrance → affinity modal → collection
4. `/profile` → Continue with Google (optional)
5. Change activity on home → options refresh without a full black screen

## 5. Ops notes

- `/api/mcp` is rate-limited to **10 requests / minute / IP**
- Ranker weights sync in the background after login (hybrid local + Supabase)
- Arc browser: if the window goes black on maximize, turn off hardware acceleration in `arc://settings/system` (known Arc GPU issue)
