-- Legacy schema reconciliation for environments that were provisioned from an older Verity schema.
-- This migration is additive/idempotent and avoids destructive drops so we can safely apply
-- the security hardening migrations that follow.

-- ---------------------------------------------------------------------------
-- 1) Roles helper
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX IF NOT EXISTS user_roles_user_role_idx ON public.user_roles (user_id, role);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------------
-- 2) Core profile + tokens schema
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE,
  display_name text,
  bio text,
  date_of_birth date,
  gender text,
  seeking_gender text,
  verification_status text DEFAULT 'unverified',
  selfie_url text,
  avatar_emoji text,
  warmup_calls_remaining integer DEFAULT 3,
  government_id_url text,
  government_id_status text DEFAULT 'none',
  phone_number text,
  verified_phone boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS seeking_gender text,
  ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS selfie_url text,
  ADD COLUMN IF NOT EXISTS avatar_emoji text,
  ADD COLUMN IF NOT EXISTS warmup_calls_remaining integer DEFAULT 3,
  ADD COLUMN IF NOT EXISTS government_id_url text,
  ADD COLUMN IF NOT EXISTS government_id_status text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS phone_number text,
  ADD COLUMN IF NOT EXISTS verified_phone boolean NOT NULL DEFAULT false;

ALTER TABLE public.profiles
  ALTER COLUMN verification_status SET DEFAULT 'unverified',
  ALTER COLUMN warmup_calls_remaining SET DEFAULT 3,
  ALTER COLUMN government_id_status SET DEFAULT 'none';

-- Backfill user_id when legacy profile IDs already match auth.users IDs.
UPDATE public.profiles p
SET user_id = p.id
WHERE p.user_id IS NULL
  AND EXISTS (
    SELECT 1
    FROM auth.users u
    WHERE u.id = p.id
  );

CREATE UNIQUE INDEX IF NOT EXISTS profiles_user_id_unique_idx
  ON public.profiles (user_id)
  WHERE user_id IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_user_id_fkey'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES auth.users(id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_gender_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_gender_check
      CHECK (gender IN ('male', 'female', 'non-binary', 'other'))
      NOT VALID;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_seeking_gender_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_seeking_gender_check
      CHECK (seeking_gender IN ('male', 'female', 'everyone'))
      NOT VALID;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_verification_status_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_verification_status_check
      CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected'))
      NOT VALID;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.user_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  balance integer NOT NULL DEFAULT 0,
  free_entries_remaining integer NOT NULL DEFAULT 5,
  free_entries_reset_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_tokens ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.token_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  type text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.token_transactions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'token_transactions_type_check'
  ) THEN
    ALTER TABLE public.token_transactions
      ADD CONSTRAINT token_transactions_type_check
      CHECK (type IN ('purchase', 'free_grant', 'spend', 'refund', 'subscription'))
      NOT VALID;
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- 3) Matchmaking schema
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id uuid,
  user1_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  user2_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  user1_decision text,
  user2_decision text,
  user1_note text,
  user2_note text,
  is_mutual boolean NOT NULL DEFAULT false,
  room_id text NOT NULL DEFAULT 'general',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS call_id uuid,
  ADD COLUMN IF NOT EXISTS user1_decision text,
  ADD COLUMN IF NOT EXISTS user2_decision text,
  ADD COLUMN IF NOT EXISTS user1_note text,
  ADD COLUMN IF NOT EXISTS user2_note text,
  ADD COLUMN IF NOT EXISTS room_id text DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS is_mutual boolean DEFAULT false;

ALTER TABLE public.matches
  ALTER COLUMN room_id SET DEFAULT 'general';

