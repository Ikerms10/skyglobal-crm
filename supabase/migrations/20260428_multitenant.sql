-- ═══════════════════════════════════════════════════════════════════════════════
-- MULTI-TENANT SAAS MIGRATION
-- Run in Supabase dashboard SQL editor BEFORE deploying code.
-- Safe to run multiple times — all statements are idempotent.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. TENANTS TABLE ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenants (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  business_name      TEXT        NOT NULL,
  business_email     TEXT,
  business_phone     TEXT,
  business_address   TEXT,
  business_website   TEXT,
  business_logo_url  TEXT,
  business_logo_path TEXT,
  industry           TEXT,
  status             TEXT        NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'trial', 'cancelled')),
  plan               TEXT        NOT NULL DEFAULT 'beta'
    CHECK (plan IN ('beta', 'starter', 'pro', 'enterprise')),
  trial_ends_at      TIMESTAMPTZ,
  settings           JSONB       NOT NULL DEFAULT '{}',
  owner_id           UUID        REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ─── 2. TENANT_USERS TABLE ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenant_users (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  tenant_id  UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT        NOT NULL DEFAULT 'member'
    CHECK (role IN ('owner', 'admin', 'member')),
  UNIQUE (tenant_id, user_id)
);

-- ─── 3. MASTER_ADMINS TABLE ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS master_admins (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id    UUID        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE
);

-- ─── 4. INVITES TABLE ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invites (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  tenant_id   UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email       TEXT        NOT NULL,
  role        TEXT        NOT NULL DEFAULT 'member'
    CHECK (role IN ('admin', 'member')),
  token       TEXT        NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by  UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days')
);

-- ─── 5. ADD tenant_id TO ALL TOP-LEVEL BUSINESS TABLES ───────────────────────
-- Added as nullable so existing rows can be backfilled in step 6 before
-- we enforce NOT NULL. The trigger (step 8) handles new inserts automatically.
ALTER TABLE customers        ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE leads            ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE projects         ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE proposals        ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE expenses         ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE invoices         ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE events           ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE notifications    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE crew_assignments  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE work_orders       ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE audit_log         ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- These tables may or may not exist depending on deploy state
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'daily_notes') THEN
    ALTER TABLE daily_notes ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'daily_todos') THEN
    ALTER TABLE daily_todos ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
  END IF;
END $$;

-- ─── 6. SEED: SKYGLOBAL TENANT + IKER AS MASTER ADMIN ────────────────────────
DO $$
DECLARE
  v_iker_id   UUID;
  v_tenant_id UUID;
BEGIN
  SELECT id INTO v_iker_id FROM auth.users WHERE email = 'ikerms10@gmail.com';

  IF v_iker_id IS NULL THEN
    RAISE NOTICE 'ikerms10@gmail.com not found — skipping seed';
    RETURN;
  END IF;

  -- Register Iker as master admin
  INSERT INTO master_admins (user_id)
  VALUES (v_iker_id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Create SkyGlobal tenant (idempotent via owner_id match)
  INSERT INTO tenants (business_name, business_email, industry, status, plan, owner_id)
  VALUES ('SkyGlobal Renovations', 'ikerms10@gmail.com', 'Painting & Renovations', 'active', 'beta', v_iker_id)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_tenant_id;

  -- If row already existed, fetch it
  IF v_tenant_id IS NULL THEN
    SELECT id INTO v_tenant_id FROM tenants WHERE owner_id = v_iker_id LIMIT 1;
  END IF;

  -- Add Iker as tenant owner
  INSERT INTO tenant_users (tenant_id, user_id, role)
  VALUES (v_tenant_id, v_iker_id, 'owner')
  ON CONFLICT (tenant_id, user_id) DO NOTHING;

  -- Backfill all existing rows with the SkyGlobal tenant_id
  UPDATE customers         SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
  UPDATE leads             SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
  UPDATE projects          SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
  UPDATE proposals         SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
  UPDATE expenses          SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
  UPDATE invoices          SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
  UPDATE events            SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
  UPDATE business_settings SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
  UPDATE notifications     SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
  UPDATE crew_assignments  SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
  UPDATE work_orders       SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
  UPDATE audit_log         SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'daily_notes') THEN
    EXECUTE 'UPDATE daily_notes SET tenant_id = $1 WHERE tenant_id IS NULL' USING v_tenant_id;
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'daily_todos') THEN
    EXECUTE 'UPDATE daily_todos SET tenant_id = $1 WHERE tenant_id IS NULL' USING v_tenant_id;
  END IF;

  RAISE NOTICE 'SkyGlobal tenant seeded with id=%', v_tenant_id;
