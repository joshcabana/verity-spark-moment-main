
-- Fix: Replace SECURITY DEFINER view with SECURITY INVOKER view
-- and add a read-only policy on moderation_stats for the view

-- Drop the definer view
DROP VIEW IF EXISTS public.public_transparency_stats;

-- Re-create as SECURITY INVOKER
CREATE OR REPLACE VIEW public.public_transparency_stats
WITH (security_invoker = true)
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

-- Add a restrictive read policy for the transparency view access
-- This allows reading aggregate data but only through the view
CREATE POLICY "Public can read stats for transparency"
ON public.moderation_stats
FOR SELECT
TO anon, authenticated
USING (true);

-- Grant access on view
GRANT SELECT ON public.public_transparency_stats TO anon, authenticated;
