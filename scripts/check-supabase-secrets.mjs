#!/usr/bin/env node

import { execFileSync } from "node:child_process";

const REQUIRED_CORE_SECRETS = [
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];

const REQUIRED_FEATURE_SECRETS = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
];

const AI_SECRET_ALIASES = [
  "AI_API_KEY",
  "LOVABLE_API_KEY",
];

const parseArgs = (argv) => {
  const args = {
    projectRef: "",
    mode: "full",
  };

  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--project-ref") {
      args.projectRef = argv[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (token === "--mode") {
      args.mode = argv[i + 1] ?? "";
      i += 1;
      continue;
    }
  }

  return args;
};

const { projectRef: argProjectRef, mode: argMode } = parseArgs(process.argv);
const projectRef = argProjectRef || process.env.SUPABASE_PROJECT_REF || "";
const mode = argMode || "full";

if (!projectRef) {
  console.error("Missing --project-ref (or SUPABASE_PROJECT_REF env var).");
  process.exit(1);
}

if (!["core", "full"].includes(mode)) {
  console.error(`Invalid --mode value: "${mode}". Use "core" or "full".`);
  process.exit(1);
}

let output;
try {
  output = execFileSync(
    "npx",
    ["supabase", "secrets", "list", "--project-ref", projectRef, "-o", "json"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
} catch (error) {
  console.error("Failed to query Supabase secrets.");
  if (error instanceof Error && "stderr" in error) {
    const stderr = String(error.stderr ?? "").trim();
    if (stderr) console.error(stderr);
    if (stderr.includes("status 403")) {
      console.error(
        "Supabase API returned 403. This usually means the CLI account does not have access to this project ref, or the wrong project ref is being targeted.",
      );
      console.error(
        `Verify project ref (${projectRef}) and role permissions in Supabase Dashboard (Project Settings > Members / Access Control).`,
      );
    }
  }
  process.exit(1);
}

let parsedSecrets;
try {
  parsedSecrets = JSON.parse(output);
} catch {
  console.error("Could not parse Supabase secrets output as JSON.");
  process.exit(1);
}

const existing = new Set(
  Array.isArray(parsedSecrets) ? parsedSecrets.map((entry) => entry?.name).filter(Boolean) : [],
);

const hasAiSecret = AI_SECRET_ALIASES.some((name) => existing.has(name));
const required = mode === "core"
  ? REQUIRED_CORE_SECRETS
  : [...REQUIRED_CORE_SECRETS, ...REQUIRED_FEATURE_SECRETS];

const missingRequired = required.filter((name) => !existing.has(name));
if (mode === "full" && !hasAiSecret) {
  missingRequired.push("AI_API_KEY (or LOVABLE_API_KEY)");
}

const missingFeature = [
  ...REQUIRED_FEATURE_SECRETS.filter((name) => !existing.has(name)),
  ...(hasAiSecret ? [] : ["AI_API_KEY (or LOVABLE_API_KEY)"]),
];

if (missingRequired.length > 0) {
  console.error(`Missing required Supabase secrets for project ${projectRef}:`);
  for (const name of missingRequired) {
    console.error(`- ${name}`);
  }
  process.exit(1);
}

console.log(`Supabase secret preflight passed for project ${projectRef} (mode: ${mode}).`);

if (existing.has("LOVABLE_API_KEY") && !existing.has("AI_API_KEY")) {
  console.warn("Using legacy AI secret name LOVABLE_API_KEY. Consider setting AI_API_KEY for portability.");
}

if (mode === "core" && missingFeature.length > 0) {
  console.warn("Feature secrets are missing (AI/Stripe flows will fail until configured):");
  for (const name of missingFeature) {
    console.warn(`- ${name}`);
  }
}
