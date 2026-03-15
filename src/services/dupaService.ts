/**
 * DUPA (Detailed Unit Price Analysis) Service
 * Manages DUPA items, analysis, and cost calculations
 */

import { supabase } from "@/integrations/supabase/client";
import type { DPWHUnit, BOQCategory } from "@/types";
import * as XLSX from "xlsx";

export interface DUPAItem {
  id: string;
  itemCode: string;
  description: string;
  category: string;
  unit: DPWHUnit;
  baseUnitCost: number;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DUPAMaterialAnalysis {
  id: string;
  dupaItemId: string;
  materialName: string;
  coefficient: number;
  unit: DPWHUnit;
  unitPrice: number;
  wastePercentage: number;
  notes?: string;
}

export interface DUPALaborAnalysis {
  id: string;
  dupaItemId: string;
  laborType: string;
  coefficient: number;
  hourlyRate: number;
  notes?: string;
}

export interface DUPAEquipmentAnalysis {
  id: string;
  dupaItemId: string;
  equipmentName: string;
  coefficient: number;
  hourlyRate: number;
  notes?: string;
}

export interface DUPACalculationResult {
  materialCost: number;
  laborCost: number;
  equipmentCost: number;
  unitCost: number;
  totalCost: number;
  breakdown: {
    materials: Array<{
      name: string;
      quantity: number;
      unitPrice: number;
      cost: number;
    }>;
    labor: Array<{
      type: string;
      hours: number;
      hourlyRate: number;
      cost: number;
    }>;
    equipment: Array<{
      name: string;
      hours: number;
      hourlyRate: number;
      cost: number;
    }>;
  };
}

export interface DUPASearchFilters {
  searchTerm?: string;
  category?: string;
  unit?: DPWHUnit;
  minCost?: number;
  maxCost?: number;
  materialNames?: string[];
  sortBy?: "itemCode" | "description" | "category" | "baseUnitCost" | "updatedAt";
  sortOrder?: "asc" | "desc";
}

/**
 * Advanced search and filtering for DUPA items
 */
export async function searchDUPAItems(filters: DUPASearchFilters, params?: {
  page?: number;
  limit?: number;
}): Promise<{ items: DUPAItem[]; total: number }> {
  const { page = 1, limit = 50 } = params || {};
  const offset = (page - 1) * limit;

  let query = supabase
    .from("dupa_items" as any)
    .select("*", { count: "exact" })
    .eq("is_active", true);

  // Apply filters
  if (filters.searchTerm) {
    query = query.or(
      `item_code.ilike.%${filters.searchTerm}%,description.ilike.%${filters.searchTerm}%,notes.ilike.%${filters.searchTerm}%`
    );
  }

  if (filters.category) {
    query = query.eq("category", filters.category);
  }

  if (filters.unit) {
    query = query.eq("unit", filters.unit);
  }

  if (filters.minCost !== undefined) {
    query = query.gte("base_unit_cost", filters.minCost);
  }

  if (filters.maxCost !== undefined) {
    query = query.lte("base_unit_cost", filters.maxCost);
  }

  // Sort
  const sortBy = filters.sortBy || "item_code";
  const sortOrder = filters.sortOrder || "asc";
  const dbColumn = sortBy === "itemCode" ? "item_code" : 
                   sortBy === "baseUnitCost" ? "base_unit_cost" :
                   sortBy === "updatedAt" ? "updated_at" : sortBy;
  
  query = query.order(dbColumn, { ascending: sortOrder === "asc" });

  // Pagination
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error("Error searching DUPA items:", error);
    throw error;
  }

  let items: DUPAItem[] = ((data as any[]) || []).map((item) => ({
    id: item.id,
    itemCode: item.item_code,
    description: item.description,
    category: item.category,
    unit: item.unit as DPWHUnit,
    baseUnitCost: Number(item.base_unit_cost),
    isActive: item.is_active,
    notes: item.notes || undefined,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  }));

