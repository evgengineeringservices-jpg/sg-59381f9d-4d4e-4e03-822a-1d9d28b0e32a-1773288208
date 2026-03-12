/**
 * BOQ Cost Calculation Utilities
 * Auto-calculates material and labor costs from market prices
 */

import { supabase } from "@/integrations/supabase/client";

/**
 * Philippine construction constants
 */
export const LABOR_COST_PERCENTAGE = 0.35; // 35% of material cost
export const MARKUP_PERCENTAGE = 0.15; // 15% markup for contingency
export const VAT_RATE = 0.12; // 12% VAT
export const EWT_RATE = 0.02; // 2% EWT
export const RETENTION_RATE = 0.10; // 10% Retention

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
 * Calculate labor cost based on material cost
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
  quantity: number
): number {
  if (quantity === 0) return 0;
  return Math.round(((materialCost + laborCost) / quantity) * 100) / 100;
}

/**
 * Calculate total cost
 */
export function calculateTotalCost(
  materialCost: number,
  laborCost: number
): number {
  return Math.round((materialCost + laborCost) * 100) / 100;
}

/**
 * Auto-calculate BOQ item costs
 * Returns calculated costs without saving to database
 */
export async function autoCalculateBOQItem(item: {
  description: string;
  category: string;
  unit: string;
  quantity: number;
  materialCost?: number;
  laborCost?: number;
}): Promise<{
  materialCost: number;
  laborCost: number;
  unitCost: number;
  totalCost: number;
  source: "manual" | "market" | "calculated";
}> {
  let materialCost = item.materialCost || 0;
  let source: "manual" | "market" | "calculated" = "manual";

  // If material cost is not provided, try to get from market prices
  if (materialCost === 0) {
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

  // Calculate labor cost if not provided
  const laborCost = item.laborCost || calculateLaborCost(materialCost);
  
  if (source !== "market" && laborCost > 0) {
    source = "calculated";
  }

  const unitCost = calculateUnitCost(materialCost, laborCost, item.quantity);
  const totalCost = calculateTotalCost(materialCost, laborCost);

  return {
    materialCost,
    laborCost,
    unitCost,
    totalCost,
    source,
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