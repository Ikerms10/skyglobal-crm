-- tenant_id column and backfill already handled in 20260428_multitenant.sql
-- This migration adds: invoice_number auto-generate trigger + tenant RLS policies

-- Index for tenant-scoped queries (safe to re-run)
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

-- RLS: tenant-scoped select and update
-- get_my_tenant_id() defined in 20260428_multitenant.sql — queries tenant_users
DROP POLICY IF EXISTS invoices_tenant_select ON invoices;
CREATE POLICY invoices_tenant_select
  ON invoices FOR SELECT
  USING (tenant_id = get_my_tenant_id());

DROP POLICY IF EXISTS invoices_tenant_update ON invoices;
CREATE POLICY invoices_tenant_update
  ON invoices FOR UPDATE
  USING (tenant_id = get_my_tenant_id());
