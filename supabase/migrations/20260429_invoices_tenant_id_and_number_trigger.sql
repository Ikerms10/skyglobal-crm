-- Add tenant_id to invoices for proper multi-tenant isolation
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);

-- Backfill tenant_id from users table (assumes users.tenant_id exists)
UPDATE invoices i
SET tenant_id = u.tenant_id
FROM users u
WHERE i.user_id = u.id
  AND i.tenant_id IS NULL;

-- Index for tenant-scoped queries
CREATE INDEX IF NOT EXISTS invoices_tenant_id_idx ON invoices(tenant_id);

-- Auto-generate invoice numbers: INV-{YEAR}-{4-digit sequence per tenant}
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_year text;
  v_seq  int;
BEGIN
  IF NEW.invoice_number IS NOT NULL AND NEW.invoice_number != '' THEN
    RETURN NEW;
  END IF;

  v_year := to_char(now(), 'YYYY');

  SELECT COUNT(*) + 1
  INTO v_seq
  FROM invoices
  WHERE tenant_id = NEW.tenant_id
    AND invoice_number LIKE 'INV-' || v_year || '-%'
    AND deleted_at IS NULL;

  NEW.invoice_number := 'INV-' || v_year || '-' || lpad(v_seq::text, 4, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_invoice_number ON invoices;
CREATE TRIGGER trg_invoice_number
  BEFORE INSERT ON invoices
  FOR EACH ROW EXECUTE FUNCTION generate_invoice_number();

-- RLS: allow tenant members to read/write their own invoices
-- (assumes existing user_id policy; adds tenant_id policy alongside it)
DROP POLICY IF EXISTS invoices_tenant_select ON invoices;
CREATE POLICY invoices_tenant_select
  ON invoices FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS invoices_tenant_update ON invoices;
CREATE POLICY invoices_tenant_update
  ON invoices FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );
