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

const todayIso = new Date().toISOString().slice(0, 10);
const reportPath = readArg("--report", `reports/pilot/daily-ops-${todayIso}.json`);
const trackerPath = readArg("--tracker", "docs/pilot/tracker.md");
const date = readArg("--date", reportPath.match(/(\d{4}-\d{2}-\d{2})(?=\.json$)/)?.[1] ?? todayIso);

const run = (scriptPath, args) =>
  spawnSync(process.execPath, [resolve(process.cwd(), scriptPath), ...args], {
    stdio: "inherit",
    env: process.env,
  });

const dailyResult = run("scripts/pilot-daily-ops-check.mjs", argv);

let trackerCode = 0;
if (existsSync(resolve(process.cwd(), reportPath))) {
  const trackerResult = run("scripts/pilot-update-tracker.mjs", [
    "--daily-report",
    reportPath,
    "--date",
    date,
    "--tracker",
    trackerPath,
  ]);
  trackerCode = trackerResult.status ?? 1;
} else {
  console.error(`Skipping tracker sync: report file not found (${reportPath}).`);
  trackerCode = 1;
}

const dailyCode = dailyResult.status ?? 1;
if (dailyCode !== 0) process.exit(dailyCode);
if (trackerCode !== 0) process.exit(trackerCode);
