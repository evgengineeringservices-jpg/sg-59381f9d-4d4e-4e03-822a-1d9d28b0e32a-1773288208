import { supabase } from "@/integrations/supabase/client";
import { calculateLineItem, type ProjectSettings } from "@/lib/estimateCalculations";

export interface EstimateProject {
  id: string;
  name: string;
  location?: string;
  status: string;
  ocm_percent: number;
  profit_percent: number;
  vat_percent: number;
  created_at: string;
}

export async function createEstimateProject(title: string, location: string): Promise<EstimateProject> {
  // 1. Create project
  const { data: project, error: pError } = await supabase
    .from('projects')
    .insert({
      name: title,
      location: location,
      status: 'Draft',
      ocm_percent: 15, // default assumptions
      profit_percent: 10,
      vat_percent: 5
    })
    .select()
    .single();
  
  if (pError) {
    console.error("Error creating project:", pError);
    throw pError;
  }

  // 2. Call RPC to seed all DUPA items instantly as BOQ items
  const { error: seedError } = await supabase.rpc('seed_estimate_items', {
    p_project_id: project.id
  });

  if (seedError) {
    console.error("Error seeding estimate items:", seedError);
    throw seedError;
  }

  return project as EstimateProject;
}

export async function getEstimates(): Promise<EstimateProject[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as EstimateProject[];
}

export async function getEstimateDetails(id: string) {
  const { data: project, error: pError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single();

  if (pError) throw pError;

  const { data: items, error: iError } = await supabase
    .from('boq_items')
    .select('*')
    .eq('project_id', id)
    .order('item_code', { ascending: true });

  if (iError) throw iError;

  return { project: project as EstimateProject, items };
}

export async function updateEstimateSettings(id: string, settings: Partial<ProjectSettings>) {
  const { error } = await supabase
    .from('projects')
    .update(settings)
    .eq('id', id);

  if (error) throw error;
}

export async function updateEstimateItemQuantity(itemId: string, quantity: number, settings: ProjectSettings, currentItem: any) {
  // Compute new totals locally before sending to DB to keep everything perfectly synchronized
  const calc = calculateLineItem(
    quantity, 
    Number(currentItem.labor_unit_cost || 0), 
    Number(currentItem.material_unit_cost || 0), 
    Number(currentItem.equipment_unit_cost || 0), 
    settings
  );

  const { error } = await supabase
    .from('boq_items')
    .update({
      quantity,
      total_labor_cost: calc.total_labor_cost,
      total_material_cost: calc.total_material_cost,
      total_equipment_cost: calc.total_equipment_cost,
      total_direct_cost: calc.total_direct_cost,
      total_price: calc.total_amount, // Store marked up amount as total_price
      ocm_amount: calc.ocm_amount
    })
    .eq('id', itemId);

  if (error) throw error;
  
  return calc;
}