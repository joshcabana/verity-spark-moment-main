
-- Fix SECURITY DEFINER views by recreating as SECURITY INVOKER
DROP VIEW IF EXISTS public.transparency_stats;
DROP VIEW IF EXISTS public.my_moderation_events;

CREATE VIEW public.transparency_stats
WITH (security_invoker = true)
AS
SELECT
  COALESCE(SUM(total_calls), 0) AS total_calls,
  COALESCE(SUM(violation_free_calls), 0) AS violation_free_calls,
  ROUND(AVG(avg_latency_ms)) AS avg_latency_ms,
  ROUND(AVG(false_positive_rate)::numeric, 4) AS false_positive_rate
FROM public.moderation_stats
WHERE date >= CURRENT_DATE - INTERVAL '30 days';

GRANT SELECT ON public.transparency_stats TO anon, authenticated;

CREATE VIEW public.my_moderation_events
WITH (security_invoker = true)
AS
SELECT
  id, created_at, category, tier, confidence, action_taken,
  CASE 
    WHEN offender_id = auth.uid() THEN NULL
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

-- Also add a SELECT policy on moderation_stats so the transparency_stats view
-- can aggregate data for authenticated users (via security invoker)
CREATE POLICY "Authenticated can read stats for transparency view"
  ON public.moderation_stats FOR SELECT
  USING (auth.role() = 'authenticated' OR auth.role() = 'anon');
