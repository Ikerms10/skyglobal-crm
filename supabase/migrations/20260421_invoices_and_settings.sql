-- ─── INVOICES ────────────────────────────────────────────────────────────────
-- Tracks individual invoices linked to projects.
-- Revenue KPIs on the dashboard use this table when available,
-- falling back to projects.amount_paid / projects.payment_status.
CREATE TABLE IF NOT EXISTS invoices (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id  uuid REFERENCES projects(id) ON DELETE SET NULL,
  amount      numeric(10,2) NOT NULL DEFAULT 0,
  status      text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','sent','paid','overdue')),
  paid_date   date,
  due_date    date,
  description text,
  deleted_at  timestamptz,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_user_id    ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_project_id ON invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status     ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_paid_date  ON invoices(paid_date);
CREATE INDEX IF NOT EXISTS idx_invoices_deleted_at ON invoices(deleted_at);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own invoices"
  ON invoices FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── BUSINESS SETTINGS ───────────────────────────────────────────────────────
-- Key/value store for per-user settings (revenue goals, preferences, etc.)
CREATE TABLE IF NOT EXISTS business_settings (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key        text NOT NULL,
  value      text NOT NULL DEFAULT '',
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, key)
);

CREATE INDEX IF NOT EXISTS idx_biz_settings_user_key ON business_settings(user_id, key);

ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own settings"
  ON business_settings FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