UPDATE public.matches
SET room_id = 'general'
WHERE room_id IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'matches_user1_decision_check'
  ) THEN
    ALTER TABLE public.matches
      ADD CONSTRAINT matches_user1_decision_check
      CHECK (user1_decision IN ('spark', 'pass'))
      NOT VALID;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'matches_user2_decision_check'
  ) THEN
    ALTER TABLE public.matches
      ADD CONSTRAINT matches_user2_decision_check
      CHECK (user2_decision IN ('spark', 'pass'))
      NOT VALID;
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.sync_match_mutual_flag()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.is_mutual := (
    NEW.user1_decision = 'spark'
    AND NEW.user2_decision = 'spark'
  );
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_sync_match_mutual_flag'
  ) THEN
    CREATE TRIGGER trg_sync_match_mutual_flag
      BEFORE INSERT OR UPDATE OF user1_decision, user2_decision
      ON public.matches
      FOR EACH ROW
      EXECUTE FUNCTION public.sync_match_mutual_flag();
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.match_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  room_id text NOT NULL DEFAULT 'general',
  gender text,
  seeking_gender text,
  is_warmup boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'waiting',
  entered_at timestamptz NOT NULL DEFAULT now(),
  matched_at timestamptz,
  matched_with uuid REFERENCES auth.users(id),
  match_id uuid
);

ALTER TABLE public.match_queue ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'match_queue_status_check'
  ) THEN
    ALTER TABLE public.match_queue
      ADD CONSTRAINT match_queue_status_check
      CHECK (status IN ('waiting', 'matched', 'cancelled'))
      NOT VALID;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'match_queue_match_id_fkey'
  ) THEN
    ALTER TABLE public.match_queue
      ADD CONSTRAINT match_queue_match_id_fkey
      FOREIGN KEY (match_id)
      REFERENCES public.matches(id)
      ON DELETE SET NULL
      NOT VALID;
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS match_queue_one_waiting_per_user_idx
  ON public.match_queue (user_id)
  WHERE status = 'waiting';

CREATE TABLE IF NOT EXISTS public.chat_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL UNIQUE REFERENCES public.matches(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_room_id uuid REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  content text,
  match_id uuid,
  from_user uuid,
  message_text text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS chat_room_id uuid REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS sender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS content text;

UPDATE public.messages
SET sender_id = from_user
WHERE sender_id IS NULL
  AND from_user IS NOT NULL;

UPDATE public.messages
SET content = message_text
WHERE content IS NULL
  AND message_text IS NOT NULL;

UPDATE public.messages m
SET chat_room_id = cr.id
FROM public.chat_rooms cr
WHERE m.chat_room_id IS NULL
  AND m.match_id IS NOT NULL
  AND cr.match_id = m.match_id;

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text NOT NULL DEFAULT 'inactive',
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'subscriptions_status_check'
  ) THEN
    ALTER TABLE public.subscriptions
      ADD CONSTRAINT subscriptions_status_check
      CHECK (status IN ('active', 'inactive', 'cancelled', 'past_due'))
      NOT VALID;
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- 4) Moderation schema
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.moderation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id uuid,
  match_id uuid,
  offender_id uuid NOT NULL,
  victim_id uuid,
  tier integer NOT NULL DEFAULT 1,
  category text NOT NULL,
  confidence numeric(5,4) NOT NULL DEFAULT 0,
  action_taken text NOT NULL DEFAULT 'warning',
  ai_reasoning text,
  clip_url text,
  clip_expires_at timestamptz,
  reviewed boolean NOT NULL DEFAULT false,
  reviewed_by text,
  reviewed_at timestamptz,
  review_outcome text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.moderation_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.appeals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  moderation_event_id uuid NOT NULL REFERENCES public.moderation_events(id),
  user_id uuid NOT NULL,
  appeal_text text,
  voice_note_url text,
  status text NOT NULL DEFAULT 'pending',
  resolution_text text,
  apology_tokens_awarded integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

ALTER TABLE public.appeals ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.user_bans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reason text NOT NULL,
  moderation_event_id uuid REFERENCES public.moderation_events(id),
  ban_type text NOT NULL DEFAULT 'temporary',
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  lifted_at timestamptz
);

