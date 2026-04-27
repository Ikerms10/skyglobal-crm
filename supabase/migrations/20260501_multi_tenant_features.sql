-- ═══════════════════════════════════════════════════════════════════════════════
-- Multi-tenant feature tables: integrations, login log, backup storage bucket
-- Run in Supabase dashboard SQL editor.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── tenant_integrations ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tenant_integrations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  service       text NOT NULL,              -- 'google_calendar', 'thumbtack', 'zapier', etc.
  enabled       boolean NOT NULL DEFAULT false,
  config        jsonb NOT NULL DEFAULT '{}', -- service-specific settings (calendar_id, etc.)
  connected_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, service)
);

ALTER TABLE tenant_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_integrations_tenant_isolation"
  ON tenant_integrations
  USING (tenant_id = get_my_tenant_id());

CREATE INDEX IF NOT EXISTS idx_tenant_integrations_tenant
  ON tenant_integrations(tenant_id);

-- ─── tenant_login_log ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tenant_login_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL,
  logged_in_at timestamptz NOT NULL DEFAULT now(),
  ip_address   text,
  user_agent   text
);

-- No RLS needed — only accessed by master admin via service role
CREATE INDEX IF NOT EXISTS idx_tenant_login_log_tenant_time
  ON tenant_login_log(tenant_id, logged_in_at DESC);

CREATE INDEX IF NOT EXISTS idx_tenant_login_log_time
  ON tenant_login_log(logged_in_at DESC);

-- ─── crm-backups Storage bucket ──────────────────────────────────────────────
-- NOTE: bucket creation must be done via Supabase dashboard or CLI.
-- If running via CLI: `supabase storage create crm-backups`
-- Dashboard: Storage → New bucket → "crm-backups" (private)
--
-- The INSERT below only works in environments where storage schema is accessible:
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES ('crm-backups', 'crm-backups', false, 52428800, ARRAY['application/json'])
-- ON CONFLICT (id) DO NOTHING;

-- ─── Ensure notifications table has required columns ─────────────────────────
-- (In case notifications was created without a 'type' column)
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'info';

-- ─── Performance index for admin activity feed ───────────────────────────────
CREATE INDEX IF NOT EXISTS idx_leads_tenant_created_at
  ON leads(tenant_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_tenant_created_at
  ON invoices(tenant_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_projects_tenant_created_at
  ON projects(tenant_id, created_at DESC)
  WHERE deleted_at IS NULL;
