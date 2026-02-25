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
import { evaluatePilotGate } from "./lib/pilot-gate-evaluation.mjs";

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
    minMatchesCreated: readEnvNumber("PILOT_GATE_A_MIN_MATCHES_CREATED", 10),
    minDecisionsCompleted: readEnvNumber("PILOT_GATE_A_MIN_DECISIONS_COMPLETED", 10),
    minCallCompletionRate: readEnvNumber("PILOT_GATE_A_MIN_CALL_COMPLETION_RATE", 0.8),
    maxStaleQueueEntries: readEnvNumber("PILOT_GATE_A_MAX_STALE_QUEUE_ENTRIES", 3),
    maxOpenCriticalIncidents: readEnvNumber("PILOT_GATE_A_MAX_OPEN_CRITICAL_INCIDENTS", 0),
    maxRpcExceptions: readEnvNumber("PILOT_GATE_A_MAX_RPC_EXCEPTIONS", 3),
  },
  gateB: {
    minMutualSparks: readEnvNumber("PILOT_GATE_B_MIN_MUTUAL_SPARKS", 5),
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

const { checks: selectedChecks, status, recommendation } = evaluatePilotGate({
  gate,
  metrics,
  thresholds,
});

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
