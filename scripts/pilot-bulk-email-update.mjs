#!/usr/bin/env node

/**
 * Bulk email update for pilot invites.
 * 
 * Reads a CSV with real participant emails and updates private/pilot/wave1-invites.csv
 * with those addresses, maintaining all other fields and scheduling.
 * 
 * Usage:
 *   node scripts/pilot-bulk-email-update.mjs --input private/pilot/participants.csv --output private/pilot/wave1-invites.csv
 * 
 * Input CSV format (private/pilot/participants.csv):
 *   email,city,name,notes
 *   jane.smith@gmail.com,Canberra,Jane Smith,Friend of founder
 *   john.doe@outlook.com,Sydney,John Doe,Tech community referral
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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
const inputPath = args.input || "private/pilot/participants.csv";
const outputPath = args.output || "private/pilot/wave1-invites.csv";
const templatePath = args.template || "docs/pilot/templates/wave1-invites.template.csv";
const dryRun = args["dry-run"] === "true";

try {
  // Read current invites file if it exists; otherwise bootstrap from tracked template
  const sourceInvitesPath = existsSync(outputPath) ? outputPath : templatePath;
  const currentCsvContent = readFileSync(sourceInvitesPath, "utf8");
  const currentRows = parse(currentCsvContent, {
    columns: true,
    skip_empty_lines: true,
  });

  // Read participant emails
  const inputCsvContent = readFileSync(inputPath, "utf8");
  const participants = parse(inputCsvContent, {
    columns: true,
    skip_empty_lines: true,
  });

  // Group current invites by city
  const invitesByCity = {};
  for (const row of currentRows) {
    const city = row.city?.trim();
    const inviteId = row.invite_id?.trim();
    if (!city || !inviteId) continue;
    if (!invitesByCity[city]) invitesByCity[city] = [];
    invitesByCity[city].push({ ...row, _originalIndex: currentRows.indexOf(row) });
  }

  // Group participants by city
  const participantsByCity = {};
  for (const p of participants) {
    const city = p.city?.trim();
    if (!city) {
      console.warn(`Skipping participant: missing city. Email: ${p.email}`);
      continue;
    }
    if (!participantsByCity[city]) participantsByCity[city] = [];
    participantsByCity[city].push(p);
  }

  // Update invites with participant emails
  const updatedRows = [...currentRows];
  let updateCount = 0;
  let skipCount = 0;

  for (const [city, invites] of Object.entries(invitesByCity)) {
    const cityParticipants = participantsByCity[city] || [];

    for (let i = 0; i < invites.length; i += 1) {
      const invite = invites[i];
      const originalIndex = updatedRows.findIndex(
        (r) => r.invite_id?.trim() === invite.invite_id?.trim(),
      );

      if (i < cityParticipants.length) {
        const participant = cityParticipants[i];
        const email = participant.email?.trim();
        const name = participant.name?.trim() || "";
        const notes = participant.notes?.trim() || "";

        if (!email) {
          console.warn(`Skipping participant in ${city}: missing email`);
          skipCount += 1;
          continue;
        }

        // Validate email format
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          console.warn(`Invalid email format: ${email}`);
          skipCount += 1;
          continue;
        }

        if (originalIndex !== -1) {
          updatedRows[originalIndex] = {
            ...updatedRows[originalIndex],
            email,
            notes: notes || `Real participant: ${name}`,
          };
          console.log(`✓ ${city} #${i + 1}: ${email}`);
          updateCount += 1;
        }
      } else {
        console.warn(
          `No participant available for ${city} invite #${i + 1} (${invite.invite_id})`,
        );
      }
    }
  }

  // Prepare CSV columns (match original)
  const columns = ["invite_id", "email", "city", "cohort", "wave", "status", "invite_date", "activated_at", "notes"];

  // Write output
  if (!dryRun) {
    mkdirSync(dirname(resolve(process.cwd(), outputPath)), { recursive: true });
    const csvOutput = stringify(updatedRows, {
      header: true,
      columns,
    });
    writeFileSync(outputPath, csvOutput, "utf8");
    console.log(`\n✓ Updated ${outputPath} with ${updateCount} real emails`);
    if (!existsSync(outputPath) || sourceInvitesPath === templatePath) {
      console.log(`✓ Seeded from template: ${templatePath}`);
    }
  } else {
    console.log(`\n[DRY RUN] Would update ${updateCount} invites`);
  }

  if (skipCount > 0) {
    console.warn(`⚠ Skipped ${skipCount} participants due to validation errors`);
  }

  if (updateCount === 0) {
    console.error("No invites updated. Check input CSV format.");
    process.exit(1);
  }
} catch (error) {
  console.error("Error:", error instanceof Error ? error.message : String(error));
  process.exit(1);
}
