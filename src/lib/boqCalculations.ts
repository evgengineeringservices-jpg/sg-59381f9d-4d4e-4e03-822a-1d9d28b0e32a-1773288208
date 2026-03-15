/**
 * BOQ Cost Calculation Utilities with DUPA Integration
 * Auto-calculates material, labor, and equipment costs using DUPA formulas
 */

import { supabase } from "@/integrations/supabase/client";

/**
 * Philippine construction constants
 */
export const LABOR_COST_PERCENTAGE = 0.35; // 35% of material cost (fallback)
export const MARKUP_PERCENTAGE = 0.15; // 15% markup for contingency
export const VAT_RATE = 0.12; // 12% VAT
export const EWT_RATE = 0.02; // 2% EWT
export const RETENTION_RATE = 0.10; // 10% Retention

/**
 * DUPA-based cost calculation for a work item
 */
export async function calculateDUPACost(
  dupaItemId: string,
  quantity: number
): Promise<{
  materialCost: number;
  laborCost: number;
  equipmentCost: number;
  unitCost: number;
  totalCost: number;
  breakdown: {
    materials: Array<{ name: string; quantity: number; cost: number }>;
    labor: Array<{ type: string; hours: number; cost: number }>;
    equipment: Array<{ name: string; hours: number; cost: number }>;
  };
} | null> {
  const { data, error } = await supabase.rpc("calculate_dupa_cost", {
    p_dupa_item_id: dupaItemId,
    p_quantity: quantity,
  });

  if (error || !data || !Array.isArray(data) || data.length === 0) {
    console.error("Error calculating DUPA cost:", error);
    return null;
  }

  const result = data[0];
  return {
    materialCost: Number(result.total_material_cost),
    laborCost: Number(result.total_labor_cost),
    equipmentCost: Number(result.total_equipment_cost),
    unitCost: Number(result.unit_cost),
    totalCost: Number(result.total_cost),
    breakdown: {
      materials: [],
      labor: [],
      equipment: [],
    },
  };
}

/**
 * Get DUPA item details with full analysis
 */
export async function getDUPAItemDetails(dupaItemId: string): Promise<{
  id: string;
  itemCode: string;
  description: string;
  unit: string;
  baseUnitCost: number;
  materials: Array<{
    id: string;
    materialName: string;
    coefficient: number;
    unit: string;
    unitPrice: number;
    wastePercentage: number;
  }>;
  labor: Array<{
    id: string;
    laborType: string;
    coefficient: number;
    hourlyRate: number;
  }>;
  equipment: Array<{
    id: string;
    equipmentName: string;
    coefficient: number;
    hourlyRate: number;
  }>;
} | null> {
  // Get DUPA item
  const { data: dupaItem, error: dupaError } = await supabase
    .from("dupa_items")
    .select("*")
    .eq("id", dupaItemId)
    .single();

  if (dupaError || !dupaItem) {
    console.error("Error fetching DUPA item:", dupaError);
    return null;
  }

  // Get material analysis
  const { data: materials, error: materialsError } = await supabase
    .from("dupa_material_analysis")
    .select("*")
    .eq("dupa_item_id", dupaItemId);

  // Get labor analysis
  const { data: labor, error: laborError } = await supabase
    .from("dupa_labor_analysis")
    .select("*")
    .eq("dupa_item_id", dupaItemId);

  // Get equipment analysis
  const { data: equipment, error: equipmentError } = await supabase
    .from("dupa_equipment_analysis")
    .select("*")
    .eq("dupa_item_id", dupaItemId);

  return {
    id: dupaItem.id,
    itemCode: dupaItem.item_code,
    description: dupaItem.description,
    unit: dupaItem.unit,
    baseUnitCost: Number(dupaItem.base_unit_cost),
    materials: (materials || []).map((m) => ({
      id: m.id,
      materialName: m.material_name,
      coefficient: Number(m.coefficient),
      unit: m.unit,
      unitPrice: Number(m.unit_price),
      wastePercentage: Number(m.waste_percentage),
    })),
    labor: (labor || []).map((l) => ({
      id: l.id,
      laborType: l.labor_type,
      coefficient: Number(l.coefficient),
      hourlyRate: Number(l.hourly_rate),
    })),
    equipment: (equipment || []).map((e) => ({
      id: e.id,
      equipmentName: e.equipment_name,
      coefficient: Number(e.coefficient),
      hourlyRate: Number(e.hourly_rate),
    })),
  };
}

