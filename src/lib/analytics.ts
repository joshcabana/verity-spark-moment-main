/**
 * Analytics utility for Verity.
 * Provides a central interface for tracking key user events.
 *
 * Production analytics: Mixpanel (enabled when VITE_MIXPANEL_TOKEN is set).
 * Development: console-only logging (no token required).
 */

export type PilotEventName =
  | "onboarding_started"
  | "queue_entered"
  | "call_started"
  | "call_completed"
  | "spark_created"
  | "post_spark_viewed"
  | "post_spark_feedback_submitted"
  | "spark_again_requested"
  | "identity_reveal_requested"
  | "chat_started"
  | "purchase_completed";

interface PilotBaseProperties {
  city?: string;
  cohort?: string;
  wave?: string;
}

interface PilotEventPropertiesMap {
  onboarding_started: PilotBaseProperties & { entryPoint?: string };
  queue_entered: PilotBaseProperties & { roomId: string; isWarmup: boolean };
  call_started: PilotBaseProperties & { roomId: string; matchId: string };
  call_completed: PilotBaseProperties & {
    roomId: string;
    matchId: string;
    durationSeconds: number;
    extended: boolean;
  };
  spark_created: PilotBaseProperties & { matchId: string };
  post_spark_viewed: PilotBaseProperties & { matchId: string; firstTimeSpark: boolean };
  post_spark_feedback_submitted: PilotBaseProperties & {
    matchId: string;
    sparkOutcome: "continue_chat" | "end_spark" | "spark_again";
    rating: "up" | "down";
  };
  spark_again_requested: PilotBaseProperties & { matchId: string; usedPass: boolean };
  identity_reveal_requested: PilotBaseProperties & { matchId: string };
  chat_started: PilotBaseProperties & { matchId: string; chatRoomId: string };
  purchase_completed: PilotBaseProperties & { source: "stripe_checkout_redirect" };
}

// ---------------------------------------------------------------------------
// Mixpanel lightweight integration (no SDK dependency — uses HTTP API)
// ---------------------------------------------------------------------------

const MIXPANEL_TOKEN = import.meta.env.VITE_MIXPANEL_TOKEN as string | undefined;
const MIXPANEL_API_URL = "https://api.mixpanel.com/track";

/** Whether production analytics are enabled. */
export const isAnalyticsEnabled = (): boolean =>
  typeof MIXPANEL_TOKEN === "string" && MIXPANEL_TOKEN.length > 0;

let _distinctId: string | undefined;

/**
 * Set the Mixpanel distinct_id (call after auth login / signup).
 * If not set, events will be sent as anonymous with a session-level random id.
 */
export const identifyUser = (userId: string, userProperties?: Record<string, unknown>) => {
  _distinctId = userId;

  if (!isAnalyticsEnabled()) return;

  // Send a $identify / $set event to Mixpanel using the Engage API
  const payload = {
    $token: MIXPANEL_TOKEN,
    $distinct_id: userId,
    $set: userProperties ?? {},
  };

  try {
    navigator.sendBeacon(
      "https://api.mixpanel.com/engage#profile-set",
      new Blob([JSON.stringify([payload])], { type: "application/json" }),
    );
  } catch {
    // Silent fail — analytics must never break the app
  }
};

/** Reset identity on logout. */
export const resetAnalytics = () => {
  _distinctId = undefined;
};

const getDistinctId = (): string => {
  if (_distinctId) return _distinctId;
  // Generate a session-level anonymous id
  if (!window.__verity_anon_id) {
    window.__verity_anon_id = crypto.randomUUID();
  }
  return window.__verity_anon_id;
};

// Augment Window to hold anonymous id
declare global {
  interface Window {
    __verity_anon_id?: string;
  }
}

const sendToMixpanel = (eventName: string, properties: Record<string, unknown>) => {
  if (!isAnalyticsEnabled()) return;

  const payload = {
    event: eventName,
    properties: {
      ...properties,
      token: MIXPANEL_TOKEN,
      distinct_id: getDistinctId(),
      time: Math.floor(Date.now() / 1000),
      $insert_id: crypto.randomUUID(),
    },
  };

  try {
    // Use sendBeacon to avoid blocking navigation and guarantee delivery
    const blob = new Blob([JSON.stringify([payload])], { type: "application/json" });
    const sent = navigator.sendBeacon(MIXPANEL_API_URL, blob);

    // Fallback to fetch if sendBeacon fails (e.g. payload too large)
    if (!sent) {
      fetch(MIXPANEL_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([payload]),
        keepalive: true,
      }).catch(() => {
        // Silent — analytics failures must never surface to users
      });
    }
  } catch {
    // Silent fail
  }
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const getPilotMetadata = (userMetadata: unknown): PilotBaseProperties => {
  if (!userMetadata || typeof userMetadata !== "object") {
    return {};
  }

  const metadata = userMetadata as Record<string, unknown>;
  const city = typeof metadata.city === "string" ? metadata.city : undefined;
  const cohort = typeof metadata.cohort === "string" ? metadata.cohort : undefined;
  const wave = typeof metadata.wave === "string" ? metadata.wave : undefined;
  return { city, cohort, wave };
};

export const trackEvent = (eventName: string, properties?: Record<string, unknown>) => {
  const props = properties ?? {};

  // Always log in development for debugging
  if (import.meta.env.DEV) {
    console.log(`[Analytics] ${eventName}`, props);
  }

  // Send to Mixpanel in production (when token is configured)
  sendToMixpanel(eventName, props);
};

export const trackPilotEvent = <TEvent extends PilotEventName>(
  eventName: TEvent,
  properties: PilotEventPropertiesMap[TEvent],
) => {
  trackEvent(eventName, properties);
};
