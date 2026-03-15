/**
 * DUPA (Detailed Unit Price Analysis) Service
 * Manages DUPA items, analysis, and cost calculations
 */

import { supabase } from "@/integrations/supabase/client";
import type { DPWHUnit, BOQCategory } from "@/types";

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

/**
 * Get all DUPA items with pagination and filtering
 */
export async function getDUPAItems(params: {
  page?: number;
  limit?: number;
  category?: string;
  searchTerm?: string;
  isActive?: boolean;
}): Promise<{ items: DUPAItem[]; total: number }> {
  const { page = 1, limit = 50, category, searchTerm, isActive = true } = params;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("dupa_items")
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
    items: (data || []).map((item) => ({
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
    .from("dupa_items")
    .select("*")
    .eq("id", dupaItemId)
    .single();

  if (itemError || !item) {
    console.error("Error fetching DUPA item:", itemError);
    return null;
  }

  // Get material analysis
  const { data: materials, error: materialsError } = await supabase
    .from("dupa_material_analysis")
    .select("*")
    .eq("dupa_item_id", dupaItemId)
    .order("material_name");

  // Get labor analysis
  const { data: labor, error: laborError } = await supabase
    .from("dupa_labor_analysis")
    .select("*")
    .eq("dupa_item_id", dupaItemId)
    .order("labor_type");

  // Get equipment analysis
  const { data: equipment, error: equipmentError } = await supabase
    .from("dupa_equipment_analysis")
    .select("*")
    .eq("dupa_item_id", dupaItemId)
    .order("equipment_name");

  return {
    item: {
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
    },
    materials: (materials || []).map((m) => ({
      id: m.id,
      dupaItemId: m.dupa_item_id,
      materialName: m.material_name,
      coefficient: Number(m.coefficient),
      unit: m.unit as DPWHUnit,
      unitPrice: Number(m.unit_price),
      wastePercentage: Number(m.waste_percentage),
      notes: m.notes || undefined,
    })),
    labor: (labor || []).map((l) => ({
      id: l.id,
      dupaItemId: l.dupa_item_id,
      laborType: l.labor_type,
      coefficient: Number(l.coefficient),
      hourlyRate: Number(l.hourly_rate),
      notes: l.notes || undefined,
    })),
    equipment: (equipment || []).map((e) => ({
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
  const { data, error } = await supabase.rpc("calculate_dupa_cost", {
    p_dupa_item_id: dupaItemId,
    p_quantity: quantity,
  });

  if (error || !data || !Array.isArray(data) || data.length === 0) {
    console.error("Error calculating DUPA cost:", error);
    return null;
  }

  const result = data[0];

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
 * Create a new DUPA item
 */
export async function createDUPAItem(item: {
  itemCode: string;
  description: string;
  category: string;
  unit: DPWHUnit;
  baseUnitCost?: number;
  notes?: string;
}): Promise<DUPAItem | null> {
  const { data, error } = await supabase
    .from("dupa_items")
    .insert({
      item_code: item.itemCode,
      description: item.description,
      category: item.category,
      unit: item.unit,
      base_unit_cost: item.baseUnitCost || 0,
      notes: item.notes,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating DUPA item:", error);
    throw error;
  }

  return {
    id: data.id,
    itemCode: data.item_code,
    description: data.description,
    category: data.category,
    unit: data.unit as DPWHUnit,
    baseUnitCost: Number(data.base_unit_cost),
    isActive: data.is_active,
    notes: data.notes || undefined,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
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
    .from("dupa_material_analysis")
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

  return {
    id: data.id,
    dupaItemId: data.dupa_item_id,
    materialName: data.material_name,
    coefficient: Number(data.coefficient),
    unit: data.unit as DPWHUnit,
    unitPrice: Number(data.unit_price),
    wastePercentage: Number(data.waste_percentage),
    notes: data.notes || undefined,
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
    .from("dupa_labor_analysis")
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

  return {
    id: data.id,
    dupaItemId: data.dupa_item_id,
    laborType: data.labor_type,
    coefficient: Number(data.coefficient),
    hourlyRate: Number(data.hourly_rate),
    notes: data.notes || undefined,
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
    .from("dupa_equipment_analysis")
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

  return {
    id: data.id,
    dupaItemId: data.dupa_item_id,
    equipmentName: data.equipment_name,
    coefficient: Number(data.coefficient),
    hourlyRate: Number(data.hourly_rate),
    notes: data.notes || undefined,
  };
}

/**
 * Update DUPA item
 */
export async function updateDUPAItem(
  id: string,
  updates: Partial<{
    itemCode: string;
    description: string;
    category: string;
    unit: DPWHUnit;
    baseUnitCost: number;
    isActive: boolean;
    notes: string;
  }>
): Promise<DUPAItem | null> {
  const updateData: any = {};

  if (updates.itemCode !== undefined) updateData.item_code = updates.itemCode;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.category !== undefined) updateData.category = updates.category;
  if (updates.unit !== undefined) updateData.unit = updates.unit;
  if (updates.baseUnitCost !== undefined) updateData.base_unit_cost = updates.baseUnitCost;
  if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
  if (updates.notes !== undefined) updateData.notes = updates.notes;

  const { data, error } = await supabase
    .from("dupa_items")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating DUPA item:", error);
    throw error;
  }

  return {
    id: data.id,
    itemCode: data.item_code,
    description: data.description,
    category: data.category,
    unit: data.unit as DPWHUnit,
    baseUnitCost: Number(data.base_unit_cost),
    isActive: data.is_active,
    notes: data.notes || undefined,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Delete DUPA item (soft delete)
 */
export async function deleteDUPAItem(id: string): Promise<boolean> {
  const { error } = await supabase
    .from("dupa_items")
    .update({ is_active: false })
    .eq("id", id);

  if (error) {
    console.error("Error deleting DUPA item:", error);
    throw error;
  }

  return true;
}

/**
 * Get DUPA categories
 */
export async function getDUPACategories(): Promise<string[]> {
  const { data, error } = await supabase
    .from("dupa_items")
    .select("category")
    .eq("is_active", true);

  if (error) {
    console.error("Error fetching DUPA categories:", error);
    return [];
  }

  const categories = [...new Set(data?.map((item) => item.category) || [])];
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
    wastePercentage?: number;
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
      // Create DUPA item
      const dupaItem = await createDUPAItem({
        itemCode: item.itemCode,
        description: item.description,
        category: item.category,
        unit: item.unit,
        baseUnitCost: item.baseUnitCost,
      });

      if (!dupaItem) {
        failed++;
        errors.push(`Failed to create item: ${item.itemCode}`);
        continue;
      }

      // Add materials
      if (item.materials) {
        for (const material of item.materials) {
          await addDUPAMaterial({
            dupaItemId: dupaItem.id,
            ...material,
          });
        }
      }

      // Add labor
      if (item.labor) {
        for (const labor of item.labor) {
          await addDUPALabor({
            dupaItemId: dupaItem.id,
            ...labor,
          });
        }
      }

      // Add equipment
      if (item.equipment) {
        for (const equip of item.equipment) {
          await addDUPAEquipment({
            dupaItemId: dupaItem.id,
            ...equip,
          });
        }
      }

      success++;
    } catch (error) {
      failed++;
      errors.push(`Error importing ${item.itemCode}: ${error}`);
    }
  }

  return { success, failed, errors };
}