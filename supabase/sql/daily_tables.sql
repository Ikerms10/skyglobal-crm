-- Daily Notes & To-Do tables
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS daily_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS daily_todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  text TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  priority TEXT CHECK (priority IN ('high','medium','low')) DEFAULT 'medium',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE daily_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own notes" ON daily_notes
  FOR ALL USING (auth.uid() = user_id);

ALTER TABLE daily_todos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own todos" ON daily_todos
  FOR ALL USING (auth.uid() = user_id);
