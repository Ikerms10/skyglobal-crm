-- ─────────────────────────────────────────────────────────────────────────────
-- SkyGlobal CRM — Database Optimizations
-- Run this in the Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Indexes for common queries ───────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_leads_user_id
  ON leads(user_id);

CREATE INDEX IF NOT EXISTS idx_leads_stage
  ON leads(stage);

CREATE INDEX IF NOT EXISTS idx_leads_follow_up
  ON leads(follow_up_date)
  WHERE follow_up_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_customer
  ON leads(customer_id);

CREATE INDEX IF NOT EXISTS idx_projects_user_id
  ON projects(user_id);

CREATE INDEX IF NOT EXISTS idx_projects_status
  ON projects(status);

CREATE INDEX IF NOT EXISTS idx_projects_customer
  ON projects(customer_id);

CREATE INDEX IF NOT EXISTS idx_projects_dates
  ON projects(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_project_expenses_project
  ON project_expenses(project_id);

CREATE INDEX IF NOT EXISTS idx_project_expenses_user
  ON project_expenses(user_id);

CREATE INDEX IF NOT EXISTS idx_customers_user_id
  ON customers(user_id);

CREATE INDEX IF NOT EXISTS idx_customers_name
  ON customers(name);

CREATE INDEX IF NOT EXISTS idx_activities_customer
  ON activities(customer_id);

CREATE INDEX IF NOT EXISTS idx_activities_project
  ON activities(project_id);

CREATE INDEX IF NOT EXISTS idx_activities_created
  ON activities(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_expenses_user_date
  ON expenses(user_id, date DESC);

-- ─── updated_at auto-update trigger ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_leads_updated_at ON leads;
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Google Calendar integration table ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_integrations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users NOT NULL,
  provider    TEXT NOT NULL,
  access_token   TEXT,
  refresh_token  TEXT,
  expires_at     TIMESTAMPTZ,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_user_integrations_user
  ON user_integrations(user_id);

ALTER TABLE user_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own integrations"
  ON user_integrations
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── Materialized view for dashboard metrics ──────────────────────────────────
-- NOTE: Refresh with: REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_metrics;
-- Consider scheduling this via pg_cron or on-demand.

CREATE MATERIALIZED VIEW IF NOT EXISTS dashboard_metrics AS
SELECT
  c.user_id,
  COUNT(DISTINCT c.id)                                         AS total_customers,
  COUNT(DISTINCT l.id)                                         AS total_leads,
  COUNT(DISTINCT CASE WHEN l.stage = 'Won' THEN l.id END)     AS won_leads,
  COUNT(DISTINCT p.id)                                         AS total_projects,
  COUNT(DISTINCT CASE WHEN p.status = 'In Progress' THEN p.id END) AS active_projects,
  COALESCE(SUM(
    CASE WHEN p.status IN ('In Progress', 'Completed')
    THEN p.contract_value END
  ), 0)                                                        AS total_revenue
FROM customers c
LEFT JOIN leads l    ON l.customer_id = c.id AND l.deleted_at IS NULL
LEFT JOIN projects p ON p.customer_id = c.id AND p.deleted_at IS NULL
WHERE c.user_id IS NOT NULL
  AND c.deleted_at IS NULL
GROUP BY c.user_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_dashboard_metrics_user
  ON dashboard_metrics(user_id);

-- ─── Backups storage bucket (run in Dashboard → Storage or via SQL) ───────────
-- Note: Create the 'backups' bucket in Supabase Dashboard → Storage
-- Set as Private, with these RLS policies:

-- INSERT: auth.uid()::text = (storage.foldername(name))[1]
-- SELECT: auth.uid()::text = (storage.foldername(name))[1]
-- DELETE: auth.uid()::text = (storage.foldername(name))[1]