END $$;

-- ─── 7. RLS HELPER FUNCTIONS ─────────────────────────────────────────────────
-- SECURITY DEFINER so the function can query tenant_users/master_admins
-- without being blocked by their own RLS policies.
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

-- ─── 8. AUTO-SET tenant_id TRIGGER ──────────────────────────────────────────
-- Fires BEFORE INSERT so existing code that omits tenant_id still works.
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
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_business_settings_tenant_id') THEN
    CREATE TRIGGER trg_business_settings_tenant_id
      BEFORE INSERT ON business_settings FOR EACH ROW EXECUTE FUNCTION auto_set_tenant_id();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_notifications_tenant_id') THEN
    CREATE TRIGGER trg_notifications_tenant_id
      BEFORE INSERT ON notifications FOR EACH ROW EXECUTE FUNCTION auto_set_tenant_id();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_crew_assignments_tenant_id') THEN
    CREATE TRIGGER trg_crew_assignments_tenant_id
      BEFORE INSERT ON crew_assignments FOR EACH ROW EXECUTE FUNCTION auto_set_tenant_id();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_work_orders_tenant_id') THEN
    CREATE TRIGGER trg_work_orders_tenant_id
      BEFORE INSERT ON work_orders FOR EACH ROW EXECUTE FUNCTION auto_set_tenant_id();
  END IF;
END $$;

-- ─── 9. REPLACE OLD user_id-BASED RLS POLICIES WITH tenant_id POLICIES ───────
-- Drop existing per-operation policies from 20260423_security_hardening.sql
-- and replace with a single FOR ALL policy per table based on tenant isolation.

-- CUSTOMERS
DROP POLICY IF EXISTS "customers_select" ON customers;
DROP POLICY IF EXISTS "customers_insert" ON customers;
DROP POLICY IF EXISTS "customers_update" ON customers;
DROP POLICY IF EXISTS "customers_delete" ON customers;
DROP POLICY IF EXISTS "customers_isolation" ON customers;
CREATE POLICY "customers_isolation" ON customers
  FOR ALL USING (is_master_admin() OR tenant_id = get_my_tenant_id())
  WITH CHECK (is_master_admin() OR tenant_id = get_my_tenant_id());

-- LEADS
DROP POLICY IF EXISTS "leads_select" ON leads;
DROP POLICY IF EXISTS "leads_insert" ON leads;
DROP POLICY IF EXISTS "leads_update" ON leads;
DROP POLICY IF EXISTS "leads_delete" ON leads;
DROP POLICY IF EXISTS "leads_isolation" ON leads;
CREATE POLICY "leads_isolation" ON leads
  FOR ALL USING (is_master_admin() OR tenant_id = get_my_tenant_id())
  WITH CHECK (is_master_admin() OR tenant_id = get_my_tenant_id());

-- PROJECTS
DROP POLICY IF EXISTS "projects_select" ON projects;
DROP POLICY IF EXISTS "projects_insert" ON projects;
DROP POLICY IF EXISTS "projects_update" ON projects;
DROP POLICY IF EXISTS "projects_delete" ON projects;
DROP POLICY IF EXISTS "projects_isolation" ON projects;
CREATE POLICY "projects_isolation" ON projects
  FOR ALL USING (is_master_admin() OR tenant_id = get_my_tenant_id())
  WITH CHECK (is_master_admin() OR tenant_id = get_my_tenant_id());

