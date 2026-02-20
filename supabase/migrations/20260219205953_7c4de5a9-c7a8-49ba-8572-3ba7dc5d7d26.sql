
-- Remove the overly broad policy
DROP POLICY IF EXISTS "Public can read stats for transparency" ON public.moderation_stats;

-- Drop the SECURITY INVOKER view
DROP VIEW IF EXISTS public.public_transparency_stats;

-- Create a SECURITY DEFINER function that returns only aggregated stats
-- This is the accepted pattern: functions with SECURITY DEFINER + set search_path
CREATE OR REPLACE FUNCTION public.get_public_transparency_stats()
RETURNS TABLE (
  violation_free_percentage numeric,
  total_calls_last_month bigint,
  average_moderation_latency_ms numeric,
  tier0_count bigint,
  tier1_count bigint,
  appeals_success_rate numeric,
  total_violations bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE WHEN SUM(total_calls) > 0
      THEN ROUND((SUM(violation_free_calls)::numeric / SUM(total_calls)::numeric) * 100, 1)
      ELSE 0::numeric
    END AS violation_free_percentage,
    COALESCE(SUM(total_calls)::bigint, 0::bigint) AS total_calls_last_month,
    ROUND(AVG(avg_latency_ms), 0) AS average_moderation_latency_ms,
    COALESCE(SUM(tier0_actions)::bigint, 0::bigint) AS tier0_count,
    COALESCE(SUM(tier1_warnings)::bigint, 0::bigint) AS tier1_count,
    CASE WHEN SUM(appeals_filed) > 0
      THEN ROUND((SUM(appeals_overturned)::numeric / SUM(appeals_filed)::numeric) * 100, 1)
      ELSE 0::numeric
    END AS appeals_success_rate,
    COALESCE((SUM(tier0_actions) + SUM(tier1_warnings))::bigint, 0::bigint) AS total_violations
  FROM public.moderation_stats
  WHERE date >= (CURRENT_DATE - INTERVAL '30 days');
$$;

-- Grant execute to anon and authenticated
GRANT EXECUTE ON FUNCTION public.get_public_transparency_stats() TO anon, authenticated;
