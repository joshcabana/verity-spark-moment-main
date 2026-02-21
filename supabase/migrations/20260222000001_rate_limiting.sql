-- Rate Limiting Configuration
CREATE TABLE IF NOT EXISTS public.api_rate_limits (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
-- Index for fast lookup by user, endpoint, and recent timeframe
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_lookup ON public.api_rate_limits (user_id, endpoint, created_at DESC);
-- Enable RLS (Service role only access via RPC)
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role can manage rate limits" ON public.api_rate_limits;
CREATE POLICY "Service role can manage rate limits" ON public.api_rate_limits FOR ALL TO service_role USING (true) WITH CHECK (true);
-- Atomic Rate Limit Checker RPC
CREATE OR REPLACE FUNCTION public.rpc_check_rate_limit(
        p_user_id uuid,
        p_endpoint text,
        p_limit integer,
        p_window_seconds integer
    ) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER -- Runs as service role to bypass RLS and read auth.users/api_rate_limits
SET search_path = public AS $$
DECLARE v_recent_count integer;
v_cutoff timestamptz;
BEGIN v_cutoff := now() - make_interval(secs => p_window_seconds);
-- Count requests in the rolling window
SELECT COUNT(*) INTO v_recent_count
FROM public.api_rate_limits
WHERE user_id = p_user_id
    AND endpoint = p_endpoint
    AND created_at >= v_cutoff;
IF v_recent_count >= p_limit THEN -- Limit exceeded
RETURN false;
END IF;
-- Allowed: Insert log
INSERT INTO public.api_rate_limits (user_id, endpoint, created_at)
VALUES (p_user_id, p_endpoint, now());
RETURN true;
END;
$$;
-- Grant EXECUTE so authenticated clients (or Edge Functions with User JWT) can call it
REVOKE ALL ON FUNCTION public.rpc_check_rate_limit(uuid, text, integer, integer)
FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_check_rate_limit(uuid, text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_check_rate_limit(uuid, text, integer, integer) TO service_role;
-- Enforce Email Confirmation in Matchmaking
-- We modify rpc_enter_matchmaking to check auth.users directly. 
-- Since it's SECURITY DEFINER, it has the permissions to do this.
CREATE OR REPLACE FUNCTION public.rpc_enter_matchmaking(
        p_room_id text,
        p_is_warmup boolean DEFAULT false
    ) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE v_user_id uuid := auth.uid();
v_profile public.profiles %ROWTYPE;
v_tokens public.user_tokens %ROWTYPE;
v_actual_warmup boolean := false;
v_queue_id uuid;
v_candidate RECORD;
v_match_id uuid;
v_entry_source text;
v_now timestamptz := now();
v_email_confirmed_at timestamptz;
BEGIN IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated';
END IF;
-- Get email confirmation status from auth.users
SELECT email_confirmed_at INTO v_email_confirmed_at
FROM auth.users
WHERE id = v_user_id;
IF v_email_confirmed_at IS NULL THEN RETURN jsonb_build_object('error', 'email_unverified');
END IF;
IF p_room_id IS NULL
OR length(trim(p_room_id)) = 0 THEN RAISE EXCEPTION 'Missing room id';
END IF;
-- Do not allow banned users into matchmaking.
IF EXISTS (
    SELECT 1
    FROM public.user_bans b
    WHERE b.user_id = v_user_id
        AND b.lifted_at IS NULL
        AND (
            b.expires_at IS NULL
            OR b.expires_at > now()
        )
) THEN RETURN jsonb_build_object('error', 'banned');
END IF;
-- Cancel stale waiting entries from previous attempts.
UPDATE public.match_queue
SET status = 'cancelled'
WHERE user_id = v_user_id
    AND status = 'waiting';
SELECT * INTO v_profile
FROM public.profiles
WHERE user_id = v_user_id FOR
UPDATE;
IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found';
END IF;
SELECT * INTO v_tokens
FROM public.user_tokens
WHERE user_id = v_user_id FOR
UPDATE;
IF NOT FOUND THEN RAISE EXCEPTION 'Token wallet not found';
END IF;
-- Weekly free-entry reset now runs server-side.
IF v_tokens.free_entries_reset_at < now() THEN
UPDATE public.user_tokens
SET free_entries_remaining = 5,
    free_entries_reset_at = now() + interval '7 days',
    updated_at = now()
WHERE user_id = v_user_id
RETURNING * INTO v_tokens;
END IF;
v_actual_warmup := COALESCE(p_is_warmup, false)
AND COALESCE(v_profile.warmup_calls_remaining, 0) > 0;
IF v_tokens.free_entries_remaining > 0 THEN
UPDATE public.user_tokens
SET free_entries_remaining = free_entries_remaining - 1,
    updated_at = now()
WHERE user_id = v_user_id
RETURNING * INTO v_tokens;
v_entry_source := 'free';
ELSIF v_tokens.balance > 0 THEN PERFORM public.increment_user_tokens(v_user_id, -1, 'spend', 'Call entry');
SELECT * INTO v_tokens
FROM public.user_tokens
WHERE user_id = v_user_id;
v_entry_source := 'token';
ELSE RETURN jsonb_build_object(
    'error',
    'no_entries',
    'freeEntries',
    COALESCE(v_tokens.free_entries_remaining, 0),
    'balance',
    COALESCE(v_tokens.balance, 0)
);
END IF;
INSERT INTO public.match_queue (
        user_id,
        room_id,
        gender,
        seeking_gender,
        is_warmup,
        status
    )
VALUES (
        v_user_id,
        p_room_id,
        v_profile.gender,
        v_profile.seeking_gender,
        v_actual_warmup,
        'waiting'
    )
RETURNING id INTO v_queue_id;
-- Prefer compatible candidate first.
SELECT q.id,
    q.user_id,
    q.is_warmup INTO v_candidate
FROM public.match_queue q
WHERE q.room_id = p_room_id
    AND q.status = 'waiting'
    AND q.is_warmup = v_actual_warmup
    AND q.user_id <> v_user_id
    AND (
        v_profile.seeking_gender IS NULL
        OR v_profile.seeking_gender = 'everyone'
        OR q.gender = v_profile.seeking_gender
    )
    AND (
        q.seeking_gender IS NULL
        OR q.seeking_gender = 'everyone'
        OR v_profile.gender = q.seeking_gender
    )
ORDER BY q.entered_at FOR
UPDATE SKIP LOCKED
LIMIT 1;
-- Fallback to first available.
IF NOT FOUND THEN
SELECT q.id,
    q.user_id,
    q.is_warmup INTO v_candidate
FROM public.match_queue q
WHERE q.room_id = p_room_id
    AND q.status = 'waiting'
    AND q.is_warmup = v_actual_warmup
    AND q.user_id <> v_user_id
ORDER BY q.entered_at FOR
UPDATE SKIP LOCKED
LIMIT 1;
END IF;
IF FOUND THEN
INSERT INTO public.matches (user1_id, user2_id, room_id)
VALUES (v_user_id, v_candidate.user_id, p_room_id)
RETURNING id INTO v_match_id;
UPDATE public.match_queue
SET status = 'matched',
    matched_with = v_candidate.user_id,
    matched_at = v_now,
    match_id = v_match_id
WHERE id = v_queue_id;
UPDATE public.match_queue
SET status = 'matched',
    matched_with = v_user_id,
    matched_at = v_now,
    match_id = v_match_id
WHERE id = v_candidate.id;
IF v_actual_warmup THEN
UPDATE public.profiles
SET warmup_calls_remaining = GREATEST(0, warmup_calls_remaining - 1)
WHERE user_id = v_user_id;
END IF;
IF COALESCE(v_candidate.is_warmup, false) THEN
UPDATE public.profiles
SET warmup_calls_remaining = GREATEST(0, warmup_calls_remaining - 1)
WHERE user_id = v_candidate.user_id;
END IF;
RETURN jsonb_build_object(
    'matched',
    true,
    'matchId',
    v_match_id,
    'matchedWith',
    v_candidate.user_id,
    'roomId',
    p_room_id,
    'queueId',
    v_queue_id,
    'entrySource',
    v_entry_source,
    'freeEntries',
    COALESCE(v_tokens.free_entries_remaining, 0),
    'balance',
    COALESCE(v_tokens.balance, 0)
);
END IF;
RETURN jsonb_build_object(
    'matched',
    false,
    'queueId',
    v_queue_id,
    'roomId',
    p_room_id,
    'entrySource',
    v_entry_source,
    'freeEntries',
    COALESCE(v_tokens.free_entries_remaining, 0),
    'balance',
    COALESCE(v_tokens.balance, 0)
);
END;
$$;