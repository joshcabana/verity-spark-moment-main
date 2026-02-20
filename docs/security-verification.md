# Security Verification Runbook

Use these commands to verify live security posture against a deployed Supabase project.

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
