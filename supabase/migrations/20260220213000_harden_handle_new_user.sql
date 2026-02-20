-- Make user bootstrap resilient across legacy profile schemas.
-- Never allow auth signup to fail because optional profile/token initialization failed.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    -- Prefer deterministic profile IDs when the legacy schema links profiles.id to auth.users.id.
    INSERT INTO public.profiles (id, user_id)
    VALUES (NEW.id, NEW.id)
    ON CONFLICT DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- Keep signup flow alive even if legacy profile constraints reject this insert.
    NULL;
  END;

  BEGIN
    INSERT INTO public.user_tokens (user_id, free_entries_remaining, balance)
    VALUES (NEW.id, 5, 0)
    ON CONFLICT DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- Token bootstrap should also be best-effort only.
    NULL;
  END;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'on_auth_user_created_verity'
      AND tgrelid = 'auth.users'::regclass
  ) THEN
    DROP TRIGGER on_auth_user_created_verity ON auth.users;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'on_auth_user_created'
      AND tgrelid = 'auth.users'::regclass
  ) THEN
    DROP TRIGGER on_auth_user_created ON auth.users;
  END IF;

  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
END
$$;
