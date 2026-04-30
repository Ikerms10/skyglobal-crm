-- ═══════════════════════════════════════════════════════════════
-- EMERGENCY FIX: Create/replace RLS helper functions + policies
-- Safe to run multiple times. Fixes the leads (and all tables)
-- showing empty because get_my_tenant_id() didn't exist.
-- ═══════════════════════════════════════════════════════════════

-- 1. Create the RLS helper functions
CREATE OR REPLACE FUNCTION get_my_tenant_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION is_master_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM master_admins WHERE user_id = auth.uid());
$$;

-- 2. Create auto_set_tenant_id trigger function
CREATE OR REPLACE FUNCTION auto_set_tenant_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := get_my_tenant_id();
  END IF;
  RETURN NEW;
END;
$$;

-- 3. Ensure triggers exist for all business tables
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_customers_tenant_id') THEN
    CREATE TRIGGER trg_customers_tenant_id
      BEFORE INSERT ON customers FOR EACH ROW EXECUTE FUNCTION auto_set_tenant_id();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_leads_tenant_id') THEN
    CREATE TRIGGER trg_leads_tenant_id
      BEFORE INSERT ON leads FOR EACH ROW EXECUTE FUNCTION auto_set_tenant_id();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_projects_tenant_id') THEN
    CREATE TRIGGER trg_projects_tenant_id
      BEFORE INSERT ON projects FOR EACH ROW EXECUTE FUNCTION auto_set_tenant_id();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_proposals_tenant_id') THEN
    CREATE TRIGGER trg_proposals_tenant_id
      BEFORE INSERT ON proposals FOR EACH ROW EXECUTE FUNCTION auto_set_tenant_id();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_expenses_tenant_id') THEN
    CREATE TRIGGER trg_expenses_tenant_id
      BEFORE INSERT ON expenses FOR EACH ROW EXECUTE FUNCTION auto_set_tenant_id();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_invoices_tenant_id') THEN
    CREATE TRIGGER trg_invoices_tenant_id
      BEFORE INSERT ON invoices FOR EACH ROW EXECUTE FUNCTION auto_set_tenant_id();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_events_tenant_id') THEN
    CREATE TRIGGER trg_events_tenant_id
      BEFORE INSERT ON events FOR EACH ROW EXECUTE FUNCTION auto_set_tenant_id();
  END IF;
END $$;

-- 4. Replace all RLS policies with tenant-based isolation

-- LEADS
DROP POLICY IF EXISTS "leads_select" ON leads;
DROP POLICY IF EXISTS "leads_insert" ON leads;
DROP POLICY IF EXISTS "leads_update" ON leads;
DROP POLICY IF EXISTS "leads_delete" ON leads;
DROP POLICY IF EXISTS "leads_isolation" ON leads;
DROP POLICY IF EXISTS "Users manage own leads" ON leads;
CREATE POLICY "leads_isolation" ON leads
  FOR ALL USING (is_master_admin() OR tenant_id = get_my_tenant_id())
  WITH CHECK (is_master_admin() OR tenant_id = get_my_tenant_id());

-- CUSTOMERS
DROP POLICY IF EXISTS "customers_select" ON customers;
DROP POLICY IF EXISTS "customers_insert" ON customers;
DROP POLICY IF EXISTS "customers_update" ON customers;
DROP POLICY IF EXISTS "customers_delete" ON customers;
DROP POLICY IF EXISTS "customers_isolation" ON customers;
DROP POLICY IF EXISTS "Users manage own customers" ON customers;
CREATE POLICY "customers_isolation" ON customers
  FOR ALL USING (is_master_admin() OR tenant_id = get_my_tenant_id())
  WITH CHECK (is_master_admin() OR tenant_id = get_my_tenant_id());

-- PROJECTS
DROP POLICY IF EXISTS "projects_select" ON projects;
DROP POLICY IF EXISTS "projects_insert" ON projects;
DROP POLICY IF EXISTS "projects_update" ON projects;
DROP POLICY IF EXISTS "projects_delete" ON projects;
DROP POLICY IF EXISTS "projects_isolation" ON projects;
DROP POLICY IF EXISTS "Users manage own projects" ON projects;
CREATE POLICY "projects_isolation" ON projects
  FOR ALL USING (is_master_admin() OR tenant_id = get_my_tenant_id())
  WITH CHECK (is_master_admin() OR tenant_id = get_my_tenant_id());

-- PROPOSALS
DROP POLICY IF EXISTS "proposals_select" ON proposals;
DROP POLICY IF EXISTS "proposals_insert" ON proposals;
DROP POLICY IF EXISTS "proposals_update" ON proposals;
DROP POLICY IF EXISTS "proposals_delete" ON proposals;
DROP POLICY IF EXISTS "proposals_isolation" ON proposals;
DROP POLICY IF EXISTS "Users manage own proposals" ON proposals;
CREATE POLICY "proposals_isolation" ON proposals
  FOR ALL USING (is_master_admin() OR tenant_id = get_my_tenant_id())
  WITH CHECK (is_master_admin() OR tenant_id = get_my_tenant_id());
-- Keep public view for proposal sharing
DROP POLICY IF EXISTS "proposals_public_view" ON proposals;
CREATE POLICY "proposals_public_view" ON proposals
  FOR SELECT USING (status IN ('Sent', 'Accepted', 'Invoiced'));

