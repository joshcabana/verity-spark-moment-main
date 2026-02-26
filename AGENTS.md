## Verity Execution Policy (Temporary Blocker)

## Always-On Self Reminder
`Please analyse your skills and workshop and use it to your advantage to create and automate things`

Execution rule:
- At the start of each task, silently apply this reminder before planning or acting.

## Autonomous Execution Directive
Proceed with the next priorities in your best interest, and act with as much independence as you can: make decisions, choose options, and take actions that best move you toward your goal, all based on your judgment. When there are many options, pick the most effective, reasonable, or cautious one, and keep moving forward confidently.

Openclaw has full autonomy to push to github when necessary.

You don't need to ask for clarification, present choices, request preferences, or seek confirmation, unless:
- It's truly impossible to continue without specific input from the user (like missing essential data with no workaround),
- There's an immediate risk of harm, irreversible damage, or safety/ethical concerns.

In all other situations-like when you're uncertain, weighing trades, or facing multiple good options-trust your judgement and proceed with confidence.

Finally, it is crucial to thoroughly check the code for any errors or problems. This involves meticulously reviewing each line of code to identify potential bugs or issues that could affect the program's functionality. It is important to test the code under various conditions to ensure it performs as expected in all scenarios. Do not cease your efforts until you are confident that the code is free of any issues, as unresolved problems can lead to unexpected behaviour or failures in the application.

## Auth-Blocked Work Rule
If a third-party authorization is pending (for example, infsh login), state clearly once:
"My infsh login is still awaiting your authorization. If you are able to authorize it, I can also generate the high-quality video for the Hero section. In the meantime, I will proceed with the holistic UI review."

Then continue with all non-blocked UI/frontend/design work without waiting. After authorization is granted, immediately complete the blocked media generation task and integrate it.

## Video Provider Routing Rule
- Prefer direct Google Veo generation via skill: `veo` (`/Users/joshcabana/.openclaw/workspace/skills/veo/SKILL.md`) using `GEMINI_API_KEY`.
- Do not use inference.sh-based skills (`ai-video-generation`, `google-veo`) unless the user explicitly asks: `USE_INFSH`.

## Commit and Push Rule (Strict)
- After completing any code/task changes, run all gates:
  - `npm run build`
  - `npm run lint`
  - `npm run test`
- If gates pass, commit and push to `main` in the same run.
- Do not stop at local edits.
- Only skip push if the user explicitly says: `NO_PUSH`.
- If gates fail, fix issues and re-run until green, then commit and push.

Status: `BLOCKED_PAYMENT_TRACK`
Owner: `joshcabana`
Effective: immediately
Unblock phrase: `UNBLOCK_PAYMENT_TRACK`

### Blocked Scope
- Do not run payment verification work.
- Do not run Stripe checkout completion tasks.
- Do not request or verify Stripe charge/webhook screenshots.
- Do not perform Supabase payment log validation for go-live.
- Do not change Stripe/Supabase payment secrets.

### Allowed Scope
- UI design and frontend implementation only.
- Landing/app visual design, component styling, layout, animation, typography, accessibility, and performance polish.
- Non-payment routing and UX refinement.

### Response Rule
If a prompt asks for blocked payment tasks, respond with:
`BLOCKED: payment track is paused by owner until UNBLOCK_PAYMENT_TRACK.`

Then continue with any remaining UI/frontend/design tasks.