ALTER TABLE public.user_bans ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.moderation_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL DEFAULT CURRENT_DATE,
  total_calls integer NOT NULL DEFAULT 0,
  violation_free_calls integer NOT NULL DEFAULT 0,
  tier0_actions integer NOT NULL DEFAULT 0,
  tier1_warnings integer NOT NULL DEFAULT 0,
  safe_exits integer NOT NULL DEFAULT 0,
  appeals_filed integer NOT NULL DEFAULT 0,
  appeals_overturned integer NOT NULL DEFAULT 0,
  avg_latency_ms integer NOT NULL DEFAULT 0,
  false_positive_rate numeric(5,4) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (date)
);

ALTER TABLE public.moderation_stats ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 5) Helper functions for policy checks
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_match_participant(_match_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.matches
    WHERE id = _match_id
      AND (user1_id = auth.uid() OR user2_id = auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION public.is_chat_participant(_chat_room_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chat_rooms cr
    JOIN public.matches m ON m.id = cr.match_id
    WHERE cr.id = _chat_room_id
      AND (m.user1_id = auth.uid() OR m.user2_id = auth.uid())
  );
$$;

-- ---------------------------------------------------------------------------
-- 6) Baseline RLS policy names expected by later hardening migrations
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view matched profiles" ON public.profiles;
CREATE POLICY "Users can view matched profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.matches
      WHERE is_mutual = true
        AND (
          (user1_id = auth.uid() AND user2_id = profiles.user_id) OR
          (user2_id = auth.uid() AND user1_id = profiles.user_id)
        )
    )
  );

DROP POLICY IF EXISTS "Users can view own tokens" ON public.user_tokens;
CREATE POLICY "Users can view own tokens"
  ON public.user_tokens FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own tokens" ON public.user_tokens;
CREATE POLICY "Users can insert own tokens"
  ON public.user_tokens FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own tokens" ON public.user_tokens;
CREATE POLICY "Users can update own tokens"
  ON public.user_tokens FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view own transactions" ON public.token_transactions;
CREATE POLICY "Users can view own transactions"
  ON public.token_transactions FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own transactions" ON public.token_transactions;
CREATE POLICY "Users can insert own transactions"
  ON public.token_transactions FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view own queue entry" ON public.match_queue;
CREATE POLICY "Users can view own queue entry"
  ON public.match_queue FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can join queue" ON public.match_queue;
CREATE POLICY "Users can join queue"
  ON public.match_queue FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own queue entry" ON public.match_queue;
CREATE POLICY "Users can update own queue entry"
  ON public.match_queue FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can leave queue" ON public.match_queue;
CREATE POLICY "Users can leave queue"
  ON public.match_queue FOR DELETE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view own matches" ON public.matches;
