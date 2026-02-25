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

const lookbackHours = Number(readArg(argv, "--lookback-hours", String(readEnvNumber("PILOT_LOOKBACK_HOURS", 24))));
const staleThresholdMinutes = Number(
  readArg(argv, "--stale-minutes", String(readEnvNumber("PILOT_STALE_QUEUE_MINUTES", 15))),
);
const intakeCapPerDay = Number(readArg(argv, "--daily-intake-cap", String(readEnvNumber("PILOT_DAILY_INTAKE_CAP", 10))));
const sinceIso = readArg(argv, "--since", isoHoursAgo(lookbackHours));
const reportPath = readArg(
  argv,
  "--report",
  `reports/pilot/daily-ops-${new Date().toISOString().slice(0, 10)}.json`,
);

const minCallCompletionRate = readEnvNumber("PILOT_MIN_CALL_COMPLETION_RATE", 0.7);
const maxStaleQueueEntries = readEnvNumber("PILOT_MAX_STALE_QUEUE_ENTRIES", 3);
const maxStripeFailures = readEnvNumber("PILOT_MAX_STRIPE_FAILURES", 1);
const maxRpcExceptions = readEnvNumber("PILOT_MAX_RPC_EXCEPTIONS", 3);
const maxOpenCriticalIncidents = readEnvNumber("PILOT_MAX_OPEN_CRITICAL_INCIDENTS", 0);

const supabase = createSupabaseAdminClient();
const metrics = await collectPilotMetrics({
  supabase,
  sinceIso,
  staleThresholdMinutes,
});

const checks = [
  {
    name: "Stale queue entries",
    pass: metrics.staleQueueEntries <= maxStaleQueueEntries,
    actual: metrics.staleQueueEntries,
    threshold: `<= ${maxStaleQueueEntries}`,
  },
  {
    name: "Call completion rate",
    pass: metrics.callCompletionRate >= minCallCompletionRate,
    actual: Number(metrics.callCompletionRate.toFixed(4)),
    threshold: `>= ${minCallCompletionRate}`,
  },
  {
    name: "Open critical incidents",
    pass: metrics.unresolvedCriticalIncidents <= maxOpenCriticalIncidents,
    actual: metrics.unresolvedCriticalIncidents,
    threshold: `<= ${maxOpenCriticalIncidents}`,
  },
  {
    name: "Stripe failures",
    pass: metrics.stripeFailures <= maxStripeFailures,
    actual: metrics.stripeFailures,
    threshold: `<= ${maxStripeFailures}`,
  },
  {
    name: "RPC exceptions",
    pass: metrics.rpcExceptions <= maxRpcExceptions,
    actual: metrics.rpcExceptions,
    threshold: `<= ${maxRpcExceptions}`,
  },
  {
    name: "Daily intake cap",
    pass: metrics.newProfiles <= intakeCapPerDay,
    actual: metrics.newProfiles,
    threshold: `<= ${intakeCapPerDay}`,
  },
];

const failedChecks = checks.filter((check) => !check.pass);
const status = failedChecks.length === 0 ? "PASS" : "FAIL";

console.log(`Pilot daily ops status: ${status}`);
console.log(`Window start: ${metrics.windowStart}`);
console.log(`Queue now: ${metrics.queuedNow} (stale: ${metrics.staleQueueEntries})`);
console.log(
  `Matches: ${metrics.matchesCreated}, decisions: ${metrics.decisionsCompleted}, completion: ${(metrics.callCompletionRate * 100).toFixed(1)}%`,
);
console.log(
  `Mutual sparks: ${metrics.mutualSparks}, chats: ${metrics.chatRoomsCreated}, spark conversion: ${(metrics.sparkConversionRate * 100).toFixed(1)}%`,
);
console.log(
  `Moderation flags: ${metrics.moderationFlags}, unresolved critical: ${metrics.unresolvedCriticalIncidents}`,
);
console.log(`Stripe failures: ${metrics.stripeFailures}, RPC exceptions: ${metrics.rpcExceptions}`);
console.log(`New profiles: ${metrics.newProfiles} (cap ${intakeCapPerDay}/24h)`);

if (failedChecks.length > 0) {
  console.error("Failed checks:");
  for (const check of failedChecks) {
    console.error(`- ${check.name}: actual ${check.actual} (required ${check.threshold})`);
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  status,
  checks,
  metrics,
};

const absoluteReportPath = resolve(process.cwd(), reportPath);
await mkdir(dirname(absoluteReportPath), { recursive: true });
await writeFile(absoluteReportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(`Report written to ${absoluteReportPath}`);

if (failedChecks.length > 0) process.exit(1);
