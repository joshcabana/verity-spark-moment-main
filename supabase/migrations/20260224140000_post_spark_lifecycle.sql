-- Post-Spark lifecycle + trust boundaries

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS spark_outcome text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS spark_outcome_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS identity_revealed_at timestamptz,
  ADD COLUMN IF NOT EXISTS user1_reveal_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS user2_reveal_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS user1_spark_again_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS user2_spark_again_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS rematch_match_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'matches_spark_outcome_check'
  ) THEN
    ALTER TABLE public.matches
      ADD CONSTRAINT matches_spark_outcome_check
      CHECK (spark_outcome IN ('pending', 'continue_chat', 'end_spark', 'spark_again'))
      NOT VALID;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'matches_rematch_match_id_fkey'
  ) THEN
    ALTER TABLE public.matches
      ADD CONSTRAINT matches_rematch_match_id_fkey
      FOREIGN KEY (rematch_match_id)
      REFERENCES public.matches(id)
      ON DELETE SET NULL
      NOT VALID;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_matches_rematch_match_id ON public.matches (rematch_match_id);

CREATE TABLE IF NOT EXISTS public.match_post_spark_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating text NOT NULL CHECK (rating IN ('up', 'down')),
  note text,
  spark_outcome text NOT NULL DEFAULT 'continue_chat'
    CHECK (spark_outcome IN ('continue_chat', 'end_spark', 'spark_again')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT match_post_spark_feedback_note_length CHECK (char_length(COALESCE(note, '')) <= 180),
  CONSTRAINT match_post_spark_feedback_match_user_unique UNIQUE (match_id, user_id)
);

ALTER TABLE public.match_post_spark_feedback ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_match_post_spark_feedback_match_id
  ON public.match_post_spark_feedback (match_id, created_at DESC);

DROP POLICY IF EXISTS "Users can view own post spark feedback" ON public.match_post_spark_feedback;
CREATE POLICY "Users can view own post spark feedback"
  ON public.match_post_spark_feedback FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own post spark feedback" ON public.match_post_spark_feedback;
CREATE POLICY "Users can insert own post spark feedback"
  ON public.match_post_spark_feedback FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND public.is_match_participant(match_id)
  );

DROP POLICY IF EXISTS "Users can update own post spark feedback" ON public.match_post_spark_feedback;
CREATE POLICY "Users can update own post spark feedback"
  ON public.match_post_spark_feedback FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND public.is_match_participant(match_id)
  );

