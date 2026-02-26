#!/usr/bin/env node
/**
 * validate-participants-csv.mjs
 *
 * Pre-flight check for private/pilot/participants.csv before running the onboard workflow.
 * Catches format issues, placeholder emails, duplicates, and city mismatches
 * before any Supabase accounts are created.
 *
 * Usage:
 *   node scripts/validate-participants-csv.mjs --participants private/pilot/participants.csv
 *   node scripts/validate-participants-csv.mjs --participants private/pilot/participants.csv --strict
 *
 * Exit codes:
 *   0 — all checks passed (safe to proceed with onboard workflow)
 *   1 — validation errors found (must fix before running onboard)
 */

import { readFileSync } from "fs";
import { resolve } from "path";

// ─── CLI args ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const getArg = (flag) => {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : null;
};
const hasFlag = (flag) => args.includes(flag);

const csvPath = getArg("--participants") ?? getArg("-p");
const strict = hasFlag("--strict"); // strict: warn-level issues become errors

if (!csvPath) {
  console.error(
    "Usage: node scripts/validate-participants-csv.mjs --participants <path_to_csv>"
  );
  process.exit(1);
}

// ─── Load CSV ────────────────────────────────────────────────────────────────

let rawText;
try {
  rawText = readFileSync(resolve(process.cwd(), csvPath), "utf-8");
} catch (err) {
  console.error(`✗ Cannot read file: ${csvPath}`);
  console.error(`  ${err.message}`);
  process.exit(1);
}

const lines = rawText.trim().split(/\r?\n/);

if (lines.length < 2) {
  console.error("✗ CSV is empty or has no data rows (only a header).");
  process.exit(1);
}

// ─── Constants ───────────────────────────────────────────────────────────────

const REQUIRED_COLUMNS = ["email", "city", "name"];
const ALLOWED_CITIES = ["canberra", "sydney"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PLACEHOLDER_PATTERNS = [
  /^pilot\./i,
  /verity\.date$/i,
  /^REPLACE_WITH_REAL_EMAIL$/i,
  /example\.com$/i,
  /test@/i,
  /^noreply@/i,
  /^no-reply@/i,
];
const MAX_PARTICIPANTS = 100;
const RECOMMENDED_MIN = 10;

// ─── Parse header ────────────────────────────────────────────────────────────

const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
const errors = [];
const warnings = [];

for (const col of REQUIRED_COLUMNS) {
  if (!header.includes(col)) {
    errors.push(`Missing required column: "${col}"`);
  }
}

if (errors.length) {
  console.error("\n✗ Header validation failed:");
  for (const e of errors) console.error(`  • ${e}`);
  console.error(`\n  Expected header: email,city,name,notes`);
  console.error(`  Found:           ${lines[0]}`);
  process.exit(1);
}

const col = (row, name) => row[header.indexOf(name)]?.trim() ?? "";

// ─── Parse rows ──────────────────────────────────────────────────────────────

const rows = [];
for (let i = 1; i < lines.length; i++) {
  if (!lines[i].trim()) continue; // skip blank lines
  const parts = lines[i].split(",");
  // Handle quoted values with commas inside (basic CSV support)
  const row = header.map((_, idx) => parts[idx]?.replace(/^"|"$/g, "").trim() ?? "");
  rows.push({ lineNum: i + 1, row });
}

// ─── Validate rows ───────────────────────────────────────────────────────────

const emails = new Set();
const cityCounts = {};

for (const { lineNum, row } of rows) {
  const email = col(row, "email");
  const city = col(row, "city");
  const name = col(row, "name");

  // Empty email
  if (!email) {
    errors.push(`Line ${lineNum}: missing email`);
    continue;
  }

  // Email format
  if (!EMAIL_RE.test(email)) {
    errors.push(`Line ${lineNum}: invalid email format — "${email}"`);
  }

  // Placeholder emails
  const isPlaceholder = PLACEHOLDER_PATTERNS.some((re) => re.test(email));
  if (isPlaceholder) {
    errors.push(
      `Line ${lineNum}: placeholder/synthetic email not allowed — "${email}"`
    );
  }

  // Duplicates
  const emailLower = email.toLowerCase();
  if (emails.has(emailLower)) {
    errors.push(`Line ${lineNum}: duplicate email — "${email}"`);
  } else {
    emails.add(emailLower);
  }

  // City validation
  if (!city) {
    errors.push(`Line ${lineNum}: missing city for "${email}"`);
  } else if (!ALLOWED_CITIES.includes(city.toLowerCase())) {
    errors.push(
      `Line ${lineNum}: unknown city "${city}" — allowed: ${ALLOWED_CITIES.join(", ")}`
    );
  } else {
    const cityKey = city.toLowerCase();
    cityCounts[cityKey] = (cityCounts[cityKey] ?? 0) + 1;
  }

  // Missing name (warning, not error)
  if (!name) {
    warnings.push(`Line ${lineNum}: missing name for "${email}" (invite message will omit name)`);
  }
}

// ─── Aggregate checks ────────────────────────────────────────────────────────

const total = rows.length;

if (total > MAX_PARTICIPANTS) {
  errors.push(
    `Too many participants: ${total} (max ${MAX_PARTICIPANTS}). Split into multiple waves.`
  );
}

if (total < RECOMMENDED_MIN) {
  warnings.push(
    `Only ${total} participant(s) — recommend at least ${RECOMMENDED_MIN} (5 per city) to meet Gate A minimum.`
  );
}

for (const city of ALLOWED_CITIES) {
  const count = cityCounts[city] ?? 0;
  if (count < 5) {
    warnings.push(
      `Only ${count} participant(s) in ${city} — recommend ≥5 per city for Gate A evidence.`
    );
  }
}

// ─── Report ──────────────────────────────────────────────────────────────────

console.log(`\nParticipant CSV Validation — ${csvPath}`);
console.log("─".repeat(50));
console.log(`  Rows parsed:   ${total}`);
console.log(`  Unique emails: ${emails.size}`);
for (const city of ALLOWED_CITIES) {
  console.log(`  ${city.padEnd(12)} ${cityCounts[city] ?? 0} participant(s)`);
}

const effectiveErrors = strict ? [...errors, ...warnings.map((w) => "[strict] " + w)] : errors;

if (warnings.length) {
  console.log(`\n⚠  Warnings (${warnings.length}):`);
  for (const w of warnings) console.log(`  • ${w}`);
}

if (effectiveErrors.length) {
  console.log(`\n✗  Errors (${effectiveErrors.length}):`);
  for (const e of effectiveErrors) console.log(`  • ${e}`);
  console.log("\n  Fix the above issues before running the onboard workflow.");
  console.log("  Reference: docs/pilot/templates/participants.template.csv for correct format.\n");
  process.exit(1);
}

console.log("\n✓  All checks passed.");
console.log(
  `   ${total} participant(s) ready. Safe to proceed:\n`
);
console.log(
  `   npm run pilot:onboard -- --participants ${csvPath} --dry-run`
);
console.log(
  `   npm run pilot:onboard -- --participants ${csvPath} --confirm\n`
);
