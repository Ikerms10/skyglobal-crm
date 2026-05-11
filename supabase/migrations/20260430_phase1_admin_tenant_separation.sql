-- ═══════════════════════════════════════════════════════════════════════════
-- PHASE 1 — Admin/Tenant Separation Migration
-- Run in Supabase Dashboard → SQL Editor
-- Run STEP 1 (diagnostics) first. Save results. Then run STEP 2 (migration).
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- STEP 1: DIAGNOSTIC SNAPSHOT — run this first, save the output
-- ───────────────────────────────────────────────────────────────────────────

SELECT 'CURRENT STATE BEFORE MIGRATION' AS snapshot;

SELECT id, email, created_at FROM auth.users ORDER BY created_at;

SELECT id, business_name, business_email, owner_id, status FROM tenants;

SELECT tu.tenant_id, tu.user_id, tu.role, u.email, t.business_name
FROM tenant_users tu
JOIN auth.users u ON u.id = tu.user_id
JOIN tenants t ON t.id = tu.tenant_id;

SELECT
  t.business_name,
  (SELECT COUNT(*) FROM leads       WHERE tenant_id = t.id) AS leads,
  (SELECT COUNT(*) FROM customers   WHERE tenant_id = t.id) AS customers,
  (SELECT COUNT(*) FROM projects    WHERE tenant_id = t.id) AS projects,
  (SELECT COUNT(*) FROM proposals   WHERE tenant_id = t.id) AS proposals,
  (SELECT COUNT(*) FROM invoices    WHERE tenant_id = t.id) AS invoices,
  (SELECT COUNT(*) FROM expenses    WHERE tenant_id = t.id) AS expenses
FROM tenants t;


-- ───────────────────────────────────────────────────────────────────────────
-- STEP 2: MIGRATION — run only after saving Step 1 output
-- Pre-requisite: create skyglobalsvcs@gmail.com in Supabase Dashboard →
--   Authentication → Users → Add User (auto-confirm, password: 378HiddenPalm!)
-- ───────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_iker_id            UUID;
  v_skyglobal_user_id  UUID;
  v_skyglobal_tenant_id UUID;
  v_lead_count         INT;
  v_customer_count     INT;
  v_project_count      INT;
  v_proposal_count     INT;
  v_invoice_count      INT;
