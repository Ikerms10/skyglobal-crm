-- Lead → Proposal → Project chain linkage columns
-- Run in Supabase dashboard SQL editor before deploying the matching code

-- Proposals: link back to source lead, track approval/sent timestamps
ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS lead_id      UUID REFERENCES leads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sent_at      TIMESTAMPTZ;

-- Projects: link to source proposal
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS proposal_id UUID REFERENCES proposals(id) ON DELETE SET NULL;

-- Leads: track conversion outcome
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS converted_at               TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS converted_to_customer_id   UUID REFERENCES customers(id)  ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS converted_to_project_id    UUID REFERENCES projects(id)   ON DELETE SET NULL;

-- Indexes for joins used in the approval flow
CREATE INDEX IF NOT EXISTS idx_proposals_lead_id      ON proposals(lead_id);
CREATE INDEX IF NOT EXISTS idx_projects_proposal_id   ON projects(proposal_id);
CREATE INDEX IF NOT EXISTS idx_leads_stage            ON leads(stage);