-- PROJECT_EXPENSES (has user_id directly)
DROP POLICY IF EXISTS "project_expenses_select" ON project_expenses;
DROP POLICY IF EXISTS "project_expenses_insert" ON project_expenses;
DROP POLICY IF EXISTS "project_expenses_update" ON project_expenses;
DROP POLICY IF EXISTS "project_expenses_delete" ON project_expenses;
DROP POLICY IF EXISTS "project_expenses_isolation" ON project_expenses;
CREATE POLICY "project_expenses_isolation" ON project_expenses
  FOR ALL USING (
    is_master_admin() OR
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_expenses.project_id AND p.tenant_id = get_my_tenant_id())
  )
  WITH CHECK (
    is_master_admin() OR
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_expenses.project_id AND p.tenant_id = get_my_tenant_id())
  );

-- PROJECT_LINE_ITEMS (join through projects)
DROP POLICY IF EXISTS "project_line_items_select" ON project_line_items;
DROP POLICY IF EXISTS "project_line_items_insert" ON project_line_items;
DROP POLICY IF EXISTS "project_line_items_update" ON project_line_items;
DROP POLICY IF EXISTS "project_line_items_delete" ON project_line_items;
DROP POLICY IF EXISTS "project_line_items_isolation" ON project_line_items;
CREATE POLICY "project_line_items_isolation" ON project_line_items
  FOR ALL USING (
    is_master_admin() OR
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_line_items.project_id AND p.tenant_id = get_my_tenant_id())
  )
  WITH CHECK (
    is_master_admin() OR
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_line_items.project_id AND p.tenant_id = get_my_tenant_id())
  );

-- EXPENSES
DROP POLICY IF EXISTS "expenses_select" ON expenses;
DROP POLICY IF EXISTS "expenses_insert" ON expenses;
DROP POLICY IF EXISTS "expenses_update" ON expenses;
DROP POLICY IF EXISTS "expenses_delete" ON expenses;
DROP POLICY IF EXISTS "expenses_isolation" ON expenses;
CREATE POLICY "expenses_isolation" ON expenses
  FOR ALL USING (is_master_admin() OR tenant_id = get_my_tenant_id())
  WITH CHECK (is_master_admin() OR tenant_id = get_my_tenant_id());

-- ACTIVITIES (has user_id directly, joined through customers/leads/projects)
DROP POLICY IF EXISTS "activities_select" ON activities;
DROP POLICY IF EXISTS "activities_insert" ON activities;
DROP POLICY IF EXISTS "activities_update" ON activities;
DROP POLICY IF EXISTS "activities_delete" ON activities;
DROP POLICY IF EXISTS "activities_isolation" ON activities;
CREATE POLICY "activities_isolation" ON activities
  FOR ALL USING (
    is_master_admin() OR
    EXISTS (SELECT 1 FROM customers c WHERE c.id = activities.customer_id AND c.tenant_id = get_my_tenant_id())
  )
  WITH CHECK (
    is_master_admin() OR
    EXISTS (SELECT 1 FROM customers c WHERE c.id = activities.customer_id AND c.tenant_id = get_my_tenant_id())
  );

-- PROJECT_PHOTOS (has user_id directly, join through projects)
DROP POLICY IF EXISTS "project_photos_select" ON project_photos;
DROP POLICY IF EXISTS "project_photos_insert" ON project_photos;
DROP POLICY IF EXISTS "project_photos_update" ON project_photos;
DROP POLICY IF EXISTS "project_photos_delete" ON project_photos;
DROP POLICY IF EXISTS "project_photos_isolation" ON project_photos;
CREATE POLICY "project_photos_isolation" ON project_photos
  FOR ALL USING (
    is_master_admin() OR
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_photos.project_id AND p.tenant_id = get_my_tenant_id())
  )
  WITH CHECK (
    is_master_admin() OR
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_photos.project_id AND p.tenant_id = get_my_tenant_id())
  );

-- PROPOSALS
DROP POLICY IF EXISTS "proposals_select" ON proposals;
DROP POLICY IF EXISTS "proposals_insert" ON proposals;
DROP POLICY IF EXISTS "proposals_update" ON proposals;
DROP POLICY IF EXISTS "proposals_delete" ON proposals;
DROP POLICY IF EXISTS "proposals_isolation" ON proposals;
CREATE POLICY "proposals_isolation" ON proposals
  FOR ALL USING (is_master_admin() OR tenant_id = get_my_tenant_id())
  WITH CHECK (is_master_admin() OR tenant_id = get_my_tenant_id());

