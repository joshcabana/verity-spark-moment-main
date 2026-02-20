#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const parseArgs = (argv) => {
  const args = {
    projectRef: "",
    envFile: ".env",
    configFile: "supabase/config.toml",
  };

  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--project-ref") {
      args.projectRef = argv[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (token === "--env-file") {
      args.envFile = argv[i + 1] ?? args.envFile;
      i += 1;
      continue;
    }
    if (token === "--config-file") {
      args.configFile = argv[i + 1] ?? args.configFile;
      i += 1;
      continue;
    }
  }

  return args;
};

const parseEnvFile = (filepath) => {
  if (!existsSync(filepath)) return {};

  const raw = readFileSync(filepath, "utf8");
  const result = {};

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();

    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    result[key] = value;
  }

  return result;
};

const parseConfigProjectRef = (filepath) => {
  if (!existsSync(filepath)) return "";
  const raw = readFileSync(filepath, "utf8");
  const match = raw.match(/^\s*project_id\s*=\s*"([a-z0-9]{20})"\s*$/m);
  return match?.[1] ?? "";
};

const parseProjectRefFromUrl = (value) => {
  if (!value) return "";
  const match = value.match(/https?:\/\/([a-z0-9]{20})\.supabase\.co/i);
  return match?.[1] ?? "";
};

const { projectRef: argProjectRef, envFile, configFile } = parseArgs(process.argv);

const resolvedEnvFile = resolve(envFile);
const resolvedConfigFile = resolve(configFile);
const envVars = parseEnvFile(resolvedEnvFile);
const configProjectRef = parseConfigProjectRef(resolvedConfigFile);
const envViteRef = parseProjectRefFromUrl(envVars.VITE_SUPABASE_URL ?? "");
const envServerRef = parseProjectRefFromUrl(envVars.SUPABASE_URL ?? "");
const targetProjectRef = argProjectRef || process.env.SUPABASE_PROJECT_REF || configProjectRef;

let linkedRef = "";
const linkedRefPath = resolve("supabase/.temp/project-ref");
if (existsSync(linkedRefPath)) {
  linkedRef = readFileSync(linkedRefPath, "utf8").trim();
}

if (!targetProjectRef) {
  console.error("Could not determine deployment project ref.");
  console.error("Pass --project-ref or set SUPABASE_PROJECT_REF, or define project_id in supabase/config.toml.");
  process.exit(1);
}

const mismatches = [];
if (configProjectRef && configProjectRef !== targetProjectRef) {
  mismatches.push(`config.toml project_id=${configProjectRef}`);
}
if (envViteRef && envViteRef !== targetProjectRef) {
  mismatches.push(`.env VITE_SUPABASE_URL ref=${envViteRef}`);
}
if (envServerRef && envServerRef !== targetProjectRef) {
  mismatches.push(`.env SUPABASE_URL ref=${envServerRef}`);
}

console.log(`Target project ref: ${targetProjectRef}`);
if (configProjectRef) console.log(`Config project ref: ${configProjectRef}`);
if (envViteRef) console.log(`Env VITE_SUPABASE_URL ref: ${envViteRef}`);
if (envServerRef) console.log(`Env SUPABASE_URL ref: ${envServerRef}`);
if (linkedRef) console.log(`Currently linked project ref: ${linkedRef}`);

if (mismatches.length > 0) {
  console.error("Supabase deployment target mismatch detected:");
  for (const mismatch of mismatches) {
    console.error(`- ${mismatch}`);
  }
  console.error("Update local config/env or deploy to the matching project ref before continuing.");
  process.exit(1);
}

if (linkedRef && linkedRef !== targetProjectRef) {
  console.warn("Warning: linked project differs from target ref. deploy-supabase.sh will relink before db push.");
}

console.log("Supabase target alignment preflight passed.");
