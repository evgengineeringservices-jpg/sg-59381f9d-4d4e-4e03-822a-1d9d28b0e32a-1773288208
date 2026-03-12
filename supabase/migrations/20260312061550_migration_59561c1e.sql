-- Clean up old functions to avoid return type conflicts
DROP FUNCTION IF EXISTS get_current_market_price(text, text, text);
DROP FUNCTION IF EXISTS get_current_market_price(text, text);
DROP FUNCTION IF EXISTS calculate_labor_cost(numeric, numeric);
DROP FUNCTION IF EXISTS suggest_market_prices_for_boq(text, text, text);
DROP FUNCTION IF EXISTS get_boq_summary(uuid);
DROP FUNCTION IF EXISTS check_market_price_changes(integer);
DROP FUNCTION IF EXISTS refresh_boq_costs_from_market(uuid);
DROP FUNCTION IF EXISTS recalculate_project_boq_costs(uuid);

-- Function 1: Get current market price for an item
CREATE OR REPLACE FUNCTION get_current_market_price(
  p_item_name text,
  p_category text DEFAULT NULL,
  p_unit text DEFAULT NULL
)
RETURNS TABLE (
  price numeric,
  supplier text,
  location text,
  date_recorded date,
  item_name text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mp.price,
    mp.supplier,
    mp.location,
    mp.date_recorded,
    mp.item_name
  FROM market_prices mp
  WHERE 
    mp.item_name ILIKE '%' || p_item_name || '%'
    AND (p_category IS NULL OR mp.category = p_category)
    AND (p_unit IS NULL OR mp.unit = p_unit)
  ORDER BY mp.price DESC, mp.date_recorded DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function 2: Calculate labor cost
CREATE OR REPLACE FUNCTION calculate_labor_cost(
  p_material_cost numeric,
  p_labor_percentage numeric DEFAULT 0.35
)
RETURNS numeric AS $$
BEGIN
  RETURN ROUND(p_material_cost * p_labor_percentage, 2);
END;
$$ LANGUAGE plpgsql;

-- Function 3: Get market price suggestions
CREATE OR REPLACE FUNCTION suggest_market_prices_for_boq(
  p_description text,
  p_category text,
  p_unit text
)
RETURNS TABLE (
  item_name text,
  price numeric,
  supplier text,
  location text,
  date_recorded date,
  match_score integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mp.item_name,
    mp.price,
    mp.supplier,
    mp.location,
    mp.date_recorded,
    -- Simple match score based on name similarity
    CASE 
      WHEN mp.item_name ILIKE p_description THEN 100
      WHEN mp.item_name ILIKE '%' || p_description || '%' THEN 80
      WHEN p_description ILIKE '%' || mp.item_name || '%' THEN 60
      ELSE 40
    END as match_score
  FROM market_prices mp
  WHERE 
    mp.category = p_category
    AND mp.unit = p_unit
    AND (
      mp.item_name ILIKE '%' || p_description || '%'
      OR p_description ILIKE '%' || mp.item_name || '%'
    )
  ORDER BY match_score DESC, mp.price DESC, mp.date_recorded DESC
  LIMIT 5;
END;
$$ LANGUAGE plpgsql;

-- Function 4: Get BOQ summary with totals (fixed ambiguous total_cost)
CREATE OR REPLACE FUNCTION get_boq_summary(p_project_id uuid)
RETURNS TABLE (
  category text,
  total_material_cost numeric,
  total_labor_cost numeric,
  category_total_cost numeric,
  item_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bi.category,
    ROUND(SUM(bi.material_cost), 2) as total_material_cost,
    ROUND(SUM(bi.labor_cost), 2) as total_labor_cost,
    ROUND(SUM(bi.total_cost), 2) as category_total_cost,
    COUNT(*) as item_count
  FROM boq_items bi
  WHERE bi.project_id = p_project_id
  GROUP BY bi.category
  ORDER BY category_total_cost DESC;
END;
$$ LANGUAGE plpgsql;

-- Function 5: Check for significant market price changes (fixed date column)
CREATE OR REPLACE FUNCTION check_market_price_changes(p_days_back integer DEFAULT 30)
RETURNS TABLE (
  item_name text,
  category text,
  old_price numeric,
  new_price numeric,
  price_change_percent numeric,
  days_between integer
) AS $$
BEGIN
  RETURN QUERY
  WITH price_comparison AS (
    SELECT 
      mp1.item_name,
      mp1.category,
      mp1.price as new_price,
      mp1.date_recorded as new_date,
      mp2.price as old_price,
      mp2.date_recorded as old_date
    FROM market_prices mp1
    LEFT JOIN LATERAL (
      SELECT price, date_recorded
      FROM market_prices mp2
      WHERE mp2.item_name = mp1.item_name
        AND mp2.date_recorded < mp1.date_recorded
        AND mp2.date_recorded >= CURRENT_DATE - p_days_back
      ORDER BY date_recorded DESC
      LIMIT 1
    ) mp2 ON true
    WHERE mp1.date_recorded >= CURRENT_DATE - p_days_back
  )
  SELECT 
    pc.item_name,
    pc.category,
    pc.old_price,
    pc.new_price,
    ROUND(((pc.new_price - pc.old_price) / NULLIF(pc.old_price, 0) * 100), 2) as price_change_percent,
    (pc.new_date - pc.old_date) as days_between
  FROM price_comparison pc
  WHERE pc.old_price IS NOT NULL
    AND ABS((pc.new_price - pc.old_price) / NULLIF(pc.old_price, 0) * 100) > 5
  ORDER BY price_change_percent DESC;
END;
$$ LANGUAGE plpgsql;

-- Function 6: Bulk update BOQ costs from current market prices
CREATE OR REPLACE FUNCTION refresh_boq_costs_from_market(p_project_id uuid)
RETURNS TABLE (
  updated_count integer,
  total_cost_change numeric
) AS $$
DECLARE
  v_updated_count integer := 0;
  v_old_total numeric;
  v_new_total numeric;
BEGIN
  -- Get old total
  SELECT COALESCE(SUM(total_cost), 0) INTO v_old_total
  FROM boq_items
  WHERE project_id = p_project_id;

  -- Update all BOQ items by triggering recalculation
  UPDATE boq_items
  SET 
    material_cost = 0,  -- Reset to trigger recalculation
    labor_cost = 0,     -- Reset to trigger recalculation
    updated_at = NOW()
  WHERE project_id = p_project_id;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  -- Get new total
  SELECT COALESCE(SUM(total_cost), 0) INTO v_new_total
  FROM boq_items
  WHERE project_id = p_project_id;

  RETURN QUERY
  SELECT 
    v_updated_count,
    ROUND(v_new_total - v_old_total, 2) as total_cost_change;
END;
$$ LANGUAGE plpgsql;