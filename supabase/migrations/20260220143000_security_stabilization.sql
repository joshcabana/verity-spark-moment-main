-- Security and integrity stabilization

-- 1) Stripe webhook idempotency table
CREATE TABLE IF NOT EXISTS public.stripe_events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'processed', 'failed')),
  payload jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;

-- 2) Selfie verification request log for rate limiting
CREATE TABLE IF NOT EXISTS public.selfie_verification_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.selfie_verification_attempts ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_selfie_verification_attempts_user_time
  ON public.selfie_verification_attempts (user_id, attempted_at DESC);

-- 3) Match queue linkage + anti-zombie guard
ALTER TABLE public.match_queue
  ADD COLUMN IF NOT EXISTS match_id uuid REFERENCES public.matches(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS match_queue_one_waiting_per_user_idx
  ON public.match_queue (user_id)
  WHERE status = 'waiting';

-- 4) Token balance floor
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_tokens_balance_non_negative'
  ) THEN
    ALTER TABLE public.user_tokens
      ADD CONSTRAINT user_tokens_balance_non_negative CHECK (balance >= 0) NOT VALID;
  END IF;
END
$$;

-- 5) Harden direct client mutation policies
DROP POLICY IF EXISTS "Users can update own tokens" ON public.user_tokens;
DROP POLICY IF EXISTS "Users can insert own tokens" ON public.user_tokens;

DROP POLICY IF EXISTS "Users can update own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can insert own subscription" ON public.subscriptions;

DROP POLICY IF EXISTS "Users can update own matches" ON public.matches;
DROP POLICY IF EXISTS "Users can insert matches" ON public.matches;

DROP POLICY IF EXISTS "Users can update own queue entry" ON public.match_queue;
DROP POLICY IF EXISTS "Users can join queue" ON public.match_queue;
DROP POLICY IF EXISTS "Users can leave queue" ON public.match_queue;

-- Keep read access policies unchanged.

-- 6) Atomic token increment/decrement function
CREATE OR REPLACE FUNCTION public.increment_user_tokens(
  p_user_id uuid,
  p_delta integer,
  p_type text,
  p_description text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance integer;
  v_new_balance integer;
BEGIN
  SELECT balance
    INTO v_current_balance
    FROM public.user_tokens
   WHERE user_id = p_user_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Token account not found for user %', p_user_id;
  END IF;

  v_new_balance := v_current_balance + p_delta;
  IF v_new_balance < 0 THEN
    RAISE EXCEPTION 'Insufficient token balance';
  END IF;

  UPDATE public.user_tokens
     SET balance = v_new_balance,
         updated_at = now()
   WHERE user_id = p_user_id;

  INSERT INTO public.token_transactions (user_id, amount, type, description)
  VALUES (p_user_id, p_delta, p_type, p_description);

  RETURN v_new_balance;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_user_tokens(uuid, integer, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_user_tokens(uuid, integer, text, text) TO service_role;

-- 7) Transactional matchmaking RPC
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
  SELECT q.id, q.user_id, q.is_warmup
    INTO v_candidate
    FROM public.match_queue q
   WHERE q.room_id = p_room_id
     AND q.status = 'waiting'
     AND q.is_warmup = v_actual_warmup
     AND q.user_id <> v_user_id
     AND (v_profile.seeking_gender IS NULL OR v_profile.seeking_gender = 'everyone' OR q.gender = v_profile.seeking_gender)
     AND (q.seeking_gender IS NULL OR q.seeking_gender = 'everyone' OR v_profile.gender = q.seeking_gender)
   ORDER BY q.entered_at
   FOR UPDATE SKIP LOCKED
   LIMIT 1;

  -- Fallback to first available.
  IF NOT FOUND THEN
    SELECT q.id, q.user_id, q.is_warmup
      INTO v_candidate
      FROM public.match_queue q
     WHERE q.room_id = p_room_id
       AND q.status = 'waiting'
       AND q.is_warmup = v_actual_warmup
       AND q.user_id <> v_user_id
     ORDER BY q.entered_at
     FOR UPDATE SKIP LOCKED
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

-- 8) Cancel waiting queue entry via RPC (prevents direct table updates)
CREATE OR REPLACE FUNCTION public.rpc_cancel_matchmaking(
  p_queue_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_rows integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.match_queue
     SET status = 'cancelled'
   WHERE user_id = v_user_id
     AND status = 'waiting'
     AND (p_queue_id IS NULL OR id = p_queue_id);

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  RETURN jsonb_build_object('cancelled', v_rows > 0, 'rows', v_rows);
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_cancel_matchmaking(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_cancel_matchmaking(uuid) TO authenticated;

-- 9) Atomic match decision RPC
CREATE OR REPLACE FUNCTION public.rpc_submit_match_decision(
  p_match_id uuid,
  p_decision text,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_match public.matches%ROWTYPE;
  v_is_user1 boolean;
  v_note text;
  v_chat_room_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_decision NOT IN ('spark', 'pass') THEN
    RAISE EXCEPTION 'Invalid decision';
  END IF;

  v_note := NULLIF(trim(COALESCE(p_note, '')), '');
  IF v_note IS NOT NULL THEN
    v_note := left(v_note, 100);
  END IF;

  SELECT *
    INTO v_match
    FROM public.matches
   WHERE id = p_match_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found';
  END IF;

  v_is_user1 := (v_match.user1_id = v_user_id);

  IF NOT v_is_user1 AND v_match.user2_id <> v_user_id THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF v_is_user1 THEN
    UPDATE public.matches
       SET user1_decision = p_decision,
           user1_note = COALESCE(v_note, user1_note)
     WHERE id = p_match_id;
  ELSE
    UPDATE public.matches
       SET user2_decision = p_decision,
           user2_note = COALESCE(v_note, user2_note)
     WHERE id = p_match_id;
  END IF;

  SELECT * INTO v_match
    FROM public.matches
   WHERE id = p_match_id;

  IF v_match.user1_decision IS NOT NULL AND v_match.user2_decision IS NOT NULL THEN
    IF COALESCE(v_match.is_mutual, false) THEN
      INSERT INTO public.chat_rooms (match_id)
      VALUES (p_match_id)
      ON CONFLICT (match_id) DO NOTHING;

      SELECT id INTO v_chat_room_id
        FROM public.chat_rooms
       WHERE match_id = p_match_id;
    END IF;

    RETURN jsonb_build_object(
      'awaitingOther', false,
      'isMutual', COALESCE(v_match.is_mutual, false),
      'chatRoomId', v_chat_room_id
    );
  END IF;

  RETURN jsonb_build_object(
    'awaitingOther', true,
    'isMutual', NULL,
    'chatRoomId', NULL
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_submit_match_decision(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_submit_match_decision(uuid, text, text) TO authenticated;
