# Runtime Monitoring Setup

This repository includes a scheduled workflow (`.github/workflows/runtime-alerts.yml`) that runs `scripts/check-runtime-alerts.mjs`.

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
node scripts/check-supabase-secrets.mjs --project-ref <project_ref> --mode full
```

Required in `full` mode:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `LOVABLE_API_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

`scripts/deploy-supabase.sh` now runs this check automatically (`full` mode by default).
Set `SUPABASE_SECRET_CHECK_MODE=core` only if you intentionally need a limited rollout.
