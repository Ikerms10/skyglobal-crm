-- Fix business_settings schema confusion
--
-- Context: Two migrations created business_settings with conflicting structures:
--   20260421: key-value table (user_id, key, value) — this one WON (ran first)
--   20260424: structured columns — was a no-op due to CREATE TABLE IF NOT EXISTS
--   20260426: incorrectly added a 'language' column to the KV table — remove it
--
-- The correct schema is the KV table from 20260421:
--   (id, user_id, key, value, updated_at) with UNIQUE (user_id, key)
-- Language preference is stored as key='ui_language', not as a column.

-- Remove the incorrectly added language column
ALTER TABLE business_settings DROP COLUMN IF EXISTS language;

-- Ensure the unique constraint exists (should already be there from 20260421)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'business_settings_user_id_key_key'
      AND conrelid = 'business_settings'::regclass
  ) THEN
    ALTER TABLE business_settings ADD CONSTRAINT business_settings_user_id_key_key UNIQUE (user_id, key);
  END IF;
END $$;
