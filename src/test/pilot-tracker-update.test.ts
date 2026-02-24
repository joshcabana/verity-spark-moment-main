// @vitest-environment node

import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const scriptPath = resolve(process.cwd(), "scripts/pilot-update-tracker.mjs");

const trackerFixture = `# Pilot Tracker (Canberra + Sydney)

## Activations

| Date | New Profiles | Intake Cap | Cap Status | Onboarding Start Rate | Notes |
| --- | ---: | ---: | --- | ---: | --- |
<!-- pilot:auto:activations:start -->
| 2026-02-24 | 0 | 10 | pending | 0% | |
| 2026-02-25 | 0 | 10 | pending | 0% | |
<!-- pilot:auto:activations:end -->

## Retention + Funnel

| Date | Matches Created | Call Completion % | Spark Conversion % | Chat Activation % | Purchases | Notes |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
<!-- pilot:auto:funnel:start -->
| 2026-02-24 | 0 | 0% | 0% | 0% | 0 | |
| 2026-02-25 | 0 | 0% | 0% | 0% | 0 | |
<!-- pilot:auto:funnel:end -->

## Gate Decisions

| Gate | Date | Required Condition | Result | Decision |
| --- | --- | --- | --- | --- |
<!-- pilot:auto:gates:start -->
| Gate A | 2026-02-27 | Reliability stable + zero unresolved critical incidents | pending | pending |
| Gate B | 2026-03-03 | Spark/chat conversion directionally healthy | pending | pending |
| Final | 2026-03-07 | Expand or harden or pause | pending | pending |
<!-- pilot:auto:gates:end -->
`;

const dailyReportFixture = {
  generatedAt: "2026-02-24T00:00:00.000Z",
  status: "PASS",
  checks: [
    { name: "Daily intake cap", threshold: "<= 10", pass: true, actual: 3 },
  ],
  metrics: {
    newProfiles: 3,
    matchesCreated: 2,
    decisionsCompleted: 2,
    callCompletionRate: 1,
    mutualSparks: 1,
    sparkConversionRate: 0.5,
    chatRoomsCreated: 1,
    chatActivationRate: 1,
    messagesSent: 4,
    moderationFlags: 0,
    unresolvedCriticalIncidents: 0,
    stripeFailures: 0,
    stripeProcessed: 1,
    rpcExceptions: 0,
    staleQueueEntries: 0,
    queuedNow: 0,
  },
};

const gateReportFixture = {
  generatedAt: "2026-02-27T00:00:00.000Z",
  gate: "A",
  status: "PASS",
  recommendation: "CONTINUE_TO_GATE_B",
  checks: [],
  metrics: {},
  thresholds: {},
};

const writeJson = (path: string, data: unknown) => {
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, "utf8");
};

const runScript = (args: string[]) =>
  spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
  });

const readRow = (content: string, firstCell: string) => {
  const line = content
    .split("\n")
    .find((value) => value.startsWith(`| ${firstCell} |`));
  return line ?? "";
};

describe("pilot tracker update script", () => {
  it("updates daily and gate sections using report inputs", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "pilot-tracker-"));
    const trackerPath = join(tempDir, "tracker.md");
    const dailyPath = join(tempDir, "daily-ops-2026-02-24.json");
    const gatePath = join(tempDir, "gate-a-2026-02-27.json");

    writeFileSync(trackerPath, trackerFixture, "utf8");
    writeJson(dailyPath, dailyReportFixture);
    writeJson(gatePath, gateReportFixture);

    const dailyResult = runScript([
      "--tracker",
      trackerPath,
      "--daily-report",
      dailyPath,
      "--date",
      "2026-02-24",
    ]);
    expect(dailyResult.status).toBe(0);

    const gateResult = runScript([
      "--tracker",
      trackerPath,
      "--gate-report",
      gatePath,
      "--gate",
      "A",
    ]);
    expect(gateResult.status).toBe(0);

    const updated = readFileSync(trackerPath, "utf8");
    expect(readRow(updated, "2026-02-24")).toContain("| 3 | 10 | ok |");
    expect(updated).toContain("| 2026-02-24 | 2 | 100.0% | 50.0% | 100.0% | 1 |");
    expect(updated).toContain("| Gate A | 2026-02-27 | Reliability stable + zero unresolved critical incidents | PASS | CONTINUE_TO_GATE_B |");
  });

  it("is idempotent when run twice with the same daily report", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "pilot-tracker-idempotent-"));
    const trackerPath = join(tempDir, "tracker.md");
    const dailyPath = join(tempDir, "daily-ops-2026-02-24.json");

    writeFileSync(trackerPath, trackerFixture, "utf8");
    writeJson(dailyPath, dailyReportFixture);

    const first = runScript(["--tracker", trackerPath, "--daily-report", dailyPath, "--date", "2026-02-24"]);
    expect(first.status).toBe(0);
    const once = readFileSync(trackerPath, "utf8");

    const second = runScript(["--tracker", trackerPath, "--daily-report", dailyPath, "--date", "2026-02-24"]);
    expect(second.status).toBe(0);
    const twice = readFileSync(trackerPath, "utf8");

    expect(twice).toBe(once);
    expect(twice.match(/\| 2026-02-24 \| 3 \| 10 \| ok \|/g)?.length ?? 0).toBe(1);
  });

  it("uses explicit --date override for row targeting", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "pilot-tracker-date-"));
    const trackerPath = join(tempDir, "tracker.md");
    const dailyPath = join(tempDir, "daily-ops-2026-02-24.json");

    writeFileSync(trackerPath, trackerFixture, "utf8");
    writeJson(dailyPath, dailyReportFixture);

    const result = runScript([
      "--tracker",
      trackerPath,
      "--daily-report",
      dailyPath,
      "--date",
      "2026-02-25",
    ]);
    expect(result.status).toBe(0);

    const updated = readFileSync(trackerPath, "utf8");
    expect(readRow(updated, "2026-02-25")).toContain("| 3 | 10 | ok |");
    expect(readRow(updated, "2026-02-24")).toContain("| 0 | 10 | pending |");
  });

  it("fails with non-zero exit on missing report file", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "pilot-tracker-missing-"));
    const trackerPath = join(tempDir, "tracker.md");
    const missingPath = join(tempDir, "daily-ops-2026-02-24.json");

    writeFileSync(trackerPath, trackerFixture, "utf8");

    const result = runScript(["--tracker", trackerPath, "--daily-report", missingPath, "--date", "2026-02-24"]);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Failed to read report file");
  });

  it("fails safely on malformed JSON without partially editing tracker", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "pilot-tracker-malformed-"));
    const trackerPath = join(tempDir, "tracker.md");
    const badPath = join(tempDir, "daily-ops-2026-02-24.json");

    writeFileSync(trackerPath, trackerFixture, "utf8");
    writeFileSync(badPath, "{this-is-not-json", "utf8");

    const before = readFileSync(trackerPath, "utf8");
    const result = runScript(["--tracker", trackerPath, "--daily-report", badPath, "--date", "2026-02-24"]);
    const after = readFileSync(trackerPath, "utf8");

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Invalid JSON");
    expect(after).toBe(before);
  });
});