BEGIN
  -- 1. Resolve user IDs
  SELECT id INTO v_iker_id         FROM auth.users WHERE email = 'ikerms10@gmail.com';
  SELECT id INTO v_skyglobal_user_id FROM auth.users WHERE email = 'skyglobalsvcs@gmail.com';

  IF v_iker_id IS NULL THEN
    RAISE EXCEPTION 'ikerms10@gmail.com not found in auth.users';
  END IF;
  IF v_skyglobal_user_id IS NULL THEN
    RAISE EXCEPTION 'skyglobalsvcs@gmail.com not found — create it in Supabase Dashboard first';
  END IF;

  RAISE NOTICE 'Iker (admin)     : %', v_iker_id;
  RAISE NOTICE 'SkyGlobal user   : %', v_skyglobal_user_id;

  -- 2. Find the canonical SkyGlobal tenant (most data wins)
  SELECT t.id INTO v_skyglobal_tenant_id
  FROM tenants t
  WHERE t.business_name ILIKE '%skyglobal%'
     OR t.owner_id = v_iker_id
  ORDER BY (
    (SELECT COUNT(*) FROM leads     WHERE tenant_id = t.id) +
    (SELECT COUNT(*) FROM customers WHERE tenant_id = t.id) +
    (SELECT COUNT(*) FROM projects  WHERE tenant_id = t.id)
  ) DESC, t.created_at ASC
  LIMIT 1;

  IF v_skyglobal_tenant_id IS NULL THEN
    INSERT INTO tenants (
      business_name, business_email, business_phone,
      business_website, industry, status, plan, owner_id
    ) VALUES (
      'SkyGlobal Renovations LLC', 'skyglobalsvcs@gmail.com', '352-782-2460',
      'skyglobalsvcs.com', 'painting', 'active', 'beta', v_skyglobal_user_id
    ) RETURNING id INTO v_skyglobal_tenant_id;
    RAISE NOTICE 'Created new SkyGlobal tenant : %', v_skyglobal_tenant_id;
  ELSE
    RAISE NOTICE 'Using existing tenant        : %', v_skyglobal_tenant_id;
  END IF;

  -- 3. Update tenant record — hand ownership to SkyGlobal user
  UPDATE tenants SET
    owner_id         = v_skyglobal_user_id,
    business_name    = 'SkyGlobal Renovations LLC',
    business_email   = 'skyglobalsvcs@gmail.com',
    business_phone   = COALESCE(NULLIF(business_phone, ''), '352-782-2460'),
    business_website = COALESCE(NULLIF(business_website, ''), 'skyglobalsvcs.com'),
    industry         = COALESCE(NULLIF(industry, ''), 'painting'),
    status           = 'active',
    plan             = 'beta'
  WHERE id = v_skyglobal_tenant_id;

  RAISE NOTICE 'Tenant ownership updated';

  -- 4. Migrate all data from duplicate/test tenants → canonical tenant
  --    Also pulls in any NULL-tenant rows (legacy single-tenant data)
  UPDATE leads SET tenant_id = v_skyglobal_tenant_id
  WHERE tenant_id IS NULL
     OR (tenant_id != v_skyglobal_tenant_id AND tenant_id IN (
          SELECT id FROM tenants WHERE id != v_skyglobal_tenant_id));

  UPDATE customers SET tenant_id = v_skyglobal_tenant_id
  WHERE tenant_id IS NULL
     OR (tenant_id != v_skyglobal_tenant_id AND tenant_id IN (
          SELECT id FROM tenants WHERE id != v_skyglobal_tenant_id));

  UPDATE projects SET tenant_id = v_skyglobal_tenant_id
  WHERE tenant_id IS NULL
     OR (tenant_id != v_skyglobal_tenant_id AND tenant_id IN (
          SELECT id FROM tenants WHERE id != v_skyglobal_tenant_id));

  UPDATE proposals SET tenant_id = v_skyglobal_tenant_id
  WHERE tenant_id IS NULL
     OR (tenant_id != v_skyglobal_tenant_id AND tenant_id IN (
          SELECT id FROM tenants WHERE id != v_skyglobal_tenant_id));

  UPDATE invoices SET tenant_id = v_skyglobal_tenant_id
  WHERE tenant_id IS NULL
     OR (tenant_id != v_skyglobal_tenant_id AND tenant_id IN (
          SELECT id FROM tenants WHERE id != v_skyglobal_tenant_id));

  UPDATE expenses SET tenant_id = v_skyglobal_tenant_id
  WHERE tenant_id IS NULL
     OR (tenant_id != v_skyglobal_tenant_id AND tenant_id IN (
          SELECT id FROM tenants WHERE id != v_skyglobal_tenant_id));

  -- activity_log and notifications — safe-wrap in case column doesn't exist
  BEGIN
    UPDATE activity_log SET tenant_id = v_skyglobal_tenant_id
    WHERE tenant_id IS NULL
       OR (tenant_id != v_skyglobal_tenant_id AND tenant_id IN (
            SELECT id FROM tenants WHERE id != v_skyglobal_tenant_id));
  EXCEPTION WHEN undefined_column OR undefined_table THEN NULL; END;

  BEGIN
    UPDATE notifications SET tenant_id = v_skyglobal_tenant_id
    WHERE tenant_id IS NULL
       OR (tenant_id != v_skyglobal_tenant_id AND tenant_id IN (
            SELECT id FROM tenants WHERE id != v_skyglobal_tenant_id));
  EXCEPTION WHEN undefined_column OR undefined_table THEN NULL; END;

  BEGIN
    UPDATE business_settings SET tenant_id = v_skyglobal_tenant_id
    WHERE tenant_id IS NULL OR tenant_id != v_skyglobal_tenant_id;
  EXCEPTION WHEN undefined_column OR undefined_table THEN NULL; END;

  BEGIN
    UPDATE tenant_integrations SET tenant_id = v_skyglobal_tenant_id
    WHERE tenant_id != v_skyglobal_tenant_id;
  EXCEPTION WHEN undefined_column OR undefined_table THEN NULL; END;

  RAISE NOTICE 'All data consolidated into SkyGlobal tenant';

  -- 5. Delete all other tenants (test/duplicate rows)
  DELETE FROM tenant_users WHERE tenant_id IN (
    SELECT id FROM tenants WHERE id != v_skyglobal_tenant_id
  );
  DELETE FROM tenants WHERE id != v_skyglobal_tenant_id;

  RAISE NOTICE 'Duplicate/test tenants removed';

  -- 6. tenant_users: exactly one row — SkyGlobal user as owner
  DELETE FROM tenant_users WHERE tenant_id = v_skyglobal_tenant_id;
  INSERT INTO tenant_users (tenant_id, user_id, role)
  VALUES (v_skyglobal_tenant_id, v_skyglobal_user_id, 'owner');

  RAISE NOTICE 'SkyGlobal user linked as tenant owner';

  -- 7. master_admins: exactly Iker (and only Iker)
  DELETE FROM master_admins;
  INSERT INTO master_admins (user_id) VALUES (v_iker_id);

  RAISE NOTICE 'Iker set as sole master admin';

  -- 8. Iker must have NO tenant_users row (pure admin, no tenant)
  DELETE FROM tenant_users WHERE user_id = v_iker_id;

  RAISE NOTICE 'Removed any tenant_users rows for Iker';

  -- 9. Verification counts
  SELECT COUNT(*) INTO v_lead_count     FROM leads     WHERE tenant_id = v_skyglobal_tenant_id;
  SELECT COUNT(*) INTO v_customer_count FROM customers WHERE tenant_id = v_skyglobal_tenant_id;
  SELECT COUNT(*) INTO v_project_count  FROM projects  WHERE tenant_id = v_skyglobal_tenant_id;
  SELECT COUNT(*) INTO v_proposal_count FROM proposals WHERE tenant_id = v_skyglobal_tenant_id;
  SELECT COUNT(*) INTO v_invoice_count  FROM invoices  WHERE tenant_id = v_skyglobal_tenant_id;

  RAISE NOTICE '══════════════════════════════════════════════════';
  RAISE NOTICE 'PHASE 1 MIGRATION COMPLETE';
  RAISE NOTICE '  Admin (no tenant) : ikerms10@gmail.com';
  RAISE NOTICE '  Tenant owner      : skyglobalsvcs@gmail.com';
  RAISE NOTICE '  Tenant ID         : %', v_skyglobal_tenant_id;
  RAISE NOTICE '  Leads             : %', v_lead_count;
  RAISE NOTICE '  Customers         : %', v_customer_count;
  RAISE NOTICE '  Projects          : %', v_project_count;
  RAISE NOTICE '  Proposals         : %', v_proposal_count;
  RAISE NOTICE '  Invoices          : %', v_invoice_count;
  RAISE NOTICE '══════════════════════════════════════════════════';
