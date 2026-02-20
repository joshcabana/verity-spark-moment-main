
-- 1. Create app_role enum and user_roles table for admin access
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles without recursion
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
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
  )
$$;

-- RLS: only admins can view all roles, users can see their own
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- 2. Create moderation-clips storage bucket (private, encrypted at rest via Supabase)
INSERT INTO storage.buckets (id, name, public)
VALUES ('moderation-clips', 'moderation-clips', false);

-- RLS: only admins can read clips
CREATE POLICY "Admins can view moderation clips"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'moderation-clips' AND public.has_role(auth.uid(), 'admin'));

-- Service can upload clips (edge functions use service role)
CREATE POLICY "Service can upload moderation clips"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'moderation-clips');

-- Service can delete expired clips
CREATE POLICY "Service can delete moderation clips"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'moderation-clips');

-- 3. Create government-id storage bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('government-id', 'government-id', false);

-- Users can upload their own ID
CREATE POLICY "Users can upload own government ID"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'government-id' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can view own ID
CREATE POLICY "Users can view own government ID"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'government-id' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Admins can view all IDs
CREATE POLICY "Admins can view all government IDs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'government-id' AND public.has_role(auth.uid(), 'admin'));

-- 4. Add government_id_status to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS government_id_url text,
  ADD COLUMN IF NOT EXISTS government_id_status text NOT NULL DEFAULT 'none';

-- 5. Add clip_url tracking to moderation_events (already exists but ensure clip storage fields)
-- clip_url and clip_expires_at already exist in the schema
