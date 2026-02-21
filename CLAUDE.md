# Verity — The Anti-Dating-App Dating App

## Project Overview

Verity replaces traditional swiping with 45-second anonymous live video calls (Agora WebRTC), followed by mutual spark/pass decisions. Built as a mobile-first React SPA with a Supabase backend.

## Architecture

```
src/
  pages/          → 14 route-level pages (lazy-loaded)
  components/     → App components + ui/ (50+ shadcn components)
  hooks/          → useAuth, useModeration, use-toast, use-mobile
  integrations/   → supabase/client.ts, supabase/types.ts
  lib/            → match-session.ts (SessionStorage), utils.ts
  types/          → Global type declarations
  test/           → Vitest setup + test files

supabase/
  functions/      → 12 Deno edge functions
  migrations/     → Postgres migrations (timestamped SQL)
  config.toml     → Local Supabase config
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite 7, Tailwind CSS 3 |
| UI | shadcn/ui (Radix), Framer Motion, Lucide icons |
| State | TanStack React Query, React Context (auth) |
| Video | Agora RTC SDK (`agora-rtc-sdk-ng`) |
| Backend | Supabase (Postgres, Auth, Realtime, Storage, Edge Functions) |
| Payments | Stripe (checkout, webhooks, customer portal) |
| AI Moderation | Gemini Flash 3 via edge functions |
| Testing | Vitest, @testing-library/react, jsdom |
| Validation | Zod, react-hook-form |

## Common Commands

```bash
npm run dev          # Vite dev server (port 8080)
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Vitest (single run)
npm run test:watch   # Vitest (watch mode)
npx tsc --noEmit     # Type-check without emitting
```

## Key Conventions

- **Path alias**: `@/` maps to `./src/` (configured in tsconfig + vite)
- **Page pattern**: Each page is a default export in `src/pages/`, lazy-loaded in `App.tsx`
- **Styling**: Tailwind utility classes + custom `glass-card`, `glow-gold`, `text-gradient-gold` utilities
- **Color tokens**: `verity-gold`, `verity-success`, `verity-danger`, `verity-surface` (HSL CSS vars)
- **Fonts**: DM Sans (body), Playfair Display (headings via `font-display`)
- **Animation**: Framer Motion for page transitions (`PageWrapper`) and element entry
- **Forms**: React Hook Form + Zod for validation where used
- **Auth guard**: `ProtectedRoute` / `PublicRoute` wrappers in `App.tsx`
- **Supabase client**: Single instance from `@/integrations/supabase/client`
- **Realtime**: Postgres subscriptions on `match_queue`, `matches`, `messages` tables
- **Match session**: `writeMatchSession()` / `readMatchSession()` in SessionStorage

## Supabase Edge Functions

All in `supabase/functions/<name>/index.ts` (Deno runtime):

| Function | Purpose |
|----------|---------|
| `agora-token` | Agora RTC token generation |
| `ai-moderate` | Real-time frame + audio moderation (Gemini) |
| `verify-selfie` | AI liveness detection |
| `create-checkout` | Stripe checkout session |
| `check-subscription` | Verify Stripe subscription |
| `customer-portal` | Stripe management link |
| `spark-extend` | +90s call extension logic |
| `find-match` | Matchmaking orchestration |
| `submit-appeal` | User moderation appeal |
| `admin-moderation` | Admin review actions |
| `stripe-webhook` | Stripe event sync |

## Database RPCs

- `rpc_enter_matchmaking(p_room_id, p_is_warmup)` — enqueue + attempt match
- `rpc_cancel_matchmaking(p_queue_id)` — remove from queue
- `rpc_submit_match_decision(p_match_id, p_decision, p_note)` — spark/pass
- `increment_user_tokens(p_user_id, p_delta, p_type, p_description)` — token ledger
- `get_public_transparency_stats()` — public safety metrics

## Testing Conventions

- Test files: `src/**/__tests__/*.test.{ts,tsx}` or `src/test/*.test.ts`
- Setup file: `src/test/setup.ts` (globally mocks Supabase client, IntersectionObserver, matchMedia)
- Component tests use `@testing-library/react` + `@testing-library/user-event`
- Supabase is globally mocked — override with `vi.mocked()` in individual tests
- Environment: jsdom (configured in `vitest.config.ts`)

## Security Notes

- Never edit `.env` files — they contain Supabase and Stripe secrets
- Don't modify `package-lock.json` directly
- RLS is enforced on all tables — test with service role only in edge functions
- Phone verification is mandatory before matchmaking
- AI moderation runs on every video frame (8s intervals) + audio clip (2s)
- Moderation tiers: 0 = instant termination, 1 = warning, 2 = log only

## Environment Variables

Frontend (VITE_ prefix, public):
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` — Supabase anon key

Backend (edge function secrets):
- `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `AI_API_KEY`
- `AI_API_BASE_URL`, `AI_API_MODEL`, `AGORA_APP_ID`