/**
 * Search DUPA items by description or category
 */
export async function searchDUPAItems(
  searchTerm: string,
  category?: string
): Promise<Array<{
  id: string;
  itemCode: string;
  description: string;
  category: string;
  unit: string;
  baseUnitCost: number;
}>> {
  let query = supabase
    .from("dupa_items")
    .select("*")
    .ilike("description", `%${searchTerm}%`)
    .eq("is_active", true)
    .order("item_code");

  if (category) {
    query = query.eq("category", category);
  }

  const { data, error } = await query.limit(50);

  if (error) {
    console.error("Error searching DUPA items:", error);
    return [];
  }

  return (data || []).map((item) => ({
    id: item.id,
    itemCode: item.item_code,
    description: item.description,
    category: item.category,
    unit: item.unit,
    baseUnitCost: Number(item.base_unit_cost),
  }));
}

/**
 * Get current market price for an item (highest price for profit protection)
 */
export async function getCurrentMarketPrice(
  itemName: string,
  category?: string,
  unit?: string
): Promise<{
  price: number;
  supplier: string | null;
  location: string | null;
  dateRecorded: string;
  itemName: string;
} | null> {
  const { data, error } = await supabase.rpc("get_current_market_price", {
    p_item_name: itemName,
    p_category: category || null,
    p_unit: unit || null,
  });

  if (error || !data || !Array.isArray(data) || data.length === 0) {
    console.error("Error fetching market price:", error);
    return null;
  }

  return {
    price: Number(data[0].price),
    supplier: data[0].supplier,
    location: data[0].location,
    dateRecorded: data[0].date_recorded,
    itemName: data[0].item_name,
  };
}

/**
 * Calculate labor cost based on material cost (fallback method)
 */
export function calculateLaborCost(
  materialCost: number,
  laborPercentage: number = LABOR_COST_PERCENTAGE
): number {
  return Math.round(materialCost * laborPercentage * 100) / 100;
}

/**
 * Get market price suggestions for a BOQ item
 */
export async function getMarketPriceSuggestions(
  description: string,
  category: string,
  unit: string
): Promise<Array<{
  itemName: string;
  price: number;
  supplier: string | null;
  location: string | null;
  dateRecorded: string;
  matchScore: number;
}>> {
  const { data, error } = await supabase.rpc("suggest_market_prices_for_boq", {
    p_description: description,
    p_category: category,
    p_unit: unit,
  });

  if (error) {
    console.error("Error fetching price suggestions:", error);
    return [];
  }

  return (data || []).map((item: any) => ({
    itemName: item.item_name,
    price: Number(item.price),
    supplier: item.supplier,
    location: item.location,
    dateRecorded: item.date_recorded,
    matchScore: Number(item.match_score),
  }));
}

/**
 * Get BOQ summary by category
 */
export async function getBOQSummary(projectId: string): Promise<Array<{
  category: string;
  totalMaterialCost: number;
  totalLaborCost: number;
  totalCost: number;
  itemCount: number;
}>> {
  const { data, error } = await supabase.rpc("get_boq_summary", {
    p_project_id: projectId,
  });

  if (error) {
    console.error("Error fetching BOQ summary:", error);
    return [];
  }

  return (data || []).map((item: any) => ({
    category: item.category,
    totalMaterialCost: Number(item.total_material_cost),
    totalLaborCost: Number(item.total_labor_cost),
    totalCost: Number(item.category_total_cost),
    itemCount: Number(item.item_count),
  }));
}

/**
 * Check for significant market price changes
 */
