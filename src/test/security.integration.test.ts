// @vitest-environment node

import { createHmac } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

const RUN_INTEGRATION = process.env.RUN_SECURITY_INTEGRATION === "1";
const PROJECT_URL = process.env.INTEGRATION_SUPABASE_URL ?? "https://dhtojyslsrnfopzwjbif.supabase.co";

const ANON_KEY = process.env.INTEGRATION_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.INTEGRATION_SUPABASE_SERVICE_ROLE_KEY;
const TEST_EMAIL = process.env.INTEGRATION_TEST_USER_EMAIL;
const TEST_PASSWORD = process.env.INTEGRATION_TEST_USER_PASSWORD;
const STRIPE_WEBHOOK_SECRET = process.env.INTEGRATION_STRIPE_WEBHOOK_SECRET;

const describeIntegration = RUN_INTEGRATION ? describe : describe.skip;
const hasAuthEnv = Boolean(ANON_KEY && SERVICE_ROLE_KEY && TEST_EMAIL && TEST_PASSWORD);
const hasStripeSecret = Boolean(STRIPE_WEBHOOK_SECRET);

const postFunction = async (name: string, body: unknown, headers: Record<string, string> = {}) => {
  return fetch(`${PROJECT_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
};

describeIntegration("security integration checks", () => {
  it("rejects unauthenticated ai-moderate", async () => {
    const response = await postFunction("ai-moderate", { frameBase64: "aGVsbG8=" });
    expect(response.status).toBe(401);
  });

  it("rejects unauthenticated verify-selfie", async () => {
    const response = await postFunction("verify-selfie", { imageBase64: "aGVsbG8=" });
    expect(response.status).toBe(401);
  });

  it("rejects webhook payloads without stripe signature", async () => {
    const response = await postFunction("stripe-webhook", {});
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  (hasStripeSecret ? it : it.skip)("processes signed webhook once and ignores replay by event id", async () => {
    const eventId = `evt_test_${Date.now()}`;
    const payload = JSON.stringify({
      id: eventId,
      object: "event",
      type: "test.event",
      data: { object: {} },
    });
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = createHmac("sha256", STRIPE_WEBHOOK_SECRET!)
      .update(`${timestamp}.${payload}`)
      .digest("hex");
    const signatureHeader = `t=${timestamp},v1=${signature}`;

    const first = await fetch(`${PROJECT_URL}/functions/v1/stripe-webhook`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "stripe-signature": signatureHeader,
      },
      body: payload,
    });
    const firstBody = await first.json();

    const second = await fetch(`${PROJECT_URL}/functions/v1/stripe-webhook`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "stripe-signature": signatureHeader,
      },
      body: payload,
    });
    const secondBody = await second.json();

    expect(first.status).toBe(200);
    expect(firstBody.received).toBe(true);
    expect(second.status).toBe(200);
    expect(secondBody.duplicate).toBe(true);
  });

  (hasAuthEnv ? it : it.skip)("blocks direct user token balance and subscription mutation attempts", async () => {
    const userClient = createClient(PROJECT_URL, ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const serviceClient = createClient(PROJECT_URL, SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const { data: signInData, error: signInError } = await userClient.auth.signInWithPassword({
      email: TEST_EMAIL!,
      password: TEST_PASSWORD!,
    });
    expect(signInError).toBeNull();
    expect(signInData.user).toBeTruthy();
    const userId = signInData.user!.id;

    const { data: tokenBefore } = await serviceClient
      .from("user_tokens")
      .select("balance")
      .eq("user_id", userId)
      .single();
    expect(tokenBefore).toBeTruthy();

    await userClient
      .from("user_tokens")
      .update({ balance: (tokenBefore?.balance ?? 0) + 999 })
      .eq("user_id", userId);

    const { data: tokenAfter } = await serviceClient
      .from("user_tokens")
      .select("balance")
      .eq("user_id", userId)
      .single();
    expect(tokenAfter?.balance).toBe(tokenBefore?.balance);

    await serviceClient
      .from("subscriptions")
      .upsert(
        {
          user_id: userId,
          status: "active",
        },
        { onConflict: "user_id" },
      );

    await userClient
      .from("subscriptions")
      .update({ status: "cancelled" })
      .eq("user_id", userId);

    const { data: subscriptionAfter } = await serviceClient
      .from("subscriptions")
      .select("status")
      .eq("user_id", userId)
      .single();
    expect(subscriptionAfter?.status).toBe("active");

    await userClient.auth.signOut();
  });
});
