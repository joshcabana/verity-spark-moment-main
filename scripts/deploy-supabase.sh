#!/usr/bin/env bash
set -euo pipefail

PROJECT_REF="${1:-dhtojyslsrnfopzwjbif}"
SECRET_CHECK_MODE="${SUPABASE_SECRET_CHECK_MODE:-full}"
ENV_FILE="${SUPABASE_ENV_FILE:-.env}"

echo "Checking Supabase target alignment for project: ${PROJECT_REF}"
node scripts/check-supabase-target.mjs --project-ref "${PROJECT_REF}" --env-file "${ENV_FILE}"

echo "Checking Supabase secrets for project: ${PROJECT_REF} (mode: ${SECRET_CHECK_MODE})"
node scripts/check-supabase-secrets.mjs --project-ref "${PROJECT_REF}" --mode "${SECRET_CHECK_MODE}"

SUPABASE_CMD=(node scripts/run-supabase.mjs)

echo "Linking Supabase project: ${PROJECT_REF}"
"${SUPABASE_CMD[@]}" link --project-ref "${PROJECT_REF}"

echo "Pushing database migrations"
"${SUPABASE_CMD[@]}" db push --linked

FUNCTIONS=(
  admin-moderation
  agora-token
  ai-moderate
  check-subscription
  create-checkout
  customer-portal
  find-match
  spark-extend
  stripe-webhook
  submit-appeal
  verify-selfie
)

for fn in "${FUNCTIONS[@]}"; do
  echo "Deploying function: ${fn}"
  "${SUPABASE_CMD[@]}" functions deploy "${fn}" --project-ref "${PROJECT_REF}"
done

echo "Supabase rollout complete for project ${PROJECT_REF}."
