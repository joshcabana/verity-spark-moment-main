# Runtime Monitoring Setup

This repository includes a scheduled workflow (`.github/workflows/runtime-alerts.yml`) that runs `scripts/check-runtime-alerts.mjs`.
For pilot operations, use `scripts/pilot-daily-ops-check.mjs` for a broader readiness report (queue health, completion/conversion, moderation backlog, Stripe failures, intake cap).

## Required GitHub Secrets

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Alert Signals

The script checks a rolling window (`ALERT_LOOKBACK_MINUTES`, default `60`) for:

1. `stripe_events.status = 'failed'`  
   Threshold env: `STRIPE_WEBHOOK_FAILURE_THRESHOLD` (default `1`)
2. `runtime_alert_events.event_type = 'rpc_exception'`  
   Threshold env: `RPC_EXCEPTION_THRESHOLD` (default `3`)
3. `runtime_alert_events` where `event_source IN ('ai-moderate','verify-selfie')` and `status_code IN (401,403,429)`  
   Threshold env: `MODERATION_STATUS_SPIKE_THRESHOLD` (default `20`)

If any threshold is met/exceeded, the workflow exits non-zero.

## Pilot Daily Ops Command

Run this once per day during gated rollout:

```bash
SUPABASE_URL="https://<project-ref>.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="<service_role_key>" \
npm run pilot:ops:daily
```

The command writes a JSON report to `reports/pilot/daily-ops-YYYY-MM-DD.json` and exits non-zero when reliability/safety/intake thresholds are breached.

## Runtime Event Logging

Runtime events are written by `public.log_runtime_alert_event(...)` and stored in:

- `public.runtime_alert_events`

Current producers:

- `ai-moderate`
- `verify-selfie`
- `stripe-webhook`
- `find-match`
- `spark-extend`
- `submit-appeal`
- `admin-moderation`

## Deployment Secret Preflight

Before any production rollout, run:

```bash
node scripts/check-supabase-target.mjs --project-ref <project_ref>
node scripts/check-supabase-secrets.mjs --project-ref <project_ref> --mode full
```

Required in `full` mode:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `AI_API_KEY` (preferred) or `LOVABLE_API_KEY` (legacy alias)
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

`scripts/deploy-supabase.sh` now runs both target-alignment + secrets preflight checks automatically (`full` mode by default).
Set `SUPABASE_SECRET_CHECK_MODE=core` only if you intentionally need a limited rollout.
