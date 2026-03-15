-- DUPA (Detailed Unit Price Analysis) Database Schema

-- 1. DUPA Master Items (Standard work items with descriptions)
CREATE TABLE IF NOT EXISTS dupa_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(100) NOT NULL,
  unit VARCHAR(20) NOT NULL,
  specification TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. DUPA Material Analysis (Material components per unit of work)
CREATE TABLE IF NOT EXISTS dupa_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dupa_item_id UUID REFERENCES dupa_items(id) ON DELETE CASCADE,
  material_name VARCHAR(255) NOT NULL,
  material_code VARCHAR(50),
  unit VARCHAR(20) NOT NULL,
  coefficient DECIMAL(10, 6) NOT NULL, -- Quantity per unit of work
  waste_factor DECIMAL(5, 4) DEFAULT 0.05, -- 5% default waste
  specification TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. DUPA Labor Analysis (Labor requirements per unit of work)
CREATE TABLE IF NOT EXISTS dupa_labor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dupa_item_id UUID REFERENCES dupa_items(id) ON DELETE CASCADE,
  labor_type VARCHAR(100) NOT NULL, -- e.g., 'Skilled Worker', 'Helper', 'Foreman'
  labor_code VARCHAR(50),
  coefficient DECIMAL(10, 6) NOT NULL, -- Man-hours per unit of work
  productivity_rate DECIMAL(10, 4), -- Units per man-day
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. DUPA Equipment Analysis (Equipment usage per unit of work)
CREATE TABLE IF NOT EXISTS dupa_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dupa_item_id UUID REFERENCES dupa_items(id) ON DELETE CASCADE,
  equipment_name VARCHAR(255) NOT NULL,
  equipment_code VARCHAR(50),
  equipment_type VARCHAR(100), -- e.g., 'Excavator', 'Concrete Mixer', 'Truck'
  coefficient DECIMAL(10, 6) NOT NULL, -- Hours per unit of work
  capacity VARCHAR(100), -- e.g., '1.0 m3', '10 tons'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Labor Wage Rates (Current wage rates by labor type and location)
CREATE TABLE IF NOT EXISTS labor_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  labor_type VARCHAR(100) NOT NULL,
  location VARCHAR(255),
  daily_rate DECIMAL(10, 2) NOT NULL,
  hourly_rate DECIMAL(10, 2) NOT NULL,
  overtime_rate DECIMAL(10, 2),
  effective_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Equipment Rental Rates (Current rental rates by equipment type and location)
CREATE TABLE IF NOT EXISTS equipment_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_type VARCHAR(100) NOT NULL,
  equipment_name VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  hourly_rate DECIMAL(10, 2) NOT NULL,
  daily_rate DECIMAL(10, 2) NOT NULL,
  monthly_rate DECIMAL(10, 2),
  operator_included BOOLEAN DEFAULT false,
  fuel_included BOOLEAN DEFAULT false,
  effective_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Link BOQ Items to DUPA Items (for automated pricing)
ALTER TABLE boq_items 
ADD COLUMN IF NOT EXISTS dupa_item_id UUID REFERENCES dupa_items(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS calculation_method VARCHAR(20) DEFAULT 'manual' CHECK (calculation_method IN ('manual', 'dupa', 'hybrid'));

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_dupa_materials_item ON dupa_materials(dupa_item_id);
CREATE INDEX IF NOT EXISTS idx_dupa_labor_item ON dupa_labor(dupa_item_id);
CREATE INDEX IF NOT EXISTS idx_dupa_equipment_item ON dupa_equipment(dupa_item_id);
CREATE INDEX IF NOT EXISTS idx_dupa_items_category ON dupa_items(category);
CREATE INDEX IF NOT EXISTS idx_dupa_items_code ON dupa_items(item_code);
CREATE INDEX IF NOT EXISTS idx_boq_items_dupa ON boq_items(dupa_item_id);

-- Enable RLS
ALTER TABLE dupa_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE dupa_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE dupa_labor ENABLE ROW LEVEL SECURITY;
ALTER TABLE dupa_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE labor_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_rates ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Read-only for most users, write for admins)
CREATE POLICY "Anyone can view DUPA items" ON dupa_items FOR SELECT USING (true);
CREATE POLICY "Admins can manage DUPA items" ON dupa_items FOR ALL USING (auth.jwt()->>'role' IN ('super_admin', 'owner', 'contractor_admin'));

CREATE POLICY "Anyone can view DUPA materials" ON dupa_materials FOR SELECT USING (true);
CREATE POLICY "Admins can manage DUPA materials" ON dupa_materials FOR ALL USING (auth.jwt()->>'role' IN ('super_admin', 'owner', 'contractor_admin'));

CREATE POLICY "Anyone can view DUPA labor" ON dupa_labor FOR SELECT USING (true);
CREATE POLICY "Admins can manage DUPA labor" ON dupa_labor FOR ALL USING (auth.jwt()->>'role' IN ('super_admin', 'owner', 'contractor_admin'));

