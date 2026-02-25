# Verity Pilot Activation — Quick Start Guide

**Status:** Day 2 of 14 pilot window. Zero real activations. **Time-sensitive.**

---

## 🚀 Quick Start (30 minutes to first real invites)

### 1. Recruit 10–20 Participants (Choose One)

**Fastest (Personal Network):** ⭐ Recommended

- Call/text 10 friends in Canberra + Sydney
- Share the concept: "45-second blind video dating, no swiping"
- Get 5 emails per city
- Done in 2 hours

**Alternative Sources:**

- Reddit: r/Canberra, r/Sydney, r/dating communities
- Facebook: local dating / singles groups
- Meetup.com: singles events

### 2. Create Participants CSV

```bash
# Copy the example and fill in your real participants
cp participants-EXAMPLE.csv participants.csv

# Edit participants.csv with your real emails, names, and notes
```

**Format (4 columns):**

```csv
email,city,name,notes
alice@gmail.com,Canberra,Alice,Friend from university
bob@outlook.com,Sydney,Bob,Tech community referral
```

### 3. Run the Onboarding Workflow (Dry-Run First)

```bash
# Test the workflow without making changes
npm run pilot:onboard -- --participants participants.csv --dry-run

# Review the output, then run for real:
npm run pilot:onboard -- --participants participants.csv --confirm
```

This script will:

- ✓ Update `docs/pilot/wave1-invites.csv` with real emails
- ✓ Re-seed Supabase auth accounts
- ✓ Generate shareable credentials (no passwords)

### 4. Share Invite Links with Participants

```bash
# Credentials are in:
cat reports/pilot/invite-credentials-SHAREABLE.csv
```

Send each participant:

- **Email:** Their login email
- **URL:** <https://verity-spark-moment-main.vercel.app/auth>
- **Password:** VerityPilot!2026
- **Instructions:** Sign in → complete 7-step onboarding → enter lobby

### 5. Monitor First Activations

```bash
# Check new profile count (should > 0 within 2 hours)
npm run pilot:ops:daily

# Update tracker
npm run pilot:tracker:update
```

---

## 🔧 Pre-Deployment Configuration

Before real users can make purchases or report analytics:

### Mixpanel Setup (30 seconds)

1. Go to <https://mixpanel.com> → Create Project
2. Copy the **Project Token**
3. In Vercel Dashboard → Environments → `VITE_MIXPANEL_TOKEN` → paste token
4. Redeploy

```bash
# Vercel redeployment
vercel --prod
```

### Stripe Live-Mode (2 minutes)

**Step 1:** Verify keys are `sk_live_*` (not `sk_test_*`):

```bash
npm run supabase:secrets:check -- --project-ref nhpbxlvogqnqutmflwlk --mode full
```

**Step 2:** If still test mode, get live keys from [Stripe Dashboard](https://dashboard.stripe.com/keys):

- Copy **Live Secret Key** (starts with `sk_live_`)
- Update in [Supabase Dashboard](https://supabase.com/dashboard/project/nhpbxlvogqnqutmflwlk/functions) → Secrets

**Step 3:** Create live webhook endpoint at Stripe Dashboard:

- Endpoint: `https://nhpbxlvogqnqutmflwlk.supabase.co/functions/v1/stripe-webhook`
- Events: `checkout.session.completed`, `invoice.paid`, `customer.subscription.deleted`
- Copy **Signing Secret** → Supabase Secret `STRIPE_WEBHOOK_SECRET`

---

## 📊 Monitoring & Gates

### Daily Operations (Run Every Morning)

```bash
npm run pilot:run:daily
```

This produces:

- Daily ops report → `reports/pilot/daily-ops-{date}.json`
- Updated tracker → `docs/pilot/tracker.md`

### Gate A (2026-02-27) — Pre-Check

```bash
npm run pilot:run:gate -- --gate A
```

Expected result at Gate A: **HOLD_COLLECT_EVIDENCE** (now that we have real users)

---

## 📋 Onboarding Workflow Details

### What Happens Automatically

When you run `npm run pilot:onboard`:

1. **Email Bulk Update**
   - Reads `participants.csv` (your real emails)
   - Matches by city (Canberra ↔ Canberra, Sydney ↔ Sydney)
   - Updates `wave1-invites.csv` with real addresses
   - Scheduling preserved (daily intake caps respected)

2. **Supabase Re-seed**
   - Creates auth accounts for each real email
   - Sets metadata (city, cohort, wave)
   - Initializes profile + tokens (20 tokens, 5 free entries)
   - Phone verification status = verified (for testing)

3. **Credentials Generation**
   - Creates login credentials CSV
   - Generates credential IDs for tracking
   - Separates shareable version (passwords removed)

### Manual Fallback (If Automation Fails)

```bash
# Step-by-step manual invocation:

# 1. Update CSV
npm run pilot:bulk:email -- --input participants.csv --output docs/pilot/wave1-invites.csv --confirm

# 2. Re-seed accounts
npm run seed:pilot:users -- --wave1 --invites-csv docs/pilot/wave1-invites.csv

# 3. Generate credentials
npm run pilot:invite:creds -- --invites docs/pilot/wave1-invites.csv --out reports/pilot/invite-credentials.csv --confirm
```

---

## 🎯 Success Criteria (Next 48 Hours)

| Metric | Target | Today (2026-02-25) | By 2026-02-27 |
| ------ | ------ | ------------------ | -------------- |
| Real participants recruited | 20 (5 per city) | 0 → 10 | 10 → 20 |
| Invites sent | 20 | 0 | 20 |
| Profiles completed (onboarded) | ≥10 | 0 | ≥10 |
| Calls initiated | ≥5 | 0 | ≥5 |
| Decisions submitted | ≥5 | 0 | ≥5 |
| Mutual sparks | ≥2 | 0 | ≥2 |

If we hit **≥10 profiles + ≥5 decisions by 2026-02-27**, Gate A will return **data-driven insight** instead of auto-fail.

---

## ⚠️ Troubleshooting

### "No valid real emails found in invites CSV"

- Check `participants.csv` has real emails (not `REPLACE_WITH_REAL_EMAIL`)
- Run `npm run pilot:bulk:email -- --input participants.csv --dry-run` to verify

### "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"

- Set env vars:

```bash
export SUPABASE_URL="https://nhpbxlvogqnqutmflwlk.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="<your-key>"
npm run pilot:onboard -- --participants participants.csv --confirm
```

### "Error: User already exists"

- Users from synthetic invites may conflict. Delete them first:

```sql
-- In Supabase SQL Editor
DELETE FROM auth.users 
WHERE email LIKE 'pilot.%@verity.date'
```

### "Participants didn't receive signup emails"

- Supabase Auth may not have email delivery configured
- Fallback: Share login link + password directly
- Or use magic links: `SELECT auth.send_magic_link('email@example.com')`
