-- ─── SECURITY HARDENING MIGRATION ─────────────────────────────────────────────
-- Enables RLS on every public table, creates per-table CRUD policies,
-- and creates the immutable audit_log table.
-- Safe to run multiple times (DROP IF EXISTS + IF NOT EXISTS guards).
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── HELPER FUNCTION ──────────────────────────────────────────────────────────
-- Single point of truth for "current user owns this row"
CREATE OR REPLACE FUNCTION is_authenticated_owner(row_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN auth.uid() = row_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ─── CUSTOMERS ────────────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customers_select" ON customers;
DROP POLICY IF EXISTS "customers_insert" ON customers;
DROP POLICY IF EXISTS "customers_update" ON customers;
DROP POLICY IF EXISTS "customers_delete" ON customers;

CREATE POLICY "customers_select" ON customers
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "customers_insert" ON customers
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "customers_update" ON customers
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "customers_delete" ON customers
  FOR DELETE USING (auth.uid() = user_id);

-- ─── LEADS ────────────────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leads_select" ON leads;
DROP POLICY IF EXISTS "leads_insert" ON leads;
DROP POLICY IF EXISTS "leads_update" ON leads;
DROP POLICY IF EXISTS "leads_delete" ON leads;

CREATE POLICY "leads_select" ON leads
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "leads_insert" ON leads
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "leads_update" ON leads
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "leads_delete" ON leads
  FOR DELETE USING (auth.uid() = user_id);

-- ─── PROJECTS ─────────────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "projects_select" ON projects;
DROP POLICY IF EXISTS "projects_insert" ON projects;
DROP POLICY IF EXISTS "projects_update" ON projects;
DROP POLICY IF EXISTS "projects_delete" ON projects;

CREATE POLICY "projects_select" ON projects
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "projects_insert" ON projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "projects_update" ON projects
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "projects_delete" ON projects
  FOR DELETE USING (auth.uid() = user_id);

-- ─── PROJECT_EXPENSES ─────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS project_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_expenses_select" ON project_expenses;
DROP POLICY IF EXISTS "project_expenses_insert" ON project_expenses;
DROP POLICY IF EXISTS "project_expenses_update" ON project_expenses;
DROP POLICY IF EXISTS "project_expenses_delete" ON project_expenses;

CREATE POLICY "project_expenses_select" ON project_expenses
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "project_expenses_insert" ON project_expenses
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "project_expenses_update" ON project_expenses
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "project_expenses_delete" ON project_expenses
  FOR DELETE USING (auth.uid() = user_id);

-- ─── PROJECT_LINE_ITEMS (no user_id — join through projects) ──────────────────
ALTER TABLE IF EXISTS project_line_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_line_items_select" ON project_line_items;
DROP POLICY IF EXISTS "project_line_items_insert" ON project_line_items;
DROP POLICY IF EXISTS "project_line_items_update" ON project_line_items;
DROP POLICY IF EXISTS "project_line_items_delete" ON project_line_items;

CREATE POLICY "project_line_items_select" ON project_line_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = project_line_items.project_id AND projects.user_id = auth.uid())
  );
CREATE POLICY "project_line_items_insert" ON project_line_items
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = project_line_items.project_id AND projects.user_id = auth.uid())
  );
CREATE POLICY "project_line_items_update" ON project_line_items
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = project_line_items.project_id AND projects.user_id = auth.uid())
  );
CREATE POLICY "project_line_items_delete" ON project_line_items
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = project_line_items.project_id AND projects.user_id = auth.uid())
  );

-- ─── EXPENSES ─────────────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "expenses_select" ON expenses;
DROP POLICY IF EXISTS "expenses_insert" ON expenses;
DROP POLICY IF EXISTS "expenses_update" ON expenses;
DROP POLICY IF EXISTS "expenses_delete" ON expenses;

CREATE POLICY "expenses_select" ON expenses
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "expenses_insert" ON expenses
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "expenses_update" ON expenses
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "expenses_delete" ON expenses
  FOR DELETE USING (auth.uid() = user_id);

-- ─── ACTIVITIES ───────────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activities_select" ON activities;
DROP POLICY IF EXISTS "activities_insert" ON activities;
DROP POLICY IF EXISTS "activities_update" ON activities;
DROP POLICY IF EXISTS "activities_delete" ON activities;

CREATE POLICY "activities_select" ON activities
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "activities_insert" ON activities
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "activities_update" ON activities
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "activities_delete" ON activities
  FOR DELETE USING (auth.uid() = user_id);

-- ─── PROJECT_PHOTOS ───────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS project_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_photos_select" ON project_photos;
DROP POLICY IF EXISTS "project_photos_insert" ON project_photos;
DROP POLICY IF EXISTS "project_photos_update" ON project_photos;
DROP POLICY IF EXISTS "project_photos_delete" ON project_photos;

CREATE POLICY "project_photos_select" ON project_photos
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "project_photos_insert" ON project_photos
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "project_photos_update" ON project_photos
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "project_photos_delete" ON project_photos
  FOR DELETE USING (auth.uid() = user_id);

-- ─── PROPOSALS ────────────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS proposals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "proposals_select" ON proposals;
DROP POLICY IF EXISTS "proposals_insert" ON proposals;
DROP POLICY IF EXISTS "proposals_update" ON proposals;
DROP POLICY IF EXISTS "proposals_delete" ON proposals;

