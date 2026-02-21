import { createClient } from "@supabase/supabase-js";

export const readEnvNumber = (key, fallback) => {
  const value = process.env[key];
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const readArg = (argv, flag, fallback) => {
  const index = argv.indexOf(flag);
  if (index === -1) return fallback;
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) return fallback;
  return value;
};

export const createSupabaseAdminClient = () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }
  return createClient(url, key, { auth: { persistSession: false } });
};

export const isoHoursAgo = (hours) => new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
export const isoMinutesAgo = (minutes) => new Date(Date.now() - minutes * 60 * 1000).toISOString();

const countRows = async (builder, label) => {
  const { count, error } = await builder;
  if (error) throw new Error(`Failed to query ${label}: ${error.message}`);
  return count ?? 0;
};

export const collectPilotMetrics = async ({
  supabase,
  sinceIso,
  staleThresholdMinutes = 15,
}) => {
  const staleSinceIso = isoMinutesAgo(staleThresholdMinutes);

  const queuedNow = await countRows(
    supabase.from("match_queue").select("id", { head: true, count: "exact" }).eq("status", "queued"),
    "match_queue (queued)",
  );

  const staleQueueEntries = await countRows(
    supabase
      .from("match_queue")
      .select("id", { head: true, count: "exact" })
      .eq("status", "queued")
      .lte("entered_at", staleSinceIso),
    "match_queue (stale queued)",
  );

  const matchesCreated = await countRows(
    supabase.from("matches").select("id", { head: true, count: "exact" }).gte("created_at", sinceIso),
    "matches",
  );

  const decisionsCompleted = await countRows(
    supabase
      .from("matches")
      .select("id", { head: true, count: "exact" })
      .gte("created_at", sinceIso)
      .not("user1_decision", "is", null)
      .not("user2_decision", "is", null),
    "matches (decisions completed)",
  );

  const mutualSparks = await countRows(
    supabase
      .from("matches")
      .select("id", { head: true, count: "exact" })
      .gte("created_at", sinceIso)
      .eq("is_mutual", true),
    "matches (mutual sparks)",
  );

  const chatRoomsCreated = await countRows(
    supabase.from("chat_rooms").select("id", { head: true, count: "exact" }).gte("created_at", sinceIso),
    "chat_rooms",
  );

  const messagesSent = await countRows(
    supabase.from("messages").select("id", { head: true, count: "exact" }).gte("created_at", sinceIso),
    "messages",
  );

  const moderationFlags = await countRows(
    supabase.from("moderation_events").select("id", { head: true, count: "exact" }).gte("created_at", sinceIso),
    "moderation_events",
  );

  const unresolvedCriticalIncidents = await countRows(
    supabase
      .from("moderation_events")
      .select("id", { head: true, count: "exact" })
      .eq("tier", 0)
      .eq("reviewed", false),
    "moderation_events (tier0 unresolved)",
  );

  const stripeFailures = await countRows(
    supabase
      .from("stripe_events")
      .select("event_id", { head: true, count: "exact" })
      .eq("status", "failed")
      .gte("created_at", sinceIso),
    "stripe_events (failed)",
  );

  const stripeProcessed = await countRows(
    supabase
      .from("stripe_events")
      .select("event_id", { head: true, count: "exact" })
      .eq("status", "processed")
      .gte("created_at", sinceIso),
    "stripe_events (processed)",
  );

  const rpcExceptions = await countRows(
    supabase
      .from("runtime_alert_events")
      .select("id", { head: true, count: "exact" })
      .eq("event_type", "rpc_exception")
      .gte("created_at", sinceIso),
    "runtime_alert_events (rpc_exception)",
  );

  const newProfiles = await countRows(
    supabase.from("profiles").select("id", { head: true, count: "exact" }).gte("created_at", sinceIso),
    "profiles",
  );

  const callCompletionRate = matchesCreated > 0 ? decisionsCompleted / matchesCreated : 1;
  const sparkConversionRate = decisionsCompleted > 0 ? mutualSparks / decisionsCompleted : 0;
  const chatActivationRate = mutualSparks > 0 ? chatRoomsCreated / mutualSparks : 0;

  return {
    windowStart: sinceIso,
    staleThresholdMinutes,
    queuedNow,
    staleQueueEntries,
    matchesCreated,
    decisionsCompleted,
    callCompletionRate,
    mutualSparks,
    sparkConversionRate,
    chatRoomsCreated,
    chatActivationRate,
    messagesSent,
    moderationFlags,
    unresolvedCriticalIncidents,
    stripeFailures,
    stripeProcessed,
    rpcExceptions,
    newProfiles,
  };
};
