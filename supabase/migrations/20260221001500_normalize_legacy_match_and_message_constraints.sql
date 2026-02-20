-- Normalize legacy constraints that can break current matchmaking + chat flows
-- on older projects that carry pre-reconcile schema rules.

-- Legacy unnamed/explicit check in some environments conflicts with current
-- match insertion behavior in rpc_enter_matchmaking.
ALTER TABLE public.matches
  DROP CONSTRAINT IF EXISTS matches_check;

-- Legacy message schemas may still enforce these columns as NOT NULL.
-- Current app flow writes chat_room_id/sender_id/content and derives legacy
-- columns for compatibility.
ALTER TABLE public.messages
  ALTER COLUMN match_id DROP NOT NULL,
  ALTER COLUMN from_user DROP NOT NULL,
  ALTER COLUMN message_text DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.sync_legacy_message_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Keep sender aliases synchronized.
  IF NEW.sender_id IS NULL THEN
    NEW.sender_id := NEW.from_user;
  END IF;
  IF NEW.from_user IS NULL THEN
    NEW.from_user := NEW.sender_id;
  END IF;

  -- Keep message text aliases synchronized.
  IF NEW.content IS NULL THEN
    NEW.content := NEW.message_text;
  END IF;
  IF NEW.message_text IS NULL THEN
    NEW.message_text := NEW.content;
  END IF;

  -- Derive match_id from chat_room_id when only modern shape is provided.
  IF NEW.match_id IS NULL AND NEW.chat_room_id IS NOT NULL THEN
    SELECT cr.match_id
      INTO NEW.match_id
      FROM public.chat_rooms cr
     WHERE cr.id = NEW.chat_room_id
     LIMIT 1;
  END IF;

  -- Derive chat_room_id from match_id when legacy shape is provided.
  IF NEW.chat_room_id IS NULL AND NEW.match_id IS NOT NULL THEN
    SELECT cr.id
      INTO NEW.chat_room_id
      FROM public.chat_rooms cr
     WHERE cr.match_id = NEW.match_id
     LIMIT 1;
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'sync_legacy_message_columns_trigger'
      AND tgrelid = 'public.messages'::regclass
  ) THEN
    DROP TRIGGER sync_legacy_message_columns_trigger ON public.messages;
  END IF;

  CREATE TRIGGER sync_legacy_message_columns_trigger
    BEFORE INSERT OR UPDATE ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_legacy_message_columns();
END
$$;
