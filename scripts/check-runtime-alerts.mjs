import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const LOOKBACK_MINUTES = Number(process.env.ALERT_LOOKBACK_MINUTES ?? "60");
const STRIPE_WEBHOOK_FAILURE_THRESHOLD = Number(process.env.STRIPE_WEBHOOK_FAILURE_THRESHOLD ?? "1");
const RPC_EXCEPTION_THRESHOLD = Number(process.env.RPC_EXCEPTION_THRESHOLD ?? "3");
const MODERATION_STATUS_SPIKE_THRESHOLD = Number(process.env.MODERATION_STATUS_SPIKE_THRESHOLD ?? "20");
const WINDOW_START = new Date(Date.now() - LOOKBACK_MINUTES * 60_000).toISOString();

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const countRows = async (builder, label) => {
  const { count, error } = await builder;
  if (error) {
    console.error(`Failed to query ${label}: ${error.message}`);
    process.exit(1);
  }
  return count ?? 0;
};

const stripeFailures = await countRows(
  supabase
    .from("stripe_events")
    .select("event_id", { count: "exact", head: true })
    .eq("status", "failed")
    .gte("created_at", WINDOW_START),
  "stripe_events",
);

const rpcExceptions = await countRows(
  supabase
    .from("runtime_alert_events")
    .select("id", { count: "exact", head: true })
    .eq("event_type", "rpc_exception")
    .gte("created_at", WINDOW_START),
  "runtime_alert_events (rpc_exception)",
);

const moderationStatusSpikes = await countRows(
  supabase
    .from("runtime_alert_events")
    .select("id", { count: "exact", head: true })
    .in("event_source", ["ai-moderate", "verify-selfie"])
    .in("status_code", [401, 403, 429])
    .gte("created_at", WINDOW_START),
  "runtime_alert_events (moderation auth/rate-limit statuses)",
);

console.log(`Window start: ${WINDOW_START}`);
console.log(`Stripe webhook failures: ${stripeFailures}`);
console.log(`RPC exceptions: ${rpcExceptions}`);
console.log(`Moderation/selfie 401|403|429 events: ${moderationStatusSpikes}`);

const failures = [];

if (stripeFailures >= STRIPE_WEBHOOK_FAILURE_THRESHOLD) {
  failures.push(
    `stripe_events.failed=${stripeFailures} (threshold=${STRIPE_WEBHOOK_FAILURE_THRESHOLD})`,
  );
}

if (rpcExceptions >= RPC_EXCEPTION_THRESHOLD) {
  failures.push(
    `runtime_alert_events.rpc_exception=${rpcExceptions} (threshold=${RPC_EXCEPTION_THRESHOLD})`,
  );
}

if (moderationStatusSpikes >= MODERATION_STATUS_SPIKE_THRESHOLD) {
  failures.push(
    `runtime_alert_events.moderation_status_spike=${moderationStatusSpikes} (threshold=${MODERATION_STATUS_SPIKE_THRESHOLD})`,
  );
}

if (failures.length > 0) {
  console.error("Runtime alert thresholds exceeded:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Runtime alert checks passed.");