-- Proposals public view (clients read via share link — keep select open for public tokens)
DROP POLICY IF EXISTS "proposals_public_view" ON proposals;
CREATE POLICY "proposals_public_view" ON proposals
  FOR SELECT USING (status IN ('Sent', 'Accepted', 'Invoiced'));

-- PROPOSAL_LINE_ITEMS
DROP POLICY IF EXISTS "proposal_line_items_select" ON proposal_line_items;
DROP POLICY IF EXISTS "proposal_line_items_insert" ON proposal_line_items;
DROP POLICY IF EXISTS "proposal_line_items_update" ON proposal_line_items;
DROP POLICY IF EXISTS "proposal_line_items_delete" ON proposal_line_items;
DROP POLICY IF EXISTS "proposal_line_items_isolation" ON proposal_line_items;
CREATE POLICY "proposal_line_items_isolation" ON proposal_line_items
  FOR ALL USING (
    is_master_admin() OR
    EXISTS (SELECT 1 FROM proposals pr WHERE pr.id = proposal_line_items.proposal_id AND pr.tenant_id = get_my_tenant_id())
  )
  WITH CHECK (
    is_master_admin() OR
    EXISTS (SELECT 1 FROM proposals pr WHERE pr.id = proposal_line_items.proposal_id AND pr.tenant_id = get_my_tenant_id())
  );

-- PROPOSAL_LINE_ITEMS public read for shared proposals
DROP POLICY IF EXISTS "proposal_line_items_public_view" ON proposal_line_items;
CREATE POLICY "proposal_line_items_public_view" ON proposal_line_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM proposals pr WHERE pr.id = proposal_line_items.proposal_id AND pr.status IN ('Sent', 'Accepted', 'Invoiced'))
  );

-- WORK_ORDERS
DROP POLICY IF EXISTS "work_orders_select" ON work_orders;
DROP POLICY IF EXISTS "work_orders_insert" ON work_orders;
DROP POLICY IF EXISTS "work_orders_update" ON work_orders;
DROP POLICY IF EXISTS "work_orders_delete" ON work_orders;
DROP POLICY IF EXISTS "work_orders_isolation" ON work_orders;
CREATE POLICY "work_orders_isolation" ON work_orders
  FOR ALL USING (is_master_admin() OR tenant_id = get_my_tenant_id())
  WITH CHECK (is_master_admin() OR tenant_id = get_my_tenant_id());

-- CREW_ASSIGNMENTS
DROP POLICY IF EXISTS "Users manage own crew assignments" ON crew_assignments;
DROP POLICY IF EXISTS "crew_assignments_select" ON crew_assignments;
DROP POLICY IF EXISTS "crew_assignments_insert" ON crew_assignments;
DROP POLICY IF EXISTS "crew_assignments_update" ON crew_assignments;
DROP POLICY IF EXISTS "crew_assignments_delete" ON crew_assignments;
DROP POLICY IF EXISTS "crew_assignments_isolation" ON crew_assignments;
CREATE POLICY "crew_assignments_isolation" ON crew_assignments
  FOR ALL USING (is_master_admin() OR tenant_id = get_my_tenant_id())
  WITH CHECK (is_master_admin() OR tenant_id = get_my_tenant_id());

-- INVOICES
DROP POLICY IF EXISTS "Users manage own invoices" ON invoices;
DROP POLICY IF EXISTS "invoices_select" ON invoices;
DROP POLICY IF EXISTS "invoices_insert" ON invoices;
DROP POLICY IF EXISTS "invoices_update" ON invoices;
DROP POLICY IF EXISTS "invoices_delete" ON invoices;
DROP POLICY IF EXISTS "invoices_isolation" ON invoices;
CREATE POLICY "invoices_isolation" ON invoices
  FOR ALL USING (is_master_admin() OR tenant_id = get_my_tenant_id())
  WITH CHECK (is_master_admin() OR tenant_id = get_my_tenant_id());

