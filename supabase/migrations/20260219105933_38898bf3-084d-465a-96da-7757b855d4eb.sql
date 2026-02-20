
-- Moderation events table (tracks all violations, warnings, terminations)
CREATE TABLE public.moderation_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  call_id UUID,
  match_id UUID,
  offender_id UUID NOT NULL,
  victim_id UUID,
  tier INTEGER NOT NULL DEFAULT 1, -- 0 = instant terminate, 1 = warning, 2 = safe exit
  category TEXT NOT NULL, -- nudity, harassment, tone, deepfake, scam, behavioral
  confidence NUMERIC(5,4) NOT NULL DEFAULT 0,
  action_taken TEXT NOT NULL DEFAULT 'warning', -- warning, terminate, ban, log
  ai_reasoning TEXT,
  clip_url TEXT, -- encrypted 5-10s clip reference
  clip_expires_at TIMESTAMP WITH TIME ZONE, -- auto-delete after 30 days
  reviewed BOOLEAN NOT NULL DEFAULT false,
  reviewed_by TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_outcome TEXT, -- upheld, overturned, escalated
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.moderation_events ENABLE ROW LEVEL SECURITY;

-- Users can view their own moderation events (as offender)
CREATE POLICY "Users can view own moderation events"
  ON public.moderation_events FOR SELECT
  USING (offender_id = auth.uid() OR victim_id = auth.uid());

-- Service role inserts (edge functions)
CREATE POLICY "Service can insert moderation events"
  ON public.moderation_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service can update moderation events"
  ON public.moderation_events FOR UPDATE
  USING (true);

-- Appeals table
CREATE TABLE public.appeals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  moderation_event_id UUID NOT NULL REFERENCES public.moderation_events(id),
  user_id UUID NOT NULL,
  appeal_text TEXT,
  voice_note_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, reviewing, upheld, overturned
  resolution_text TEXT,
  apology_tokens_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.appeals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own appeals"
  ON public.appeals FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create appeals"
  ON public.appeals FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service can update appeals"
  ON public.appeals FOR UPDATE
  USING (true);

-- User bans table
CREATE TABLE public.user_bans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  reason TEXT NOT NULL,
  moderation_event_id UUID REFERENCES public.moderation_events(id),
  ban_type TEXT NOT NULL DEFAULT 'temporary', -- temporary, permanent
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  lifted_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.user_bans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bans"
  ON public.user_bans FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Service can manage bans"
  ON public.user_bans FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service can update bans"
  ON public.user_bans FOR UPDATE
  USING (true);

-- Moderation stats (aggregated, public-facing for transparency dashboard)
CREATE TABLE public.moderation_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_calls INTEGER NOT NULL DEFAULT 0,
  violation_free_calls INTEGER NOT NULL DEFAULT 0,
  tier0_actions INTEGER NOT NULL DEFAULT 0,
  tier1_warnings INTEGER NOT NULL DEFAULT 0,
  safe_exits INTEGER NOT NULL DEFAULT 0,
  appeals_filed INTEGER NOT NULL DEFAULT 0,
  appeals_overturned INTEGER NOT NULL DEFAULT 0,
  avg_latency_ms INTEGER NOT NULL DEFAULT 0,
  false_positive_rate NUMERIC(5,4) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(date)
);

ALTER TABLE public.moderation_stats ENABLE ROW LEVEL SECURITY;

-- Public read for transparency
CREATE POLICY "Anyone can view moderation stats"
  ON public.moderation_stats FOR SELECT
  USING (true);

CREATE POLICY "Service can manage stats"
  ON public.moderation_stats FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service can update stats"
  ON public.moderation_stats FOR UPDATE
  USING (true);

-- Enable realtime for moderation_stats (transparency dashboard)
ALTER PUBLICATION supabase_realtime ADD TABLE public.moderation_stats;

-- Storage bucket for selfie verification images
INSERT INTO storage.buckets (id, name, public) VALUES ('selfie-verification', 'selfie-verification', false);

-- Only authenticated users can upload their own selfie
CREATE POLICY "Users can upload own selfie"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'selfie-verification' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can view own selfie
CREATE POLICY "Users can view own selfie"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'selfie-verification' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can update own selfie
CREATE POLICY "Users can update own selfie"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'selfie-verification' AND auth.uid()::text = (storage.foldername(name))[1]);
