-- Project photos table
-- Stores before/during/after photos per project uploaded to Supabase Storage (project-photos bucket)
CREATE TABLE IF NOT EXISTS project_photos (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url         text        NOT NULL,
  label       text        NOT NULL DEFAULT 'Before' CHECK (label IN ('Before', 'During', 'After')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_photos_project_id ON project_photos(project_id);
CREATE INDEX IF NOT EXISTS idx_project_photos_user_id    ON project_photos(user_id);

-- RLS
ALTER TABLE project_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_photos_select" ON project_photos;
DROP POLICY IF EXISTS "project_photos_insert" ON project_photos;
DROP POLICY IF EXISTS "project_photos_update" ON project_photos;
DROP POLICY IF EXISTS "project_photos_delete" ON project_photos;

CREATE POLICY "project_photos_select" ON project_photos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "project_photos_insert" ON project_photos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "project_photos_update" ON project_photos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "project_photos_delete" ON project_photos FOR DELETE USING (auth.uid() = user_id);

-- Storage bucket (run separately in Supabase dashboard Storage UI if it doesn't exist)
-- Bucket name: project-photos
-- Public: false (authenticated reads only via signed URLs or RLS)
