# Pilot Tracker (Canberra + Sydney)

Pilot dates: 2026-02-24 to 2026-03-07  
Cohort: `pilot-2026q1`  
Wave: `wave-1`  
Daily intake cap: 10

## Invites

| Date | City | Invites Sent | Cumulative Invites | Notes |
| --- | --- | ---: | ---: | --- |
| 2026-02-24 | Canberra | 0 | 0 | |
| 2026-02-24 | Sydney | 0 | 0 | |
| 2026-02-25 | Canberra | 0 | 0 | |
| 2026-02-25 | Sydney | 0 | 0 | |
| 2026-02-26 | Canberra | 0 | 0 | |
| 2026-02-26 | Sydney | 0 | 0 | |
| 2026-02-27 | Canberra | 0 | 0 | |
| 2026-02-27 | Sydney | 0 | 0 | |

## Activations

| Date | New Profiles | Intake Cap | Cap Status | Onboarding Start Rate | Notes |
| --- | ---: | ---: | --- | ---: | --- |
<!-- pilot:auto:activations:start -->
| 2026-02-24 | 0 | 10 | ok | 0.0% | status=PASS; stripe=0; rpc=0; critical=0 |
| 2026-02-25 | 0 | 10 | ok | 0.0% | status=PASS; stripe=0; rpc=0; critical=0 |
<!-- pilot:auto:activations:end -->

## Incidents

SLA: triage in 30 minutes.

| Timestamp (AEST) | Severity | Category | Status | Owner | Triage Time (min) | Action |
| --- | --- | --- | --- | --- | ---: | --- |
| - | - | - | - | - | - | - |

## Retention + Funnel

| Date | Matches Created | Call Completion % | Spark Conversion % | Chat Activation % | Purchases | Notes |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
<!-- pilot:auto:funnel:start -->
| 2026-02-24 | 0 | 100.0% | 0.0% | 0.0% | 0 | status=PASS; chats=0; messages=0 |
| 2026-02-25 | 0 | 100.0% | 0.0% | 0.0% | 0 | status=PASS; chats=0; messages=0 |
<!-- pilot:auto:funnel:end -->

## Learnings

| Date | Observation | Decision | Owner | Follow-up Date |
| --- | --- | --- | --- | --- |
| 2026-02-25 | All 40 invite addresses are synthetic placeholders (`pilot.canberraXX@verity.date`) — no real users received invites | Replace with real email addresses immediately; re-seed auth accounts | Product / Growth | 2026-02-26 |
| 2026-02-25 | Analytics pipeline is console-only; Mixpanel integration was stubbed but not connected | Implemented SDK-free Mixpanel HTTP integration; needs `VITE_MIXPANEL_TOKEN` env var on Vercel | Engineering | 2026-02-26 |
| 2026-02-25 | Anti-gravity output (risk register, metric targets, GTM hypotheses) was empty template | Completed full risk register (10 risks), metric targets (9 metrics), and 5 GTM hypotheses | Product | 2026-02-27 |
| 2026-02-25 | Stripe live-mode keys unconfirmed — `STRIPE_SECRET_KEY` may still be `sk_test_` prefix | Verify key prefix in Supabase secrets before real user purchases | Engineering | 2026-02-26 |
| 2026-02-25 | Gate A will almost certainly return `HOLD_COLLECT_EVIDENCE` due to 0 matches and 0 decisions | Recommend extending Gate A deadline to 2026-03-01 if real users onboarded by 2026-02-27 | Product | 2026-02-27 |

## Gate Decisions

| Gate | Date | Required Condition | Result | Decision |
| --- | --- | --- | --- | --- |
<!-- pilot:auto:gates:start -->
| Gate A | 2026-02-27 | Reliability stable + zero unresolved critical incidents + minimum evidence sample (>=10 matches and >=10 completed decisions) | FAIL | HOLD_COLLECT_EVIDENCE |
| Gate B | 2026-03-03 | Spark/chat conversion directionally healthy with minimum spark sample (>=5 mutual sparks) | pending | pending |
| Final | 2026-03-07 | Expand or harden or pause | pending | pending |
<!-- pilot:auto:gates:end -->
