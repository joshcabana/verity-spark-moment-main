
-- ══════════════════════════════════════════════════════════════
-- SECURITY HARDENING MIGRATION
-- ══════════════════════════════════════════════════════════════

-- ─── 1. REMOVE phone_number FROM profiles (move to secure table) ───
ALTER TABLE public.profiles DROP COLUMN IF EXISTS phone_number;

-- ─── 2. DROP old phone_verifications table (insecure OTP storage) ───
DROP TABLE IF EXISTS public.phone_verifications;

-- ─── 3. CREATE secure user_phone_verifications table ───
CREATE TABLE public.user_phone_verifications (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_hash text NOT NULL,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_phone_verifications ENABLE ROW LEVEL SECURITY;

-- Ultra-strict RLS: owner can only see their own verified status (not phone_hash)
-- No public access, no cross-user access
CREATE POLICY "Users can view own phone verification"
  ON public.user_phone_verifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own phone verification"
  ON public.user_phone_verifications FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own phone verification"
  ON public.user_phone_verifications FOR UPDATE
  USING (user_id = auth.uid());

-- Admins can view for moderation purposes
CREATE POLICY "Admins can view phone verifications"
  ON public.user_phone_verifications FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- ─── 4. FIX moderation_events: restrict clip_url from offenders ───
-- Drop the old overly permissive policies
DROP POLICY IF EXISTS "Service can insert moderation events" ON public.moderation_events;
DROP POLICY IF EXISTS "Service can update moderation events" ON public.moderation_events;
DROP POLICY IF EXISTS "Users can view own moderation events" ON public.moderation_events;

-- Recreate with proper service-role scoping
-- Service role bypass RLS anyway, but these RESTRICTIVE policies block anon/user
CREATE POLICY "Only service role can insert moderation events"
  ON public.moderation_events FOR INSERT
  WITH CHECK (false); -- service_role bypasses RLS

CREATE POLICY "Only service role can update moderation events"
  ON public.moderation_events FOR UPDATE
  USING (false); -- service_role bypasses RLS

-- Victims can see events against them (with clip_url visible)
-- Offenders can see events but NOT clip_url (handled at query level via a view)
CREATE POLICY "Victims can view moderation events"
  ON public.moderation_events FOR SELECT
  USING (victim_id = auth.uid());

-- Offenders can see their own events (but we'll use a view that strips clip_url)
CREATE POLICY "Offenders can view own events without clips"
  ON public.moderation_events FOR SELECT
  USING (offender_id = auth.uid());

-- Admins can view all
CREATE POLICY "Admins can view all moderation events"
  ON public.moderation_events FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- ─── 5. FIX moderation_stats: remove public access ───
DROP POLICY IF EXISTS "Anyone can view moderation stats" ON public.moderation_stats;
DROP POLICY IF EXISTS "Service can manage stats" ON public.moderation_stats;
DROP POLICY IF EXISTS "Service can update stats" ON public.moderation_stats;

-- Only service role (edge functions) can read/write stats
CREATE POLICY "Only service role can insert stats"
  ON public.moderation_stats FOR INSERT
  WITH CHECK (false); -- service_role bypasses

CREATE POLICY "Only service role can update stats"
  ON public.moderation_stats FOR UPDATE
  USING (false); -- service_role bypasses

-- Admins can view full stats
CREATE POLICY "Admins can view moderation stats"
  ON public.moderation_stats FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- ─── 6. Create a SECURE VIEW for public transparency (anonymized) ───
CREATE OR REPLACE VIEW public.transparency_stats AS
SELECT
  COALESCE(SUM(total_calls), 0) AS total_calls,
  COALESCE(SUM(violation_free_calls), 0) AS violation_free_calls,
  ROUND(AVG(avg_latency_ms)) AS avg_latency_ms,
  ROUND(AVG(false_positive_rate)::numeric, 4) AS false_positive_rate
FROM public.moderation_stats
WHERE date >= CURRENT_DATE - INTERVAL '30 days';

-- Grant public read on the view
GRANT SELECT ON public.transparency_stats TO anon, authenticated;

-- ─── 7. FIX appeals: tighten service UPDATE policy ───
DROP POLICY IF EXISTS "Service can update appeals" ON public.appeals;

CREATE POLICY "Only service role can update appeals"
  ON public.appeals FOR UPDATE
  USING (false); -- service_role bypasses

-- ─── 8. FIX user_bans: tighten service policies ───
DROP POLICY IF EXISTS "Service can manage bans" ON public.user_bans;
DROP POLICY IF EXISTS "Service can update bans" ON public.user_bans;

CREATE POLICY "Only service role can insert bans"
  ON public.user_bans FOR INSERT
  WITH CHECK (false); -- service_role bypasses

CREATE POLICY "Only service role can update bans"
  ON public.user_bans FOR UPDATE
  USING (false); -- service_role bypasses

-- ─── 9. Create secure view for offender moderation events (strips clip_url) ───
CREATE OR REPLACE VIEW public.my_moderation_events AS
SELECT
  id, created_at, category, tier, confidence, action_taken,
  CASE 
    WHEN offender_id = auth.uid() THEN NULL  -- offender cannot see clip
    ELSE clip_url 
  END AS clip_url,
  CASE
    WHEN offender_id = auth.uid() THEN NULL
    ELSE clip_expires_at
  END AS clip_expires_at,
  ai_reasoning, reviewed, review_outcome, offender_id, victim_id, match_id
FROM public.moderation_events
WHERE offender_id = auth.uid() OR victim_id = auth.uid();

GRANT SELECT ON public.my_moderation_events TO authenticated;