CREATE OR REPLACE FUNCTION public.rpc_submit_post_spark_feedback(
  p_match_id uuid,
  p_rating text,
  p_note text DEFAULT NULL,
  p_spark_outcome text DEFAULT 'continue_chat'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_match public.matches%ROWTYPE;
  v_note text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_rating NOT IN ('up', 'down') THEN
    RAISE EXCEPTION 'Invalid rating';
  END IF;

  IF p_spark_outcome NOT IN ('continue_chat', 'end_spark', 'spark_again') THEN
    RAISE EXCEPTION 'Invalid spark outcome';
  END IF;

  SELECT *
    INTO v_match
    FROM public.matches
   WHERE id = p_match_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found';
  END IF;

  IF v_match.user1_id <> v_user_id AND v_match.user2_id <> v_user_id THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  v_note := NULLIF(trim(COALESCE(p_note, '')), '');
  IF v_note IS NOT NULL THEN
    v_note := left(v_note, 180);
  END IF;

  INSERT INTO public.match_post_spark_feedback (
    match_id,
    user_id,
    rating,
    note,
    spark_outcome,
    updated_at
  )
  VALUES (
    p_match_id,
    v_user_id,
    p_rating,
    v_note,
    p_spark_outcome,
    now()
  )
  ON CONFLICT (match_id, user_id) DO UPDATE
    SET rating = EXCLUDED.rating,
        note = EXCLUDED.note,
        spark_outcome = EXCLUDED.spark_outcome,
        updated_at = now();

  UPDATE public.matches
     SET spark_outcome = p_spark_outcome,
         spark_outcome_updated_at = now()
   WHERE id = p_match_id;

  IF p_rating = 'down' OR v_note IS NOT NULL THEN
    PERFORM public.log_runtime_alert_event(
      p_event_source := 'post-spark-feedback',
      p_event_type := 'user_feedback',
      p_severity := CASE WHEN p_rating = 'down' THEN 'warning' ELSE 'info' END,
      p_user_id := v_user_id,
      p_details := jsonb_build_object(
        'matchId', p_match_id,
        'rating', p_rating,
        'sparkOutcome', p_spark_outcome,
        'note', v_note
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'rating', p_rating,
    'note', v_note,
    'sparkOutcome', p_spark_outcome
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_submit_post_spark_feedback(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_submit_post_spark_feedback(uuid, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.rpc_request_identity_reveal(
  p_match_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_match public.matches%ROWTYPE;
  v_is_subscriber boolean := false;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT *
    INTO v_match
    FROM public.matches
   WHERE id = p_match_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found';
  END IF;

  IF v_match.user1_id <> v_user_id AND v_match.user2_id <> v_user_id THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF COALESCE(v_match.is_mutual, false) = false THEN
    RAISE EXCEPTION 'Identity reveal requires a mutual match';
  END IF;

  v_is_subscriber := EXISTS (
    SELECT 1
    FROM public.subscriptions s
    WHERE s.user_id = v_user_id
      AND s.status = 'active'
      AND s.current_period_end > now()
  );

  IF NOT v_is_subscriber THEN
    RAISE EXCEPTION 'Verity Pass required';
  END IF;

  IF v_match.user1_id = v_user_id THEN
    UPDATE public.matches
       SET user1_reveal_requested_at = COALESCE(user1_reveal_requested_at, now())
     WHERE id = p_match_id;
  ELSE
    UPDATE public.matches
       SET user2_reveal_requested_at = COALESCE(user2_reveal_requested_at, now())
     WHERE id = p_match_id;
  END IF;

  SELECT *
    INTO v_match
    FROM public.matches
   WHERE id = p_match_id
   FOR UPDATE;

  IF v_match.identity_revealed_at IS NULL
     AND v_match.user1_reveal_requested_at IS NOT NULL
     AND v_match.user2_reveal_requested_at IS NOT NULL THEN
    UPDATE public.matches
       SET identity_revealed_at = now()
     WHERE id = p_match_id;
  END IF;

  SELECT *
    INTO v_match
    FROM public.matches
   WHERE id = p_match_id;

  RETURN jsonb_build_object(
    'revealed', v_match.identity_revealed_at IS NOT NULL,
    'awaitingOther', v_match.identity_revealed_at IS NULL,
    'identityRevealedAt', v_match.identity_revealed_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_request_identity_reveal(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_request_identity_reveal(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.rpc_request_spark_again(
  p_match_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_match public.matches%ROWTYPE;
  v_is_subscriber boolean := false;
  v_new_request boolean := false;
  v_new_match_id uuid;
  v_other_user_id uuid;
  v_charged boolean := false;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT *
    INTO v_match
    FROM public.matches
   WHERE id = p_match_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found';
  END IF;

  IF v_match.user1_id <> v_user_id AND v_match.user2_id <> v_user_id THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF COALESCE(v_match.is_mutual, false) = false THEN
    RAISE EXCEPTION 'Spark Again requires a mutual match';
  END IF;

  IF v_match.rematch_match_id IS NOT NULL THEN
    v_other_user_id := CASE WHEN v_match.user1_id = v_user_id THEN v_match.user2_id ELSE v_match.user1_id END;
    RETURN jsonb_build_object(
      'awaitingOther', false,
      'rematchMatchId', v_match.rematch_match_id,
      'roomId', v_match.room_id,
      'otherUserId', v_other_user_id,
      'charged', false
    );
  END IF;

  v_is_subscriber := EXISTS (
    SELECT 1
    FROM public.subscriptions s
    WHERE s.user_id = v_user_id
      AND s.status = 'active'
      AND s.current_period_end > now()
  );

  IF v_match.user1_id = v_user_id THEN
    IF v_match.user1_spark_again_requested_at IS NULL THEN
      UPDATE public.matches
         SET user1_spark_again_requested_at = now()
       WHERE id = p_match_id;
      v_new_request := true;
    END IF;
    v_other_user_id := v_match.user2_id;
  ELSE
    IF v_match.user2_spark_again_requested_at IS NULL THEN
      UPDATE public.matches
         SET user2_spark_again_requested_at = now()
       WHERE id = p_match_id;
      v_new_request := true;
    END IF;
    v_other_user_id := v_match.user1_id;
  END IF;

  IF v_new_request AND NOT v_is_subscriber THEN
    PERFORM public.increment_user_tokens(
      p_user_id := v_user_id,
      p_delta := -1,
      p_type := 'spend',
      p_description := 'Spark Again rematch'
    );
    v_charged := true;
  END IF;

  SELECT *
    INTO v_match
    FROM public.matches
   WHERE id = p_match_id
   FOR UPDATE;

  IF v_match.user1_spark_again_requested_at IS NOT NULL
     AND v_match.user2_spark_again_requested_at IS NOT NULL
     AND v_match.rematch_match_id IS NULL THEN
    INSERT INTO public.matches (user1_id, user2_id, room_id)
    VALUES (v_match.user1_id, v_match.user2_id, v_match.room_id)
    RETURNING id INTO v_new_match_id;

    UPDATE public.matches
       SET rematch_match_id = v_new_match_id,
           spark_outcome = 'spark_again',
           spark_outcome_updated_at = now()
     WHERE id = p_match_id;
  END IF;

  SELECT rematch_match_id
    INTO v_new_match_id
    FROM public.matches
   WHERE id = p_match_id;

  RETURN jsonb_build_object(
    'awaitingOther', v_new_match_id IS NULL,
    'rematchMatchId', v_new_match_id,
    'roomId', v_match.room_id,
    'otherUserId', v_other_user_id,
    'charged', v_charged
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_request_spark_again(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_request_spark_again(uuid) TO authenticated;

DROP POLICY IF EXISTS "Users can view matched profiles" ON public.profiles;
CREATE POLICY "Users can view matched profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.matches
      WHERE is_mutual = true
        AND identity_revealed_at IS NOT NULL
        AND (
          (user1_id = auth.uid() AND user2_id = profiles.user_id) OR
          (user2_id = auth.uid() AND user1_id = profiles.user_id)
        )
    )
  );
