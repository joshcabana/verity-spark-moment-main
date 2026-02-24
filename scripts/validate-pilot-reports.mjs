#!/usr/bin/env node

import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ACTIVATIONS_MARKER = "pilot:auto:activations";
const FUNNEL_MARKER = "pilot:auto:funnel";
const GATES_MARKER = "pilot:auto:gates";

const GATE_DATES = {
  A: "2026-02-27",
  B: "2026-03-03",
  FINAL: "2026-03-07",
};

const GATE_ROW_LABELS = {
  A: "Gate A",
  B: "Gate B",
  FINAL: "Final",
};

const REQUIRED_METRICS = [
  "newProfiles",
  "matchesCreated",
  "callCompletionRate",
  "sparkConversionRate",
  "chatActivationRate",
  "stripeFailures",
  "stripeProcessed",
  "rpcExceptions",
  "unresolvedCriticalIncidents",
];

const argv = process.argv.slice(2);

const readArg = (flag, fallback = null) => {
  const index = argv.indexOf(flag);
  if (index === -1) return fallback;
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) return fallback;
  return value;
};

const normalizeGate = (value) => {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (normalized === "A" || normalized === "B" || normalized === "FINAL") return normalized;
  return null;
};

const markerBlock = (content, marker) => {
  const startTag = `<!-- ${marker}:start -->`;
  const endTag = `<!-- ${marker}:end -->`;
  const start = content.indexOf(startTag);
  const end = content.indexOf(endTag);

  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`Missing marker block ${marker}`);
  }

  return content.slice(start + startTag.length, end);
};

const parseRows = (block) =>
  block
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|") && line.endsWith("|"))
    .filter((line) => !/^\|\s*[-:\s|]+\|\s*$/.test(line))
    .map((line) =>
      line
        .split("|")
        .slice(1, -1)
        .map((cell) => cell.trim()),
    );

const readJson = (path) => {
  let raw;
  try {
    raw = readFileSync(path, "utf8");
  } catch (error) {
    throw new Error(`Missing required report: ${path}`);
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Invalid JSON report: ${path}`);
  }
};

const aestToday = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Sydney",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const validateDailyReport = (report, reportPath) => {
  if (!report || typeof report !== "object") {
    throw new Error(`Daily report is invalid: ${reportPath}`);
  }
  if (!report.metrics || typeof report.metrics !== "object") {
    throw new Error(`Daily report metrics missing: ${reportPath}`);
  }
  for (const key of REQUIRED_METRICS) {
    if (typeof report.metrics[key] !== "number" || Number.isNaN(report.metrics[key])) {
      throw new Error(`Daily report missing metrics.${key}: ${reportPath}`);
    }
  }
};

const validateTrackerRows = (trackerContent, date) => {
  const activationRows = parseRows(markerBlock(trackerContent, ACTIVATIONS_MARKER));
  const funnelRows = parseRows(markerBlock(trackerContent, FUNNEL_MARKER));

  const activationRow = activationRows.find((row) => row[0] === date);
  const funnelRow = funnelRows.find((row) => row[0] === date);

  if (!activationRow) {
    throw new Error(`Tracker activations row missing for ${date}`);
  }
  if (!funnelRow) {
    throw new Error(`Tracker funnel row missing for ${date}`);
  }
  if (activationRow[3]?.toLowerCase() === "pending") {
    throw new Error(`Tracker activation cap status still pending for ${date}`);
  }
};

const gateReportExists = (gateKey, reportsDir) => {
  const prefix = `gate-${gateKey.toLowerCase()}-`;
  const files = readdirSync(reportsDir);
  return files.some((file) => file.startsWith(prefix) && file.endsWith(".json"));
};

const validateGateDueState = (trackerContent, date, requestedGate = null) => {
  const gateRows = parseRows(markerBlock(trackerContent, GATES_MARKER));
  const gatesToCheck = requestedGate
    ? [requestedGate]
    : Object.keys(GATE_DATES).filter((gateKey) => date >= GATE_DATES[gateKey]);

  if (gatesToCheck.length === 0) return;

  const reportsDir = resolve(process.cwd(), "reports/pilot");

  for (const gateKey of gatesToCheck) {
    if (!gateReportExists(gateKey, reportsDir)) {
      throw new Error(`Gate ${gateKey} report missing in reports/pilot (due since ${GATE_DATES[gateKey]}).`);
    }

    const label = GATE_ROW_LABELS[gateKey];
    const row = gateRows.find((cells) => cells[0] === label);
    if (!row) {
      throw new Error(`Tracker gate row missing for ${label}`);
    }
    if (date >= GATE_DATES[gateKey] && (row[3] === "pending" || row[4] === "pending")) {
      throw new Error(`Tracker gate row still pending for ${label}`);
    }
  }
};

try {
  const date = readArg("--date", aestToday());
  const gate = normalizeGate(readArg("--gate"));
  const trackerPath = resolve(process.cwd(), readArg("--tracker", "docs/pilot/tracker.md"));
  const dailyPath = resolve(process.cwd(), `reports/pilot/daily-ops-${date}.json`);

  const dailyReport = readJson(dailyPath);
  validateDailyReport(dailyReport, dailyPath);

  const trackerContent = readFileSync(trackerPath, "utf8");
  validateTrackerRows(trackerContent, date);
  validateGateDueState(trackerContent, date, gate);

  console.log(`Pilot report validation passed for ${date}${gate ? ` (gate ${gate})` : ""}.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
