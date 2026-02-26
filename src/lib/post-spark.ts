import { z } from "zod";

export const SparkOutcomeSchema = z.enum(["continue_chat", "end_spark", "spark_again"]);
export type SparkOutcome = z.infer<typeof SparkOutcomeSchema>;

const FeedbackNoteSchema = z
  .string()
  .max(180, "Note must be 180 characters or fewer")
  .optional()
  .transform((value) => {
    const trimmed = value?.trim() ?? "";
    return trimmed.length > 0 ? trimmed : undefined;
  });

export const PostSparkFeedbackSchema = z.object({
  rating: z.enum(["up", "down"]),
  note: FeedbackNoteSchema,
  sparkOutcome: SparkOutcomeSchema,
});

export const ChatPrefillStateSchema = z.object({
  prefillMessage: z.string().trim().min(1).max(180).optional(),
});

export const IcebreakerPromptSchema = z.object({
  id: z.string().min(1),
  text: z.string().trim().min(1).max(180),
});

const RAW_ICEBREAKER_PROMPTS = [
  { id: "food-memory", text: "What meal instantly reminds you of home?" },
  { id: "micro-adventure", text: "What is your ideal 15-minute spontaneous adventure in this city?" },
  { id: "weekend-energy", text: "Are you recharge-on-the-couch or out-in-the-world on weekends?" },
  { id: "laugh-trigger", text: "What type of humor makes you laugh every time?" },
  { id: "secret-skill", text: "What is one oddly specific skill you are quietly proud of?" },
  { id: "audio-vibe", text: "What song would you pick as your hello soundtrack right now?" },
  { id: "conversation-style", text: "Do you prefer deep talks quickly, or warming up with light banter first?" },
  { id: "local-spot", text: "Which local spot would you take someone to show your personality?" },
];

export const ICEBREAKER_PROMPTS = RAW_ICEBREAKER_PROMPTS.map((prompt) =>
  IcebreakerPromptSchema.parse(prompt),
);

const clampPromptCount = (count: number): number => {
  if (!Number.isFinite(count)) return 3;
  if (count < 3) return 3;
  if (count > 5) return 5;
  return Math.round(count);
};

const hashMatchId = (matchId: string): number => {
  let hash = 0;
  for (let index = 0; index < matchId.length; index += 1) {
    hash = (hash * 31 + matchId.charCodeAt(index)) >>> 0;
  }
  return hash;
};

export const getIcebreakersForMatch = (matchId: string, count = 3) => {
  const safeCount = clampPromptCount(count);
  const pool = ICEBREAKER_PROMPTS;
  if (pool.length <= safeCount) return pool;

  const start = hashMatchId(matchId) % pool.length;
  const picked: z.infer<typeof IcebreakerPromptSchema>[] = [];
  let cursor = start;

  while (picked.length < safeCount) {
    picked.push(pool[cursor]);
    cursor = (cursor + 1) % pool.length;
  }

  return picked;
};
