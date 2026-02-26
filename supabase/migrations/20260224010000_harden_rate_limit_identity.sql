-- Harden rpc_check_rate_limit identity binding so authenticated callers cannot
-- burn another user's quota by passing arbitrary user IDs.

CREATE OR REPLACE FUNCTION public.rpc_check_rate_limit(
  p_user_id uuid,
  p_endpoint text,
  p_limit integer,
  p_window_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recent_count integer;
  v_cutoff timestamptz;
  v_effective_user_id uuid;
  v_auth_user_id uuid := auth.uid();
BEGIN
  IF p_endpoint IS NULL OR length(trim(p_endpoint)) = 0 THEN
    RAISE EXCEPTION 'Missing endpoint';
  END IF;

  IF p_limit IS NULL OR p_limit <= 0 THEN
    RAISE EXCEPTION 'Invalid rate limit threshold';
  END IF;

  IF p_window_seconds IS NULL OR p_window_seconds <= 0 THEN
    RAISE EXCEPTION 'Invalid rate limit window';
  END IF;

  IF v_auth_user_id IS NOT NULL THEN
    IF p_user_id IS NOT NULL AND p_user_id <> v_auth_user_id THEN
      RAISE EXCEPTION 'Rate limit identity mismatch';
    END IF;
    v_effective_user_id := v_auth_user_id;
  ELSIF auth.role() = 'service_role' THEN
    IF p_user_id IS NULL THEN
      RAISE EXCEPTION 'Missing user id for service role rate limit check';
    END IF;
    v_effective_user_id := p_user_id;
  ELSE
    RAISE EXCEPTION 'Unauthorized rate limit check';
  END IF;

  v_cutoff := now() - make_interval(secs => p_window_seconds);

  SELECT COUNT(*)
    INTO v_recent_count
    FROM public.api_rate_limits
   WHERE user_id = v_effective_user_id
     AND endpoint = p_endpoint
     AND created_at >= v_cutoff;

  IF v_recent_count >= p_limit THEN
    RETURN false;
  END IF;

  INSERT INTO public.api_rate_limits (user_id, endpoint, created_at)
  VALUES (v_effective_user_id, p_endpoint, now());

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_check_rate_limit(uuid, text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_check_rate_limit(uuid, text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_check_rate_limit(uuid, text, integer, integer) TO service_role;
