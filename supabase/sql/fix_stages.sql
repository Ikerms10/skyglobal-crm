-- Fix lead stages: remove 'Negotiating', migrate to 'Follow-up'
-- Run this in Supabase SQL Editor

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_stage_check;

UPDATE leads SET stage = 'Follow-up' WHERE stage = 'Negotiating';

ALTER TABLE leads ADD CONSTRAINT leads_stage_check
  CHECK (stage IN ('New Lead', 'Estimate Sent', 'Follow-up', 'Won', 'Lost', 'On Hold'));
