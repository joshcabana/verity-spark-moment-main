#!/usr/bin/env node

import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const argv = process.argv.slice(2);

const readArg = (flag, fallback = null) => {
  const index = argv.indexOf(flag);
  if (index === -1) return fallback;
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) return fallback;
  return value;
};

const normalizeGate = (value) => {
  const normalized = String(value ?? "A").trim().toUpperCase();
  if (normalized === "A" || normalized === "B" || normalized === "FINAL") return normalized;
  return "A";
};

const gate = normalizeGate(readArg("--gate", "A"));
const todayIso = new Date().toISOString().slice(0, 10);
const reportPath = readArg("--report", `reports/pilot/gate-${gate.toLowerCase()}-${todayIso}.json`);
const trackerPath = readArg("--tracker", "docs/pilot/tracker.md");

const run = (scriptPath, args) =>
  spawnSync(process.execPath, [resolve(process.cwd(), scriptPath), ...args], {
    stdio: "inherit",
    env: process.env,
  });

const gateResult = run("scripts/pilot-decision-gate.mjs", argv);

let trackerCode = 0;
if (existsSync(resolve(process.cwd(), reportPath))) {
  const trackerResult = run("scripts/pilot-update-tracker.mjs", [
    "--gate-report",
    reportPath,
    "--gate",
    gate,
    "--tracker",
    trackerPath,
  ]);
  trackerCode = trackerResult.status ?? 1;
} else {
  console.error(`Skipping tracker sync: report file not found (${reportPath}).`);
  trackerCode = 1;
}

const gateCode = gateResult.status ?? 1;
if (gateCode !== 0) process.exit(gateCode);
if (trackerCode !== 0) process.exit(trackerCode);
