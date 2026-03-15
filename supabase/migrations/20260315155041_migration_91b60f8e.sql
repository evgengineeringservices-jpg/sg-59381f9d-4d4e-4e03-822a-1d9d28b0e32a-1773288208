-- Add location to projects if missing
ALTER TABLE projects ADD COLUMN IF NOT EXISTS location TEXT;

-- Create the robust RPC function to instantly seed new estimates with all active DUPA items
CREATE OR REPLACE FUNCTION seed_estimate_items(p_project_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO boq_items (
    project_id, 
    item_code, 
    description, 
    unit, 
    quantity, 
    category,
    material_unit_cost,
    labor_unit_cost,
    equipment_unit_cost,
    direct_cost_per_unit,
    total_material_cost,
    total_labor_cost,
    total_equipment_cost,
    total_direct_cost,
    unit_price,
    total_price
  )
  SELECT 
    p_project_id,
    di.item_code,
    di.description,
    di.unit::text,
    0, -- Initial quantity is 0
    di.category,
    COALESCE((SELECT SUM(unit_price * coefficient * (1 + waste_percentage/100)) FROM dupa_material_analysis WHERE dupa_item_id = di.id), 0),
    COALESCE((SELECT SUM(hourly_rate * coefficient) FROM dupa_labor_analysis WHERE dupa_item_id = di.id), 0),
    COALESCE((SELECT SUM(hourly_rate * coefficient) FROM dupa_equipment_analysis WHERE dupa_item_id = di.id), 0),
    0, 0, 0, 0, 0, 0, 0
  FROM dupa_items di
  WHERE di.is_active = true;

  -- Set the combined unit costs immediately
  UPDATE boq_items 
  SET 
    direct_cost_per_unit = material_unit_cost + labor_unit_cost + equipment_unit_cost,
    unit_price = material_unit_cost + labor_unit_cost + equipment_unit_cost
  WHERE project_id = p_project_id;
END;
$$ LANGUAGE plpgsql;