END $$;


-- ───────────────────────────────────────────────────────────────────────────
-- STEP 3: POST-MIGRATION VERIFICATION — run after migration, compare to Step 1
-- ───────────────────────────────────────────────────────────────────────────

SELECT 'AFTER MIGRATION STATE' AS snapshot;

-- Exactly 1 tenant
SELECT id, business_name, business_email, owner_id, status FROM tenants;

-- Exactly 1 tenant_users row (SkyGlobal user, owner)
SELECT tu.role, u.email, t.business_name
FROM tenant_users tu
JOIN auth.users u ON u.id = tu.user_id
JOIN tenants t ON t.id = tu.tenant_id;

-- Exactly 1 master_admin row (Iker)
SELECT u.email AS master_admin FROM master_admins ma
JOIN auth.users u ON u.id = ma.user_id;

-- Must return FALSE — Iker must NOT be in tenant_users
SELECT EXISTS (
  SELECT 1 FROM tenant_users tu
  JOIN auth.users u ON u.id = tu.user_id
  WHERE u.email = 'ikerms10@gmail.com'
) AS iker_has_tenant_role;

-- Counts — compare to Step 1
SELECT
  (SELECT COUNT(*) FROM leads)     AS leads,
  (SELECT COUNT(*) FROM customers) AS customers,
  (SELECT COUNT(*) FROM projects)  AS projects,
  (SELECT COUNT(*) FROM proposals) AS proposals,
  (SELECT COUNT(*) FROM invoices)  AS invoices,
  (SELECT COUNT(*) FROM expenses)  AS expenses;


-- ───────────────────────────────────────────────────────────────────────────
-- STEP 4: REFRESH RLS HELPER FUNCTIONS (safe to re-run)
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_my_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_master_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM master_admins WHERE user_id = auth.uid());
$$ LANGUAGE sql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION get_my_tenant_id() TO authenticated;
GRANT EXECUTE ON FUNCTION is_master_admin()   TO authenticated;
