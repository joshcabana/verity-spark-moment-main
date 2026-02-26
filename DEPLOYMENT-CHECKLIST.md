# Deployment Checklist — Pilot Activation

**Status:** Day 2 of 14. Infrastructure ready, zero real users. **URGENT: Get real participants today.**

**Timeline:** 48 hours to Gate A (2026-02-27). Actions must complete by EOB 2026-02-26.

---

## Phase 1: Participant Recruitment (TODAY — 2026-02-25)

- [ ] **Identify 10–20 real participants** — 5 per city (Canberra + Sydney)
  - Friends/family in target cities (fastest)
  - Or dating app communities, tech groups, coworking spaces
  - Must have valid personal email addresses

- [ ] **Create private/pilot/participants.csv** with columns: `email`, `city`, `name`, `notes`
  - Example template: `docs/pilot/templates/participants.template.csv`
  - Invite message templates: [docs/pilot/invite-message-templates.md](docs/pilot/invite-message-templates.md)

- [ ] **Validate private/pilot/participants.csv** before seeding:

```bash
npm run pilot:participants:validate -- --participants private/pilot/participants.csv
```

- [ ] **Test participants list** with dry-run:

```bash
npm run pilot:onboard -- --participants private/pilot/participants.csv --dry-run
```

---

## Phase 2: Supabase Activation (2026-02-25 Evening)

- [ ] **Set env variables** (required before seed):

```bash
export SUPABASE_URL="https://nhpbxlvogqnqutmflwlk.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="<get from Supabase Dashboard → Settings → API>"
```

- [ ] **Verify Supabase connection**:

```bash
npm run supabase:secrets:check -- --project-ref nhpbxlvogqnqutmflwlk --mode core
```

- [ ] **Run full onboarding workflow** (creates auth accounts + seeds profiles):

```bash
npm run pilot:onboard -- --participants private/pilot/participants.csv --confirm
```

- [ ] **Verify profile creation** in Supabase Dashboard:
  - Auth → Users: should show new accounts (not `pilot.X` placeholders)
  - Database → `profiles` table: should show new profiles with correct city metadata

---

## Phase 3: Credential Distribution (2026-02-25–26)

- [ ] **Retrieve shareable credentials** (no passwords):

```bash
cat private/pilot/invite-credentials-SHAREABLE.csv
```

- [ ] **Send invites to participants** with:
  - Their email address (username)
  - Login URL: <https://verity-spark-moment-main.vercel.app/auth>
  - Default password: `VerityPilot!2026`
  - 7-step onboarding instructions
  - Encourage testing 2026-02-25–26, live pilot starts 2026-02-27

- [ ] **Set up support channel** for participant questions
  - Email: <pilot-support@verity.date> (or your mailbox)
  - Response SLA: 2 hours during pilot hours

---

## Phase 4: Stripe Live-Mode (2026-02-26 Morning)

- [ ] **Verify live-mode keys are deployed**:

```bash
npm run supabase:secrets:check -- --project-ref nhpbxlvogqnqutmflwlk --mode full
```

- `STRIPE_SECRET_KEY`: must start with `sk_live_` (not `sk_test_`)
- `STRIPE_WEBHOOK_SECRET`: must be set to live webhook signing secret

- [ ] **If still test mode**, update Supabase secrets:
  1. Go to [Stripe Dashboard](https://dashboard.stripe.com/keys) → Copy **Live Secret Key**
  2. Supabase Dashboard → Functions → Secrets → Update `STRIPE_SECRET_KEY`
  3. Create webhook endpoint at Stripe Dashboard:
     - URL: `https://nhpbxlvogqnqutmflwlk.supabase.co/functions/v1/stripe-webhook`
     - Select events: `checkout.session.completed`, `invoice.paid`, `customer.subscription.deleted`
  4. Copy webhook signing secret → Supabase secret `STRIPE_WEBHOOK_SECRET`

- [ ] **Test $0 hold** with Stripe test card (optional):
  - Once live mode confirmed, all transactions are real $$

---

## Phase 5: Mixpanel Analytics (2026-02-26 Morning)

- [ ] **Create Mixpanel project**:
  1. Go to <https://mixpanel.com> → Create new project
  2. Copy the **Project Token** (looks like: `a1b2c3d4e5f6g7h8i9j`)

- [ ] **Add to Vercel environment**:
  1. Vercel Dashboard → Settings → Environment Variables
  2. Name: `VITE_MIXPANEL_TOKEN` → Value: `<token>`
  3. Scopes: Production

- [ ] **Redeploy to Vercel**:

```bash
vercel --prod
# or git push main (auto-triggers if github/vercel linked)
```

- [ ] **Verify Mixpanel integration** (manual test):
  1. Open app in dev mode: `npm run dev`
  2. Open browser DevTools → Network tab
  3. Log in / trigger an event
  4. Look for POST to `api.mixpanel.com` with event data
  5. Should see `trackEvent` in console

---

## Phase 6: Pre-Pilot Verification (2026-02-26 Afternoon)

- [ ] **Test complete onboarding flow**:
  1. Open <https://verity-spark-moment-main.vercel.app/auth>
  2. Sign in as first real participant
  3. Complete 7-step flow → ready status
  4. Verify profile in dashboard

- [ ] **Test matchmaking** (internal):

```bash
npm run security:live:smoke
# Should show all Edge Functions returning proper auth errors
```

- [ ] **Check daily ops**:

```bash
npm run pilot:ops:daily
```

Expected output:

- `newProfiles: >0` (real users, not synthetic)
- `matchesCreated: 0` (optional, ok if no matches yet)
- All status checks: PASS

- [ ] **Review tracker**:

```bash
npm run pilot:tracker:update
cat docs/pilot/tracker.md
```

   Should show Day 2–3 activations, no more synthetic addresses

---

## Phase 7: Going Live (2026-02-27 — Gate A)

- [ ] **Run Gate A evaluation**:

```bash
npm run pilot:gate -- --gate A
```

   Expected: `HOLD_COLLECT_EVIDENCE` (if ≥5 real activations) instead of auto-fail

- [ ] **If Gate A = HOLD**:
  - Extend deadline to 2026-03-01 (per anti-gravity-output.md)
  - Onboard remaining participants through 2026-03-01
  - Re-run Gate A on 2026-03-01

- [ ] **If Gate A = FAIL**:
  - Diagnose why activations < 5
  - Common issues: email delivery, onboarding friction, promotion
  - Pivot strategy: use in-person invites, direct SMS, personal calls

- [ ] **Daily monitoring** (2026-02-27 onwards):

```bash
npm run pilot:run:daily
# Runs ops check + tracker update daily
```

---

## Rollback Plan (If Critical Issues)

If production breaks and we need to rollback:

```bash
# Revert to last stable commit
git revert <commit-hash>

# Or manually restore from backup
vercel --prod --alias main  # Deploy previous version
```

---

## Success Metrics (48 Hours)

| Metric | Target | Success |
| ------ | ------ | ------- |
| Real participants recruited | 20 | ✓ if ≥10 |
| Invites sent | 20 | ✓ if ≥10 |
| Profile completions | ≥5 | ✓ if 5+ |
| Gate A evaluation | hold_collect_evidence | ✓ if not auto-fail |
| Stripe live-mode verified | live keys deployed | ✓ if `sk_live_` confirmed |
| Mixpanel tracking active | events recorded | ✓ if POST to mixpanel.com seen |
