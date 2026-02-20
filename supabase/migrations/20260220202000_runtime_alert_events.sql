-- Runtime alert event log for security and integrity monitoring

CREATE TABLE IF NOT EXISTS public.runtime_alert_events (
  id bigserial PRIMARY KEY,
  event_source text NOT NULL,
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'error')),
  status_code integer,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.runtime_alert_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_runtime_alert_events_created_at
  ON public.runtime_alert_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_runtime_alert_events_source_created
  ON public.runtime_alert_events (event_source, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_runtime_alert_events_type_created
  ON public.runtime_alert_events (event_type, created_at DESC);

CREATE OR REPLACE FUNCTION public.log_runtime_alert_event(
  p_event_source text,
  p_event_type text,
  p_severity text DEFAULT 'warning',
  p_status_code integer DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_details jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.runtime_alert_events (
    event_source,
    event_type,
    severity,
    status_code,
    user_id,
    details
  ) VALUES (
    p_event_source,
    p_event_type,
    CASE
      WHEN p_severity IN ('info', 'warning', 'error') THEN p_severity
      ELSE 'warning'
    END,
    p_status_code,
    p_user_id,
    p_details
  );
END;
$$;

REVOKE ALL ON FUNCTION public.log_runtime_alert_event(text, text, text, integer, uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_runtime_alert_event(text, text, text, integer, uuid, jsonb) TO service_role;
