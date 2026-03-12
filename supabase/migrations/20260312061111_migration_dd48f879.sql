-- Function 1: Get current market price for an item
CREATE OR REPLACE FUNCTION get_current_market_price(
  p_item_name TEXT,
  p_category TEXT DEFAULT NULL
)
RETURNS NUMERIC AS $$
DECLARE
  v_price NUMERIC;
BEGIN
  -- Get the highest (most expensive) current market price for profit protection
  SELECT MAX(price)
  INTO v_price
  FROM market_prices
  WHERE item_name ILIKE '%' || p_item_name || '%'
    AND (p_category IS NULL OR category = p_category)
    AND date >= CURRENT_DATE - INTERVAL '90 days'; -- Only prices from last 90 days
  
  RETURN COALESCE(v_price, 0);
END;
$$ LANGUAGE plpgsql;

-- Function 2: Calculate material cost based on quantity and market price
CREATE OR REPLACE FUNCTION calculate_material_cost(
  p_description TEXT,
  p_category TEXT,
  p_quantity NUMERIC,
  p_unit TEXT
)
RETURNS NUMERIC AS $$
DECLARE
  v_unit_price NUMERIC;
  v_total_cost NUMERIC;
BEGIN
  -- Try to find matching market price
  SELECT MAX(price)
  INTO v_unit_price
  FROM market_prices mp
  WHERE (
    mp.item_name ILIKE '%' || split_part(p_description, ' ', 1) || '%'
    OR mp.item_name ILIKE '%' || split_part(p_description, ' ', 2) || '%'
  )
  AND mp.category = p_category
  AND mp.unit = p_unit
  AND mp.date >= CURRENT_DATE - INTERVAL '90 days';
  
  -- If no exact match, try broader category search
  IF v_unit_price IS NULL THEN
    SELECT MAX(price)
    INTO v_unit_price
    FROM market_prices mp
    WHERE mp.category = p_category
      AND mp.unit = p_unit
      AND mp.date >= CURRENT_DATE - INTERVAL '90 days'
    LIMIT 1;
  END IF;
  
  v_total_cost := COALESCE(v_unit_price, 0) * p_quantity;
  
  RETURN v_total_cost;
END;
$$ LANGUAGE plpgsql;

-- Function 3: Calculate labor cost (can be percentage-based or fixed rate)
CREATE OR REPLACE FUNCTION calculate_labor_cost(
  p_material_cost NUMERIC,
  p_category TEXT,
  p_quantity NUMERIC,
  p_unit TEXT,
  p_labor_mode TEXT DEFAULT 'percentage' -- 'percentage', 'fixed_rate', or 'manual'
)
RETURNS NUMERIC AS $$
DECLARE
  v_labor_cost NUMERIC;
  v_labor_percentage NUMERIC;
  v_labor_rate NUMERIC;
BEGIN
  -- Default labor percentages by category (Philippine construction standards)
  v_labor_percentage := CASE p_category
    WHEN 'Earthworks' THEN 0.40 -- 40% of material cost
    WHEN 'Concrete Works' THEN 0.35
    WHEN 'Reinforcing Steel' THEN 0.30
    WHEN 'Masonry' THEN 0.35
    WHEN 'Carpentry & Joinery' THEN 0.40
    WHEN 'Roofing & Waterproofing' THEN 0.30
    WHEN 'Doors & Windows' THEN 0.25
    WHEN 'Floor Finishes' THEN 0.30
    WHEN 'Wall Finishes' THEN 0.35
    WHEN 'Ceiling Works' THEN 0.30
    WHEN 'Painting' THEN 0.50 -- Higher labor component
    WHEN 'Plumbing & Sanitary' THEN 0.45
    WHEN 'Electrical Works' THEN 0.40
    WHEN 'Mechanical / HVAC' THEN 0.35
    ELSE 0.30 -- Default 30%
  END;
  
  IF p_labor_mode = 'percentage' THEN
    v_labor_cost := p_material_cost * v_labor_percentage;
  ELSIF p_labor_mode = 'fixed_rate' THEN
    -- Fixed labor rates by category (per unit)
    v_labor_rate := CASE p_category
      WHEN 'Masonry' THEN 280 -- ₱280/sqm
      WHEN 'Concrete Works' THEN 450 -- ₱450/cu.m
      WHEN 'Painting' THEN 85 -- ₱85/sqm
      WHEN 'Tiling' THEN 150 -- ₱150/sqm
      ELSE 0
    END;
    v_labor_cost := v_labor_rate * p_quantity;
  ELSE
    v_labor_cost := 0; -- Manual entry required
  END IF;
  
  RETURN COALESCE(v_labor_cost, 0);
END;
$$ LANGUAGE plpgsql;

-- Function 4: Auto-calculate all BOQ costs
CREATE OR REPLACE FUNCTION auto_calculate_boq_costs()
RETURNS TRIGGER AS $$
DECLARE
  v_material_cost NUMERIC;
  v_labor_cost NUMERIC;
  v_total_cost NUMERIC;
