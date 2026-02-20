import { describe, expect, it, beforeEach } from "vitest";
import {
  clearMatchSession,
  isVerityMatchSession,
  readMatchSession,
  writeMatchSession,
  type VerityMatchSession,
} from "@/lib/match-session";

const validSession: VerityMatchSession = {
  matchId: "match-123",
  queueId: "queue-123",
  matchedWith: "user-456",
  roomId: "general",
};

describe("match session utilities", () => {
  beforeEach(() => {
    clearMatchSession();
  });

  it("accepts a complete match session shape", () => {
    expect(isVerityMatchSession(validSession)).toBe(true);
  });

  it("rejects incomplete match session shape", () => {
    expect(
      isVerityMatchSession({
        matchId: "match-123",
        matchedWith: "user-456",
        roomId: "general",
      }),
    ).toBe(false);
  });

  it("writes and reads back a valid session", () => {
    writeMatchSession(validSession);
    expect(readMatchSession()).toEqual(validSession);
  });

  it("returns null for invalid JSON payload", () => {
    sessionStorage.setItem("verity_match", "{bad json}");
    expect(readMatchSession()).toBeNull();
  });

  it("returns null for malformed session payload", () => {
    sessionStorage.setItem(
      "verity_match",
      JSON.stringify({
        matchId: "match-123",
        matchedWith: "user-456",
      }),
    );

    expect(readMatchSession()).toBeNull();
  });
});