CREATE POLICY "Anyone can view DUPA equipment" ON dupa_equipment FOR SELECT USING (true);
CREATE POLICY "Admins can manage DUPA equipment" ON dupa_equipment FOR ALL USING (auth.jwt()->>'role' IN ('super_admin', 'owner', 'contractor_admin'));

CREATE POLICY "Anyone can view labor rates" ON labor_rates FOR SELECT USING (true);
CREATE POLICY "Admins can manage labor rates" ON labor_rates FOR ALL USING (auth.jwt()->>'role' IN ('super_admin', 'owner', 'contractor_admin'));

CREATE POLICY "Anyone can view equipment rates" ON equipment_rates FOR SELECT USING (true);
CREATE POLICY "Admins can manage equipment rates" ON equipment_rates FOR ALL USING (auth.jwt()->>'role' IN ('super_admin', 'owner', 'contractor_admin'));

-- Function to calculate DUPA-based costs for a BOQ item
CREATE OR REPLACE FUNCTION calculate_dupa_costs(
  p_dupa_item_id UUID,
  p_quantity DECIMAL,
  p_location VARCHAR DEFAULT NULL
)
RETURNS TABLE(
  material_cost DECIMAL,
  labor_cost DECIMAL,
  equipment_cost DECIMAL,
  total_cost DECIMAL,
  breakdown JSONB
) AS $$
DECLARE
  v_material_cost DECIMAL := 0;
  v_labor_cost DECIMAL := 0;
  v_equipment_cost DECIMAL := 0;
  v_breakdown JSONB := '{}'::jsonb;
  v_materials JSONB := '[]'::jsonb;
  v_labor JSONB := '[]'::jsonb;
  v_equipment JSONB := '[]'::jsonb;
BEGIN
  -- Calculate Material Costs
  SELECT 
    COALESCE(SUM(
      dm.coefficient * (1 + dm.waste_factor) * COALESCE(mp.price, 0) * p_quantity
    ), 0),
    jsonb_agg(jsonb_build_object(
      'material', dm.material_name,
      'coefficient', dm.coefficient,
      'waste_factor', dm.waste_factor,
      'unit_price', COALESCE(mp.price, 0),
      'total', dm.coefficient * (1 + dm.waste_factor) * COALESCE(mp.price, 0) * p_quantity
    ))
  INTO v_material_cost, v_materials
  FROM dupa_materials dm
  LEFT JOIN market_prices mp ON LOWER(mp.item_name) = LOWER(dm.material_name)
    AND (p_location IS NULL OR mp.location = p_location OR mp.location IS NULL)
  WHERE dm.dupa_item_id = p_dupa_item_id
  GROUP BY dm.dupa_item_id;

  -- Calculate Labor Costs
  SELECT 
    COALESCE(SUM(
      dl.coefficient * COALESCE(lr.hourly_rate, 0) * p_quantity
    ), 0),
    jsonb_agg(jsonb_build_object(
      'labor_type', dl.labor_type,
      'coefficient', dl.coefficient,
      'hourly_rate', COALESCE(lr.hourly_rate, 0),
      'total', dl.coefficient * COALESCE(lr.hourly_rate, 0) * p_quantity
    ))
  INTO v_labor_cost, v_labor
  FROM dupa_labor dl
  LEFT JOIN LATERAL (
    SELECT hourly_rate
    FROM labor_rates
    WHERE labor_type = dl.labor_type
      AND (p_location IS NULL OR location = p_location OR location IS NULL)
    ORDER BY effective_date DESC
    LIMIT 1
  ) lr ON true
  WHERE dl.dupa_item_id = p_dupa_item_id
  GROUP BY dl.dupa_item_id;

  -- Calculate Equipment Costs
  SELECT 
    COALESCE(SUM(
      de.coefficient * COALESCE(er.hourly_rate, 0) * p_quantity
    ), 0),
    jsonb_agg(jsonb_build_object(
      'equipment', de.equipment_name,
      'coefficient', de.coefficient,
      'hourly_rate', COALESCE(er.hourly_rate, 0),
      'total', de.coefficient * COALESCE(er.hourly_rate, 0) * p_quantity
    ))
  INTO v_equipment_cost, v_equipment
  FROM dupa_equipment de
  LEFT JOIN LATERAL (
    SELECT hourly_rate
    FROM equipment_rates
    WHERE equipment_type = de.equipment_type
      AND (p_location IS NULL OR location = p_location OR location IS NULL)
    ORDER BY effective_date DESC
    LIMIT 1
  ) er ON true
  WHERE de.dupa_item_id = p_dupa_item_id
  GROUP BY de.dupa_item_id;

  -- Build breakdown JSON
  v_breakdown := jsonb_build_object(
    'materials', COALESCE(v_materials, '[]'::jsonb),
    'labor', COALESCE(v_labor, '[]'::jsonb),
    'equipment', COALESCE(v_equipment, '[]'::jsonb)
  );

  -- Return results
  RETURN QUERY SELECT 
    v_material_cost,
    v_labor_cost,
    v_equipment_cost,
    v_material_cost + v_labor_cost + v_equipment_cost,
    v_breakdown;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_dupa_costs IS 'Calculate material, labor, and equipment costs based on DUPA analysis for a given quantity';