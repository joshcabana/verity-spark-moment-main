#!/usr/bin/env bash
set -euo pipefail

PROJECT_REF="${1:-dhtojyslsrnfopzwjbif}"

echo "Linking Supabase project: ${PROJECT_REF}"
npx supabase link --project-ref "${PROJECT_REF}"

echo "Pushing database migrations"
npx supabase db push --linked

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
  npx supabase functions deploy "${fn}" --project-ref "${PROJECT_REF}"
done

echo "Supabase rollout complete for project ${PROJECT_REF}."
