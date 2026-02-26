-- Add verified_selfie_at column to profiles, used by verify-selfie edge function
-- to record the timestamp a user passed liveness verification.
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS verified_selfie_at timestamptz;
-- Backfill: any profile already marked verified gets a timestamp of now()
-- so they don't appear un-timestamped after the migration.
UPDATE public.profiles
SET verified_selfie_at = now()
WHERE verification_status = 'verified'
    AND verified_selfie_at IS NULL;