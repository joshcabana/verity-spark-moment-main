-- Rate limit cleanup cron job
-- Runs daily at 3am UTC to purge api_rate_limits rows older than 1 hour
-- and selfie_verification_attempts rows older than 24 hours.
-- This prevents unbounded table growth causing index bloat.
SELECT cron.schedule(
        'cleanup-rate-limits',
        '0 3 * * *',
        $$
        DELETE FROM public.api_rate_limits
        WHERE created_at < now() - interval '2 hours';
DELETE FROM public.selfie_verification_attempts
WHERE attempted_at < now() - interval '24 hours';
$$
);