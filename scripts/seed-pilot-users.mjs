#!/usr/bin/env node

import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const args = new Set(process.argv.slice(2));
const includeE2EUsers = args.has("--include-e2e-users");

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

const pilotUsers = [
  { email: "pilot.canberra1@verity.date", password: "VerityPilot!2026", name: "Ava", gender: "female", seeking: "male", city: "Canberra" },
  { email: "pilot.canberra2@verity.date", password: "VerityPilot!2026", name: "Mia", gender: "female", seeking: "male", city: "Canberra" },
  { email: "pilot.sydney1@verity.date", password: "VerityPilot!2026", name: "Noah", gender: "male", seeking: "female", city: "Sydney" },
  { email: "pilot.sydney2@verity.date", password: "VerityPilot!2026", name: "Liam", gender: "male", seeking: "female", city: "Sydney" },
  { email: "pilot.canberra3@verity.date", password: "VerityPilot!2026", name: "Zoe", gender: "female", seeking: "everyone", city: "Canberra" },
  { email: "pilot.sydney3@verity.date", password: "VerityPilot!2026", name: "Ethan", gender: "male", seeking: "everyone", city: "Sydney" },
  { email: "pilot.canberra4@verity.date", password: "VerityPilot!2026", name: "Ruby", gender: "female", seeking: "male", city: "Canberra" },
  { email: "pilot.sydney4@verity.date", password: "VerityPilot!2026", name: "Jack", gender: "male", seeking: "female", city: "Sydney" },
];

const e2eUsers = [
  { email: "test1@example.com", password: "password123", name: "TestOne", gender: "female", seeking: "male", city: "Canberra" },
  { email: "test2@example.com", password: "password123", name: "TestTwo", gender: "male", seeking: "female", city: "Sydney" },
];

const usersToSeed = includeE2EUsers ? [...pilotUsers, ...e2eUsers] : pilotUsers;

const hashPhone = (email) => {
  return createHash("sha256").update(`+61400000000:${email.toLowerCase()}`).digest("hex");
};

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
      cohort: "pilot-2026q1",
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
      cohort: "pilot-2026q1",
      source: "seed-pilot-users",
    },
  });
  if (updateError || !updated.user) {
    throw new Error(`Unable to update user ${candidate.email}: ${updateError?.message ?? "unknown error"}`);
  }

  return updated.user;
};

const ensureProfile = async (candidate, userId) => {
  const profilePayload = {
    id: userId,
    user_id: userId,
    name: candidate.name,
    age: 30,
    display_name: candidate.name,
    gender: candidate.gender,
    bio: `Pilot user from ${candidate.city}`,
    looking_for: [candidate.seeking],
    photos: [],
    verified: true,
    banned: false,
    city: candidate.city,
    seeking_gender: candidate.seeking,
    verified_phone: true,
    verification_status: "verified",
  };

  const upsertById = await admin.from("profiles").upsert(profilePayload, { onConflict: "id" });
  if (!upsertById.error) return;

  const fallbackUpdate = await admin
    .from("profiles")
    .update({
      name: candidate.name,
      age: 30,
      display_name: candidate.name,
      gender: candidate.gender,
      bio: `Pilot user from ${candidate.city}`,
      looking_for: [candidate.seeking],
      photos: [],
      verified: true,
      banned: false,
      city: candidate.city,
      seeking_gender: candidate.seeking,
      verified_phone: true,
      verification_status: "verified",
    })
    .eq("user_id", userId);
  if (fallbackUpdate.error) {
    throw new Error(`Profile upsert failed for ${candidate.email}: ${fallbackUpdate.error.message}`);
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
    // Legacy projects may not have this table yet; profile.verified_phone is still the primary gate.
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