  // Filter by material names if specified
  if (filters.materialNames && filters.materialNames.length > 0) {
    const itemsWithMaterials = await Promise.all(
      items.map(async (item) => {
        const { data: materials } = await supabase
          .from("dupa_material_analysis" as any)
          .select("material_name")
          .eq("dupa_item_id", item.id);

        const materialNames = (materials as any[] || []).map(m => m.material_name.toLowerCase());
        const hasAllMaterials = filters.materialNames!.every(filterMat =>
          materialNames.some(mat => mat.includes(filterMat.toLowerCase()))
        );

        return hasAllMaterials ? item : null;
      })
    );

    items = itemsWithMaterials.filter(item => item !== null) as DUPAItem[];
  }

  return {
    items,
    total: count || 0,
  };
}

/**
 * Get all DUPA items with pagination and filtering
 */
export async function getDUPAItems(params?: {
  page?: number;
  limit?: number;
  category?: string;
  searchTerm?: string;
  isActive?: boolean;
}): Promise<{ items: DUPAItem[]; total: number }> {
  const { page = 1, limit = 50, category, searchTerm, isActive = true } = params || {};
  const offset = (page - 1) * limit;

  let query = supabase
    .from("dupa_items" as any)
    .select("*", { count: "exact" })
    .eq("is_active", isActive)
    .order("item_code");

  if (category) {
    query = query.eq("category", category);
  }

  if (searchTerm) {
    query = query.or(
      `item_code.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`
    );
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error("Error fetching DUPA items:", error);
    throw error;
  }

  return {
    items: ((data as any[]) || []).map((item) => ({
      id: item.id,
      itemCode: item.item_code,
      description: item.description,
      category: item.category,
      unit: item.unit as DPWHUnit,
      baseUnitCost: Number(item.base_unit_cost),
      isActive: item.is_active,
      notes: item.notes || undefined,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    })),
    total: count || 0,
  };
}

/**
 * Get DUPA item by ID with full analysis
 */
export async function getDUPAItemById(
  dupaItemId: string
): Promise<{
  item: DUPAItem;
  materials: DUPAMaterialAnalysis[];
  labor: DUPALaborAnalysis[];
  equipment: DUPAEquipmentAnalysis[];
} | null> {
  // Get DUPA item
  const { data: item, error: itemError } = await supabase
    .from("dupa_items" as any)
    .select("*")
    .eq("id", dupaItemId)
    .single();

  if (itemError || !item) {
    console.error("Error fetching DUPA item:", itemError);
    return null;
  }

  // Get material analysis
  const { data: materials, error: materialsError } = await supabase
    .from("dupa_material_analysis" as any)
    .select("*")
    .eq("dupa_item_id", dupaItemId)
    .order("material_name");

  // Get labor analysis
  const { data: labor, error: laborError } = await supabase
    .from("dupa_labor_analysis" as any)
    .select("*")
    .eq("dupa_item_id", dupaItemId)
    .order("labor_type");

  // Get equipment analysis
  const { data: equipment, error: equipmentError } = await supabase
    .from("dupa_equipment_analysis" as any)
    .select("*")
    .eq("dupa_item_id", dupaItemId)
    .order("equipment_name");

  const dItem = item as any;
  const mList = (materials as any[]) || [];
  const lList = (labor as any[]) || [];
  const eList = (equipment as any[]) || [];

  return {
    item: {
      id: dItem.id,
      itemCode: dItem.item_code,
      description: dItem.description,
      category: dItem.category,
      unit: dItem.unit as DPWHUnit,
      baseUnitCost: Number(dItem.base_unit_cost),
      isActive: dItem.is_active,
      notes: dItem.notes || undefined,
      createdAt: dItem.created_at,
      updatedAt: dItem.updated_at,
    },
    materials: mList.map((m) => ({
      id: m.id,
      dupaItemId: m.dupa_item_id,
      materialName: m.material_name,
      coefficient: Number(m.coefficient),
      unit: m.unit as DPWHUnit,
      unitPrice: Number(m.unit_price),
      wastePercentage: Number(m.waste_percentage),
      notes: m.notes || undefined,
    })),
    labor: lList.map((l) => ({
      id: l.id,
      dupaItemId: l.dupa_item_id,
      laborType: l.labor_type,
      coefficient: Number(l.coefficient),
      hourlyRate: Number(l.hourly_rate),
      notes: l.notes || undefined,
    })),
    equipment: eList.map((e) => ({
      id: e.id,
      dupaItemId: e.dupa_item_id,
      equipmentName: e.equipment_name,
      coefficient: Number(e.coefficient),
      hourlyRate: Number(e.hourly_rate),
      notes: e.notes || undefined,
    })),
  };
}

