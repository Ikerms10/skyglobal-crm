-- Fix "Exterior Paiting" typo in projects and related tables
UPDATE projects
SET title = REPLACE(title, 'Exterior Paiting', 'Exterior Painting')
WHERE title ILIKE '%Exterior Paiting%';

UPDATE project_expenses
SET description = REPLACE(description, 'Exterior Paiting', 'Exterior Painting')
WHERE description ILIKE '%Exterior Paiting%';

UPDATE crew_assignments
SET notes = REPLACE(notes, 'Exterior Paiting', 'Exterior Painting')
WHERE notes ILIKE '%Exterior Paiting%';

-- Add lead_id to proposals for proposals-leads link
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES leads(id) ON DELETE SET NULL;
