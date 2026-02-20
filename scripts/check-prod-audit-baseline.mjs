import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const getArg = (name, fallback = null) => {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] ?? fallback;
};

const hasArg = (name) => process.argv.includes(name);

const baselinePath = resolve(getArg("--baseline", "security/npm-audit-prod-baseline.json"));
const reportPath = resolve(getArg("--report", "security/current-prod-audit.json"));
const updateBaseline = hasArg("--update-baseline");

const runAuditReport = () => {
  try {
    return execSync("npm audit --omit=dev --json", { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (error) {
    if (error?.stdout) {
      return String(error.stdout);
    }
    throw error;
  }
};

const parseAuditFindings = (report) => {
  const findings = new Set();
  const vulnerabilities = report?.vulnerabilities ?? {};

  for (const [packageName, vulnerability] of Object.entries(vulnerabilities)) {
    const severity = vulnerability?.severity;
    if (severity !== "high" && severity !== "critical") continue;

    const via = Array.isArray(vulnerability.via) ? vulnerability.via : [];
    const advisoryIds = via
      .filter((entry) => typeof entry === "object" && entry !== null)
      .map((entry) => entry.source ?? entry.name ?? "unknown");

    if (advisoryIds.length === 0) {
      findings.add(`${packageName}|${severity}|unknown`);
      continue;
    }

    for (const advisoryId of advisoryIds) {
      findings.add(`${packageName}|${severity}|${advisoryId}`);
    }
  }

  return [...findings].sort();
};

const readJson = (filePath, fallback) => {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
};

const writeJson = (filePath, value) => {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
};

const rawAudit = runAuditReport();
const auditReport = JSON.parse(rawAudit || "{}");
const currentFindings = parseAuditFindings(auditReport);

const outputReport = {
  generatedAt: new Date().toISOString(),
  summary: {
    high: auditReport?.metadata?.vulnerabilities?.high ?? 0,
    critical: auditReport?.metadata?.vulnerabilities?.critical ?? 0,
    totalFindings: currentFindings.length,
  },
  findings: currentFindings,
};

writeJson(reportPath, outputReport);

if (updateBaseline) {
  writeJson(baselinePath, outputReport);
  console.log(`Updated audit baseline: ${baselinePath}`);
  process.exit(0);
}

const baseline = readJson(baselinePath, { findings: [] });
const baselineFindings = new Set(Array.isArray(baseline.findings) ? baseline.findings : []);
const newFindings = currentFindings.filter((finding) => !baselineFindings.has(finding));

if (newFindings.length > 0) {
  console.error("New high/critical production advisories detected:");
  for (const finding of newFindings) {
    console.error(`- ${finding}`);
  }
  console.error(`Baseline: ${baselinePath}`);
  console.error(`Current report: ${reportPath}`);
  process.exit(1);
}

console.log(`No new high/critical production advisories. Baseline entries: ${baselineFindings.size}.`);