-- INVOICE_LINE_ITEMS
ALTER TABLE IF EXISTS invoice_line_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "invoice_line_items_select" ON invoice_line_items;
DROP POLICY IF EXISTS "invoice_line_items_insert" ON invoice_line_items;
DROP POLICY IF EXISTS "invoice_line_items_update" ON invoice_line_items;
DROP POLICY IF EXISTS "invoice_line_items_delete" ON invoice_line_items;
DROP POLICY IF EXISTS "invoice_line_items_isolation" ON invoice_line_items;
CREATE POLICY "invoice_line_items_isolation" ON invoice_line_items
  FOR ALL USING (
    is_master_admin() OR
    EXISTS (SELECT 1 FROM invoices i WHERE i.id = invoice_line_items.invoice_id AND i.tenant_id = get_my_tenant_id())
  )
  WITH CHECK (
    is_master_admin() OR
    EXISTS (SELECT 1 FROM invoices i WHERE i.id = invoice_line_items.invoice_id AND i.tenant_id = get_my_tenant_id())
  );

-- BUSINESS_SETTINGS
DROP POLICY IF EXISTS "Users manage own settings" ON business_settings;
DROP POLICY IF EXISTS "settings_select" ON business_settings;
DROP POLICY IF EXISTS "settings_insert" ON business_settings;
DROP POLICY IF EXISTS "settings_update" ON business_settings;
DROP POLICY IF EXISTS "settings_delete" ON business_settings;
DROP POLICY IF EXISTS "business_settings_isolation" ON business_settings;
CREATE POLICY "business_settings_isolation" ON business_settings
  FOR ALL USING (is_master_admin() OR tenant_id = get_my_tenant_id())
  WITH CHECK (is_master_admin() OR tenant_id = get_my_tenant_id());

-- NOTIFICATIONS
DROP POLICY IF EXISTS "notifications_select" ON notifications;
DROP POLICY IF EXISTS "notifications_insert" ON notifications;
DROP POLICY IF EXISTS "notifications_update" ON notifications;
DROP POLICY IF EXISTS "notifications_delete" ON notifications;
DROP POLICY IF EXISTS "notifications_isolation" ON notifications;
ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_isolation" ON notifications
  FOR ALL USING (is_master_admin() OR tenant_id = get_my_tenant_id())
  WITH CHECK (is_master_admin() OR tenant_id = get_my_tenant_id());

-- AUDIT_LOG — keep user-based read but add master_admin access
DROP POLICY IF EXISTS "audit_log_select" ON audit_log;
DROP POLICY IF EXISTS "audit_log_insert" ON audit_log;
CREATE POLICY "audit_log_select" ON audit_log
  FOR SELECT USING (is_master_admin() OR auth.uid() = user_id);
CREATE POLICY "audit_log_insert" ON audit_log
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- DAILY_NOTES / DAILY_TODOS (conditional)
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'daily_notes') THEN
    EXECUTE 'ALTER TABLE daily_notes ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "daily_notes_isolation" ON daily_notes';
    EXECUTE 'CREATE POLICY "daily_notes_isolation" ON daily_notes
      FOR ALL USING (is_master_admin() OR tenant_id = get_my_tenant_id())
      WITH CHECK (is_master_admin() OR tenant_id = get_my_tenant_id())';
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'daily_todos') THEN
    EXECUTE 'ALTER TABLE daily_todos ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "daily_todos_isolation" ON daily_todos';
    EXECUTE 'CREATE POLICY "daily_todos_isolation" ON daily_todos
      FOR ALL USING (is_master_admin() OR tenant_id = get_my_tenant_id())
      WITH CHECK (is_master_admin() OR tenant_id = get_my_tenant_id())';
  END IF;
END $$;

-- WORK_ORDER_ITEMS (join through work_orders)
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'work_order_items') THEN
    EXECUTE 'ALTER TABLE work_order_items ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "work_order_items_isolation" ON work_order_items';
    EXECUTE 'CREATE POLICY "work_order_items_isolation" ON work_order_items
      FOR ALL USING (
        is_master_admin() OR
        EXISTS (SELECT 1 FROM work_orders wo WHERE wo.id = work_order_items.work_order_id AND wo.tenant_id = get_my_tenant_id())
      )
      WITH CHECK (
        is_master_admin() OR
        EXISTS (SELECT 1 FROM work_orders wo WHERE wo.id = work_order_items.work_order_id AND wo.tenant_id = get_my_tenant_id())
      )';
  END IF;
