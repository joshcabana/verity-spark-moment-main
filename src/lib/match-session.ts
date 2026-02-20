export interface VerityMatchSession {
  matchId: string;
  queueId: string;
  matchedWith: string;
  roomId: string;
}

const MATCH_SESSION_KEY = "verity_match";

const isNonEmptyString = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;

export const isVerityMatchSession = (value: unknown): value is VerityMatchSession => {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    isNonEmptyString(record.matchId) &&
    isNonEmptyString(record.queueId) &&
    isNonEmptyString(record.matchedWith) &&
    isNonEmptyString(record.roomId)
  );
};

export const readMatchSession = (): VerityMatchSession | null => {
  const raw = sessionStorage.getItem(MATCH_SESSION_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;
    return isVerityMatchSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const writeMatchSession = (value: VerityMatchSession): void => {
  sessionStorage.setItem(MATCH_SESSION_KEY, JSON.stringify(value));
};

export const clearMatchSession = (): void => {
  sessionStorage.removeItem(MATCH_SESSION_KEY);
};