CREATE POLICY "proposals_select" ON proposals
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "proposals_insert" ON proposals
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "proposals_update" ON proposals
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "proposals_delete" ON proposals
  FOR DELETE USING (auth.uid() = user_id);

-- ─── PROPOSAL_LINE_ITEMS (no user_id — join through proposals) ────────────────
ALTER TABLE IF EXISTS proposal_line_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "proposal_line_items_select" ON proposal_line_items;
DROP POLICY IF EXISTS "proposal_line_items_insert" ON proposal_line_items;
DROP POLICY IF EXISTS "proposal_line_items_update" ON proposal_line_items;
DROP POLICY IF EXISTS "proposal_line_items_delete" ON proposal_line_items;

CREATE POLICY "proposal_line_items_select" ON proposal_line_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM proposals WHERE proposals.id = proposal_line_items.proposal_id AND proposals.user_id = auth.uid())
  );
CREATE POLICY "proposal_line_items_insert" ON proposal_line_items
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM proposals WHERE proposals.id = proposal_line_items.proposal_id AND proposals.user_id = auth.uid())
  );
CREATE POLICY "proposal_line_items_update" ON proposal_line_items
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM proposals WHERE proposals.id = proposal_line_items.proposal_id AND proposals.user_id = auth.uid())
  );
CREATE POLICY "proposal_line_items_delete" ON proposal_line_items
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM proposals WHERE proposals.id = proposal_line_items.proposal_id AND proposals.user_id = auth.uid())
  );

-- ─── WORK_ORDERS ──────────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS work_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "work_orders_select" ON work_orders;
DROP POLICY IF EXISTS "work_orders_insert" ON work_orders;
DROP POLICY IF EXISTS "work_orders_update" ON work_orders;
DROP POLICY IF EXISTS "work_orders_delete" ON work_orders;

CREATE POLICY "work_orders_select" ON work_orders
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "work_orders_insert" ON work_orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "work_orders_update" ON work_orders
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "work_orders_delete" ON work_orders
  FOR DELETE USING (auth.uid() = user_id);

-- ─── CREW_ASSIGNMENTS (already has RLS from previous migration — refresh) ─────
ALTER TABLE IF EXISTS crew_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own crew assignments" ON crew_assignments;
DROP POLICY IF EXISTS "crew_assignments_select" ON crew_assignments;
DROP POLICY IF EXISTS "crew_assignments_insert" ON crew_assignments;
DROP POLICY IF EXISTS "crew_assignments_update" ON crew_assignments;
DROP POLICY IF EXISTS "crew_assignments_delete" ON crew_assignments;

CREATE POLICY "crew_assignments_select" ON crew_assignments
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "crew_assignments_insert" ON crew_assignments
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "crew_assignments_update" ON crew_assignments
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "crew_assignments_delete" ON crew_assignments
  FOR DELETE USING (auth.uid() = user_id);

-- ─── INVOICES (from 20260421 migration — refresh to explicit per-operation) ───
-- NOTE: 20260421 used FOR ALL. Replacing with explicit policies for clarity.
DROP POLICY IF EXISTS "Users manage own invoices" ON invoices;
DROP POLICY IF EXISTS "invoices_select" ON invoices;
DROP POLICY IF EXISTS "invoices_insert" ON invoices;
DROP POLICY IF EXISTS "invoices_update" ON invoices;
DROP POLICY IF EXISTS "invoices_delete" ON invoices;

CREATE POLICY "invoices_select" ON invoices
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "invoices_insert" ON invoices
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "invoices_update" ON invoices
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "invoices_delete" ON invoices
  FOR DELETE USING (auth.uid() = user_id);

-- ─── BUSINESS_SETTINGS (extra restrictive — no delete allowed) ────────────────
-- NOTE: 20260421 used FOR ALL. Replace with no-delete policy.
DROP POLICY IF EXISTS "Users manage own settings" ON business_settings;
DROP POLICY IF EXISTS "settings_select" ON business_settings;
DROP POLICY IF EXISTS "settings_insert" ON business_settings;
DROP POLICY IF EXISTS "settings_update" ON business_settings;
DROP POLICY IF EXISTS "settings_delete" ON business_settings;

CREATE POLICY "settings_select" ON business_settings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "settings_insert" ON business_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "settings_update" ON business_settings
  FOR UPDATE USING (auth.uid() = user_id);
-- No DELETE policy — settings rows are never deleted, only updated.

-- ─── AUDIT LOG ────────────────────────────────────────────────────────────────
-- Immutable event log. INSERT allowed from authenticated context and service role.
-- No UPDATE or DELETE — audit records are write-once.
CREATE TABLE IF NOT EXISTS audit_log (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at    timestamptz DEFAULT now() NOT NULL,
  user_id       uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email    text,
  action        text        NOT NULL CHECK (action IN ('CREATE','UPDATE','DELETE','VIEW','LOGIN','LOGOUT','EXPORT')),
  resource_type text        NOT NULL,
  resource_id   uuid,
  old_values    jsonb,
  new_values    jsonb,
  ip_address    text,
  user_agent    text
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id    ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action     ON audit_log(action);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_log_select" ON audit_log;
DROP POLICY IF EXISTS "audit_log_insert" ON audit_log;

-- Authenticated users can read their own audit events
CREATE POLICY "audit_log_select" ON audit_log
  FOR SELECT USING (auth.uid() = user_id);

-- Authenticated users (and service role, which bypasses RLS) can insert
CREATE POLICY "audit_log_insert" ON audit_log
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- No UPDATE or DELETE policies — records are immutable
