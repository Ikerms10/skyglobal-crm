-- Crew Scheduling Table
CREATE TABLE IF NOT EXISTS crew_assignments (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id       uuid REFERENCES projects(id) ON DELETE SET NULL,
  crew_member_name text NOT NULL,
  start_date       date NOT NULL,
  end_date         date NOT NULL,
  notes            text,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now(),
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- Indexes for schedule page queries
CREATE INDEX IF NOT EXISTS idx_crew_user_dates ON crew_assignments(user_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_crew_project    ON crew_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_crew_member     ON crew_assignments(user_id, crew_member_name);

-- RLS
ALTER TABLE crew_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own crew assignments"
  ON crew_assignments FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
