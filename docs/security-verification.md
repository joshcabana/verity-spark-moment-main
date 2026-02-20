# Security Verification Runbook

Use these commands to verify live security posture against a deployed Supabase project.

## 0) Deployment Target Preflight

Run this before deploy/verification to avoid cross-project mistakes:

```bash
npm run supabase:target:check -- --project-ref <project-ref>
```

If this fails, your local `.env`/`supabase/config.toml` points to a different project than your deployment target.

## 1) Unauthenticated / Invalid JWT Smoke Tests

This checks all protected edge functions reject unauthenticated callers with `401`, and checks that unsigned Stripe webhooks are rejected.

```bash
npm run security:live:smoke -- \
  --project-url https://<project-ref>.supabase.co \
  --anon-key <anon_or_publishable_key>
```

By default, this runs both:

- no-auth checks
- invalid JWT checks

Disable invalid-JWT checks (rarely needed):

```bash
npm run security:live:smoke -- --project-url https://<project-ref>.supabase.co --anon-key <key> --include-bad-jwt false
```

## 2) Authenticated End-to-End Flow

This validates a full user flow:

1. user A enters queue
2. user B enters queue
3. match is created with `matchId`
4. both users submit mutual spark decisions
5. chat room exists
6. message send/read succeeds

```bash
npm run security:live:e2e -- \
  --project-url https://<project-ref>.supabase.co \
  --anon-key <anon_or_publishable_key> \
  --user-a-email <confirmed_user_a_email> \
  --user-a-password <user_a_password> \
  --user-b-email <confirmed_user_b_email> \
  --user-b-password <user_b_password>
```

Notes:

- Users must be confirmed accounts.
- If email confirmation is enabled, create/confirm these users via dashboard first.
- On legacy projects, users may also require seeded `profiles` rows before matchmaking RPCs succeed.

## Troubleshooting

- `find-match` returns `500` with `matches_check`:
  run `npm run supabase:cli -- db push --linked` to apply legacy constraint normalization migrations.
- Message insert fails on `match_id` or `from_user` NOT NULL:
  run `npm run supabase:cli -- db push --linked` to apply message compatibility trigger/constraint updates.
- `supabase:secrets:check` returns `403`:
  your CLI account lacks access to the target project, or the target project ref is incorrect.
- `supabase:secrets:check --mode full` fails on AI secret:
  set `AI_API_KEY` (preferred) or legacy `LOVABLE_API_KEY`.
