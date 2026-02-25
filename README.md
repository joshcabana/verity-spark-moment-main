# Verity

Verity is an anti-swipe dating app built around short, anonymous live video calls.

- Production app: <https://verity-spark-moment-main.vercel.app/>
- Supabase project ref: `nhpbxlvogqnqutmflwlk`

## Stack

- Vite + React + TypeScript
- Tailwind + shadcn/ui
- Supabase (Auth, Postgres, Realtime, Edge Functions, Storage)
- Agora RTC
- Stripe Checkout + Billing Portal

## Local Development

This repository uses npm as the canonical package manager. Keep `package-lock.json` committed and use `npm ci` in CI.

```bash
cd /Users/joshcabana/Downloads/verity-spark-moment-main
npm install
npm run dev
```

## Pilot Program (Wave 1: 2026-02-24 to 2026-03-07)

**Active:** Invite-only pilot in Canberra + Sydney. Onboarding real participants now.

**Quick Start:** See [PILOT-QUICKSTART.md](PILOT-QUICKSTART.md)

### Onboarding Real Participants

```bash
# 1. Create participants.csv with real emails
cp participants-EXAMPLE.csv participants.csv
# Edit with your 10–20 real participant emails

# 2. Run the complete onboarding workflow (dry-run first)
npm run pilot:onboard -- --participants participants.csv --dry-run
npm run pilot:onboard -- --participants participants.csv --confirm
```

### Monitoring & Operations

```bash
# Daily operations check (matches, calls, decisions)
npm run pilot:ops:daily

# Gate evaluations (A, B, or Final)
npm run pilot:gate -- --gate A

# Update tracker with latest metrics
npm run pilot:tracker:update

# Full daily workflow (ops + tracker)
npm run pilot:run:daily
```

### Documents

- [PILOT-QUICKSTART.md](PILOT-QUICKSTART.md) — 30-minute onboarding guide
- [docs/pilot/ACTIVATION-CHECKLIST.md](docs/pilot/ACTIVATION-CHECKLIST.md) — Detailed steps
- [docs/pilot/tracker.md](docs/pilot/tracker.md) — Live metrics & decisions
- [docs/pilot/anti-gravity-output.md](docs/pilot/anti-gravity-output.md) — Risk register & GTM

## CI Package Manager Contract

GitHub Actions in this repository are standardized on npm (`npm ci`) and require a root `package-lock.json`.
If dependencies change, update and commit `package-lock.json` with your PR.

## Website Deploy (Vercel Auto-Deploy)

This repo publishes the frontend automatically from `main` via `.github/workflows/deploy-vercel.yml`.
Every push to `main` builds and deploys the site to Vercel production.

One-time setup in GitHub:

1. Add repository secrets in `Settings -> Secrets and variables -> Actions -> Secrets`:
   - `VERCEL_TOKEN`
   - `VERCEL_ORG_ID`
   - `VERCEL_PROJECT_ID`
2. Add repository variables in `Settings -> Secrets and variables -> Actions -> Variables`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - Optional pricing/project vars used by the build (`VITE_*` in workflow).

Current production host:

- `https://verity-spark-moment-main.vercel.app`

Set Supabase Edge Function redirect secrets to keep Stripe return URLs on this host:

- `APP_BASE_URL=https://verity-spark-moment-main.vercel.app`
- `APP_ALLOWED_ORIGINS=https://verity-spark-moment-main.vercel.app`

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
  - `APP_ALLOWED_ORIGINS` (comma-separated redirect allowlist for checkout/portal)

Redirect origin behavior:
- If request `Origin` is in `APP_ALLOWED_ORIGINS`, Stripe return URLs use that origin.
- If request `Origin` is missing or untrusted, functions fall back to `APP_BASE_URL`.
- If `APP_BASE_URL` is unset/invalid, functions fall back to `https://verity-spark-moment-main.vercel.app`.

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

Recommended wrapper (writes report + updates tracker in one command):

```bash
SUPABASE_URL="https://nhpbxlvogqnqutmflwlk.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="<service_role_key>" \
npm run pilot:run:daily
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

Recommended wrapper (writes gate report + updates tracker):

```bash
SUPABASE_URL="https://nhpbxlvogqnqutmflwlk.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="<service_role_key>" \
npm run pilot:run:gate -- --gate A
```

Manual tracker sync:

```bash
npm run pilot:tracker:update -- --daily-report reports/pilot/daily-ops-YYYY-MM-DD.json --date YYYY-MM-DD
npm run pilot:tracker:update -- --gate-report reports/pilot/gate-a-YYYY-MM-DD.json --gate A
```

Pilot report artifact validation (manual/local):

```bash
npm run pilot:reports:validate -- --date YYYY-MM-DD
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
