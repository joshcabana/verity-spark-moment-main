-- Stripe webhook idempotency table strictly as requested
CREATE TABLE IF NOT EXISTS public.processed_events (
    event_id text PRIMARY KEY,
    created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.processed_events ENABLE ROW LEVEL SECURITY;