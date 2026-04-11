-- Work Orders tables
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  subcontractor_name TEXT,
  subcontractor_phone TEXT,
  subcontractor_email TEXT,
  trade TEXT DEFAULT 'General',
  status TEXT DEFAULT 'Draft',
  budget NUMERIC(10,2) NOT NULL DEFAULT 0,
  actual_cost NUMERIC(10,2) DEFAULT 0,
  start_date DATE,
  end_date DATE,
  scope_of_work TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS work_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID REFERENCES work_orders(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(10,2),
  unit TEXT,
  unit_price NUMERIC(10,2),
  total NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own work orders" ON work_orders
  FOR ALL USING (auth.uid() = user_id);

ALTER TABLE work_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own work order items" ON work_order_items
  FOR ALL USING (
    work_order_id IN (
      SELECT id FROM work_orders WHERE user_id = auth.uid()
    )
  );