/**
 * Calculate DUPA-based costs for a given quantity
 */
export async function calculateDUPACosts(
  dupaItemId: string,
  quantity: number
): Promise<DUPACalculationResult | null> {
  const { data, error } = await supabase.rpc("calculate_dupa_cost" as any, {
    p_dupa_item_id: dupaItemId,
    p_quantity: quantity,
  });

  if (error || !data || !Array.isArray(data) || data.length === 0) {
    console.error("Error calculating DUPA cost:", error);
    return null;
  }

  const result = data[0] as any;

  // Get detailed breakdown
  const details = await getDUPAItemById(dupaItemId);
  if (!details) return null;

  const breakdown = {
    materials: details.materials.map((m) => ({
      name: m.materialName,
      quantity: Number(m.coefficient) * quantity * (1 + Number(m.wastePercentage) / 100),
      unitPrice: Number(m.unitPrice),
      cost:
        Number(m.coefficient) *
        quantity *
        (1 + Number(m.wastePercentage) / 100) *
        Number(m.unitPrice),
    })),
    labor: details.labor.map((l) => ({
      type: l.laborType,
      hours: Number(l.coefficient) * quantity,
      hourlyRate: Number(l.hourlyRate),
      cost: Number(l.coefficient) * quantity * Number(l.hourlyRate),
    })),
    equipment: details.equipment.map((e) => ({
      name: e.equipmentName,
      hours: Number(e.coefficient) * quantity,
      hourlyRate: Number(e.hourlyRate),
      cost: Number(e.coefficient) * quantity * Number(e.hourlyRate),
    })),
  };

  return {
    materialCost: Number(result.total_material_cost),
    laborCost: Number(result.total_labor_cost),
    equipmentCost: Number(result.total_equipment_cost),
    unitCost: Number(result.unit_cost),
    totalCost: Number(result.total_cost),
    breakdown,
  };
}

/**
 * Create a new DUPA item with full analysis
 */
