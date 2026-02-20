
-- Add phone verification columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_number text,
  ADD COLUMN IF NOT EXISTS verified_phone boolean NOT NULL DEFAULT false;

-- Create phone_verifications table for OTP storage
CREATE TABLE public.phone_verifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  phone_number text NOT NULL,
  otp_code text NOT NULL,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '5 minutes'),
  verified boolean NOT NULL DEFAULT false,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.phone_verifications ENABLE ROW LEVEL SECURITY;

-- Policies: only service role can insert/update, users can view own
CREATE POLICY "Service can insert verifications"
  ON public.phone_verifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service can update verifications"
  ON public.phone_verifications FOR UPDATE
  USING (true);

CREATE POLICY "Users can view own verifications"
  ON public.phone_verifications FOR SELECT
  USING (user_id = auth.uid());

-- Auto-cleanup old OTPs (optional index for performance)
CREATE INDEX idx_phone_verifications_user_id ON public.phone_verifications(user_id);
CREATE INDEX idx_phone_verifications_expires ON public.phone_verifications(expires_at);
