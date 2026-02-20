
-- 1. Drop the existing transparency_stats view
DROP VIEW IF EXISTS public.transparency_stats;

-- 2. Remove the overly permissive anon policy on moderation_stats
DROP POLICY IF EXISTS "Authenticated can read stats for transparency view" ON public.moderation_stats;

-- 3. Create a new secure public view with ONLY anonymized aggregates
-- Using SECURITY DEFINER so it can read moderation_stats regardless of caller's RLS
CREATE OR REPLACE VIEW public.public_transparency_stats
WITH (security_invoker = false)
AS
SELECT
  CASE WHEN SUM(total_calls) > 0
    THEN ROUND((SUM(violation_free_calls)::numeric / SUM(total_calls)::numeric) * 100, 1)
    ELSE 0
  END AS violation_free_percentage,
  COALESCE(SUM(total_calls), 0) AS total_calls_last_month,
  ROUND(AVG(avg_latency_ms), 0) AS average_moderation_latency_ms,
  COALESCE(SUM(tier0_actions), 0) AS tier0_count,
  COALESCE(SUM(tier1_warnings), 0) AS tier1_count,
  CASE WHEN SUM(appeals_filed) > 0
    THEN ROUND((SUM(appeals_overturned)::numeric / SUM(appeals_filed)::numeric) * 100, 1)
    ELSE 0
  END AS appeals_success_rate,
  COALESCE(SUM(tier0_actions) + SUM(tier1_warnings), 0) AS total_violations
FROM public.moderation_stats
WHERE date >= (CURRENT_DATE - INTERVAL '30 days');

-- 4. Grant access to anon and authenticated roles on the new view
GRANT SELECT ON public.public_transparency_stats TO anon, authenticated;
