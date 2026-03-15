import type { Database } from "@/integrations/supabase/types";

export interface ProjectSettings {
  ocm_percent: number;
  profit_percent: number;
  vat_percent: number;
}

export interface EstimateLineItem {
  id?: string;
  dupa_item_id: string;
  item_no: string;
  description: string;
  unit: string;
  quantity: number;
  category: string;
  // Unit costs derived from DUPA template
  labor_unit_cost: number;
  material_unit_cost: number;
  equipment_unit_cost: number;
  direct_cost_per_unit: number;
  
  // Computed totals for this line
  total_labor_cost: number;
  total_material_cost: number;
  total_equipment_cost: number;
  total_direct_cost: number;
  
  // Markups
  ocm_amount: number;
  total_amount: number;
}

export interface BOETotals {
  direct_material_total: number;
  direct_labor_total: number;
  direct_equipment_total: number;
  direct_cost_subtotal: number;
  
  overhead_contingency_misc: number;
  contractors_profit: number;
  vat: number;
  indirect_cost_subtotal: number;
  
  total_project_cost: number;
}

/**
 * Calculates a single line item based on quantity and unit costs
 */
export function calculateLineItem(
  quantity: number,
  labor_unit_cost: number,
  material_unit_cost: number,
  equipment_unit_cost: number,
  settings: ProjectSettings
): Partial<EstimateLineItem> {
  const direct_cost_per_unit = labor_unit_cost + material_unit_cost + equipment_unit_cost;
  
  const total_labor_cost = quantity * labor_unit_cost;
  const total_material_cost = quantity * material_unit_cost;
  const total_equipment_cost = quantity * equipment_unit_cost;
  const total_direct_cost = quantity * direct_cost_per_unit;
  
  // OCM per line item for ABC report
  const ocm_amount = total_direct_cost * (settings.ocm_percent / 100);
  const total_amount = total_direct_cost + ocm_amount;
  
  return {
    quantity,
    direct_cost_per_unit,
    total_labor_cost,
    total_material_cost,
    total_equipment_cost,
    total_direct_cost,
    ocm_amount,
    total_amount
  };
}

/**
 * Calculates the BOE totals based on all line items and project settings
 */
export function calculateBOETotals(
  items: EstimateLineItem[],
  settings: ProjectSettings
): BOETotals {
  const direct_material_total = items.reduce((sum, item) => sum + (item.total_material_cost || 0), 0);
  const direct_labor_total = items.reduce((sum, item) => sum + (item.total_labor_cost || 0), 0);
  const direct_equipment_total = items.reduce((sum, item) => sum + (item.total_equipment_cost || 0), 0);
  
  const direct_cost_subtotal = direct_material_total + direct_labor_total + direct_equipment_total;
  
  const overhead_contingency_misc = direct_cost_subtotal * (settings.ocm_percent / 100);
  const contractors_profit = direct_cost_subtotal * (settings.profit_percent / 100);
  
  // VAT is typically applied to (Direct Cost + OCM + Profit)
  const taxable_base = direct_cost_subtotal + overhead_contingency_misc + contractors_profit;
  const vat = taxable_base * (settings.vat_percent / 100);
  
  const indirect_cost_subtotal = overhead_contingency_misc + contractors_profit + vat;
  const total_project_cost = direct_cost_subtotal + indirect_cost_subtotal;
  
  return {
    direct_material_total,
    direct_labor_total,
    direct_equipment_total,
    direct_cost_subtotal,
    overhead_contingency_misc,
    contractors_profit,
    vat,
    indirect_cost_subtotal,
    total_project_cost
  };
}

/**
 * Utility to format currency consistently
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}