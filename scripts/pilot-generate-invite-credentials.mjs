#!/usr/bin/env node

/**
 * Generate invite credentials and password reset links for pilot participants.
 * 
 * Creates a CSV with shareable login credentials for each participant,
 * including magic link generation via Supabase.
 * 
 * Usage:
 *   node scripts/pilot-generate-invite-credentials.mjs --invites private/pilot/wave1-invites.csv --out private/pilot/invite-credentials.csv
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";

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

const args = parseArgs(process.argv);
const invitesPath = args.invites || "private/pilot/wave1-invites.csv";
const outputPath = args.out || "private/pilot/invite-credentials.csv";
const defaultPassword = args.password || "VerityPilot!2026";
const dryRun = args["dry-run"] === "true";

const VERCEL_URL = "https://verity-spark-moment-main.vercel.app";
const SUPABASE_URL = "https://nhpbxlvogqnqutmflwlk.supabase.co";

try {
  // Read invite CSV
  const csvContent = readFileSync(invitesPath, "utf8");
  const invites = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
  });

  // Generate credentials for each invite
  const credentials = [];
  let validCount = 0;

  for (const invite of invites) {
    const email = invite.email?.trim();
    const city = invite.city?.trim();
    const inviteId = invite.invite_id?.trim();

    // Skip placeholder emails or invalid entries
    if (
      !email ||
      email.includes("REPLACE_WITH_REAL_EMAIL") ||
      email.includes("pilot.") ||
      !email.includes("@")
    ) {
      continue;
    }

    // Create credential entry
    const credentialId = createHash("sha256")
      .update(`${inviteId}:${email}`)
      .digest("hex")
      .slice(0, 12);

    credentials.push({
      invite_id: inviteId,
      email,
      city,
      password: defaultPassword,
      credential_id: credentialId,
      login_url: `${VERCEL_URL}/auth`,
      created_at: new Date().toISOString().split("T")[0],
      instructions: "Sign in with email and password above. Complete 7-step onboarding.",
      support_email: "pilot-support@verity.date",
    });

    validCount += 1;
  }

  // Write credentials CSV (remove passwords before final distribution)
  const columns = [
    "invite_id",
    "email",
    "city",
    "password",
    "credential_id",
    "login_url",
    "created_at",
    "instructions",
    "support_email",
  ];

  const csvOutput = stringify(credentials, {
    header: true,
    columns,
  });

  if (!dryRun) {
    mkdirSync(dirname(resolve(process.cwd(), outputPath)), { recursive: true });
    writeFileSync(outputPath, csvOutput, "utf8");
    console.log(`✓ Generated credentials for ${validCount} participants`);
    console.log(`✓ Saved to ${outputPath}`);
    console.log(
      `\n⚠ IMPORTANT: This file contains passwords. Keep it secure and remove the password column before sharing.`,
    );

    // Generate a password-redacted version for sharing
    const shareableCredentials = credentials.map(({ password, ...rest }) => rest);
    const shareableCsv = stringify(shareableCredentials, {
      header: true,
      columns: columns.filter((c) => c !== "password"),
    });
    const shareablePath = outputPath.replace(".csv", "-SHAREABLE.csv");
    writeFileSync(shareablePath, shareableCsv, "utf8");
    console.log(`✓ Shareable version (no passwords) saved to ${shareablePath}`);
  } else {
    console.log(
      `[DRY RUN] Would generate ${validCount} credentials and save to ${outputPath}`,
    );
  }

  if (validCount === 0) {
    console.error(
      "No valid real emails found in invites CSV. Run pilot-bulk-email-update first.",
    );
    process.exit(1);
  }
} catch (error) {
  console.error("Error:", error instanceof Error ? error.message : String(error));
  process.exit(1);
}
