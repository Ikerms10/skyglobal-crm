-- PROPOSALS
CREATE TABLE proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  template TEXT CHECK (template IN ('interior','exterior','cabinet','custom')) NOT NULL DEFAULT 'interior',
  status TEXT CHECK (status IN ('Draft','Sent','Accepted','Invoiced')) NOT NULL DEFAULT 'Draft',
  project_name TEXT,
  client_name TEXT,
  client_contact TEXT,
  client_address TEXT,
  project_scope TEXT,
  total_investment NUMERIC(10,2),
  issue_date DATE,
  valid_until DATE,
  deposit_pct NUMERIC(5,2) DEFAULT 30,
  progress_pct NUMERIC(5,2) DEFAULT 45,
  final_pct NUMERIC(5,2) DEFAULT 25,
  template_data JSONB DEFAULT '{}',
  show_insurance_page BOOLEAN DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- PROPOSAL LINE ITEMS
CREATE TABLE proposal_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID REFERENCES proposals(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  quantity NUMERIC(10,2),
  unit_price NUMERIC(10,2),
  total NUMERIC(10,2),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_proposals_user_id ON proposals(user_id);
CREATE INDEX idx_proposals_customer_id ON proposals(customer_id);
CREATE INDEX idx_proposals_status ON proposals(status);
CREATE INDEX idx_proposals_deleted_at ON proposals(deleted_at);
CREATE INDEX idx_proposal_line_items_proposal_id ON proposal_line_items(proposal_id);

-- updated_at trigger
CREATE TRIGGER proposals_updated_at BEFORE UPDATE ON proposals FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Enable RLS
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_line_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users own their proposals" ON proposals FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own proposal line items" ON proposal_line_items FOR ALL USING (
  EXISTS (SELECT 1 FROM proposals WHERE proposals.id = proposal_line_items.proposal_id AND proposals.user_id = auth.uid())
);
