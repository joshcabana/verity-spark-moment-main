/**
 * Analytics utility for Verity.
 * Provides a central interface for tracking key user events.
 */

export type PilotEventName =
  | "onboarding_started"
  | "queue_entered"
  | "call_started"
  | "call_completed"
  | "spark_created"
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
  chat_started: PilotBaseProperties & { matchId: string; chatRoomId: string };
  purchase_completed: PilotBaseProperties & { source: "stripe_checkout_redirect" };
}

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
  // Console mock for local development
  console.log(`[Analytics] Tracked Event: ${eventName}`, properties || {});

  // Future Integration Point:
  // if (typeof window !== 'undefined' && window.mixpanel) {
  //   window.mixpanel.track(eventName, properties);
  // }
};

export const trackPilotEvent = <TEvent extends PilotEventName>(
  eventName: TEvent,
  properties: PilotEventPropertiesMap[TEvent],
) => {
  trackEvent(eventName, properties);
};
