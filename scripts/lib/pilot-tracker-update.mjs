import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const ACTIVATIONS_MARKER = "pilot:auto:activations";
const FUNNEL_MARKER = "pilot:auto:funnel";
const GATES_MARKER = "pilot:auto:gates";

const GATE_LABEL_BY_KEY = {
  A: "Gate A",
  B: "Gate B",
  FINAL: "Final",
};

const REQUIRED_DAILY_METRICS = [
  "newProfiles",
  "matchesCreated",
  "callCompletionRate",
  "sparkConversionRate",
  "chatActivationRate",
  "stripeFailures",
  "stripeProcessed",
  "rpcExceptions",
  "unresolvedCriticalIncidents",
  "messagesSent",
  "chatRoomsCreated",
];

const readJson = async (path) => {
  let raw;
  try {
    raw = await readFile(path, "utf8");
  } catch (error) {
    throw new Error(`Failed to read report file ${path}: ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Invalid JSON in ${path}: ${error instanceof Error ? error.message : String(error)}`);
  }
};

const ensureObject = (value, label) => {
  if (!value || typeof value !== "object") {
    throw new Error(`${label} is missing or invalid`);
  }
};

const ensureDailyReportShape = (report, label) => {
  ensureObject(report, `${label} report`);
  ensureObject(report.metrics, `${label} metrics`);

  for (const key of REQUIRED_DAILY_METRICS) {
    if (typeof report.metrics[key] !== "number" || Number.isNaN(report.metrics[key])) {
      throw new Error(`${label} metrics.${key} is missing or invalid`);
    }
  }

  if (typeof report.status !== "string" || report.status.length === 0) {
    throw new Error(`${label} status is missing or invalid`);
  }
};

const ensureGateReportShape = (report) => {
  ensureObject(report, "Gate report");
  if (typeof report.status !== "string" || report.status.length === 0) {
    throw new Error("Gate report status is missing or invalid");
  }
  if (typeof report.recommendation !== "string" || report.recommendation.length === 0) {
    throw new Error("Gate report recommendation is missing or invalid");
  }
};

const markerStart = (marker) => `<!-- ${marker}:start -->`;
const markerEnd = (marker) => `<!-- ${marker}:end -->`;

const extractSection = (content, marker) => {
  const startTag = markerStart(marker);
  const endTag = markerEnd(marker);
  const start = content.indexOf(startTag);
  const end = content.indexOf(endTag);

  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`Tracker marker block not found for ${marker}`);
  }

  const sectionStart = start + startTag.length;
  const section = content.slice(sectionStart, end);

  return {
    start,
    end,
    startTag,
    endTag,
    section,
  };
};

const parseCells = (line) =>
  line
    .split("|")
    .slice(1, -1)
    .map((cell) => cell.trim());

const toRow = (cells) => `| ${cells.join(" | ")} |`;

const isDataRow = (line) => {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|")) return false;
  if (!trimmed.endsWith("|")) return false;
  return !/^\|\s*[-:\s|]+\|\s*$/.test(trimmed);
};

const readRowsFromSection = (content, marker) => {
  const { section } = extractSection(content, marker);
  return section
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter(isDataRow)
    .map((line) => parseCells(line));
};

const replaceRowsInSection = (content, marker, rows) => {
  const meta = extractSection(content, marker);
  const nextSection = `\n${rows.map((cells) => toRow(cells)).join("\n")}\n`;
  return `${content.slice(0, meta.start)}${meta.startTag}${nextSection}${meta.endTag}${content.slice(meta.end + meta.endTag.length)}`;
};

const upsertDateRow = (rows, date, cells) => {
  const next = rows.map((row) => [...row]);
  const index = next.findIndex((row) => row[0] === date);
  if (index >= 0) {
    next[index] = cells;
  } else {
    next.push(cells);
  }
  next.sort((a, b) => a[0].localeCompare(b[0]));
  return next;
};

const extractDateFromPath = (path) => {
  const match = path.match(/(\d{4}-\d{2}-\d{2})(?=\.json$)/);
  return match?.[1] ?? null;
};

