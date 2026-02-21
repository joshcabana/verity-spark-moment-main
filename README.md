# Verity

Verity is an anti-swipe dating app built around short, anonymous live video calls.

- Production app: <https://verity-spark-moment.lovable.app/>
- Supabase project ref: `nhpbxlvogqnqutmflwlk`

## Stack

- Vite + React + TypeScript
- Tailwind + shadcn/ui
- Supabase (Auth, Postgres, Realtime, Edge Functions, Storage)
- Agora RTC
- Stripe Checkout + Billing Portal

## Local Development

```bash
cd /Users/joshcabana/Downloads/verity-spark-moment-main
npm install
npm run dev
```

## CI Package Manager Contract

GitHub Actions in this repository are standardized on npm (`npm ci`) and require a root `package-lock.json`.
If dependencies change, update and commit `package-lock.json` with your PR.

## Quality Checks

```bash
npm run lint
npm run test
npm run build
npm run audit:prod:check
```

## Supabase Rollout Flow

### 1) Preflight

```bash
npm run supabase:target:check -- --project-ref nhpbxlvogqnqutmflwlk
npm run supabase:secrets:check -- --project-ref nhpbxlvogqnqutmflwlk --mode full
```

### 2) Deploy DB + Edge Functions

```bash
bash scripts/deploy-supabase.sh nhpbxlvogqnqutmflwlk
```

### 3) Security Verification

```bash
npm run security:live:smoke -- \
  --project-url https://nhpbxlvogqnqutmflwlk.supabase.co \
  --anon-key "$VITE_SUPABASE_PUBLISHABLE_KEY"

npm run security:live:e2e -- \
  --project-url https://nhpbxlvogqnqutmflwlk.supabase.co \
  --anon-key "$VITE_SUPABASE_PUBLISHABLE_KEY" \
  --user-a-email "$LIVE_USER_A_EMAIL" \
  --user-a-password "$LIVE_USER_A_PASSWORD" \
  --user-b-email "$LIVE_USER_B_EMAIL" \
  --user-b-password "$LIVE_USER_B_PASSWORD"
```

See `/Users/joshcabana/Downloads/verity-spark-moment-main/docs/security-verification.md` and `/Users/joshcabana/Downloads/verity-spark-moment-main/docs/runtime-monitoring.md` for full runbooks.

## Required Supabase Edge Function Secrets

### Core

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### AI moderation

- `AI_API_KEY` (preferred)
- `LOVABLE_API_KEY` (legacy alias accepted)
- Optional:
  - `AI_API_BASE_URL`
  - `AI_API_MODEL`

### Stripe

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- Optional for price/config cutover:
  - `STRIPE_PRICE_TOKENS_10`
  - `STRIPE_PRICE_TOKENS_15`
  - `STRIPE_PRICE_TOKENS_30`
  - `STRIPE_PRICE_VERITY_PASS`
  - `STRIPE_SUBSCRIPTION_PRICE_IDS` (comma-separated)
  - `STRIPE_TOKENS_10_AMOUNT`
  - `STRIPE_TOKENS_15_AMOUNT`
  - `STRIPE_TOKENS_30_AMOUNT`
  - `STRIPE_TOKEN_PACK_MAP_JSON` (JSON map override)
  - `APP_BASE_URL` (domain fallback for checkout/portal redirects)

## Frontend Environment Variables

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`
- Optional Stripe UI configuration:
  - `VITE_DISPLAY_CURRENCY` (default `AUD`)
  - `VITE_STRIPE_PRICE_TOKENS_10`
  - `VITE_STRIPE_PRICE_TOKENS_15`
  - `VITE_STRIPE_PRICE_TOKENS_30`
  - `VITE_STRIPE_PRICE_VERITY_PASS`
  - `VITE_PRICE_PACK_10_AMOUNT`
  - `VITE_PRICE_PACK_15_AMOUNT`
  - `VITE_PRICE_PACK_30_AMOUNT`
  - `VITE_PRICE_VERITY_PASS_AMOUNT`

## Pilot Operations (Canberra + Sydney)

### Launch packet + tracker

- Launch packet: `/Users/joshcabana/Downloads/verity-spark-moment-main/docs/pilot/launch-packet.md`
- Shared tracker: `/Users/joshcabana/Downloads/verity-spark-moment-main/docs/pilot/tracker.md`
- Anti-gravity output template: `/Users/joshcabana/Downloads/verity-spark-moment-main/docs/pilot/anti-gravity-output.md`

### Build Wave 1 invite plan (20 users/city, 10/day cap)

```bash
npm run pilot:invites:wave1
```

### Seed Wave 1 pilot users

```bash
SUPABASE_URL="https://nhpbxlvogqnqutmflwlk.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="<service_role_key>" \
npm run seed:pilot:wave1
```

Dry-run preview without writing to Supabase:

```bash
node scripts/seed-pilot-users.mjs --wave1 --count-per-city 20 --dry-run
```

### Daily pilot ops checks

```bash
SUPABASE_URL="https://nhpbxlvogqnqutmflwlk.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="<service_role_key>" \
npm run pilot:ops:daily
```

### Decision gates

```bash
SUPABASE_URL="https://nhpbxlvogqnqutmflwlk.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="<service_role_key>" \
npm run pilot:gate -- --gate A

SUPABASE_URL="https://nhpbxlvogqnqutmflwlk.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="<service_role_key>" \
npm run pilot:gate -- --gate B

SUPABASE_URL="https://nhpbxlvogqnqutmflwlk.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="<service_role_key>" \
npm run pilot:gate -- --gate FINAL
```

## Launch Checklist

1. `supabase:secrets:check --mode full` passes.
2. `scripts/deploy-supabase.sh` succeeds.
3. Live smoke + live auth E2E pass.
4. Manual two-device call flow passes (`onboarding -> call -> spark -> chat -> purchase`).
5. Stripe live-mode keys/webhook configured and validated.
6. Custom domain connected and verified.
7. Pilot daily ops report saved under `reports/pilot/`.
8. Gate A/B/Final decision reports generated and reviewed.

## Rollback Defaults

1. Re-deploy last known-good function bundle.
2. Restore prior Stripe key/webhook secrets.
3. Disable promotional traffic and keep pilot-only access.
4. Review `runtime_alert_events` and `stripe_events` before re-attempting rollout.
