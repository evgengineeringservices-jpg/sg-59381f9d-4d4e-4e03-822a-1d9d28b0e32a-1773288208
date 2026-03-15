-- Add global estimate settings to the projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS ocm_percent numeric DEFAULT 15,
ADD COLUMN IF NOT EXISTS profit_percent numeric DEFAULT 10,
ADD COLUMN IF NOT EXISTS vat_percent numeric DEFAULT 5;

-- Ensure boq_items has all the specific cost components for DUPA
ALTER TABLE boq_items 
ADD COLUMN IF NOT EXISTS equipment_cost numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS ocm_percent numeric DEFAULT 15,
ADD COLUMN IF NOT EXISTS mark_up_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_with_markup numeric DEFAULT 0;

-- Create an index to quickly find boq items for a project
CREATE INDEX IF NOT EXISTS idx_boq_items_project ON boq_items(project_id);