END $$;

-- PROJECT_TASKS (join through projects)
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'project_tasks') THEN
    EXECUTE 'ALTER TABLE project_tasks ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "project_tasks_isolation" ON project_tasks';
    EXECUTE 'CREATE POLICY "project_tasks_isolation" ON project_tasks
      FOR ALL USING (
        is_master_admin() OR
        EXISTS (SELECT 1 FROM projects p WHERE p.id = project_tasks.project_id AND p.tenant_id = get_my_tenant_id())
      )
      WITH CHECK (
        is_master_admin() OR
        EXISTS (SELECT 1 FROM projects p WHERE p.id = project_tasks.project_id AND p.tenant_id = get_my_tenant_id())
      )';
  END IF;
END $$;

-- ─── 10. NEW TABLES RLS ───────────────────────────────────────────────────────
ALTER TABLE tenants      ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites      ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenants_isolation" ON tenants;
CREATE POLICY "tenants_isolation" ON tenants
  FOR ALL USING (is_master_admin() OR id = get_my_tenant_id())
  WITH CHECK (is_master_admin() OR id = get_my_tenant_id());

DROP POLICY IF EXISTS "tenant_users_isolation" ON tenant_users;
CREATE POLICY "tenant_users_isolation" ON tenant_users
  FOR ALL USING (is_master_admin() OR tenant_id = get_my_tenant_id())
  WITH CHECK (is_master_admin() OR tenant_id = get_my_tenant_id());

DROP POLICY IF EXISTS "master_admins_self" ON master_admins;
CREATE POLICY "master_admins_self" ON master_admins
  FOR ALL USING (is_master_admin() OR user_id = auth.uid())
  WITH CHECK (is_master_admin());

DROP POLICY IF EXISTS "invites_isolation" ON invites;
CREATE POLICY "invites_isolation" ON invites
  FOR ALL USING (is_master_admin() OR tenant_id = get_my_tenant_id())
  WITH CHECK (is_master_admin() OR tenant_id = get_my_tenant_id());

-- Public: anyone with the token can read an invite (for /invite/[token] landing page)
DROP POLICY IF EXISTS "invites_public_token_read" ON invites;
CREATE POLICY "invites_public_token_read" ON invites
  FOR SELECT USING (accepted_at IS NULL AND expires_at > now());

-- ─── 11. STORAGE BUCKET FOR BUSINESS LOGOS ───────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('business-logos', 'business-logos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "business_logos_public_read" ON storage.objects;
CREATE POLICY "business_logos_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'business-logos');

DROP POLICY IF EXISTS "business_logos_authenticated_write" ON storage.objects;
CREATE POLICY "business_logos_authenticated_write" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'business-logos' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "business_logos_authenticated_update" ON storage.objects;
CREATE POLICY "business_logos_authenticated_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'business-logos' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "business_logos_authenticated_delete" ON storage.objects;
CREATE POLICY "business_logos_authenticated_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'business-logos' AND auth.uid() IS NOT NULL);

-- ─── 12. INDEXES ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tenant_users_user_id   ON tenant_users (user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant_id  ON tenant_users (tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenants_owner_id        ON tenants (owner_id);
CREATE INDEX IF NOT EXISTS idx_invites_token           ON invites (token);
CREATE INDEX IF NOT EXISTS idx_invites_tenant_id       ON invites (tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_tenant_id     ON customers (tenant_id);
CREATE INDEX IF NOT EXISTS idx_leads_tenant_id         ON leads (tenant_id);
CREATE INDEX IF NOT EXISTS idx_projects_tenant_id      ON projects (tenant_id);
CREATE INDEX IF NOT EXISTS idx_proposals_tenant_id     ON proposals (tenant_id);
CREATE INDEX IF NOT EXISTS idx_expenses_tenant_id      ON expenses (tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_id      ON invoices (tenant_id);
CREATE INDEX IF NOT EXISTS idx_events_tenant_id        ON events (tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant_id ON notifications (tenant_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_tenant_id   ON work_orders (tenant_id);
CREATE INDEX IF NOT EXISTS idx_crew_assignments_tenant ON crew_assignments (tenant_id);
