#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { parse } from "csv-parse/sync";

const argv = process.argv.slice(2);
const args = new Set(argv);

const readArg = (flag, fallback) => {
  const index = argv.indexOf(flag);
  if (index === -1) return fallback;
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) return fallback;
  return value;
};

const includeE2EUsers = args.has("--include-e2e-users");
const dryRun = args.has("--dry-run");
const wave1 = args.has("--wave1");

const countPerCityRaw = Number(readArg("--count-per-city", wave1 ? "20" : "4"));
if (!Number.isFinite(countPerCityRaw) || countPerCityRaw <= 0) {
  console.error("Invalid --count-per-city value. Use a positive number.");
  process.exit(1);
}

const countPerCity = Math.trunc(countPerCityRaw);
const cohort = readArg("--cohort", "pilot-2026q1");
const wave = readArg("--wave", wave1 ? "wave-1" : "seed-default");
const defaultPassword = readArg("--password", "VerityPilot!2026");
const domain = readArg("--domain", "verity.date");
const invitesCsvPath = readArg("--invites-csv", "");

const cityConfig = [
  { city: "Canberra", slug: "canberra" },
  { city: "Sydney", slug: "sydney" },
];

const femaleNames = ["Ava", "Mia", "Zoe", "Ruby", "Ella", "Chloe", "Lily", "Grace", "Sophie", "Isla"];
const maleNames = ["Noah", "Liam", "Ethan", "Jack", "Lucas", "Oliver", "Mason", "Henry", "James", "Leo"];
const neutralNames = ["Sam", "Alex", "Jordan", "Taylor", "Kai", "Casey", "Riley", "Morgan", "Ari", "Quinn"];

const buildCandidate = (city, slug, index) => {
  const number = String(index).padStart(2, "0");
  const mode = index % 3;
  const gender = mode === 1 ? "female" : mode === 2 ? "male" : "non-binary";
  const nameSource = gender === "female" ? femaleNames : gender === "male" ? maleNames : neutralNames;
  const name = `${nameSource[(index - 1) % nameSource.length]} ${number}`;
  const seeking = index % 5 === 0 ? "everyone" : gender === "female" ? "male" : "female";

  return {
    email: `pilot.${slug}${number}@${domain}`,
    password: defaultPassword,
    name,
    gender,
    seeking,
    city,
  };
};

const looksLikePlaceholderEmail = (email) =>
  !email ||
  email.includes("REPLACE_WITH_REAL_EMAIL") ||
  email.includes("pilot.") ||
  !email.includes("@");

const loadUsersFromInvitesCsv = (path) => {
  const csvContent = readFileSync(path, "utf8");
  const invites = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
  });

  const cityCounters = new Map();
  const users = [];

  for (const invite of invites) {
    const email = String(invite.email ?? "").trim();
    const city = String(invite.city ?? "").trim();
    if (looksLikePlaceholderEmail(email)) continue;
    if (!city) continue;

    const cityKey = city.toLowerCase();
    const cityIndex = (cityCounters.get(cityKey) ?? 0) + 1;
    cityCounters.set(cityKey, cityIndex);

    const slug = cityKey.replace(/\s+/g, "-");
    const baseCandidate = buildCandidate(city, slug, cityIndex);
    users.push({ ...baseCandidate, email });
  }

  if (users.length === 0) {
    throw new Error(`No real participant emails found in invites CSV: ${path}`);
  }

  return users;
};

const buildPilotUsers = () =>
  cityConfig.flatMap(({ city, slug }) =>
    Array.from({ length: countPerCity }, (_, idx) => buildCandidate(city, slug, idx + 1)),
  );

const pilotUsers = invitesCsvPath ? loadUsersFromInvitesCsv(invitesCsvPath) : buildPilotUsers();
const e2eUsers = [
  { email: "test1@example.com", password: "password123", name: "TestOne", gender: "female", seeking: "male", city: "Canberra" },
  { email: "test2@example.com", password: "password123", name: "TestTwo", gender: "male", seeking: "female", city: "Sydney" },
];

const usersToSeed = includeE2EUsers ? [...pilotUsers, ...e2eUsers] : pilotUsers;

