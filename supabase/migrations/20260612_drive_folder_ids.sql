-- Google Drive auto-folder integration: store the Drive folder ID created for
-- each lead ("{Customer Name} {Zip}") and project ("{Title} - {Address}").
-- Run in the Supabase dashboard SQL editor.

ALTER TABLE leads    ADD COLUMN IF NOT EXISTS drive_folder_id TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS drive_folder_id TEXT;
