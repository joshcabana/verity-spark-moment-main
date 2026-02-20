-- Track daily free Spark Extension usage for Verity Pass subscribers.
-- One free extension per subscriber per UTC calendar day.
-- Subsequent uses on the same day cost 1 token as normal.

CREATE TABLE IF NOT EXISTS public.spark_extension_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  used_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.spark_extension_log ENABLE ROW LEVEL SECURITY;

-- Users can read their own log to know if they've used today's free extension
CREATE POLICY "Users can read own extension log"
  ON public.spark_extension_log FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can insert (done via edge function)
-- No INSERT/UPDATE/DELETE for authenticated users

-- Unique constraint: one free extension per user per day
CREATE UNIQUE INDEX spark_extension_log_user_date_idx
  ON public.spark_extension_log (user_id, used_date);

-- Index for quick lookups by user and date
CREATE INDEX spark_extension_log_user_id_idx
  ON public.spark_extension_log (user_id, used_date DESC);
