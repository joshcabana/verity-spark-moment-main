-- Enforce Verity Pass subscription benefits in matchmaking:
-- 1. Subscribers get unlimited entries (skip free/token deduction)
-- 2. Subscribers get priority queue placement (ORDER BY priority)
-- 3. Premium rooms require either subscription or 1 token

-- Define which rooms are premium (non-subscribers pay 1 token to enter)
-- Premium rooms: night-owls, tech, creatives, over-35, introverts
-- Free rooms: general

CREATE OR REPLACE FUNCTION public.rpc_enter_matchmaking(
  p_room_id text,
  p_is_warmup boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_profile public.profiles%ROWTYPE;
  v_tokens public.user_tokens%ROWTYPE;
  v_actual_warmup boolean := false;
  v_queue_id uuid;
  v_candidate RECORD;
  v_match_id uuid;
  v_entry_source text;
  v_now timestamptz := now();
  v_is_subscriber boolean := false;
  v_is_premium_room boolean := false;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_room_id IS NULL OR length(trim(p_room_id)) = 0 THEN
    RAISE EXCEPTION 'Missing room id';
  END IF;

  -- Do not allow banned users into matchmaking.
  IF EXISTS (
    SELECT 1
    FROM public.user_bans b
    WHERE b.user_id = v_user_id
      AND b.lifted_at IS NULL
      AND (b.expires_at IS NULL OR b.expires_at > now())
  ) THEN
    RETURN jsonb_build_object('error', 'banned');
  END IF;

  -- Check subscription status.
  v_is_subscriber := EXISTS (
    SELECT 1
    FROM public.subscriptions s
    WHERE s.user_id = v_user_id
      AND s.status = 'active'
      AND s.current_period_end > now()
  );

  -- Determine if this is a premium room.
  v_is_premium_room := p_room_id IN ('night-owls', 'tech', 'creatives', 'over-35', 'introverts');

  -- Cancel stale waiting entries from previous attempts.
  UPDATE public.match_queue
     SET status = 'cancelled'
   WHERE user_id = v_user_id
     AND status = 'waiting';

  SELECT * INTO v_profile
    FROM public.profiles
   WHERE user_id = v_user_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  SELECT * INTO v_tokens
    FROM public.user_tokens
   WHERE user_id = v_user_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Token wallet not found';
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

  -- Entry deduction logic: subscribers get unlimited entries.
  IF v_is_subscriber THEN
    v_entry_source := 'subscription';
    -- Subscribers entering premium rooms: no extra charge (included in pass).
  ELSIF v_is_premium_room THEN
    -- Non-subscribers must pay 1 token for premium rooms (on top of entry cost).
    IF v_tokens.balance < 1 THEN
      RETURN jsonb_build_object(
        'error', 'premium_room_locked',
        'freeEntries', COALESCE(v_tokens.free_entries_remaining, 0),
        'balance', COALESCE(v_tokens.balance, 0)
      );
    END IF;
    -- Deduct premium room fee.
    PERFORM public.increment_user_tokens(v_user_id, -1, 'spend', 'Premium room: ' || p_room_id);
    SELECT * INTO v_tokens FROM public.user_tokens WHERE user_id = v_user_id;

    -- Also deduct entry cost (free first, then token).
    IF v_tokens.free_entries_remaining > 0 THEN
      UPDATE public.user_tokens
         SET free_entries_remaining = free_entries_remaining - 1,
             updated_at = now()
       WHERE user_id = v_user_id
       RETURNING * INTO v_tokens;
      v_entry_source := 'free';
    ELSIF v_tokens.balance > 0 THEN
      PERFORM public.increment_user_tokens(v_user_id, -1, 'spend', 'Call entry');
      SELECT * INTO v_tokens FROM public.user_tokens WHERE user_id = v_user_id;
      v_entry_source := 'token';
    ELSE
      RETURN jsonb_build_object(
        'error', 'no_entries',
        'freeEntries', COALESCE(v_tokens.free_entries_remaining, 0),
        'balance', COALESCE(v_tokens.balance, 0)
      );
    END IF;
  ELSE
    -- Standard room: free entries first, then tokens.
    IF v_tokens.free_entries_remaining > 0 THEN
      UPDATE public.user_tokens
         SET free_entries_remaining = free_entries_remaining - 1,
             updated_at = now()
       WHERE user_id = v_user_id
       RETURNING * INTO v_tokens;
      v_entry_source := 'free';
    ELSIF v_tokens.balance > 0 THEN
      PERFORM public.increment_user_tokens(v_user_id, -1, 'spend', 'Call entry');
      SELECT * INTO v_tokens
        FROM public.user_tokens
       WHERE user_id = v_user_id;
      v_entry_source := 'token';
    ELSE
      RETURN jsonb_build_object(
        'error', 'no_entries',
        'freeEntries', COALESCE(v_tokens.free_entries_remaining, 0),
        'balance', COALESCE(v_tokens.balance, 0)
      );
    END IF;
  END IF;

  INSERT INTO public.match_queue (
    user_id,
    room_id,
    gender,
    seeking_gender,
    is_warmup,
    status
  ) VALUES (
    v_user_id,
    p_room_id,
    v_profile.gender,
    v_profile.seeking_gender,
    v_actual_warmup,
    'waiting'
  )
  RETURNING id INTO v_queue_id;

  -- Prefer compatible candidate first.
  -- Subscribers get priority: they appear first in the queue via ordering.
  SELECT q.id, q.user_id, q.is_warmup
    INTO v_candidate
    FROM public.match_queue q
    LEFT JOIN public.subscriptions sub
      ON sub.user_id = q.user_id
      AND sub.status = 'active'
      AND sub.current_period_end > now()
   WHERE q.room_id = p_room_id
     AND q.status = 'waiting'
     AND q.is_warmup = v_actual_warmup
     AND q.user_id <> v_user_id
     AND (v_profile.seeking_gender IS NULL OR v_profile.seeking_gender = 'everyone' OR q.gender = v_profile.seeking_gender)
     AND (q.seeking_gender IS NULL OR q.seeking_gender = 'everyone' OR v_profile.gender = q.seeking_gender)
   ORDER BY
     CASE WHEN sub.user_id IS NOT NULL THEN 0 ELSE 1 END,
     q.entered_at
   FOR UPDATE OF q SKIP LOCKED
   LIMIT 1;

  -- Fallback to first available (also with subscriber priority).
  IF NOT FOUND THEN
    SELECT q.id, q.user_id, q.is_warmup
      INTO v_candidate
      FROM public.match_queue q
      LEFT JOIN public.subscriptions sub
        ON sub.user_id = q.user_id
        AND sub.status = 'active'
        AND sub.current_period_end > now()
     WHERE q.room_id = p_room_id
       AND q.status = 'waiting'
       AND q.is_warmup = v_actual_warmup
       AND q.user_id <> v_user_id
     ORDER BY
       CASE WHEN sub.user_id IS NOT NULL THEN 0 ELSE 1 END,
       q.entered_at
     FOR UPDATE OF q SKIP LOCKED
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
      'matched', true,
      'matchId', v_match_id,
      'matchedWith', v_candidate.user_id,
      'roomId', p_room_id,
      'queueId', v_queue_id,
      'entrySource', v_entry_source,
      'freeEntries', COALESCE(v_tokens.free_entries_remaining, 0),
      'balance', COALESCE(v_tokens.balance, 0)
    );
  END IF;

  RETURN jsonb_build_object(
    'matched', false,
    'queueId', v_queue_id,
    'roomId', p_room_id,
    'entrySource', v_entry_source,
    'freeEntries', COALESCE(v_tokens.free_entries_remaining, 0),
    'balance', COALESCE(v_tokens.balance, 0)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_enter_matchmaking(text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_enter_matchmaking(text, boolean) TO authenticated;
