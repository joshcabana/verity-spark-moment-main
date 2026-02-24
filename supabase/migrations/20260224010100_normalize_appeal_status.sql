-- Normalize appeal statuses to a canonical enum used consistently by
-- edge functions and frontend UI.

-- Backfill legacy values first.
UPDATE public.appeals
   SET status = 'overturned'
 WHERE lower(status) = 'approved';

UPDATE public.appeals
   SET status = 'upheld'
 WHERE lower(status) = 'rejected';

UPDATE public.appeals
   SET status = 'reviewing'
 WHERE status IS NULL
    OR length(trim(status)) = 0
    OR lower(status) NOT IN ('pending', 'reviewing', 'upheld', 'overturned');

ALTER TABLE public.appeals
  ALTER COLUMN status SET DEFAULT 'pending';

ALTER TABLE public.appeals
  DROP CONSTRAINT IF EXISTS appeals_status_check;

ALTER TABLE public.appeals
  DROP CONSTRAINT IF EXISTS appeals_status_allowed_values;

ALTER TABLE public.appeals
  ADD CONSTRAINT appeals_status_check
  CHECK (status IN ('pending', 'reviewing', 'upheld', 'overturned'));
