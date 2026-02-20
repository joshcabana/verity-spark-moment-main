
-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT,
  bio TEXT,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'non-binary', 'other')),
  seeking_gender TEXT CHECK (seeking_gender IN ('male', 'female', 'everyone')),
  verification_status TEXT NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected')),
  selfie_url TEXT,
  avatar_emoji TEXT DEFAULT '👤',
  warmup_calls_remaining INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Token balances
CREATE TABLE public.user_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  balance INTEGER NOT NULL DEFAULT 0,
  free_entries_remaining INTEGER NOT NULL DEFAULT 5,
  free_entries_reset_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_tokens ENABLE ROW LEVEL SECURITY;

-- Token transactions
CREATE TABLE public.token_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('purchase', 'free_grant', 'spend', 'refund', 'subscription')),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.token_transactions ENABLE ROW LEVEL SECURITY;

-- Match queue
CREATE TABLE public.match_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  room_id TEXT NOT NULL DEFAULT 'general',
  gender TEXT,
  seeking_gender TEXT,
  is_warmup BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'matched', 'cancelled')),
  entered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  matched_at TIMESTAMPTZ,
  matched_with UUID REFERENCES auth.users(id)
);

ALTER TABLE public.match_queue ENABLE ROW LEVEL SECURITY;

-- Enable realtime for match queue
ALTER PUBLICATION supabase_realtime ADD TABLE public.match_queue;

-- Matches (after both users make decisions)
CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID,
  user1_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user2_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user1_decision TEXT CHECK (user1_decision IN ('spark', 'pass')),
  user2_decision TEXT CHECK (user2_decision IN ('spark', 'pass')),
  user1_note TEXT,
  user2_note TEXT,
  is_mutual BOOLEAN GENERATED ALWAYS AS (user1_decision = 'spark' AND user2_decision = 'spark') STORED,
  room_id TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- Chat rooms (created on mutual match)
CREATE TABLE public.chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;

-- Messages
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_room_id UUID REFERENCES public.chat_rooms(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Subscriptions
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'cancelled', 'past_due')),
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Helper functions
CREATE OR REPLACE FUNCTION public.is_match_participant(_match_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.matches
    WHERE id = _match_id AND (user1_id = auth.uid() OR user2_id = auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION public.is_chat_participant(_chat_room_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_rooms cr
    JOIN public.matches m ON m.id = cr.match_id
    WHERE cr.id = _chat_room_id AND (m.user1_id = auth.uid() OR m.user2_id = auth.uid())
  );
$$;

-- RLS Policies
-- Profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (user_id = auth.uid());
-- Allow viewing matched users' profiles
CREATE POLICY "Users can view matched profiles" ON public.profiles FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.matches
    WHERE is_mutual = true
    AND ((user1_id = auth.uid() AND user2_id = profiles.user_id) OR (user2_id = auth.uid() AND user1_id = profiles.user_id))
  )
);

-- User tokens
CREATE POLICY "Users can view own tokens" ON public.user_tokens FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own tokens" ON public.user_tokens FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own tokens" ON public.user_tokens FOR UPDATE USING (user_id = auth.uid());

-- Token transactions
CREATE POLICY "Users can view own transactions" ON public.token_transactions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own transactions" ON public.token_transactions FOR INSERT WITH CHECK (user_id = auth.uid());

-- Match queue
CREATE POLICY "Users can view own queue entry" ON public.match_queue FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can join queue" ON public.match_queue FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own queue entry" ON public.match_queue FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can leave queue" ON public.match_queue FOR DELETE USING (user_id = auth.uid());

-- Matches
CREATE POLICY "Users can view own matches" ON public.matches FOR SELECT USING (user1_id = auth.uid() OR user2_id = auth.uid());
CREATE POLICY "Users can insert matches" ON public.matches FOR INSERT WITH CHECK (user1_id = auth.uid() OR user2_id = auth.uid());
CREATE POLICY "Users can update own matches" ON public.matches FOR UPDATE USING (user1_id = auth.uid() OR user2_id = auth.uid());

-- Chat rooms
CREATE POLICY "Participants can view chat rooms" ON public.chat_rooms FOR SELECT USING (public.is_chat_participant(id));
CREATE POLICY "System can create chat rooms" ON public.chat_rooms FOR INSERT WITH CHECK (
  public.is_match_participant(match_id)
);

-- Messages
CREATE POLICY "Participants can view messages" ON public.messages FOR SELECT USING (public.is_chat_participant(chat_room_id));
CREATE POLICY "Participants can send messages" ON public.messages FOR INSERT WITH CHECK (
  sender_id = auth.uid() AND public.is_chat_participant(chat_room_id)
);

-- Subscriptions
CREATE POLICY "Users can view own subscription" ON public.subscriptions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own subscription" ON public.subscriptions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own subscription" ON public.subscriptions FOR UPDATE USING (user_id = auth.uid());

-- Auto-create profile and token balance on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id) VALUES (NEW.id);
  INSERT INTO public.user_tokens (user_id, free_entries_remaining, balance) VALUES (NEW.id, 5, 0);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_user_tokens_updated_at BEFORE UPDATE ON public.user_tokens FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
