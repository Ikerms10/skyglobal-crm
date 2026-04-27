-- ═══════════════════════════════════════════════════════════════════════════════
-- FIX: SEED SKYGLOBAL TENANT & BACKFILL EXISTING DATA
-- Run in Supabase dashboard → SQL Editor if the admin panel shows 0 tenants.
-- Safe to run multiple times — all statements are idempotent.
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_user_id   UUID;
  v_tenant_id UUID;
BEGIN
  -- ─── 1. Resolve Iker's auth user ID ───────────────────────────────────────
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'ikerms10@gmail.com';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'ikerms10@gmail.com not found in auth.users — log in at least once first.';
  END IF;

  RAISE NOTICE 'Found user: %', v_user_id;

  -- ─── 2. Ensure Iker is in master_admins ───────────────────────────────────
  INSERT INTO master_admins (user_id)
  VALUES (v_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  -- ─── 3. Create SkyGlobal tenant (or find existing) ────────────────────────
  SELECT id INTO v_tenant_id
  FROM tenants
  WHERE owner_id = v_user_id
  LIMIT 1;

  IF v_tenant_id IS NULL THEN
    INSERT INTO tenants (
      business_name,
      business_email,
      business_phone,
      business_website,
      industry,
      status,
      plan,
      owner_id
    ) VALUES (
      'SkyGlobal Renovations LLC',
      'skyglobalsvcs@gmail.com',
      '352-782-2460',
      'skyglobalsvcs.com',
      'Painting & Renovations',
      'active',
      'beta',
      v_user_id
    )
    RETURNING id INTO v_tenant_id;

    RAISE NOTICE 'Created tenant: %', v_tenant_id;
  ELSE
    RAISE NOTICE 'Found existing tenant: %', v_tenant_id;
  END IF;

  -- ─── 4. Ensure Iker is linked as owner in tenant_users ────────────────────
  INSERT INTO tenant_users (tenant_id, user_id, role)
  VALUES (v_tenant_id, v_user_id, 'owner')
  ON CONFLICT (tenant_id, user_id) DO NOTHING;

  -- ─── 5. Backfill all existing rows to this tenant ─────────────────────────
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

  -- Optional tables (may not exist on all environments)
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'daily_notes') THEN
    EXECUTE 'UPDATE daily_notes SET tenant_id = $1 WHERE tenant_id IS NULL' USING v_tenant_id;
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'daily_todos') THEN
    EXECUTE 'UPDATE daily_todos SET tenant_id = $1 WHERE tenant_id IS NULL' USING v_tenant_id;
  END IF;

  RAISE NOTICE '✓ Done. SkyGlobal tenant_id = %', v_tenant_id;
  RAISE NOTICE '✓ Iker registered as master_admin';
  RAISE NOTICE '✓ All existing rows backfilled';
END $$;

-- ─── Verify results ───────────────────────────────────────────────────────────
SELECT 'tenants'      AS tbl, count(*)::text AS rows FROM tenants
UNION ALL
SELECT 'tenant_users' AS tbl, count(*)::text AS rows FROM tenant_users
UNION ALL
SELECT 'master_admins' AS tbl, count(*)::text AS rows FROM master_admins;
