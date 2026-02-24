#!/usr/bin/env node

import { updateTrackerFromReports } from "./lib/pilot-tracker-update.mjs";

const argv = process.argv.slice(2);

const readArg = (flag, fallback = null) => {
  const index = argv.indexOf(flag);
  if (index === -1) return fallback;
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) return fallback;
  return value;
};

const dailyReportPath = readArg("--daily-report");
const gateReportPath = readArg("--gate-report");
const date = readArg("--date");
const gate = readArg("--gate");
const trackerPath = readArg("--tracker", "docs/pilot/tracker.md");

try {
  const result = await updateTrackerFromReports({
    trackerPath,
    dailyReportPath,
    gateReportPath,
    date,
    gate,
  });

  const updateSummary = result.updates.length > 0 ? result.updates.join(", ") : "none";
  console.log(`Pilot tracker sync complete (${updateSummary}).`);
  console.log(`Tracker: ${result.trackerPath}`);
  console.log(`Changed: ${result.changed ? "yes" : "no"}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
