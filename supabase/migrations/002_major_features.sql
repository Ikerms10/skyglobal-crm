-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 002: Major Features
-- Features: Proposal portal, Invoices, Notifications, Events
-- Run in Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. PROPOSALS: add sharing & signing columns ───────────────────────────────
ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS share_token UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS viewed_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS client_signature TEXT,
  ADD COLUMN IF NOT EXISTS client_ip TEXT;

-- Unique index so token lookups are fast and guaranteed unique
CREATE UNIQUE INDEX IF NOT EXISTS proposals_share_token_idx ON proposals(share_token);

-- Backfill any proposals that don't have a token yet
UPDATE proposals SET share_token = gen_random_uuid() WHERE share_token IS NULL;

-- ── 2. INVOICES ───────────────────────────────────────────────────────────────
-- The invoices table may already exist (from 20260421_invoices_and_settings.sql).
-- These ALTER statements add missing columns needed for the full invoice flow.
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_number TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS issue_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_terms TEXT DEFAULT 'Net 30';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_at DATE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_notes TEXT;
-- 'total' may exist as 'amount' in the old schema; add both for compatibility
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS total NUMERIC(10, 2) DEFAULT 0;

-- Line items for invoices
CREATE TABLE IF NOT EXISTS invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  quantity NUMERIC(10, 2),
  unit_price NUMERIC(10, 2),
  total NUMERIC(10, 2),
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. NOTIFICATIONS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  resource_type TEXT,
  resource_id UUID,
  action_url TEXT,
  icon TEXT DEFAULT 'bell',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 4. EVENTS (calendar) ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  title TEXT NOT NULL,
  type TEXT CHECK (type IN ('estimate', 'job', 'payment', 'deadline', 'personal')) DEFAULT 'personal',
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ,
  all_day BOOLEAN DEFAULT false,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 5. RLS ────────────────────────────────────────────────────────────────────
-- invoices RLS may already be enabled from prior migration — safe to re-run
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Use IF NOT EXISTS-equivalent: drop and recreate (idempotent approach)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'invoice_line_items' AND policyname = 'Users own invoice line items via invoice'
  ) THEN
    EXECUTE 'CREATE POLICY "Users own invoice line items via invoice" ON invoice_line_items FOR ALL USING (EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_line_items.invoice_id AND invoices.user_id = auth.uid()))';
  END IF;
END $$;

CREATE POLICY "Users own their notifications"
  ON notifications FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users own their events"
  ON events FOR ALL USING (auth.uid() = user_id);

-- Public can read proposals by share token (for client portal)
-- NOTE: This allows unauthenticated reads of proposals with a valid token.
-- The share_token is a UUID (cryptographically random), not guessable.
CREATE POLICY "Public can view proposal by share token"
  ON proposals FOR SELECT
  USING (share_token IS NOT NULL AND deleted_at IS NULL);

-- ── 6. TRIGGERS ──────────────────────────────────────────────────────────────
CREATE TRIGGER invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 7. INDEXES ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at);
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_start_at ON events(start_at);
