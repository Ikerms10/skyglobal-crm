-- Performance indexes for frequently queried columns
-- Run in Supabase dashboard SQL editor

-- Leads
CREATE INDEX IF NOT EXISTS idx_leads_stage        ON leads(stage);
CREATE INDEX IF NOT EXISTS idx_leads_source       ON leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_created_at   ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_user_deleted ON leads(user_id, deleted_at);

-- Projects
CREATE INDEX IF NOT EXISTS idx_projects_status      ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_customer_id ON projects(customer_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at  ON projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_user_deleted ON projects(user_id, deleted_at);

-- Proposals
CREATE INDEX IF NOT EXISTS idx_proposals_status      ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_customer_id ON proposals(customer_id);
CREATE INDEX IF NOT EXISTS idx_proposals_created_at  ON proposals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_proposals_user_deleted ON proposals(user_id, deleted_at);

-- Expenses (general)
CREATE INDEX IF NOT EXISTS idx_expenses_category    ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_date        ON expenses(date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_user_deleted ON expenses(user_id, deleted_at);

-- Project expenses
CREATE INDEX IF NOT EXISTS idx_project_expenses_project_id ON project_expenses(project_id);
CREATE INDEX IF NOT EXISTS idx_project_expenses_category   ON project_expenses(category);
CREATE INDEX IF NOT EXISTS idx_project_expenses_date       ON project_expenses(date DESC);
CREATE INDEX IF NOT EXISTS idx_project_expenses_user_id    ON project_expenses(user_id);

-- Activities / activity log
CREATE INDEX IF NOT EXISTS idx_activities_lead_id    ON activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_user_id    ON activities(user_id);

-- Customers
CREATE INDEX IF NOT EXISTS idx_customers_user_deleted ON customers(user_id, deleted_at);
