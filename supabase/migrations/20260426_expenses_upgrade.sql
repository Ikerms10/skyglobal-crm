-- Expenses upgrade: tax tracking, project linkage, budget system
-- Run in Supabase dashboard SQL editor

-- Add columns to expenses table
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS tax_deductible BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

-- Add monthly budget columns to business_settings
ALTER TABLE business_settings
  ADD COLUMN IF NOT EXISTS budget_monthly         NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS budget_labor           NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS budget_materials       NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS budget_advertising     NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS budget_fuel            NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS budget_tools           NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS budget_subcontractors  NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS budget_overhead        NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS budget_insurance       NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS budget_software        NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS budget_other           NUMERIC(12,2);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_expenses_date       ON expenses(date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category   ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_project_id ON expenses(project_id);
