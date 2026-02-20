#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";

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
const userAEmail = args["user-a-email"] ?? process.env.LIVE_USER_A_EMAIL;
const userAPassword = args["user-a-password"] ?? process.env.LIVE_USER_A_PASSWORD;
const userBEmail = args["user-b-email"] ?? process.env.LIVE_USER_B_EMAIL;
const userBPassword = args["user-b-password"] ?? process.env.LIVE_USER_B_PASSWORD;
const roomId = args["room-id"] ?? `live-e2e-${Date.now()}`;

if (!projectUrl || !anonKey) {
  console.error("Missing project URL or anon key.");
  process.exit(1);
}

if (!userAEmail || !userAPassword || !userBEmail || !userBPassword) {
  console.error("Missing test credentials. Provide LIVE_USER_A_EMAIL/LIVE_USER_A_PASSWORD/LIVE_USER_B_EMAIL/LIVE_USER_B_PASSWORD.");
  process.exit(1);
}

const signIn = async (email, password) => {
  const client = createClient(projectUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session || !data.user) {
    const reason = error?.message ?? "unknown auth error";
    if (reason.toLowerCase().includes("email not confirmed")) {
      throw new Error(`Unable to run E2E because ${email} is not confirmed.`);
    }
    throw new Error(`Failed sign in for ${email}: ${reason}`);
  }

  return {
    email,
    token: data.session.access_token,
    userId: data.user.id,
  };
};

const callFunction = async (fn, token, body) => {
  const response = await fetch(`${projectUrl}/functions/v1/${fn}`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // keep raw text only
  }

  return {
    status: response.status,
    text,
    json,
  };
};

const makeUserClient = (token) =>
  createClient(projectUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

try {
  const userA = await signIn(userAEmail, userAPassword);
  const userB = await signIn(userBEmail, userBPassword);

  const first = await callFunction("find-match", userA.token, { roomId, isWarmup: false });
  const second = await callFunction("find-match", userB.token, { roomId, isWarmup: false });

  if (first.status !== 200 || second.status !== 200) {
    throw new Error(`find-match failed: first=${first.status} second=${second.status}`);
  }

  const matchId = first.json?.matchId || second.json?.matchId;
  if (!matchId) {
    throw new Error(`No matchId returned. first=${first.text} second=${second.text}`);
  }

  const userAClient = makeUserClient(userA.token);
  const userBClient = makeUserClient(userB.token);

  const decisionA = await userAClient.rpc("rpc_submit_match_decision", {
    p_match_id: matchId,
    p_decision: "spark",
    p_note: "E2E A",
  });
  if (decisionA.error) {
    throw new Error(`User A decision failed: ${decisionA.error.message}`);
  }

  const decisionB = await userBClient.rpc("rpc_submit_match_decision", {
    p_match_id: matchId,
    p_decision: "spark",
    p_note: "E2E B",
  });
  if (decisionB.error) {
    throw new Error(`User B decision failed: ${decisionB.error.message}`);
  }

  let chatRoomId = decisionA.data?.chatRoomId || decisionB.data?.chatRoomId;
  if (!chatRoomId) {
    const fallback = await userAClient.from("chat_rooms").select("id").eq("match_id", matchId).maybeSingle();
    if (fallback.error) {
      throw new Error(`Chat room lookup failed: ${fallback.error.message}`);
    }
    chatRoomId = fallback.data?.id;
  }

  if (!chatRoomId) {
    throw new Error("No chat room created after mutual spark.");
  }

  const insertMessage = await userAClient.from("messages").insert({
    chat_room_id: chatRoomId,
    sender_id: userA.userId,
    content: "E2E message from user A",
  });
  if (insertMessage.error) {
    throw new Error(`Message insert failed: ${insertMessage.error.message}`);
  }

  const readByB = await userBClient
    .from("messages")
    .select("id,sender_id,content")
    .eq("chat_room_id", chatRoomId)
    .order("created_at", { ascending: false })
    .limit(5);
  if (readByB.error) {
    throw new Error(`Message read failed: ${readByB.error.message}`);
  }

  console.log("Live authenticated E2E passed.");
  console.log(`roomId=${roomId}`);
  console.log(`matchId=${matchId}`);
  console.log(`chatRoomId=${chatRoomId}`);
  console.log(`messagesSeenByUserB=${JSON.stringify(readByB.data)}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
