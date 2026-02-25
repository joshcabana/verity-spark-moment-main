const normalizeGate = (value) => String(value ?? "A").trim().toUpperCase();

const check = ({ name, pass, actual, threshold, category }) => ({
  name,
  pass,
  actual,
  threshold,
  category,
});

const evaluateGateA = ({ metrics, thresholds }) => {
  const checks = [
    check({
      name: "Matches created (sample size)",
      pass: metrics.matchesCreated >= thresholds.gateA.minMatchesCreated,
      actual: metrics.matchesCreated,
      threshold: `>= ${thresholds.gateA.minMatchesCreated}`,
      category: "evidence",
    }),
    check({
      name: "Decisions completed (sample size)",
      pass: metrics.decisionsCompleted >= thresholds.gateA.minDecisionsCompleted,
      actual: metrics.decisionsCompleted,
      threshold: `>= ${thresholds.gateA.minDecisionsCompleted}`,
      category: "evidence",
    }),
    check({
      name: "Call completion rate",
      pass: metrics.callCompletionRate >= thresholds.gateA.minCallCompletionRate,
      actual: Number(metrics.callCompletionRate.toFixed(4)),
      threshold: `>= ${thresholds.gateA.minCallCompletionRate}`,
      category: "reliability",
    }),
    check({
      name: "Stale queue entries",
      pass: metrics.staleQueueEntries <= thresholds.gateA.maxStaleQueueEntries,
      actual: metrics.staleQueueEntries,
      threshold: `<= ${thresholds.gateA.maxStaleQueueEntries}`,
      category: "reliability",
    }),
    check({
      name: "Open critical incidents",
      pass: metrics.unresolvedCriticalIncidents <= thresholds.gateA.maxOpenCriticalIncidents,
      actual: metrics.unresolvedCriticalIncidents,
      threshold: `<= ${thresholds.gateA.maxOpenCriticalIncidents}`,
      category: "reliability",
    }),
    check({
      name: "RPC exceptions",
      pass: metrics.rpcExceptions <= thresholds.gateA.maxRpcExceptions,
      actual: metrics.rpcExceptions,
      threshold: `<= ${thresholds.gateA.maxRpcExceptions}`,
      category: "reliability",
    }),
  ];

  return checks;
};

const evaluateGateB = ({ metrics, thresholds }) => {
  const checks = [
    check({
      name: "Mutual sparks (sample size)",
      pass: metrics.mutualSparks >= thresholds.gateB.minMutualSparks,
      actual: metrics.mutualSparks,
      threshold: `>= ${thresholds.gateB.minMutualSparks}`,
      category: "evidence",
    }),
    check({
      name: "Spark conversion rate",
      pass: metrics.sparkConversionRate >= thresholds.gateB.minSparkConversionRate,
      actual: Number(metrics.sparkConversionRate.toFixed(4)),
      threshold: `>= ${thresholds.gateB.minSparkConversionRate}`,
      category: "conversion",
    }),
    check({
      name: "Chat activation rate",
      pass: metrics.chatActivationRate >= thresholds.gateB.minChatActivationRate,
      actual: Number(metrics.chatActivationRate.toFixed(4)),
      threshold: `>= ${thresholds.gateB.minChatActivationRate}`,
      category: "conversion",
    }),
    check({
      name: "Open critical incidents",
      pass: metrics.unresolvedCriticalIncidents <= thresholds.gateB.maxOpenCriticalIncidents,
      actual: metrics.unresolvedCriticalIncidents,
      threshold: `<= ${thresholds.gateB.maxOpenCriticalIncidents}`,
      category: "reliability",
    }),
  ];

  return checks;
};

const hasFailedCategory = (checks, category) => checks.some((item) => !item.pass && item.category === category);

export const evaluatePilotGate = ({ gate, metrics, thresholds }) => {
  const normalizedGate = normalizeGate(gate);
  if (!["A", "B", "FINAL"].includes(normalizedGate)) {
    throw new Error("Invalid gate value. Use A, B, or FINAL.");
  }

  const gateAResults = evaluateGateA({ metrics, thresholds });
  const gateBResults = evaluateGateB({ metrics, thresholds });

  const gateAPassed = gateAResults.every((result) => result.pass);
  const gateBPassed = gateBResults.every((result) => result.pass);

  const selectedChecks = normalizedGate === "A"
    ? gateAResults
    : normalizedGate === "B"
      ? gateBResults
      : [...gateAResults, ...gateBResults];

  const status = selectedChecks.every((result) => result.pass) ? "PASS" : "FAIL";

  const gateAFailedReliability = hasFailedCategory(gateAResults, "reliability");
  const gateAFailedEvidence = hasFailedCategory(gateAResults, "evidence");
  const gateBFailedReliability = hasFailedCategory(gateBResults, "reliability");
  const gateBFailedEvidence = hasFailedCategory(gateBResults, "evidence");
  const gateBFailedConversion = hasFailedCategory(gateBResults, "conversion");

  let recommendation = "HOLD_HARDENING_SPRINT";
  if (normalizedGate === "A") {
    if (gateAPassed) {
      recommendation = "CONTINUE_TO_GATE_B";
    } else if (gateAFailedReliability) {
      recommendation = "HOLD_FIX_RELIABILITY";
    } else {
      recommendation = "HOLD_COLLECT_EVIDENCE";
    }
  } else if (normalizedGate === "B") {
    if (gateBPassed) {
      recommendation = "CONTINUE_TO_FINAL_GATE";
    } else if (gateBFailedReliability) {
      recommendation = "HOLD_FIX_RELIABILITY";
    } else if (gateBFailedEvidence) {
      recommendation = "HOLD_COLLECT_EVIDENCE";
    } else {
      recommendation = "HOLD_OPTIMIZE_CONVERSION";
    }
  } else if (gateAPassed && gateBPassed) {
    recommendation = "EXPAND_COHORT";
  } else if (gateAFailedReliability) {
    recommendation = "PAUSE_AND_REWORK";
  } else if (gateAFailedEvidence || gateBFailedEvidence) {
    recommendation = "HOLD_COLLECT_EVIDENCE";
  } else if (gateBFailedConversion) {
    recommendation = "HOLD_OPTIMIZE_CONVERSION";
  }

  return {
    gate: normalizedGate,
    checks: selectedChecks,
    status,
    recommendation,
    gateAPassed,
    gateBPassed,
  };
};
