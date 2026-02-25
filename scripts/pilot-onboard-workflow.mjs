#!/usr/bin/env node

/**
 * Complete pilot participant onboarding workflow.
 * 
 * Orchestrates the full process:
 * 1. Bulk email update (participants.csv → wave1-invites.csv)
 * 2. Re-seed auth accounts in Supabase
 * 3. Generate shareable credentials
 * 4. Verify activation readiness
 * 
 * Usage:
 *   npm run pilot:onboard -- --participants participants.csv --dry-run
 *   npm run pilot:onboard -- --participants participants.csv --confirm
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const parseArgs = (argv) => {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = "true";
      continue;
    }
    args[key] = next;
    i += 1;
  }
  return args;
};

const run = (command, args, description, options = {}) => {
  const { allowFailure = false } = options;
  console.log(`\n→ ${description}`);
  const result = spawnSync(command, args, {
    stdio: "inherit",
  });
  if (result.status !== 0) {
    if (allowFailure) {
      console.warn(`⚠ ${description} (non-blocking in this mode)`);
      return false;
    }
    console.error(`✗ Failed: ${description}`);
    process.exit(1);
  }
  console.log(`✓ ${description}`);
  return true;
};

const args = parseArgs(process.argv);
const participantsPath = args.participants || "participants.csv";
const dryRunFlag = args["dry-run"] === "true" ? "--dry-run" : "";
const confirmFlag = args.confirm === "true" ? "" : "--dry-run";
const finalFlag = dryRunFlag || confirmFlag;

if (!existsSync(participantsPath)) {
  console.error(`Error: Participants file not found: ${participantsPath}`);
  console.error("Create a CSV with columns: email, city, name, notes");
  process.exit(1);
}

console.log(`
╔══════════════════════════════════════════════════════════════╗
║         Pilot Participant Onboarding Workflow               ║
╚══════════════════════════════════════════════════════════════╝

Input:   ${participantsPath}
Mode:    ${finalFlag ? "DRY RUN" : "LIVE"}
`);

// Step 1: Bulk email update
run(
  "node",
  [`scripts/pilot-bulk-email-update.mjs`, `--input`, participantsPath, `--output`, `docs/pilot/wave1-invites.csv`, finalFlag].filter(Boolean),
  "Step 1: Update invite CSV with real emails",
);

// Step 2: Re-seed accounts
if (!finalFlag) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("\n⚠ Skipping seed step: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    console.error("Set these env vars to re-seed accounts in Supabase.");
  } else {
    run(
      "npm",
      ["run", "seed:pilot:users", "--", "--wave1"],
      "Step 2: Re-seed Supabase accounts with real emails",
    );
  }
} else {
  console.log("\n→ Step 2: [SKIPPED in dry-run] Would re-seed Supabase accounts");
}

// Step 3: Generate credentials
run(
  "node",
  [
    `scripts/pilot-generate-invite-credentials.mjs`,
    `--invites`,
    `docs/pilot/wave1-invites.csv`,
    `--out`,
    `reports/pilot/invite-credentials.csv`,
    finalFlag,
  ].filter(Boolean),
  "Step 3: Generate shareable invite credentials",
  { allowFailure: Boolean(finalFlag) },
);

// Step 4: Summary
console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    Next Steps                               ║
╚══════════════════════════════════════════════════════════════╝

${finalFlag ? `[DRY RUN] Review the changes above, then run again without --dry-run:

  npm run pilot:onboard -- --participants ${participantsPath} --confirm
` : `
1. Share invite credentials with participants:
   - File: reports/pilot/invite-credentials-SHAREABLE.csv
   - Securely deliver via email or secure channel
   
2. Verify activation in the pilots dashboard:
   - npm run pilot:ops:daily
   
3. Monitor first 24 hours:
   - Dashboard: https://verity-spark-moment-main.vercel.app/admin
   - Watch for onboarding completions in tracker
   - npm run pilot:tracker:update
   
4. Prepare for Gate A (2026-02-27):
   - Check: npm run pilot:gate
   - Readiness document: docs/pilot/anti-gravity-output.md
`}
`);