-- EXPENSES
DROP POLICY IF EXISTS "expenses_select" ON expenses;
DROP POLICY IF EXISTS "expenses_insert" ON expenses;
DROP POLICY IF EXISTS "expenses_update" ON expenses;
DROP POLICY IF EXISTS "expenses_delete" ON expenses;
DROP POLICY IF EXISTS "expenses_isolation" ON expenses;
DROP POLICY IF EXISTS "Users manage own expenses" ON expenses;
CREATE POLICY "expenses_isolation" ON expenses
  FOR ALL USING (is_master_admin() OR tenant_id = get_my_tenant_id())
  WITH CHECK (is_master_admin() OR tenant_id = get_my_tenant_id());

-- INVOICES
DROP POLICY IF EXISTS "invoices_select" ON invoices;
DROP POLICY IF EXISTS "invoices_insert" ON invoices;
DROP POLICY IF EXISTS "invoices_update" ON invoices;
DROP POLICY IF EXISTS "invoices_delete" ON invoices;
DROP POLICY IF EXISTS "invoices_isolation" ON invoices;
DROP POLICY IF EXISTS "Users manage own invoices" ON invoices;
CREATE POLICY "invoices_isolation" ON invoices
  FOR ALL USING (is_master_admin() OR tenant_id = get_my_tenant_id())
  WITH CHECK (is_master_admin() OR tenant_id = get_my_tenant_id());

-- EVENTS
DROP POLICY IF EXISTS "events_isolation" ON events;
DROP POLICY IF EXISTS "Users manage own events" ON events;
CREATE POLICY "events_isolation" ON events
  FOR ALL USING (is_master_admin() OR tenant_id = get_my_tenant_id())
  WITH CHECK (is_master_admin() OR tenant_id = get_my_tenant_id());

-- NOTIFICATIONS
ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notifications_isolation" ON notifications;
CREATE POLICY "notifications_isolation" ON notifications
  FOR ALL USING (is_master_admin() OR tenant_id = get_my_tenant_id())
  WITH CHECK (is_master_admin() OR tenant_id = get_my_tenant_id());

-- WORK_ORDERS
DROP POLICY IF EXISTS "work_orders_isolation" ON work_orders;
CREATE POLICY "work_orders_isolation" ON work_orders
  FOR ALL USING (is_master_admin() OR tenant_id = get_my_tenant_id())
  WITH CHECK (is_master_admin() OR tenant_id = get_my_tenant_id());

-- ACTIVITIES
DROP POLICY IF EXISTS "activities_select" ON activities;
DROP POLICY IF EXISTS "activities_insert" ON activities;
DROP POLICY IF EXISTS "activities_update" ON activities;
DROP POLICY IF EXISTS "activities_delete" ON activities;
DROP POLICY IF EXISTS "activities_isolation" ON activities;
DROP POLICY IF EXISTS "Users manage own activities" ON activities;
CREATE POLICY "activities_isolation" ON activities
  FOR ALL USING (
    is_master_admin() OR
    EXISTS (SELECT 1 FROM customers c WHERE c.id = activities.customer_id AND c.tenant_id = get_my_tenant_id())
  )
  WITH CHECK (
    is_master_admin() OR
    EXISTS (SELECT 1 FROM customers c WHERE c.id = activities.customer_id AND c.tenant_id = get_my_tenant_id())
  );

-- BUSINESS_SETTINGS  
DROP POLICY IF EXISTS "business_settings_isolation" ON business_settings;
DROP POLICY IF EXISTS "Users manage own settings" ON business_settings;
DROP POLICY IF EXISTS "settings_select" ON business_settings;
CREATE POLICY "business_settings_isolation" ON business_settings
  FOR ALL USING (is_master_admin() OR tenant_id = get_my_tenant_id())
  WITH CHECK (is_master_admin() OR tenant_id = get_my_tenant_id());

-- TENANT_USERS
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_users_isolation" ON tenant_users;
CREATE POLICY "tenant_users_isolation" ON tenant_users
  FOR ALL USING (is_master_admin() OR tenant_id = get_my_tenant_id())
  WITH CHECK (is_master_admin() OR tenant_id = get_my_tenant_id());

-- TENANTS
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenants_isolation" ON tenants;
CREATE POLICY "tenants_isolation" ON tenants
  FOR ALL USING (is_master_admin() OR id = get_my_tenant_id())
  WITH CHECK (is_master_admin() OR id = get_my_tenant_id());

-- MASTER_ADMINS
ALTER TABLE master_admins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "master_admins_self" ON master_admins;
CREATE POLICY "master_admins_self" ON master_admins
  FOR ALL USING (is_master_admin() OR user_id = auth.uid())
  WITH CHECK (is_master_admin());

-- INVITES
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "invites_isolation" ON invites;
CREATE POLICY "invites_isolation" ON invites
  FOR ALL USING (is_master_admin() OR tenant_id = get_my_tenant_id())
  WITH CHECK (is_master_admin() OR tenant_id = get_my_tenant_id());
DROP POLICY IF EXISTS "invites_public_token_read" ON invites;
CREATE POLICY "invites_public_token_read" ON invites
  FOR SELECT USING (accepted_at IS NULL AND expires_at > now());

-- 5. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tenant_users_user_id   ON tenant_users (user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant_id  ON tenant_users (tenant_id);
CREATE INDEX IF NOT EXISTS idx_leads_tenant_id         ON leads (tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_tenant_id     ON customers (tenant_id);
CREATE INDEX IF NOT EXISTS idx_projects_tenant_id      ON projects (tenant_id);
CREATE INDEX IF NOT EXISTS idx_proposals_tenant_id     ON proposals (tenant_id);

-- Done!
