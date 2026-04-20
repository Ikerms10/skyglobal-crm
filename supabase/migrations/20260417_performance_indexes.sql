-- SkyGlobal CRM — Performance Indexes
-- Run this migration in your Supabase SQL editor.
-- These indexes cover the most frequently queried columns across all dashboard,
-- leads, projects, and expenses pages.

-- Leads: pipeline board loads, follow-up detection, overdue flagging
CREATE INDEX IF NOT EXISTS idx_leads_user_stage        ON leads(user_id, stage);
CREATE INDEX IF NOT EXISTS idx_leads_user_follow_up    ON leads(user_id, follow_up_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leads_user_created_at   ON leads(user_id, created_at)    WHERE deleted_at IS NULL;

-- Projects: customer detail page, dashboard KPIs, overdue detection
CREATE INDEX IF NOT EXISTS idx_projects_customer_id    ON projects(customer_id)          WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_projects_user_status    ON projects(user_id, status)      WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_projects_payment_status ON projects(user_id, payment_status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_projects_end_date       ON projects(user_id, end_date)    WHERE deleted_at IS NULL;

-- Expenses: reports page timeframe filtering
CREATE INDEX IF NOT EXISTS idx_expenses_user_date      ON expenses(user_id, date)        WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_category       ON expenses(user_id, category)    WHERE deleted_at IS NULL;

-- Project expenses: per-project cost aggregation, reports
CREATE INDEX IF NOT EXISTS idx_proj_expenses_project   ON project_expenses(project_id);
CREATE INDEX IF NOT EXISTS idx_proj_expenses_user_date ON project_expenses(user_id, date);

-- Activities: customer timeline load
CREATE INDEX IF NOT EXISTS idx_activities_customer_id  ON activities(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_project_id   ON activities(project_id,  created_at DESC);
