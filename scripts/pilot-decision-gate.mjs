#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  collectPilotMetrics,
  createSupabaseAdminClient,
  isoHoursAgo,
  readArg,
  readEnvNumber,
} from "./lib/pilot-metrics.mjs";

const argv = process.argv.slice(2);
const gate = readArg(argv, "--gate", "A").toUpperCase();
if (!["A", "B", "FINAL"].includes(gate)) {
  console.error("Invalid --gate value. Use A, B, or FINAL.");
  process.exit(1);
}

const defaultLookbackDays = gate === "A" ? 3 : 7;
const lookbackDays = Number(readArg(argv, "--lookback-days", String(defaultLookbackDays)));
const sinceIso = readArg(argv, "--since", isoHoursAgo(lookbackDays * 24));
const staleThresholdMinutes = Number(
  readArg(argv, "--stale-minutes", String(readEnvNumber("PILOT_STALE_QUEUE_MINUTES", 15))),
);
const reportPath = readArg(
  argv,
  "--report",
  `reports/pilot/gate-${gate.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`,
);

const thresholds = {
  gateA: {
    minCallCompletionRate: readEnvNumber("PILOT_GATE_A_MIN_CALL_COMPLETION_RATE", 0.8),
    maxStaleQueueEntries: readEnvNumber("PILOT_GATE_A_MAX_STALE_QUEUE_ENTRIES", 3),
    maxOpenCriticalIncidents: readEnvNumber("PILOT_GATE_A_MAX_OPEN_CRITICAL_INCIDENTS", 0),
    maxRpcExceptions: readEnvNumber("PILOT_GATE_A_MAX_RPC_EXCEPTIONS", 3),
  },
  gateB: {
    minSparkConversionRate: readEnvNumber("PILOT_GATE_B_MIN_SPARK_CONVERSION_RATE", 0.2),
    minChatActivationRate: readEnvNumber("PILOT_GATE_B_MIN_CHAT_ACTIVATION_RATE", 0.5),
    maxOpenCriticalIncidents: readEnvNumber("PILOT_GATE_B_MAX_OPEN_CRITICAL_INCIDENTS", 0),
  },
};

const supabase = createSupabaseAdminClient();
const metrics = await collectPilotMetrics({
  supabase,
  sinceIso,
  staleThresholdMinutes,
});

const gateAResults = [
  {
    name: "Call completion rate",
    pass: metrics.callCompletionRate >= thresholds.gateA.minCallCompletionRate,
    actual: Number(metrics.callCompletionRate.toFixed(4)),
    threshold: `>= ${thresholds.gateA.minCallCompletionRate}`,
  },
  {
    name: "Stale queue entries",
    pass: metrics.staleQueueEntries <= thresholds.gateA.maxStaleQueueEntries,
    actual: metrics.staleQueueEntries,
    threshold: `<= ${thresholds.gateA.maxStaleQueueEntries}`,
  },
  {
    name: "Open critical incidents",
    pass: metrics.unresolvedCriticalIncidents <= thresholds.gateA.maxOpenCriticalIncidents,
    actual: metrics.unresolvedCriticalIncidents,
    threshold: `<= ${thresholds.gateA.maxOpenCriticalIncidents}`,
  },
  {
    name: "RPC exceptions",
    pass: metrics.rpcExceptions <= thresholds.gateA.maxRpcExceptions,
    actual: metrics.rpcExceptions,
    threshold: `<= ${thresholds.gateA.maxRpcExceptions}`,
  },
];

const gateBResults = [
  {
    name: "Spark conversion rate",
    pass: metrics.sparkConversionRate >= thresholds.gateB.minSparkConversionRate,
    actual: Number(metrics.sparkConversionRate.toFixed(4)),
    threshold: `>= ${thresholds.gateB.minSparkConversionRate}`,
  },
  {
    name: "Chat activation rate",
    pass: metrics.chatActivationRate >= thresholds.gateB.minChatActivationRate,
    actual: Number(metrics.chatActivationRate.toFixed(4)),
    threshold: `>= ${thresholds.gateB.minChatActivationRate}`,
  },
  {
    name: "Open critical incidents",
    pass: metrics.unresolvedCriticalIncidents <= thresholds.gateB.maxOpenCriticalIncidents,
    actual: metrics.unresolvedCriticalIncidents,
    threshold: `<= ${thresholds.gateB.maxOpenCriticalIncidents}`,
  },
];

const gateAPassed = gateAResults.every((result) => result.pass);
const gateBPassed = gateBResults.every((result) => result.pass);

const selectedChecks = gate === "A" ? gateAResults : gate === "B" ? gateBResults : [...gateAResults, ...gateBResults];
const status = selectedChecks.every((result) => result.pass) ? "PASS" : "FAIL";

let recommendation = "HOLD_HARDENING_SPRINT";
if (gate === "A") {
  recommendation = gateAPassed ? "CONTINUE_TO_GATE_B" : "HOLD_FIX_RELIABILITY";
} else if (gate === "B") {
  recommendation = gateBPassed ? "CONTINUE_TO_FINAL_GATE" : "HOLD_OPTIMIZE_CONVERSION";
} else if (gateAPassed && gateBPassed) {
  recommendation = "EXPAND_COHORT";
} else if (!gateAPassed) {
  recommendation = "PAUSE_AND_REWORK";
}

console.log(`Gate ${gate} status: ${status}`);
console.log(`Recommendation: ${recommendation}`);
console.log(`Window start: ${metrics.windowStart}`);
for (const check of selectedChecks) {
  const result = check.pass ? "PASS" : "FAIL";
  console.log(`- [${result}] ${check.name}: ${check.actual} (${check.threshold})`);
}

const report = {
  generatedAt: new Date().toISOString(),
  gate,
  status,
  recommendation,
  checks: selectedChecks,
  metrics,
  thresholds,
};

const absoluteReportPath = resolve(process.cwd(), reportPath);
await mkdir(dirname(absoluteReportPath), { recursive: true });
await writeFile(absoluteReportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(`Report written to ${absoluteReportPath}`);

if (status !== "PASS" && gate !== "FINAL") process.exit(1);
