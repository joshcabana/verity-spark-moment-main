#!/usr/bin/env node

const parseArgs = (argv) => {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = "true";
      continue;
    }
    args[key] = next;
    i += 1;
  }
  return args;
};

const args = parseArgs(process.argv);
const projectUrl = args["project-url"] ?? process.env.LIVE_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const anonKey = args["anon-key"] ?? process.env.LIVE_SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const includeBadJwt = (args["include-bad-jwt"] ?? "true") !== "false";

if (!projectUrl || !anonKey) {
  console.error("Missing project URL or anon key. Use --project-url/--anon-key or LIVE_SUPABASE_URL/LIVE_SUPABASE_ANON_KEY.");
  process.exit(1);
}

const checks = [
  { fn: "ai-moderate", body: { frameBase64: "aGVsbG8=" } },
  { fn: "verify-selfie", body: { imageBase64: "aGVsbG8=" } },
  { fn: "find-match", body: { roomId: "security-smoke" } },
  { fn: "spark-extend", body: { matchId: "00000000-0000-0000-0000-000000000000" } },
  { fn: "agora-token", body: { channelName: "security-smoke" } },
  { fn: "check-subscription", body: {} },
  { fn: "create-checkout", body: { priceId: "price_test" } },
  { fn: "customer-portal", body: {} },
];

const postFunction = async (fn, body, headers) => {
  const response = await fetch(`${projectUrl}/functions/v1/${fn}`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });

  return {
    status: response.status,
    body: await response.text(),
  };
};

const failures = [];

for (const { fn, body } of checks) {
  const unauth = await postFunction(fn, body, {});
  const unauthPass = unauth.status === 401;
  console.log(`[unauth] ${fn} => ${unauth.status}`);
  if (!unauthPass) {
    failures.push(`[unauth] ${fn}: expected 401, got ${unauth.status}, body=${unauth.body}`);
  }

  if (includeBadJwt) {
    const badJwt = await postFunction(fn, body, { Authorization: "Bearer not-a-real-jwt" });
    const badJwtPass = badJwt.status === 401;
    console.log(`[bad-jwt] ${fn} => ${badJwt.status}`);
    if (!badJwtPass) {
      failures.push(`[bad-jwt] ${fn}: expected 401, got ${badJwt.status}, body=${badJwt.body}`);
    }
  }
}

const stripe = await fetch(`${projectUrl}/functions/v1/stripe-webhook`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: "{}",
});
const stripeBody = await stripe.text();
const stripePass = stripe.status >= 400 && stripe.status !== 200;
console.log(`[unsigned-webhook] stripe-webhook => ${stripe.status}`);
if (!stripePass) {
  failures.push(`[unsigned-webhook] stripe-webhook: expected non-200 error, got ${stripe.status}, body=${stripeBody}`);
}

if (failures.length > 0) {
  console.error("Live security smoke failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Live security smoke passed.");