BEGIN
  -- Only auto-calculate if material_cost is 0 or NULL (new item or explicit request)
  IF NEW.material_cost IS NULL OR NEW.material_cost = 0 THEN
    -- Calculate material cost from market prices
    v_material_cost := calculate_material_cost(
      NEW.description,
      NEW.category,
      NEW.quantity,
      NEW.unit
    );
    NEW.material_cost := v_material_cost;
  ELSE
    v_material_cost := NEW.material_cost;
  END IF;
  
  -- Only auto-calculate labor if labor_cost is 0 or NULL
  IF NEW.labor_cost IS NULL OR NEW.labor_cost = 0 THEN
    v_labor_cost := calculate_labor_cost(
      v_material_cost,
      NEW.category,
      NEW.quantity,
      NEW.unit,
      'percentage' -- Default to percentage-based
    );
    NEW.labor_cost := v_labor_cost;
  ELSE
    v_labor_cost := NEW.labor_cost;
  END IF;
  
  -- Calculate unit cost (cost per unit of measurement)
  IF NEW.quantity > 0 THEN
    NEW.unit_cost := (v_material_cost + v_labor_cost) / NEW.quantity;
  ELSE
    NEW.unit_cost := 0;
  END IF;
  
  -- Calculate total cost
  NEW.total_cost := v_material_cost + v_labor_cost;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-calculate costs on insert/update
DROP TRIGGER IF EXISTS trigger_auto_calculate_boq_costs ON boq_items;
CREATE TRIGGER trigger_auto_calculate_boq_costs
  BEFORE INSERT OR UPDATE ON boq_items
  FOR EACH ROW
  EXECUTE FUNCTION auto_calculate_boq_costs();

-- Function 5: Find matching market prices for BOQ items (for suggestions)
CREATE OR REPLACE FUNCTION suggest_market_prices_for_boq(
  p_description TEXT,
  p_category TEXT,
  p_unit TEXT
)
RETURNS TABLE(
  item_name TEXT,
  price NUMERIC,
  supplier TEXT,
  location TEXT,
  date DATE,
  notes TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mp.item_name,
    mp.price,
    mp.supplier,
    mp.location,
    mp.date,
    mp.notes
  FROM market_prices mp
  WHERE (
    mp.item_name ILIKE '%' || split_part(p_description, ' ', 1) || '%'
    OR mp.item_name ILIKE '%' || split_part(p_description, ' ', 2) || '%'
    OR mp.category = p_category
  )
  AND mp.unit = p_unit
  AND mp.date >= CURRENT_DATE - INTERVAL '180 days'
  ORDER BY mp.price DESC, mp.date DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- Function 6: Bulk recalculate BOQ costs for a project (when market prices change)
CREATE OR REPLACE FUNCTION recalculate_project_boq_costs(p_project_id UUID)
RETURNS TABLE(
  items_updated INTEGER,
  old_total NUMERIC,
  new_total NUMERIC,
  cost_increase NUMERIC
) AS $$
DECLARE
  v_items_updated INTEGER;
  v_old_total NUMERIC;
  v_new_total NUMERIC;
BEGIN
  -- Get current total
  SELECT COALESCE(SUM(total_cost), 0)
  INTO v_old_total
  FROM boq_items
  WHERE project_id = p_project_id;
  
  -- Update all BOQ items (trigger will recalculate costs)
  WITH updated AS (
    UPDATE boq_items
    SET 
      material_cost = 0, -- Force recalculation
      labor_cost = 0,    -- Force recalculation
      updated_at = NOW()
    WHERE project_id = p_project_id
    RETURNING id
  )
  SELECT COUNT(*) INTO v_items_updated FROM updated;
  
  -- Get new total
  SELECT COALESCE(SUM(total_cost), 0)
  INTO v_new_total
  FROM boq_items
  WHERE project_id = p_project_id;
  
  RETURN QUERY SELECT 
    v_items_updated,
    v_old_total,
    v_new_total,
    v_new_total - v_old_total;
END;
$$ LANGUAGE plpgsql;

-- Function 7: Get BOQ summary with auto-calculated totals
CREATE OR REPLACE FUNCTION get_boq_summary(p_project_id UUID)
RETURNS TABLE(
  total_items INTEGER,
  total_material_cost NUMERIC,
  total_labor_cost NUMERIC,
  total_cost NUMERIC,
  cost_by_category JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_items,
    COALESCE(SUM(material_cost), 0) as total_material_cost,
    COALESCE(SUM(labor_cost), 0) as total_labor_cost,
    COALESCE(SUM(total_cost), 0) as total_cost,
    jsonb_object_agg(
      category, 
      jsonb_build_object(
        'material', category_material,
        'labor', category_labor,
        'total', category_total
      )
    ) as cost_by_category
  FROM (
    SELECT 
      category,
      SUM(material_cost) as category_material,
      SUM(labor_cost) as category_labor,
      SUM(total_cost) as category_total
    FROM boq_items
    WHERE project_id = p_project_id
    GROUP BY category
  ) category_summary;
END;
$$ LANGUAGE plpgsql;