export async function createDUPAItem(item: {
  itemCode: string;
  description: string;
  category: string;
  unit: DPWHUnit;
  notes?: string;
  materials?: Array<Omit<DUPAMaterialAnalysis, "id" | "dupaItemId">>;
  labor?: Array<Omit<DUPALaborAnalysis, "id" | "dupaItemId">>;
  equipment?: Array<Omit<DUPAEquipmentAnalysis, "id" | "dupaItemId">>;
}): Promise<DUPAItem | null> {
  // Create DUPA item
  const { data, error } = await supabase
    .from("dupa_items" as any)
    .insert({
      item_code: item.itemCode,
      description: item.description,
      category: item.category,
      unit: item.unit,
      base_unit_cost: 0,
      notes: item.notes,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating DUPA item:", error);
    throw error;
  }

  const res = data as any;
  const dupaItemId = res.id;

  // Add materials
  if (item.materials && item.materials.length > 0) {
    const materialsData = item.materials.map(m => ({
      dupa_item_id: dupaItemId,
      material_name: m.materialName,
      coefficient: m.coefficient,
      unit: m.unit,
      unit_price: m.unitPrice,
      waste_percentage: m.wastePercentage || 0,
      notes: m.notes,
    }));

    const { error: matError } = await supabase
      .from("dupa_material_analysis" as any)
      .insert(materialsData);

    if (matError) console.error("Error adding materials:", matError);
  }

  // Add labor
  if (item.labor && item.labor.length > 0) {
    const laborData = item.labor.map(l => ({
      dupa_item_id: dupaItemId,
      labor_type: l.laborType,
      coefficient: l.coefficient,
      hourly_rate: l.hourlyRate,
      notes: l.notes,
    }));

    const { error: labError } = await supabase
      .from("dupa_labor_analysis" as any)
      .insert(laborData);

    if (labError) console.error("Error adding labor:", labError);
  }

  // Add equipment
  if (item.equipment && item.equipment.length > 0) {
    const equipData = item.equipment.map(e => ({
      dupa_item_id: dupaItemId,
      equipment_name: e.equipmentName,
      coefficient: e.coefficient,
      hourly_rate: e.hourlyRate,
      notes: e.notes,
    }));

    const { error: eqError } = await supabase
      .from("dupa_equipment_analysis" as any)
      .insert(equipData);

    if (eqError) console.error("Error adding equipment:", eqError);
  }

  // Calculate and update base unit cost
  const costCalc = await calculateDUPACosts(dupaItemId, 1);
  if (costCalc) {
    await supabase
      .from("dupa_items" as any)
      .update({ base_unit_cost: costCalc.unitCost })
      .eq("id", dupaItemId);
  }

  return {
    id: res.id,
    itemCode: res.item_code,
    description: res.description,
    category: res.category,
    unit: res.unit as DPWHUnit,
    baseUnitCost: costCalc?.unitCost || 0,
    isActive: res.is_active,
    notes: res.notes || undefined,
    createdAt: res.created_at,
    updatedAt: res.updated_at,
  };
}

/**
 * Add material analysis to DUPA item
 */
export async function addDUPAMaterial(material: {
  dupaItemId: string;
  materialName: string;
  coefficient: number;
  unit: DPWHUnit;
  unitPrice: number;
  wastePercentage?: number;
  notes?: string;
}): Promise<DUPAMaterialAnalysis | null> {
  const { data, error } = await supabase
    .from("dupa_material_analysis" as any)
    .insert({
      dupa_item_id: material.dupaItemId,
      material_name: material.materialName,
      coefficient: material.coefficient,
      unit: material.unit,
      unit_price: material.unitPrice,
      waste_percentage: material.wastePercentage || 0,
      notes: material.notes,
    })
    .select()
    .single();

  if (error) {
    console.error("Error adding DUPA material:", error);
    throw error;
  }

  const res = data as any;
  return {
    id: res.id,
    dupaItemId: res.dupa_item_id,
    materialName: res.material_name,
    coefficient: Number(res.coefficient),
    unit: res.unit as DPWHUnit,
    unitPrice: Number(res.unit_price),
    wastePercentage: Number(res.waste_percentage),
    notes: res.notes || undefined,
  };
}

/**
 * Add labor analysis to DUPA item
 */
export async function addDUPALabor(labor: {
  dupaItemId: string;
  laborType: string;
  coefficient: number;
  hourlyRate: number;
  notes?: string;
}): Promise<DUPALaborAnalysis | null> {
  const { data, error } = await supabase
    .from("dupa_labor_analysis" as any)
    .insert({
      dupa_item_id: labor.dupaItemId,
      labor_type: labor.laborType,
      coefficient: labor.coefficient,
      hourly_rate: labor.hourlyRate,
      notes: labor.notes,
    })
    .select()
    .single();

  if (error) {
    console.error("Error adding DUPA labor:", error);
    throw error;
  }

  const res = data as any;
  return {
    id: res.id,
    dupaItemId: res.dupa_item_id,
    laborType: res.labor_type,
    coefficient: Number(res.coefficient),
    hourlyRate: Number(res.hourly_rate),
    notes: res.notes || undefined,
  };
}

/**
 * Add equipment analysis to DUPA item
 */
export async function addDUPAEquipment(equipment: {
  dupaItemId: string;
  equipmentName: string;
  coefficient: number;
  hourlyRate: number;
  notes?: string;
}): Promise<DUPAEquipmentAnalysis | null> {
  const { data, error } = await supabase
    .from("dupa_equipment_analysis" as any)
    .insert({
      dupa_item_id: equipment.dupaItemId,
      equipment_name: equipment.equipmentName,
      coefficient: equipment.coefficient,
      hourly_rate: equipment.hourlyRate,
      notes: equipment.notes,
    })
    .select()
    .single();

  if (error) {
    console.error("Error adding DUPA equipment:", error);
    throw error;
  }

  const res = data as any;
  return {
    id: res.id,
    dupaItemId: res.dupa_item_id,
    equipmentName: res.equipment_name,
    coefficient: Number(res.coefficient),
    hourlyRate: Number(res.hourly_rate),
    notes: res.notes || undefined,
  };
}

/**
 * Update DUPA item with full analysis
 */
export async function updateDUPAItem(
  id: string,
  updates: Partial<{
    itemCode: string;
    description: string;
    category: string;
    unit: DPWHUnit;
    notes: string;
    materials: Array<Omit<DUPAMaterialAnalysis, "id" | "dupaItemId">>;
    labor: Array<Omit<DUPALaborAnalysis, "id" | "dupaItemId">>;
    equipment: Array<Omit<DUPAEquipmentAnalysis, "id" | "dupaItemId">>;
  }>
): Promise<DUPAItem | null> {
  const updateData: any = {};

  if (updates.itemCode !== undefined) updateData.item_code = updates.itemCode;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.category !== undefined) updateData.category = updates.category;
  if (updates.unit !== undefined) updateData.unit = updates.unit;
  if (updates.notes !== undefined) updateData.notes = updates.notes;

  // Update basic item data
  const { data, error } = await supabase
    .from("dupa_items" as any)
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating DUPA item:", error);
    throw error;
  }

  // Update materials if provided
  if (updates.materials !== undefined) {
    // Delete existing materials
    await supabase
      .from("dupa_material_analysis" as any)
      .delete()
      .eq("dupa_item_id", id);

    // Insert new materials
    if (updates.materials.length > 0) {
      const materialsData = updates.materials.map(m => ({
        dupa_item_id: id,
        material_name: m.materialName,
        coefficient: m.coefficient,
        unit: m.unit,
        unit_price: m.unitPrice,
        waste_percentage: m.wastePercentage || 0,
        notes: m.notes,
      }));

      await supabase
        .from("dupa_material_analysis" as any)
        .insert(materialsData);
    }
  }

  // Update labor if provided
  if (updates.labor !== undefined) {
    await supabase
      .from("dupa_labor_analysis" as any)
      .delete()
      .eq("dupa_item_id", id);

    if (updates.labor.length > 0) {
      const laborData = updates.labor.map(l => ({
        dupa_item_id: id,
        labor_type: l.laborType,
        coefficient: l.coefficient,
        hourly_rate: l.hourlyRate,
        notes: l.notes,
      }));

      await supabase
        .from("dupa_labor_analysis" as any)
        .insert(laborData);
    }
  }

  // Update equipment if provided
  if (updates.equipment !== undefined) {
    await supabase
      .from("dupa_equipment_analysis" as any)
      .delete()
      .eq("dupa_item_id", id);

    if (updates.equipment.length > 0) {
      const equipData = updates.equipment.map(e => ({
        dupa_item_id: id,
        equipment_name: e.equipmentName,
        coefficient: e.coefficient,
        hourly_rate: e.hourlyRate,
        notes: e.notes,
      }));

      await supabase
        .from("dupa_equipment_analysis" as any)
        .insert(equipData);
    }
  }

  // Recalculate base unit cost
  const costCalc = await calculateDUPACosts(id, 1);
  if (costCalc) {
    await supabase
      .from("dupa_items" as any)
      .update({ base_unit_cost: costCalc.unitCost })
      .eq("id", id);
  }

  const res = data as any;
  return {
    id: res.id,
    itemCode: res.item_code,
    description: res.description,
    category: res.category,
    unit: res.unit as DPWHUnit,
    baseUnitCost: costCalc?.unitCost || Number(res.base_unit_cost),
    isActive: res.is_active,
    notes: res.notes || undefined,
    createdAt: res.created_at,
    updatedAt: res.updated_at,
  };
}

