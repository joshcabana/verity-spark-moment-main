#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { readArg } from "./lib/pilot-metrics.mjs";

const argv = process.argv.slice(2);

const countPerCity = Number(readArg(argv, "--count-per-city", "20"));
const dailyIntakeCap = Number(readArg(argv, "--daily-intake-cap", "10"));
const startDate = readArg(argv, "--start-date", "2026-02-24");
const domain = readArg(argv, "--domain", "verity.date");
const cohort = readArg(argv, "--cohort", "pilot-2026q1");
const wave = readArg(argv, "--wave", "wave-1");
const outPath = readArg(argv, "--out", "docs/pilot/wave1-invites.csv");
const dryRun = argv.includes("--dry-run");

if (!Number.isFinite(countPerCity) || countPerCity <= 0) {
  console.error("Invalid --count-per-city value. Use a positive number.");
  process.exit(1);
}
if (!Number.isFinite(dailyIntakeCap) || dailyIntakeCap <= 0) {
  console.error("Invalid --daily-intake-cap value. Use a positive number.");
  process.exit(1);
}

const cities = [
  { name: "Canberra", slug: "canberra", prefix: "CBR" },
  { name: "Sydney", slug: "sydney", prefix: "SYD" },
];

const addDays = (baseIso, dayOffset) => {
  const date = new Date(`${baseIso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + dayOffset);
  return date.toISOString().slice(0, 10);
};

const queues = cities.map((city) => ({
  ...city,
  pending: Array.from({ length: countPerCity }, (_, index) => {
    const sequence = String(index + 1).padStart(2, "0");
    return {
      invite_id: `${wave}-${city.prefix}-${String(index + 1).padStart(3, "0")}`,
      email: `pilot.${city.slug}${sequence}@${domain}`,
      city: city.name,
      cohort,
      wave,
      status: "queued",
      invite_date: "",
      activated_at: "",
      notes: "",
    };
  }),
}));

const rows = [];
let dayIndex = 0;

while (queues.some((queue) => queue.pending.length > 0)) {
  let sentToday = 0;
  while (sentToday < dailyIntakeCap && queues.some((queue) => queue.pending.length > 0)) {
    for (const queue of queues) {
      if (sentToday >= dailyIntakeCap) break;
      const invite = queue.pending.shift();
      if (!invite) continue;
      invite.invite_date = addDays(startDate, dayIndex);
      rows.push(invite);
      sentToday += 1;
    }
  }
  dayIndex += 1;
}

const header = ["invite_id", "email", "city", "cohort", "wave", "status", "invite_date", "activated_at", "notes"];
const csv = [header.join(","), ...rows.map((row) => header.map((key) => row[key]).join(","))].join("\n");

const invitesByDate = rows.reduce((acc, row) => {
  acc[row.invite_date] = (acc[row.invite_date] ?? 0) + 1;
  return acc;
}, {});

console.log(`Generated ${rows.length} invite rows for ${cohort}/${wave}.`);
for (const [date, count] of Object.entries(invitesByDate)) {
  console.log(`- ${date}: ${count} invites`);
}

if (dryRun) process.exit(0);

const absoluteOutPath = resolve(process.cwd(), outPath);
await mkdir(dirname(absoluteOutPath), { recursive: true });
await writeFile(absoluteOutPath, `${csv}\n`, "utf8");
console.log(`Wrote ${absoluteOutPath}`);
