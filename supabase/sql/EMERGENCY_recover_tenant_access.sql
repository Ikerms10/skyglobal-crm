-- ═══════════════════════════════════════════════════════
-- STEP 1: DIAGNOSTIC — run this first, read the output
-- ═══════════════════════════════════════════════════════

-- How many tenants exist and are any linked to Iker?
SELECT
  t.id,
  t.business_name,
  t.business_email,
  t.owner_id,
  t.status,
  t.created_at,
  (SELECT COUNT(*) FROM leads     WHERE tenant_id = t.id) AS leads,
  (SELECT COUNT(*) FROM customers WHERE tenant_id = t.id) AS customers,
  (SELECT COUNT(*) FROM projects  WHERE tenant_id = t.id) AS projects,
  (SELECT COUNT(*) FROM proposals WHERE tenant_id = t.id) AS proposals
FROM tenants t
ORDER BY t.created_at;

-- Which tenants is Iker linked to via tenant_users?
SELECT
  tu.tenant_id,
  tu.role,
  t.business_name,
  t.created_at
FROM tenant_users tu
JOIN tenants t ON t.id = tu.tenant_id
WHERE tu.user_id = (SELECT id FROM auth.users WHERE email = 'ikerms10@gmail.com');

-- Orphaned rows (NULL tenant_id)
SELECT
  'leads'     AS tbl, COUNT(*) AS null_tenant FROM leads     WHERE tenant_id IS NULL UNION ALL
SELECT 'customers',       COUNT(*) FROM customers WHERE tenant_id IS NULL UNION ALL
SELECT 'projects',        COUNT(*) FROM projects  WHERE tenant_id IS NULL UNION ALL
SELECT 'proposals',       COUNT(*) FROM proposals WHERE tenant_id IS NULL UNION ALL
SELECT 'invoices',        COUNT(*) FROM invoices  WHERE tenant_id IS NULL UNION ALL
SELECT 'expenses',        COUNT(*) FROM expenses  WHERE tenant_id IS NULL;

-- ═══════════════════════════════════════════════════════
-- STEP 2: RECOVERY — run only after reading Step 1 output
-- ═══════════════════════════════════════════════════════

DO $$
DECLARE
  v_user_id          UUID;
  v_correct_tenant   UUID;
  v_lead_count       INT;
BEGIN
  -- Iker's auth user
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'ikerms10@gmail.com';
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'ikerms10@gmail.com not found in auth.users';
  END IF;
  RAISE NOTICE 'User ID: %', v_user_id;

  -- Pick the tenant with the most data (the real one)
  SELECT t.id INTO v_correct_tenant
  FROM tenants t
  WHERE t.owner_id = v_user_id
     OR EXISTS (SELECT 1 FROM tenant_users tu WHERE tu.tenant_id = t.id AND tu.user_id = v_user_id)
  ORDER BY (
    (SELECT COUNT(*) FROM leads     WHERE tenant_id = t.id) +
    (SELECT COUNT(*) FROM customers WHERE tenant_id = t.id) +
    (SELECT COUNT(*) FROM projects  WHERE tenant_id = t.id)
  ) DESC, t.created_at ASC
  LIMIT 1;

  -- If no tenant at all, create one
  IF v_correct_tenant IS NULL THEN
    INSERT INTO tenants (business_name, business_email, business_phone, business_website, industry, status, plan, owner_id)
    VALUES ('SkyGlobal Renovations LLC', 'skyglobalsvcs@gmail.com', '352-782-2460', 'skyglobalsvcs.com', 'Painting & Renovations', 'active', 'beta', v_user_id)
    RETURNING id INTO v_correct_tenant;
    RAISE NOTICE 'Created new tenant: %', v_correct_tenant;
  ELSE
    RAISE NOTICE 'Using existing tenant: %', v_correct_tenant;
  END IF;

  -- Ensure owner_id is set on the correct tenant
  UPDATE tenants SET owner_id = v_user_id WHERE id = v_correct_tenant;

  -- Migrate data from any other tenants linked to Iker → correct tenant
  UPDATE leads      SET tenant_id = v_correct_tenant WHERE tenant_id IN (SELECT id FROM tenants WHERE owner_id = v_user_id AND id != v_correct_tenant) OR tenant_id IS NULL;
  UPDATE customers  SET tenant_id = v_correct_tenant WHERE tenant_id IN (SELECT id FROM tenants WHERE owner_id = v_user_id AND id != v_correct_tenant) OR tenant_id IS NULL;
  UPDATE projects   SET tenant_id = v_correct_tenant WHERE tenant_id IN (SELECT id FROM tenants WHERE owner_id = v_user_id AND id != v_correct_tenant) OR tenant_id IS NULL;
  UPDATE proposals  SET tenant_id = v_correct_tenant WHERE tenant_id IN (SELECT id FROM tenants WHERE owner_id = v_user_id AND id != v_correct_tenant) OR tenant_id IS NULL;
  UPDATE invoices   SET tenant_id = v_correct_tenant WHERE tenant_id IN (SELECT id FROM tenants WHERE owner_id = v_user_id AND id != v_correct_tenant) OR tenant_id IS NULL;
  UPDATE expenses   SET tenant_id = v_correct_tenant WHERE tenant_id IN (SELECT id FROM tenants WHERE owner_id = v_user_id AND id != v_correct_tenant) OR tenant_id IS NULL;

  -- Clean up extra tenant_users rows for duplicate tenants, then delete duplicates
  DELETE FROM tenant_users WHERE tenant_id IN (SELECT id FROM tenants WHERE owner_id = v_user_id AND id != v_correct_tenant);
  DELETE FROM tenants WHERE owner_id = v_user_id AND id != v_correct_tenant;

  -- Re-link Iker as owner
  INSERT INTO tenant_users (tenant_id, user_id, role)
  VALUES (v_correct_tenant, v_user_id, 'owner')
  ON CONFLICT (tenant_id, user_id) DO UPDATE SET role = 'owner';

  -- Restore master admin
  INSERT INTO master_admins (user_id) VALUES (v_user_id) ON CONFLICT DO NOTHING;

  -- Count restored leads
  SELECT COUNT(*) INTO v_lead_count FROM leads WHERE tenant_id = v_correct_tenant;

  RAISE NOTICE '══════════════════════════════════════';
  RAISE NOTICE 'RECOVERY COMPLETE';
  RAISE NOTICE '  Tenant ID : %', v_correct_tenant;
  RAISE NOTICE '  Leads     : %', v_lead_count;
  RAISE NOTICE '══════════════════════════════════════';
END $$;

-- ═══════════════════════════════════════════════════════
-- STEP 3: RE-CREATE RLS HELPER FUNCTIONS (safe to re-run)
-- ═══════════════════════════════════════════════════════

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

-- ═══════════════════════════════════════════════════════
-- STEP 4: VERIFY — run after recovery, confirm numbers
-- ═══════════════════════════════════════════════════════

SELECT
  t.id,
  t.business_name,
  t.status,
  (SELECT COUNT(*) FROM leads     WHERE tenant_id = t.id) AS leads,
  (SELECT COUNT(*) FROM customers WHERE tenant_id = t.id) AS customers,
  (SELECT COUNT(*) FROM projects  WHERE tenant_id = t.id) AS projects,
  (SELECT COUNT(*) FROM proposals WHERE tenant_id = t.id) AS proposals,
  (SELECT COUNT(*) FROM invoices  WHERE tenant_id = t.id) AS invoices
FROM tenants t
WHERE t.owner_id = (SELECT id FROM auth.users WHERE email = 'ikerms10@gmail.com');
