#!/usr/bin/env node

import { runSupabase } from "./lib/supabase-cli.mjs";

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error("Usage: node scripts/run-supabase.mjs <supabase-cli-args...>");
  process.exit(1);
}

try {
  runSupabase(args, { stdio: "inherit" });
} catch (error) {
  if (error instanceof Error && "stderr" in error) {
    const stderr = String(error.stderr ?? "").trim();
    if (stderr) {
      console.error(stderr);
    }
  } else if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error("Unknown Supabase CLI error");
  }

  const status = error instanceof Error && "status" in error && typeof error.status === "number"
    ? error.status
    : 1;
  process.exit(status);
}