/**
 * Delete DUPA item (soft delete)
 */
export async function deleteDUPAItem(id: string): Promise<boolean> {
  const { error } = await supabase
    .from("dupa_items" as any)
    .update({ is_active: false })
    .eq("id", id);

  if (error) {
    console.error("Error deleting DUPA item:", error);
    throw error;
  }

  return true;
}

/**
 * Sync DUPA item material prices with the latest Market Prices
 */
export async function syncDUPAWithMarketPrices(dupaItemId: string): Promise<{ success: boolean; updatedCount: number }> {
  // 1. Get DUPA materials
  const { data: materialsData, error: matError } = await supabase
    .from("dupa_material_analysis" as any)
    .select("*")
    .eq("dupa_item_id", dupaItemId);
    
  const materialsList = (materialsData as any[]) || [];
  if (matError || materialsList.length === 0) return { success: true, updatedCount: 0 };

  // 2. Get all market prices
  const { data: marketPricesData, error: mpError } = await supabase
    .from("market_prices" as any)
    .select("*")
    .order("effective_date", { ascending: false });
    
  const marketPrices = (marketPricesData as any[]) || [];
  
  if (mpError || marketPrices.length === 0) return { success: true, updatedCount: 0 };

  let updatedCount = 0;

  // 3. For each material, find latest market price
  for (const mat of materialsList) {
    // Try to find an exact or partial match in market prices
    const match = marketPrices.find((mp: any) => 
      mp.item_name.toLowerCase() === mat.material_name.toLowerCase() ||
      mat.material_name.toLowerCase().includes(mp.item_name.toLowerCase()) ||
      mp.item_name.toLowerCase().includes(mat.material_name.toLowerCase())
    );
    
    if (match && Number(match.price_per_unit) !== Number(mat.unit_price)) {
      await supabase
        .from("dupa_material_analysis" as any)
        .update({ unit_price: match.price_per_unit })
        .eq("id", mat.id);
      updatedCount++;
    }
  }
  
  // 4. Recalculate base cost if anything was updated
  if (updatedCount > 0) {
    const costCalc = await calculateDUPACosts(dupaItemId, 1);
    if (costCalc) {
      await supabase
        .from("dupa_items" as any)
        .update({ base_unit_cost: costCalc.unitCost })
        .eq("id", dupaItemId);
    }
  }
  
  return { success: true, updatedCount };
}

