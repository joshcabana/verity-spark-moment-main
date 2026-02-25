# Verity Analytics Schema & Query Guide

This document defines the core funnel events implemented in Verity to track conversion from the landing page through the auth flow and into the pilot.

## 1. Funnel Event Schema

| Event Name | Properties | Description |
| :--- | :--- | :--- |
| `landing_view` | `page: "landing"` | Fired when a user loads the landing page. |
| `landing_scroll_depth` | `percent: number (25, 50, 75, 100)` | Fired as the user scrolls down the landing page. |
| `landing_primary_cta_clicked` | `placement: "hero" \| "footer" \| "sticky_mobile"` | Fired when a user clicks a primary "Try a 45s Spark" CTA. |
| `landing_safety_clicked` | `placement: "hero" \| "footer"` | Fired when a user clicks the safety/transparency links. |
| `landing_faq_opened` | `question: string` | Fired when a user expands an FAQ item. |
| `auth_view` | `mode: "signin" \| "signup"` | Fired when the auth screen is viewed. |
| `auth_mode_toggled` | `next_mode: "signin" \| "signup"` | Fired when a user toggles between login and register. |
| `auth_submit_attempt` | `mode: "signin" \| "signup"`, `email_domain: string` | Fired when a user submits the auth form. |
| `auth_submit_success` | `mode: "signin" \| "signup"`, `verification?: "email_link_sent"` | Fired on successful auth API response. |
| `auth_submit_failed` | `mode: "signin" \| "signup"`, `reason: string` | Fired if the auth API rejects the attempt. |
| `auth_post_signin_route` | `next_route: "/lobby" \| "/onboarding"` | Fired after signin to track if the user needs onboarding. |

---

## 2. Mixpanel Query Snippets (JQL & Insights)

### A. Landing Page Conversion Rate (Overall)
To see how many users who view the landing page attempt to sign up:
**Funnel:**
1. `landing_view`
2. `landing_primary_cta_clicked`
3. `auth_view` (where `mode` = "signup")
4. `auth_submit_success` (where `mode` = "signup")

### B. CTA Placement Performance
Compare which CTA drives the most clicks:
**Insights (Event Segmentation):**
- **Event:** `landing_primary_cta_clicked`
- **Breakdown by:** `placement`
- **Chart type:** Bar chart or pie chart.

### C. Authentication Drop-off
Identify where users fail during auth:
**Funnel:**
1. `auth_view`
2. `auth_submit_attempt`
3. `auth_submit_success`
*Breakdown by `mode` to compare signin vs. signup.*

### D. Scroll Depth Engagement
Understand how far users read before leaving or converting:
**Insights:**
- **Event:** `landing_scroll_depth`
- **Breakdown by:** `percent`
- **Metric:** Unique Users

### E. Common Auth Errors
See why users are failing to sign in/up:
**Insights:**
- **Event:** `auth_submit_failed`
- **Breakdown by:** `reason`
- **Metric:** Total Events

---

## 3. Developer Notes
- Events are sent to Mixpanel if `VITE_MIXPANEL_TOKEN` is set.
- In local development (`DEV` mode), events are logged to the console prefixing with `[Analytics]`.
- User identities are linked post-login using `identifyUser()` which sends a `$identify` payload. Anonymous session tracking falls back to a randomized UUID.