export async function checkMarketPriceChanges(daysBack: number = 30): Promise<Array<{
  itemName: string;
  category: string;
  oldPrice: number;
  newPrice: number;
  priceChangePercent: number;
  daysBetween: number;
}>> {
  const { data, error } = await supabase.rpc("check_market_price_changes", {
    p_days_back: daysBack,
  });

  if (error) {
    console.error("Error checking price changes:", error);
    return [];
  }

  return (data || []).map((item: any) => ({
    itemName: item.item_name,
    category: item.category,
    oldPrice: Number(item.old_price),
    newPrice: Number(item.new_price),
    priceChangePercent: Number(item.price_change_percent),
    daysBetween: Number(item.days_between),
  }));
}

/**
 * Refresh all BOQ costs from current market prices
 */
export async function refreshBOQCostsFromMarket(projectId: string): Promise<{
  updatedCount: number;
  totalCostChange: number;
} | null> {
  const { data, error } = await supabase.rpc("refresh_boq_costs_from_market", {
    p_project_id: projectId,
  });

  if (error) {
    console.error("Error refreshing BOQ costs:", error);
    return null;
  }

  if (!data || !Array.isArray(data) || data.length === 0) return null;

  return {
    updatedCount: Number(data[0].updated_count),
    totalCostChange: Number(data[0].total_cost_change),
  };
}

/**
 * Calculate unit cost from material and labor costs
 */
export function calculateUnitCost(
  materialCost: number,
  laborCost: number,
  equipmentCost: number,
  quantity: number
): number {
  if (quantity === 0) return 0;
  return Math.round(((materialCost + laborCost + equipmentCost) / quantity) * 100) / 100;
}

/**
 * Calculate total cost
 */
export function calculateTotalCost(
  materialCost: number,
  laborCost: number,
  equipmentCost: number = 0
): number {
  return Math.round((materialCost + laborCost + equipmentCost) * 100) / 100;
}

/**
 * Auto-calculate BOQ item costs with DUPA integration
 * Priority: DUPA > Market Prices > Manual
 */
export async function autoCalculateBOQItem(item: {
  description: string;
  category: string;
  unit: string;
  quantity: number;
  dupaItemId?: string;
  materialCost?: number;
  laborCost?: number;
  equipmentCost?: number;
}): Promise<{
  materialCost: number;
  laborCost: number;
  equipmentCost: number;
  unitCost: number;
  totalCost: number;
  source: "dupa" | "manual" | "market" | "calculated";
  dupaBreakdown?: {
    materials: Array<{ name: string; quantity: number; cost: number }>;
    labor: Array<{ type: string; hours: number; cost: number }>;
    equipment: Array<{ name: string; hours: number; cost: number }>;
  };
}> {
  let materialCost = item.materialCost || 0;
  let laborCost = item.laborCost || 0;
  let equipmentCost = item.equipmentCost || 0;
  let source: "dupa" | "manual" | "market" | "calculated" = "manual";
  let dupaBreakdown;

  // Priority 1: Use DUPA if available
  if (item.dupaItemId) {
    const dupaResult = await calculateDUPACost(item.dupaItemId, item.quantity);
    if (dupaResult) {
      materialCost = dupaResult.materialCost;
      laborCost = dupaResult.laborCost;
      equipmentCost = dupaResult.equipmentCost;
      source = "dupa";
      dupaBreakdown = dupaResult.breakdown;
    }
  }

  // Priority 2: If no DUPA and material cost is not provided, try market prices
  if (source !== "dupa" && materialCost === 0) {
    const marketPrice = await getCurrentMarketPrice(
      item.description,
      item.category,
      item.unit
    );

    if (marketPrice) {
      materialCost = marketPrice.price * item.quantity;
      source = "market";
    }
  }

  // Priority 3: Calculate labor cost if not from DUPA
  if (source !== "dupa" && laborCost === 0) {
    laborCost = calculateLaborCost(materialCost);
    if (source !== "market") {
      source = "calculated";
    }
  }

  const unitCost = calculateUnitCost(materialCost, laborCost, equipmentCost, item.quantity);
  const totalCost = calculateTotalCost(materialCost, laborCost, equipmentCost);

  return {
    materialCost,
    laborCost,
    equipmentCost,
    unitCost,
    totalCost,
    source,
    dupaBreakdown,
  };
}

/**
 * Format Philippine Peso currency
 */
export function formatPeso(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(amount);
}