/**
 * Get DUPA categories
 */
export async function getDUPACategories(): Promise<string[]> {
  const { data, error } = await supabase
    .from("dupa_items" as any)
    .select("category")
    .eq("is_active", true);

  if (error) {
    console.error("Error fetching DUPA categories:", error);
    return [];
  }

  const categories = [...new Set((data as any[])?.map((item) => item.category) || [])];
  return categories.sort();
}

/**
 * Bulk import DUPA items from CSV/Excel data
 */
export async function bulkImportDUPAItems(items: Array<{
  itemCode: string;
  description: string;
  category: string;
  unit: DPWHUnit;
  baseUnitCost?: number;
  materials?: Array<{
    materialName: string;
    coefficient: number;
    unit: DPWHUnit;
    unitPrice: number;
    wastePercentage: number;
  }>;
  labor?: Array<{
    laborType: string;
    coefficient: number;
    hourlyRate: number;
  }>;
  equipment?: Array<{
    equipmentName: string;
    coefficient: number;
    hourlyRate: number;
  }>;
}>): Promise<{ success: number; failed: number; errors: string[] }> {
  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const item of items) {
    try {
      await createDUPAItem({
        itemCode: item.itemCode,
        description: item.description,
        category: item.category,
        unit: item.unit,
        notes: "",
        materials: item.materials,
        labor: item.labor,
        equipment: item.equipment,
      });

      success++;
    } catch (error) {
      failed++;
      errors.push(`Error importing ${item.itemCode}: ${error}`);
    }
  }

  return { success, failed, errors };
}