if (dryRun) {
  const byCity = usersToSeed.reduce((acc, user) => {
    acc[user.city] = (acc[user.city] ?? 0) + 1;
    return acc;
  }, {});

  console.log(`Dry run only. Cohort=${cohort} Wave=${wave}`);
  console.log(`Total users: ${usersToSeed.length}`);
  for (const [city, count] of Object.entries(byCity)) {
    console.log(`- ${city}: ${count}`);
  }
  console.log("First 10 users:");
  for (const user of usersToSeed.slice(0, 10)) {
    console.log(`- ${user.email} | ${user.name} | ${user.gender} | seeks ${user.seeking}`);
  }
  process.exit(0);
}

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

const hashPhone = (email) => createHash("sha256").update(`+61400000000:${email.toLowerCase()}`).digest("hex");

const getUserByEmail = async (email) => {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  return data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase()) ?? null;
};

const ensureUser = async (candidate) => {
  const createPayload = {
    email: candidate.email,
    password: candidate.password,
    email_confirm: true,
    user_metadata: {
      city: candidate.city,
      cohort,
      wave,
      source: "seed-pilot-users",
    },
  };

  const created = await admin.auth.admin.createUser(createPayload);
  if (!created.error && created.data.user) {
    return created.data.user;
  }

  const existing = await getUserByEmail(candidate.email);
  if (!existing) {
    throw new Error(`Unable to create or find user ${candidate.email}: ${created.error?.message ?? "unknown error"}`);
  }

  const { data: updated, error: updateError } = await admin.auth.admin.updateUserById(existing.id, {
    password: candidate.password,
    email_confirm: true,
    user_metadata: {
      ...(existing.user_metadata ?? {}),
      city: candidate.city,
      cohort,
      wave,
      source: "seed-pilot-users",
    },
  });
  if (updateError || !updated.user) {
    throw new Error(`Unable to update user ${candidate.email}: ${updateError?.message ?? "unknown error"}`);
  }

  return updated.user;
};

const upsertProfile = async (payload, onConflict) => {
  return admin.from("profiles").upsert(payload, { onConflict });
};

const ensureProfile = async (candidate, userId) => {
  const baseProfilePayload = {
    id: userId,
    user_id: userId,
    display_name: candidate.name,
    gender: candidate.gender,
    bio: `Pilot user from ${candidate.city}`,
    seeking_gender: candidate.seeking,
    verified_phone: true,
    verification_status: "verified",
  };

  const payloadWithCity = {
    ...baseProfilePayload,
    city: candidate.city,
  };

  let result = await upsertProfile(payloadWithCity, "user_id");
  if (result.error && result.error.message.toLowerCase().includes("city")) {
    result = await upsertProfile(baseProfilePayload, "user_id");
  }
  if (result.error) {
    result = await upsertProfile(baseProfilePayload, "id");
  }
  if (result.error) {
    const fallbackUpdate = await admin
      .from("profiles")
      .update({
        display_name: candidate.name,
        gender: candidate.gender,
        bio: `Pilot user from ${candidate.city}`,
        seeking_gender: candidate.seeking,
        verified_phone: true,
        verification_status: "verified",
      })
      .eq("user_id", userId);
    if (fallbackUpdate.error) {
      throw new Error(`Profile upsert failed for ${candidate.email}: ${fallbackUpdate.error.message}`);
    }
  }
};

const ensurePhoneVerification = async (candidate, userId) => {
  const { error } = await admin.from("user_phone_verifications").upsert(
    {
      user_id: userId,
      phone_hash: hashPhone(candidate.email),
      verified_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error && error.message.includes("Could not find the table")) {
    return;
  }
  if (error) {
    throw new Error(`Phone verification upsert failed for ${candidate.email}: ${error.message}`);
  }
};

const ensureTokens = async (candidate, userId) => {
  const { error } = await admin.from("user_tokens").upsert(
    {
      user_id: userId,
      balance: 20,
      free_entries_remaining: 5,
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(`Token upsert failed for ${candidate.email}: ${error.message}`);
};

let successCount = 0;
for (const candidate of usersToSeed) {
  try {
    const user = await ensureUser(candidate);
    await ensureProfile(candidate, user.id);
    await ensurePhoneVerification(candidate, user.id);
    await ensureTokens(candidate, user.id);
    successCount += 1;
    console.log(`Seeded ${candidate.email}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
  }
}

console.log(`Seeding complete: ${successCount}/${usersToSeed.length} users ready.`);
