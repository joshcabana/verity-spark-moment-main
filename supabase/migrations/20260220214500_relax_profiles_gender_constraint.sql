-- Some legacy environments carry a restrictive profiles_gender_check definition.
-- Normalize it to the current allowed value set while keeping compatibility aliases.

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_gender_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_gender_check
  CHECK (
    gender IS NULL OR
    gender IN (
      'male',
      'female',
      'non-binary',
      'other',
      'man',
      'woman'
    )
  )
  NOT VALID;