const parseIntakeCap = (checks, fallback = 10) => {
  if (!Array.isArray(checks)) return fallback;
  const check = checks.find((item) => String(item?.name ?? "").toLowerCase() === "daily intake cap");
  if (!check || typeof check.threshold !== "string") return fallback;
  const match = check.threshold.match(/<=\s*(\d+)/);
  if (!match) return fallback;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toPercent = (value) => `${(Math.max(0, Number(value) || 0) * 100).toFixed(1)}%`;

const onboardingStartRate = (newProfiles, matchesCreated) => {
  if (newProfiles <= 0) return "0.0%";
  const ratio = Math.min(1, Math.max(0, matchesCreated / newProfiles));
  return toPercent(ratio);
};

const normalizeGateKey = (value) => {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (normalized === "A" || normalized === "B" || normalized === "FINAL") return normalized;
  return null;
};

export const applyDailyReportToTracker = ({ trackerContent, report, date, defaultIntakeCap = 10 }) => {
  ensureDailyReportShape(report, "Daily");

  const metrics = report.metrics;
  const intakeCap = parseIntakeCap(report.checks, defaultIntakeCap);
  const capStatus = metrics.newProfiles <= intakeCap ? "ok" : "breached";

  const activationNotes = [
    `status=${report.status}`,
    `stripe=${metrics.stripeFailures}`,
    `rpc=${metrics.rpcExceptions}`,
    `critical=${metrics.unresolvedCriticalIncidents}`,
  ].join("; ");

  const funnelNotes = [
    `status=${report.status}`,
    `chats=${metrics.chatRoomsCreated}`,
    `messages=${metrics.messagesSent}`,
  ].join("; ");

  const activationRows = readRowsFromSection(trackerContent, ACTIVATIONS_MARKER);
  const nextActivationRows = upsertDateRow(activationRows, date, [
    date,
    String(metrics.newProfiles),
    String(intakeCap),
    capStatus,
    onboardingStartRate(metrics.newProfiles, metrics.matchesCreated),
    activationNotes,
  ]);
  const withActivations = replaceRowsInSection(trackerContent, ACTIVATIONS_MARKER, nextActivationRows);

  const funnelRows = readRowsFromSection(withActivations, FUNNEL_MARKER);
  const nextFunnelRows = upsertDateRow(funnelRows, date, [
    date,
    String(metrics.matchesCreated),
    toPercent(metrics.callCompletionRate),
    toPercent(metrics.sparkConversionRate),
    toPercent(metrics.chatActivationRate),
    String(metrics.stripeProcessed),
    funnelNotes,
  ]);

  return replaceRowsInSection(withActivations, FUNNEL_MARKER, nextFunnelRows);
};

export const applyGateReportToTracker = ({ trackerContent, report, gate }) => {
  ensureGateReportShape(report);

  const gateKey = normalizeGateKey(gate ?? report.gate);
  if (!gateKey) {
    throw new Error("Gate key is missing or invalid. Use A, B, or FINAL.");
  }

  const gateLabel = GATE_LABEL_BY_KEY[gateKey];
  const rows = readRowsFromSection(trackerContent, GATES_MARKER);
  const rowIndex = rows.findIndex((row) => row[0] === gateLabel);

  if (rowIndex === -1) {
    throw new Error(`Gate row not found in tracker for ${gateLabel}`);
  }

  const nextRows = rows.map((row) => [...row]);
  nextRows[rowIndex][3] = report.status;
  nextRows[rowIndex][4] = report.recommendation;

  return replaceRowsInSection(trackerContent, GATES_MARKER, nextRows);
};

export const updateTrackerFromReports = async ({
  trackerPath = "docs/pilot/tracker.md",
  dailyReportPath,
  gateReportPath,
  date,
  gate,
}) => {
  if (!dailyReportPath && !gateReportPath) {
    throw new Error("Provide at least one input: --daily-report or --gate-report.");
  }

  const resolvedTrackerPath = resolve(process.cwd(), trackerPath);
  let trackerContent;
  try {
    trackerContent = await readFile(resolvedTrackerPath, "utf8");
  } catch (error) {
    throw new Error(`Failed to read tracker ${resolvedTrackerPath}: ${error instanceof Error ? error.message : String(error)}`);
  }

  let nextContent = trackerContent;
  const updates = [];

  if (dailyReportPath) {
    const resolvedDailyPath = resolve(process.cwd(), dailyReportPath);
    const dailyReport = await readJson(resolvedDailyPath);
    const dailyDate = date ?? extractDateFromPath(dailyReportPath);
    if (!dailyDate) {
      throw new Error("Unable to determine report date. Pass --date YYYY-MM-DD.");
    }
    nextContent = applyDailyReportToTracker({
      trackerContent: nextContent,
      report: dailyReport,
      date: dailyDate,
    });
    updates.push(`daily:${dailyDate}`);
  }

  if (gateReportPath) {
    const resolvedGatePath = resolve(process.cwd(), gateReportPath);
    const gateReport = await readJson(resolvedGatePath);
    nextContent = applyGateReportToTracker({
      trackerContent: nextContent,
      report: gateReport,
      gate,
    });
    updates.push(`gate:${normalizeGateKey(gate ?? gateReport.gate) ?? "unknown"}`);
  }

  if (nextContent !== trackerContent) {
    await writeFile(resolvedTrackerPath, nextContent, "utf8");
  }

  return {
    trackerPath: resolvedTrackerPath,
    updates,
    changed: nextContent !== trackerContent,
  };
};
