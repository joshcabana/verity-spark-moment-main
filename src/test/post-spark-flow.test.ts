import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { ChatPrefillStateSchema, PostSparkFeedbackSchema, getIcebreakersForMatch } from "@/lib/post-spark";

const readRepoFile = (relativePath: string): string => {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
};

describe("post spark schemas and prompts", () => {
  it("validates feedback payloads and deterministic icebreakers", () => {
    const parsed = PostSparkFeedbackSchema.parse({
      rating: "up",
      note: "  Great energy  ",
      sparkOutcome: "continue_chat",
    });

    expect(parsed.rating).toBe("up");
    expect(parsed.note).toBe("Great energy");
    expect(parsed.sparkOutcome).toBe("continue_chat");

    const invalid = PostSparkFeedbackSchema.safeParse({
      rating: "up",
      note: "x".repeat(181),
      sparkOutcome: "continue_chat",
    });
    expect(invalid.success).toBe(false);

    const promptSetA = getIcebreakersForMatch("match-123", 4);
    const promptSetB = getIcebreakersForMatch("match-123", 4);
    expect(promptSetA).toEqual(promptSetB);
    expect(promptSetA).toHaveLength(4);
    expect(new Set(promptSetA.map((prompt) => prompt.id)).size).toBe(4);

    const state = ChatPrefillStateSchema.parse({ prefillMessage: "What made you smile today?" });
    expect(state.prefillMessage).toBe("What made you smile today?");
  });
});

describe("post spark wiring and lifecycle contracts", () => {
  it("keeps route wiring and migration guards for post spark flow", () => {
    const appRoutes = readRepoFile("src/App.tsx");
    const matchDecision = readRepoFile("src/pages/MatchDecision.tsx");
    const chatPage = readRepoFile("src/pages/Chat.tsx");
    const migration = readRepoFile("supabase/migrations/20260224140000_post_spark_lifecycle.sql");

    expect(appRoutes).toContain('path="/post-spark/:matchId"');
    expect(matchDecision).toContain("navigate(`/post-spark/${matchId}`)");
    expect(chatPage).toContain("ChatPrefillStateSchema");
    expect(chatPage).toContain("prefillMessage");

    expect(migration).toContain("spark_outcome");
    expect(migration).toContain("identity_revealed_at");
    expect(migration).toContain("rematch_match_id");
    expect(migration).toContain("rpc_submit_post_spark_feedback");
    expect(migration).toContain("rpc_request_identity_reveal");
    expect(migration).toContain("rpc_request_spark_again");
    expect(migration).toContain("identity_revealed_at IS NOT NULL");
  });
});
