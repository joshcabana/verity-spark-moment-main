# Next Priorities — UI / Structure / Media / Innovation

## Shipped in this pass
- Landing CTA clarity tightened to one dominant action: **Try a 45s Spark**
- Hero trust badges added (moderation, anonymity, safe exit, anti-swipe loop)
- Landing information architecture improved:
  - trust strip
  - clearer 3-step flow
  - FAQ section for objections
- Public/app architecture split retained from prior pass for performance isolation

## Next implementation sprint (recommended order)

### 1) Product-demo hero video (highest conversion impact)
- Add muted 5–8s loop of real app flow:
  - queue -> live timer -> match decision -> chat unlock
- Use poster fallback image and reduced-motion fallback
- Lazy-load video after first contentful paint

### 2) Mobile conversion polish
- Sticky bottom CTA on landing
- Increase touch target spacing in hero and FAQ
- Add subtle scroll progress indicator for long landing page

### 3) Trust and safety deepening
- Add dedicated /safety page with:
  - moderation flow
  - report flow
  - enforcement policy summary
- Link from hero and footer

### 4) Funnel instrumentation
- Track events:
  - landing_view
  - hero_cta_click
  - faq_expand
  - safety_link_click
  - signup_started
  - signup_completed
- Add weekly conversion dashboard baseline

### 5) Video call UX innovations
- Pre-call quality check (camera framing + audio + network)
- Dynamic fallback to voice-first when bandwidth drops
- One-tap “Safe Exit + Report” quick action cluster

### 6) Experiment framework
- A/B test headlines:
  - H1 emotional vs direct conversion framing
- A/B test CTA labels:
  - Try a 45s Spark vs Go Live Now
- Run for minimum 1k sessions before winner lock

## Performance and quality gate (must pass)
- npm run lint
- npm test
- npm run build
- Production smoke checks:
  - / returns 200
  - /privacy, /terms, /sitemap.xml valid
  - assets immutable cache headers

## KPI targets for next 7 days
- Hero CTA CTR: +15%
- Signup start rate: +10%
- Landing bounce rate: -10%
- LCP target: <3.0s mobile p75
