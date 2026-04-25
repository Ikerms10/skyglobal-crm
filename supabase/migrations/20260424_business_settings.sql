-- Business settings table
-- Stores per-user business info, notification prefs, and revenue goals
CREATE TABLE IF NOT EXISTS business_settings (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name         text,
  business_phone        text,
  business_email        text,
  business_address      text,
  -- Notification toggles
  notify_weekly_report  boolean     NOT NULL DEFAULT true,
  notify_proposal_viewed boolean    NOT NULL DEFAULT true,
  notify_rain_alert     boolean     NOT NULL DEFAULT false,
  -- Revenue goals
  monthly_revenue_goal  numeric(12,2),
  annual_revenue_goal   numeric(12,2),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_business_settings_user_id ON business_settings(user_id);

-- RLS
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "business_settings_select" ON business_settings;
DROP POLICY IF EXISTS "business_settings_insert" ON business_settings;
DROP POLICY IF EXISTS "business_settings_update" ON business_settings;

CREATE POLICY "business_settings_select" ON business_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "business_settings_insert" ON business_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "business_settings_update" ON business_settings FOR UPDATE USING (auth.uid() = user_id);