/**
 * Parse and import DUPA items from an Excel/CSV file buffer
 */
export async function importDUPAFromExcel(fileBuffer: ArrayBuffer): Promise<{ success: number; failed: number; errors: string[] }> {
  try {
    const workbook = XLSX.read(fileBuffer, { type: "array" });
    const groupedItems: Record<string, any> = {};
    let parsedCount = 0;

    // Iterate through all sheets as each standard DUPA item might have its own sheet
    for (const sheetName of workbook.SheetNames) {
      // Skip summary sheets like "INPUT DATA", "BOE", "ABC", etc.
      if (sheetName.toLowerCase().includes("input") || 
          sheetName.toLowerCase() === "boe" || 
          sheetName.toLowerCase() === "abc" || 
          sheetName.toLowerCase() === "table of contents") {
        continue;
      }

      const worksheet = workbook.Sheets[sheetName];
      // Read as 2D array to easily search for specific sections (A. Labor, B. Equipment, E. Materials)
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      
      // Attempt to extract item code from sheet name (e.g., "800(1) Clearing & Grab" -> "800(1)")
      const itemCodeMatch = sheetName.match(/^([\w.()-]+)/);
      const itemCode = itemCodeMatch ? itemCodeMatch[1] : sheetName;
      const description = sheetName.replace(itemCode, "").trim() || "Imported DUPA Item";

      let currentSection = "";
      
      if (!groupedItems[itemCode]) {
        groupedItems[itemCode] = {
          itemCode,
          description,
          category: "General",
          unit: "sq_m", // Default fallback, we will try to find the real one
          materials: [],
          labor: [],
          equipment: []
        };
      }

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i] || [];
        const firstCell = String(row[0] || "").trim();
        const secondCell = String(row[1] || "").trim();
        
        // Detect sections based on DPWH standard format
        if (secondCell.includes("A.") && (row[2] || "").toString().includes("Labor")) currentSection = "Labor";
        else if (secondCell.includes("B.") && (row[2] || "").toString().includes("Equipment")) currentSection = "Equipment";
        else if (secondCell.includes("E.") && (row[2] || "").toString().includes("Materials")) currentSection = "Materials";
        
        // Parse data based on current section
        if (currentSection === "Labor" && row.length >= 6) {
          const designation = String(row[1] || row[2] || "").trim();
          const quantity = Number(row[10] || row[5] || row[4] || 0);
          const unit = String(row[13] || row[6] || row[5] || "hr").trim();
          const rate = Number(row[16] || row[7] || row[6] || 0);
          
          if (designation && designation !== "Name and Specifications" && designation !== "Labor" && quantity > 0) {
            groupedItems[itemCode].labor.push({
              laborType: designation,
              coefficient: quantity,
              hourlyRate: rate
            });
            parsedCount++;
          }
        }
        else if (currentSection === "Equipment" && row.length >= 6) {
          const designation = String(row[1] || row[2] || "").trim();
          const quantity = Number(row[10] || row[5] || row[4] || 0);
          const rate = Number(row[16] || row[7] || row[6] || 0);
          
          if (designation && designation !== "Name and Specifications" && designation !== "Equipment" && quantity > 0) {
            groupedItems[itemCode].equipment.push({
              equipmentName: designation,
              coefficient: quantity,
              hourlyRate: rate
            });
            parsedCount++;
          }
        }
        else if (currentSection === "Materials" && row.length >= 6) {
          const designation = String(row[1] || row[2] || "").trim();
          const quantity = Number(row[10] || row[5] || row[4] || 0);
          const unit = String(row[13] || row[6] || row[5] || "pcs").trim().toLowerCase() as DPWHUnit;
          const rate = Number(row[16] || row[7] || row[6] || 0);
          
          if (designation && designation !== "Name and Specifications" && designation !== "Materials" && quantity > 0) {
            groupedItems[itemCode].materials.push({
              materialName: designation,
              coefficient: quantity,
              unit: unit,
              unitPrice: rate,
              wastePercentage: 0
            });
            parsedCount++;
          }
        }

        // Try to extract the overall DUPA Unit (often found near "Output per day")
        if (secondCell.includes("D.") && (row[2] || "").toString().includes("Output per day")) {
           const outputUnit = String(row[9] || row[8] || "").trim().toLowerCase();
           if (outputUnit.includes("sq.m")) groupedItems[itemCode].unit = "sq_m";
           else if (outputUnit.includes("cu.m")) groupedItems[itemCode].unit = "cu_m";
           else if (outputUnit.includes("ln.m")) groupedItems[itemCode].unit = "ln_m";
           else if (outputUnit.includes("kgs")) groupedItems[itemCode].unit = "kgs";
           else if (outputUnit.includes("mt")) groupedItems[itemCode].unit = "mt";
           else if (outputUnit.includes("pcs")) groupedItems[itemCode].unit = "pcs";
        }
      }
    }
    
    // If we didn't find multiple sheets with DPWH layout, fallback to the flat table approach
    if (parsedCount === 0) {
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      
      for (const row of jsonData as any[]) {
        const itemCode = row["Item Code"] || row["Item_Code"] || row["ItemCode"] || row["Item No."] || row["Pay Item No."];
        if (!itemCode) continue;
        
        if (!groupedItems[itemCode]) {
          groupedItems[itemCode] = {
            itemCode: String(itemCode),
            description: row["Description"] || "Standard Item",
            category: row["Category"] || "General",
            unit: String(row["Unit"] || "sq_m").toLowerCase() as DPWHUnit,
            materials: [],
            labor: [],
            equipment: []
          };
        }
        
        const designation = row["Designation"] || row["Name"];
        const type = row["Type"] || row["Component"];
        
        if (row["Material Name"] || (designation && type?.toLowerCase().includes("material"))) {
          groupedItems[itemCode].materials.push({
            materialName: String(row["Material Name"] || designation),
            coefficient: Number(row["Material Quantity"] || row["Material Coeff"] || row["Quantity"] || 0),
            unit: String(row["Material Unit"] || row["Unit"] || "pcs").toLowerCase() as DPWHUnit,
            unitPrice: Number(row["Material Rate"] || row["Material Price"] || row["Unit Cost"] || 0),
            wastePercentage: Number(row["Waste %"] || 0)
          });
        }
        
        if (row["Labor Type"] || (designation && type?.toLowerCase().includes("labor"))) {
          groupedItems[itemCode].labor.push({
            laborType: String(row["Labor Type"] || designation),
            coefficient: Number(row["Labor Hours"] || row["Labor Coeff"] || row["Quantity"] || 0),
            hourlyRate: Number(row["Labor Rate"] || row["Unit Cost"] || 0)
          });
        }
        
        if (row["Equipment Name"] || (designation && type?.toLowerCase().includes("equipment"))) {
          groupedItems[itemCode].equipment.push({
            equipmentName: String(row["Equipment Name"] || designation),
            coefficient: Number(row["Equipment Hours"] || row["Equipment Coeff"] || row["Quantity"] || 0),
            hourlyRate: Number(row["Equipment Rate"] || row["Unit Cost"] || 0)
          });
        }
      }
    }
    
    const formattedItems = Object.values(groupedItems).filter((item: any) => 
      item.materials.length > 0 || item.labor.length > 0 || item.equipment.length > 0
    );
    
    if (formattedItems.length === 0) {
      return { success: 0, failed: 1, errors: ["No valid DUPA items found in the file. Make sure the format matches DPWH standard sheets."] };
    }
    
    return await bulkImportDUPAItems(formattedItems as any);
  } catch (error) {
    console.error("Excel parsing error:", error);
    return {
      success: 0,
      failed: 1,
      errors: [error instanceof Error ? error.message : "Failed to parse Excel file"]
    };
  }
}