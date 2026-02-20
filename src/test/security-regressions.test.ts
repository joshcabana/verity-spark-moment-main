import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readRepoFile = (relativePath: string): string => {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
};

describe("security hardening regressions", () => {
  it("keeps JWT verification enabled for all functions except stripe-webhook", () => {
    const configToml = readRepoFile("supabase/config.toml");
    const matches = [...configToml.matchAll(/\[functions\.([^\]]+)\]\s*[\r\n]+verify_jwt\s*=\s*(true|false)/g)];

    expect(matches.length).toBeGreaterThan(0);

    const verifyDisabled = matches
      .filter(([, , verifyJwt]) => verifyJwt === "false")
      .map(([, functionName]) => functionName)
      .sort();

    expect(verifyDisabled).toEqual(["stripe-webhook"]);
  });

  it("requires signed Stripe webhooks and records event idempotency", () => {
    const source = readRepoFile("supabase/functions/stripe-webhook/index.ts");

    expect(source).toContain("STRIPE_WEBHOOK_SECRET");
    expect(source).toContain("Missing stripe-signature header");
    expect(source).toContain("constructEvent(body, signature, webhookSecret)");
    expect(source).toContain('.from("stripe_events")');
    expect(source).toContain("duplicate: true");
  });

  it("derives moderation offender identity from auth context instead of request body", () => {
    const source = readRepoFile("supabase/functions/ai-moderate/index.ts");

    expect(source).toContain('return new Response(JSON.stringify({ error: "Unauthorized" })');
    expect(source).toContain("const offenderId = user.id;");
    expect(source).not.toMatch(/\buserId\b/);
  });

  it("requires auth and rate limits selfie verification", () => {
    const source = readRepoFile("supabase/functions/verify-selfie/index.ts");

    expect(source).toContain('return new Response(JSON.stringify({ error: "Unauthorized" })');
    expect(source).toContain("MAX_ATTEMPTS_PER_WINDOW");
    expect(source).toContain('.from("selfie_verification_attempts")');
    expect(source).toContain("Image too large. Maximum 5MB.");
  });

  it("keeps token integrity and matchmaking RPC protections in migration", () => {
    const migration = readRepoFile("supabase/migrations/20260220143000_security_stabilization.sql");

    expect(migration).toContain("user_tokens_balance_non_negative CHECK (balance >= 0)");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.increment_user_tokens");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.rpc_enter_matchmaking");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.rpc_submit_match_decision");
    expect(migration).toContain("DROP POLICY IF EXISTS \"Users can update own tokens\"");
    expect(migration).toContain("CREATE UNIQUE INDEX IF NOT EXISTS match_queue_one_waiting_per_user_idx");
  });

  it("uses cancelled status for queue timeout cleanup", () => {
    const lobby = readRepoFile("src/pages/Lobby.tsx");
    expect(lobby).toContain('rpc_cancel_matchmaking');
    expect(lobby).not.toContain('"expired"');
  });
});
