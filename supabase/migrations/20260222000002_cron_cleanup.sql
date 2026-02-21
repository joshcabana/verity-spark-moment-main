-- 1) Ensure pg_cron extension is enabled 
-- Note: Requires superuser, which Supabase provides for default roles, but if it fails, it must be enabled in the dashboard.
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
-- 2) Remove any existing cron job with this name
DO $$ BEGIN IF EXISTS (
    SELECT 1
    FROM cron.job
    WHERE jobname = 'cleanup_stale_match_queues'
) THEN PERFORM cron.unschedule('cleanup_stale_match_queues');
END IF;
END $$;
-- 3) Schedule the cleanup job every 5 minutes
-- Our existing function "public.cleanup_stale_queue_entries()" sets status='timeout' for waiting entries older than 60 seconds
SELECT cron.schedule(
        'cleanup_stale_match_queues',
        '*/5 * * * *',
        $$
        SELECT public.cleanup_stale_queue_entries();
$$
);