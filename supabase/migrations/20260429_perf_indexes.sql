-- ═══════════════════════════════════════════════════════════════════════════════
-- PERFORMANCE: Composite indexes for tenant-scoped queries
-- Safe to run multiple times — all CREATE INDEX are IF NOT EXISTS.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_leads_tenant_status
  ON leads(tenant_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_leads_tenant_created
  ON leads(tenant_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_leads_follow_up
  ON leads(tenant_id, follow_up_date)
  WHERE deleted_at IS NULL AND stage NOT IN ('Won', 'Lost', 'On Hold');

CREATE INDEX IF NOT EXISTS idx_projects_tenant_status
  ON projects(tenant_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_projects_tenant_created
  ON projects(tenant_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_tenant_status
  ON invoices(tenant_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_expenses_tenant_date
  ON expenses(tenant_id, date DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_proposals_tenant_status
  ON proposals(tenant_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_customers_tenant
  ON customers(tenant_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_tenant_read
  ON notifications(tenant_id, is_read, created_at DESC);
