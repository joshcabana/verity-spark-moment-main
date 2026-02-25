// @vitest-environment node

import { describe, expect, it } from "vitest";
import { evaluatePilotGate } from "../../scripts/lib/pilot-gate-evaluation.mjs";

const thresholds = {
  gateA: {
    minMatchesCreated: 10,
    minDecisionsCompleted: 10,
    minCallCompletionRate: 0.8,
    maxStaleQueueEntries: 3,
    maxOpenCriticalIncidents: 0,
    maxRpcExceptions: 3,
  },
  gateB: {
    minMutualSparks: 5,
    minSparkConversionRate: 0.2,
    minChatActivationRate: 0.5,
    maxOpenCriticalIncidents: 0,
  },
};

const metrics = {
  matchesCreated: 0,
  decisionsCompleted: 0,
  callCompletionRate: 1,
  staleQueueEntries: 0,
  unresolvedCriticalIncidents: 0,
  rpcExceptions: 0,
  mutualSparks: 0,
  sparkConversionRate: 0,
  chatActivationRate: 0,
};

describe("pilot gate evaluation", () => {
  it("holds Gate A when evidence sample size is missing", () => {
    const result = evaluatePilotGate({
      gate: "A",
      metrics,
      thresholds,
    });

    expect(result.status).toBe("FAIL");
    expect(result.recommendation).toBe("HOLD_COLLECT_EVIDENCE");
    expect(result.checks.find((item) => item.name === "Matches created (sample size)")?.pass).toBe(false);
    expect(result.checks.find((item) => item.name === "Decisions completed (sample size)")?.pass).toBe(false);
  });

  it("prioritizes reliability hold when reliability checks fail", () => {
    const result = evaluatePilotGate({
      gate: "A",
      metrics: {
        ...metrics,
        matchesCreated: 12,
        decisionsCompleted: 12,
        unresolvedCriticalIncidents: 1,
      },
      thresholds,
    });

    expect(result.status).toBe("FAIL");
    expect(result.recommendation).toBe("HOLD_FIX_RELIABILITY");
  });

  it("holds Gate B for insufficient spark evidence even if reliability is clean", () => {
    const result = evaluatePilotGate({
      gate: "B",
      metrics: {
        ...metrics,
        matchesCreated: 20,
        decisionsCompleted: 16,
        callCompletionRate: 0.9,
        mutualSparks: 2,
        sparkConversionRate: 0.3,
        chatActivationRate: 0.8,
      },
      thresholds,
    });

    expect(result.status).toBe("FAIL");
    expect(result.recommendation).toBe("HOLD_COLLECT_EVIDENCE");
    expect(result.checks.find((item) => item.name === "Mutual sparks (sample size)")?.pass).toBe(false);
  });
});
