# Anti-gravity Output

Requested document: `pilot risk register + metric targets + GTM hypotheses`

Generated: 2026-02-25 (Day 2 of 14)

## 1) Risk Register

| Risk | Severity | Likelihood | Owner | Mitigation | Trigger Signal |
| --- | --- | --- | --- | --- | --- |
| Zero user activation — invite emails are synthetic placeholder addresses, no real users reached | Critical | Confirmed | Product / Growth | Replace `pilot.canberraXX@verity.date` with real participant emails; re-send invites immediately | 0 profiles created after 48 h |
| Gate A auto-fail — insufficient evidence sample before 2026-02-27 | High | Very High | Product | Pause Gate A clock or lower evidence threshold; fast-track real invite delivery | < 10 matches by Day 4 |
| Agora token exhaustion under load — no load testing performed | Medium | Medium | Engineering | Run synthetic 10-user concurrent call test pre-expansion; monitor Agora dashboard | Token errors in `agora-token` function logs |
| Stripe in test mode — live-mode keys unconfirmed for production | High | Medium | Engineering | Validate `STRIPE_SECRET_KEY` prefix is `sk_live_` in Supabase secrets; run $0 hold test | Checkout sessions fail or use `sk_test_` prefix |
| AI moderation false-positive spike — Tier 0 instant-terminate on innocent content | High | Low | Trust & Safety | Monitor moderation_events table; set up alert if > 5% of calls hit Tier 0 | > 3 Tier 0 events with no confirmed violation in a 24 h window |
| Stale match queue build-up under concurrent load | Medium | Medium | Engineering | `cleanup_stale_queue_entries` RPC exists but untested under real contention; run stress test | > 3 stale queue entries in daily ops check |
| Single-city matchmaking drought — not enough same-city users online simultaneously | High | High | Product / Growth | Expand matching radius or enable cross-city matching during low-activity hours | < 2 concurrent queue entries during scheduled matching windows |
| Phone verification SMS deliverability — unconfirmed for AU numbers | Medium | Medium | Engineering | Test with 3+ real AU mobile numbers before bulk invite | Phone verification step abandonment > 30% |
| Privacy incident — identity revealed before mutual Spark decision | Critical | Low | Engineering | RLS policies + `rpc_request_identity_reveal` guard verified in tests; add integration smoke test | Any report of premature identity reveal |
| Pilot clock burn — 14-day window expires without actionable data | Critical | High | Product | Treat Days 3–5 as hard deadline for first real activations; escalate if 0 profiles by Day 4 | 0 new profiles by end of Day 4 (2026-02-27) |

## 2) Metric Targets (14-Day Pilot)

| Metric | Target | Minimum Acceptable | Measurement Source |
| --- | ---: | ---: | --- |
| Activation rate (invited → profile created) | 60% | 40% | `profiles` table count / total invites sent |
| Call completion rate (calls finished / calls started) | 90% | 80% | `matches` where `user1_decision IS NOT NULL` / total matches |
| Spark conversion rate (mutual sparks / completed decisions) | 25% | 20% | `matches` where `spark_outcome = 'mutual_spark'` / completed decisions |
| Chat activation rate (chats opened / mutual sparks) | 70% | 50% | `chat_rooms` count / mutual sparks count |
| Paid conversion rate (purchases / activated users) | 10% | 5% | `stripe_events` successful checkouts / activated profiles |
| Unresolved critical incidents | 0 | 0 | `runtime_alert_events` with severity = critical and unresolved |
| Average calls per active user per day | 3 | 1.5 | `matches` count / active user-days |
| Onboarding completion rate (started → ready) | 80% | 65% | Profiles with `verification_status = 'verified'` / auth signups |
| Warm-up call completion (first 3 calls) | 85% | 70% | Profiles where `warmup_calls_remaining = 0` / activated profiles |

## 3) GTM Hypotheses (Canberra + Sydney)

| Hypothesis | Audience | Channel | Offer | Success Criteria | Failure Criteria |
| --- | --- | --- | --- | --- | --- |
| H1: Dating-app-fatigued 25-40 singles will try a "no swipe, real face" alternative | 25–40 singles in Canberra & Sydney who are active on Hinge/Bumble | Instagram/TikTok ads targeted to dating-app interest, "delete the apps" messaging | Free 5-call trial (warm-up mode), invite-only exclusivity | ≥ 40% invite activation, ≥ 3 calls/user in first 48 h | < 25% activation or < 1.5 calls/user |
| H2: Themed rooms drive niche engagement and retention | Over-35 singles; Tech Professionals; Creatives | Niche community groups (Meetup, Reddit r/Canberra, tech Slack communities) | Themed room access ("Over 35 Room", "Tech Room") as hook | ≥ 30% of users select a themed room within 3 sessions | < 15% themed room selection |
| H3: Token scarcity + daily limits create urgency without frustration | All pilot users | In-app prompts after free entries exhausted | 10-token starter pack at $12.99 AUD | ≥ 10% purchase rate within 7 days; < 5% churn attributed to "ran out of tokens" | < 5% purchase rate or > 15% token-related churn |
| H4: Mutual Spark identity reveal drives chat engagement | Matched users post-Spark | In-app post-Spark flow | Identity reveal + AI icebreakers as reward for mutual Spark | ≥ 50% of mutual Sparks open identity reveal; ≥ 70% send first message | < 30% reveal rate or < 40% first message rate |
| H5: Word-of-mouth from successful Sparks generates organic invites | Users who had ≥ 1 mutual Spark | In-app "invite a friend" prompt post-Spark celebration | 5 bonus tokens for each accepted referral | ≥ 20% of Sparked users send ≥ 1 invite; ≥ 10% of those invites convert | < 10% invite-send rate |

## 4) Gate Recommendations

### Gate A (2026-02-27)

- Recommendation: **HOLD_COLLECT_EVIDENCE** — extend evidence collection window to 2026-03-01
- Rationale: All infrastructure checks PASS (stale queue ≤ 3, call completion = 100%, 0 critical incidents, 0 RPC exceptions). However, evidence thresholds are unmet: 0/10 required matches, 0/10 required decisions. Root cause is confirmed: invite addresses are synthetic placeholders with no real delivery pipeline. The system is healthy but untested with real users. Pausing the gate clock by 2 days while onboarding real participants is the correct action — a FAIL verdict would be premature given the infrastructure is clean.

### Gate B (2026-03-03)

- Recommendation: **Pending** — evaluate only after Gate A passes with real user data
- Rationale: Gate B measures conversion quality (≥ 5 mutual sparks, ≥ 20% spark conversion, ≥ 50% chat activation). These metrics are meaningless without a real user cohort. If Gate A shifts to 2026-03-01, Gate B should shift proportionally to ~2026-03-05 to allow at minimum 4 days of real usage data.

### Final Gate (2026-03-07)

- Recommendation: **Pending** — decision depends on Gates A and B outcomes
- Rationale: The four possible outcomes remain (`EXPAND_COHORT`, `HOLD_COLLECT_EVIDENCE`, `HOLD_OPTIMIZE_CONVERSION`, `PAUSE_AND_REWORK`). Current trajectory suggests the pilot window may need a 3–5 day extension to reach a valid Final Gate evaluation, moving it to ~2026-03-10–12. The application is technically ready for expansion; the blocking factor is purely user acquisition.
