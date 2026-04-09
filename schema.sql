-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CUSTOMERS
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  type TEXT CHECK (type IN ('Residential', 'Commercial')) NOT NULL,
  company_name TEXT,
  referred_by TEXT,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- LEADS
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  source TEXT CHECK (source IN ('Thumbtack','Referral','Google','Instagram','Door Knock','Facebook','Yelp','Other')) NOT NULL,
  stage TEXT CHECK (stage IN ('New Lead','Estimate Sent','Follow-up','Negotiating','Won','Lost','On Hold')) DEFAULT 'New Lead',
  lost_reason TEXT,
  estimated_value NUMERIC(10,2),
  notes TEXT,
  follow_up_date DATE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- PROJECTS
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id),
  title TEXT NOT NULL,
  status TEXT CHECK (status IN ('Scheduled','In Progress','On Hold','Completed','Cancelled')) DEFAULT 'Scheduled',
  type TEXT CHECK (type IN ('Residential','Commercial')) NOT NULL,
  start_date DATE,
  end_date DATE,
  contract_value NUMERIC(10,2),
  amount_paid NUMERIC(10,2) DEFAULT 0,
  payment_status TEXT CHECK (payment_status IN ('Unpaid','Partial','Paid','Overdue')) DEFAULT 'Unpaid',
  address TEXT,
  description TEXT,
  notes TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- PROJECT LINE ITEMS
CREATE TABLE project_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(10,2),
  unit TEXT,
  unit_price NUMERIC(10,2),
  total NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- PROJECT EXPENSES
CREATE TABLE project_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users NOT NULL,
  category TEXT CHECK (category IN ('Labor','Materials','Subcontractors','Fuel','Tools','Other')) NOT NULL,
  description TEXT,
  amount NUMERIC(10,2) NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- GENERAL EXPENSES
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  category TEXT CHECK (category IN ('Labor','Materials','Advertising','Fuel','Tools','Subcontractors','Overhead','Insurance','Software','Other')) NOT NULL,
  description TEXT,
  amount NUMERIC(10,2) NOT NULL,
  date DATE NOT NULL,
  recurring BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ACTIVITIES
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  type TEXT CHECK (type IN ('Call','Text','Email','Visit','Note','Stage Change','Payment Received','Photo Added','Estimate Sent')) NOT NULL,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- PROJECT PHOTOS
CREATE TABLE project_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users NOT NULL,
  url TEXT NOT NULL,
  label TEXT CHECK (label IN ('Before','During','After')),
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_customers_user_id ON customers(user_id);
CREATE INDEX idx_customers_deleted_at ON customers(deleted_at);
CREATE INDEX idx_leads_user_id ON leads(user_id);
CREATE INDEX idx_leads_customer_id ON leads(customer_id);
CREATE INDEX idx_leads_stage ON leads(stage);
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_customer_id ON projects(customer_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_activities_customer_id ON activities(customer_id);
CREATE INDEX idx_activities_lead_id ON activities(lead_id);
CREATE INDEX idx_activities_project_id ON activities(project_id);

-- Updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Enable RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_photos ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users own their customers" ON customers FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their leads" ON leads FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their projects" ON projects FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own line items via project" ON project_line_items FOR ALL USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = project_line_items.project_id AND projects.user_id = auth.uid())
);
CREATE POLICY "Users own project expenses" ON project_expenses FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own expenses" ON expenses FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own activities" ON activities FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own photos" ON project_photos FOR ALL USING (auth.uid() = user_id);

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('project-photos', 'project-photos', true) ON CONFLICT DO NOTHING;
CREATE POLICY "Users can upload photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'project-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Photos are public" ON storage.objects FOR SELECT USING (bucket_id = 'project-photos');
CREATE POLICY "Users can delete own photos" ON storage.objects FOR DELETE USING (bucket_id = 'project-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
