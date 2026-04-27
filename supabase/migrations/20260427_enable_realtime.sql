-- Enable Supabase Realtime postgres_changes for all core CRM tables.
-- This allows the client-side useRealtimeSync hook to receive INSERT/UPDATE/DELETE
-- events and invalidate React Query caches immediately across all open tabs/devices.
--
-- REPLICA IDENTITY FULL is required so Supabase can send the full OLD row on
-- UPDATE and DELETE (needed for proper cache invalidation patterns).

ALTER TABLE leads             REPLICA IDENTITY FULL;
ALTER TABLE projects          REPLICA IDENTITY FULL;
ALTER TABLE expenses          REPLICA IDENTITY FULL;
ALTER TABLE project_expenses  REPLICA IDENTITY FULL;
ALTER TABLE invoices          REPLICA IDENTITY FULL;
ALTER TABLE proposals         REPLICA IDENTITY FULL;
ALTER TABLE customers         REPLICA IDENTITY FULL;

-- Add tables to the realtime publication
-- (Supabase creates `supabase_realtime` by default; these statements are idempotent)
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['leads','projects','expenses','project_expenses','invoices','proposals','customers']) LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = tbl
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', tbl);
    END IF;
  END LOOP;
END $$;
