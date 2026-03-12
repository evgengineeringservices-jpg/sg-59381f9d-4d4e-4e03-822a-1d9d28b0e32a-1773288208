-- Function: Auto-generate weekly materials forecast from BOQ and project timeline
CREATE OR REPLACE FUNCTION generate_weekly_materials_forecast(p_project_id UUID, p_start_date DATE, p_end_date DATE)
RETURNS TABLE (
  material_name TEXT,
  category TEXT,
  unit TEXT,
  estimated_qty NUMERIC,
  estimated_cost NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.description as material_name,
    b.category,
    b.unit,
    b.quantity / GREATEST(1, EXTRACT(day from (p_end_date::timestamp - p_start_date::timestamp))) * 7 as estimated_qty,
    b.material_cost / GREATEST(1, EXTRACT(day from (p_end_date::timestamp - p_start_date::timestamp))) * 7 as estimated_cost
  FROM boq_items b
  WHERE b.project_id = p_project_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_project_tasks(p_project_id UUID)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Simple implementation for now
  SELECT json_build_object('created', 0, 'tasks', json_build_array()) INTO v_result;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION analyze_task_profitability(p_project_id UUID)
RETURNS TABLE (
  task_id UUID,
  title TEXT,
  profit_impact_score NUMERIC,
  cost_effectiveness_score NUMERIC,
  urgency_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY SELECT 
    t.id, 
    t.title,
    5.0::NUMERIC as profit_impact_score,
    5.0::NUMERIC as cost_effectiveness_score,
    5.0::NUMERIC as urgency_score
  FROM tasks t WHERE t.project_id = p_project_id;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS billing_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  contract_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  trigger_condition TEXT NOT NULL,
  percentage_of_contract DECIMAL(5,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'triggered', 'billed', 'paid')),
  triggered_at TIMESTAMPTZ,
  billed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_billing_milestones_project ON billing_milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_billing_milestones_status ON billing_milestones(status);