CREATE POLICY "Users can view own matches"
  ON public.matches FOR SELECT
  USING (user1_id = auth.uid() OR user2_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert matches" ON public.matches;
CREATE POLICY "Users can insert matches"
  ON public.matches FOR INSERT
  WITH CHECK (user1_id = auth.uid() OR user2_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own matches" ON public.matches;
CREATE POLICY "Users can update own matches"
  ON public.matches FOR UPDATE
  USING (user1_id = auth.uid() OR user2_id = auth.uid());

DROP POLICY IF EXISTS "Participants can view chat rooms" ON public.chat_rooms;
CREATE POLICY "Participants can view chat rooms"
  ON public.chat_rooms FOR SELECT
  USING (public.is_chat_participant(id));

DROP POLICY IF EXISTS "System can create chat rooms" ON public.chat_rooms;
CREATE POLICY "System can create chat rooms"
  ON public.chat_rooms FOR INSERT
  WITH CHECK (public.is_match_participant(match_id));

DROP POLICY IF EXISTS "Participants can view messages" ON public.messages;
CREATE POLICY "Participants can view messages"
  ON public.messages FOR SELECT
  USING (public.is_chat_participant(chat_room_id));

DROP POLICY IF EXISTS "Participants can send messages" ON public.messages;
CREATE POLICY "Participants can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND public.is_chat_participant(chat_room_id)
  );

DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
CREATE POLICY "Users can view own subscription"
  ON public.subscriptions FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own subscription" ON public.subscriptions;
CREATE POLICY "Users can insert own subscription"
  ON public.subscriptions FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own subscription" ON public.subscriptions;
CREATE POLICY "Users can update own subscription"
  ON public.subscriptions FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view own moderation events" ON public.moderation_events;
CREATE POLICY "Users can view own moderation events"
  ON public.moderation_events FOR SELECT
  USING (offender_id = auth.uid() OR victim_id = auth.uid());

DROP POLICY IF EXISTS "Service can insert moderation events" ON public.moderation_events;
CREATE POLICY "Service can insert moderation events"
  ON public.moderation_events FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service can update moderation events" ON public.moderation_events;
CREATE POLICY "Service can update moderation events"
  ON public.moderation_events FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "Users can view own appeals" ON public.appeals;
CREATE POLICY "Users can view own appeals"
  ON public.appeals FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create appeals" ON public.appeals;
CREATE POLICY "Users can create appeals"
  ON public.appeals FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Service can update appeals" ON public.appeals;
CREATE POLICY "Service can update appeals"
  ON public.appeals FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "Users can view own bans" ON public.user_bans;
CREATE POLICY "Users can view own bans"
  ON public.user_bans FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Service can manage bans" ON public.user_bans;
CREATE POLICY "Service can manage bans"
  ON public.user_bans FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service can update bans" ON public.user_bans;
CREATE POLICY "Service can update bans"
  ON public.user_bans FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "Anyone can view moderation stats" ON public.moderation_stats;
CREATE POLICY "Anyone can view moderation stats"
  ON public.moderation_stats FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Service can manage stats" ON public.moderation_stats;
CREATE POLICY "Service can manage stats"
  ON public.moderation_stats FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service can update stats" ON public.moderation_stats;
CREATE POLICY "Service can update stats"
  ON public.moderation_stats FOR UPDATE
  USING (true);

-- ---------------------------------------------------------------------------
-- 7) Realtime publication and storage buckets/policies
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'match_queue'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.match_queue;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'matches'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'moderation_stats'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.moderation_stats;
  END IF;
END
$$;

INSERT INTO storage.buckets (id, name, public)
SELECT 'selfie-verification', 'selfie-verification', false
WHERE NOT EXISTS (
  SELECT 1
  FROM storage.buckets
  WHERE id = 'selfie-verification'
);

INSERT INTO storage.buckets (id, name, public)
SELECT 'moderation-clips', 'moderation-clips', false
WHERE NOT EXISTS (
  SELECT 1
  FROM storage.buckets
  WHERE id = 'moderation-clips'
);

DROP POLICY IF EXISTS "Users can upload own selfie" ON storage.objects;
CREATE POLICY "Users can upload own selfie"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'selfie-verification'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can view own selfie" ON storage.objects;
CREATE POLICY "Users can view own selfie"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'selfie-verification'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can update own selfie" ON storage.objects;
CREATE POLICY "Users can update own selfie"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'selfie-verification'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Admins can view moderation clips" ON storage.objects;
CREATE POLICY "Admins can view moderation clips"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'moderation-clips'
    AND public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Service can upload moderation clips" ON storage.objects;
CREATE POLICY "Service can upload moderation clips"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'moderation-clips');

DROP POLICY IF EXISTS "Service can delete moderation clips" ON storage.objects;
CREATE POLICY "Service can delete moderation clips"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'moderation-clips');

-- ---------------------------------------------------------------------------
-- 8) User bootstrap + updated_at helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id)
  VALUES (NEW.id)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.user_tokens (user_id, free_entries_remaining, balance)
  VALUES (NEW.id, 5, 0)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'on_auth_user_created_verity'
  ) THEN
    CREATE TRIGGER on_auth_user_created_verity
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_user();
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_profiles_updated_at'
  ) THEN
    CREATE TRIGGER update_profiles_updated_at
      BEFORE UPDATE ON public.profiles
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at();
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_user_tokens_updated_at'
  ) THEN
    CREATE TRIGGER update_user_tokens_updated_at
      BEFORE UPDATE ON public.user_tokens
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at();
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_subscriptions_updated_at'
  ) THEN
    CREATE TRIGGER update_subscriptions_updated_at
      BEFORE UPDATE ON public.subscriptions
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at();
  END IF;
END
$$;
