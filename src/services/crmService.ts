import { supabase } from "@/integrations/supabase/client";
import type {
  Profile,
  Lead,
  Project,
  BOQItem,
  PlanningPhase,
  Task,
  ProgressReport,
  BillingItem,
  Document,
  DrawingLog,
  WeeklyLogistics,
  MarketPrice,
  AuditLog,
} from "@/types";
import {
  generateWeeklyMaterialsForecast,
  generateProjectTasks,
  analyzeTaskProfitability,
  computeProgressBilling,
  getWeeklyLogistics as getWeeklyLogisticsAuto,
  createBillingMilestone as createMilestone,
  getProjectCostSummary,
  suggestTaskPrioritization,
} from "@/lib/projectAutomation";
import type { BillingMilestone } from "@/types";

// ===== MAPPERS =====

function mapProfile(db: any): Profile {
  return {
    id: db.id,
    email: db.email || "",
    displayName: db.display_name || "",
    avatarUrl: db.avatar_url || null,
    role: db.role as Profile["role"],
    phone: db.phone || null,
    isActive: db.is_active || true,
    createdAt: db.created_at || "",
    updatedAt: db.updated_at || "",
  };
}

function mapLead(db: any): Lead {
  return {
    id: db.id,
    name: db.name,
    email: db.email,
    phone: db.phone || null,
    company: db.company || null,
    projectType: db.project_type || null,
    budgetRange: db.budget_range || null,
    location: db.location || null,
    source: db.source || null,
    notes: db.notes || null,
    message: db.message || null,
    status: db.status as Lead["status"],
    assignedTo: db.assigned_to || null,
    createdAt: db.created_at || "",
    updatedAt: db.updated_at || "",
  };
}

function mapProject(db: any): Project {
  return {
    id: db.id,
    name: db.name,
    client: db.client,
    status: db.status as Project["status"],
    progress: db.progress || 0,
    startDate: db.start_date || "",
    endDate: db.end_date || null,
    budget: db.budget || 0,
    spent: db.spent || 0,
    projectType: db.project_type as Project["projectType"],
    location: db.location || "",
    contractAmount: db.contract_amount || 0,
    pcabCategory: db.pcab_category as Project["pcabCategory"] || null,
    permitNo: db.permit_no || null,
    permitStatus: db.permit_status as Project["permitStatus"],
    description: db.description || null,
    createdAt: db.created_at || "",
    updatedAt: db.updated_at || "",
  };
}

function mapBOQItem(db: any): BOQItem {
  return {
    id: db.id,
    projectId: db.project_id,
    itemNo: db.item_no,
    dpwhItemCode: db.dpwh_item_code || null,
    description: db.description,
    category: db.category as BOQItem["category"],
    unit: db.unit as BOQItem["unit"],
    quantity: db.quantity,
    unitCost: db.unit_cost || 0,
    laborCost: db.labor_cost || 0,
    materialCost: db.material_cost || 0,
    total: db.total_cost || 0,
    markup: 0,
    createdAt: db.created_at || "",
    updatedAt: db.updated_at || "",
  };
}

function mapPlanningPhase(db: any): PlanningPhase {
  return {
    id: db.id,
    projectId: db.project_id,
    name: db.phase,
    startDate: db.start_date,
    endDate: db.end_date,
    status: db.status as PlanningPhase["status"],
    progress: db.progress || 0,
    dependencies: db.dependencies || [],
    assignedRole: null,
    assignedUserId: null,
    isMilestone: false,
    isBillingTrigger: false,
    notes: null,
    createdAt: db.created_at || "",
    updatedAt: db.updated_at || "",
  };
}

function mapTask(db: any): Task {
  return {
    id: db.id,
    projectId: db.project_id || null,
    phaseId: db.phase_id || null,
    title: db.title,
    description: db.description || null,
    assignedTo: db.assigned_to || null,
    assignedRole: db.assigned_role as Task["assignedRole"] || null,
    dueDate: db.due_date || null,
    priority: db.priority as Task["priority"],
    status: db.status as Task["status"],
    estimatedCostImpact: null,
    estimatedProfitImpact: null,
    dependency: null,
    source: (db.source as Task["source"]) || "manual",
    createdAt: db.created_at || "",
    updatedAt: db.updated_at || "",
  };
}

function mapProgressReport(db: any): ProgressReport {
  return {
    id: db.id,
    projectId: db.project_id,
    title: db.title,
    date: db.date,
    authorId: db.author,
    description: db.description || null,
    progressPercentage: db.progress || 0,
    sitePhotos: db.images || [],
    linkedPhaseId: null,
    linkedBoqItemId: null,
    milestoneCompleted: false,
    weather: null,
    manpower: null,
    remarks: null,
    createdAt: db.created_at || "",
    updatedAt: db.updated_at || "",
  };
}

function mapBillingItem(db: any): BillingItem {
  return {
    id: db.id,
    projectId: db.project_id,
    invoiceNo: db.invoice_no,
    date: db.date,
    billingType: db.billing_type as BillingItem["billingType"],
    description: db.description || "",
    baseAmount: db.amount,
    progressPercent: db.progress_percent || null,
    vat: db.vat_amount || 0,
    ewt: db.ewt_amount || 0,
    retention: db.retention_amount || 0,
    netAmount: db.net_amount || 0,
    status: db.status as BillingItem["status"],
    relatedMilestoneId: null,
    notes: null,
    createdAt: db.created_at || "",
    updatedAt: db.updated_at || "",
  };
}

function mapDocument(db: any): Document {
  return {
    id: db.id,
    projectId: db.project_id,
    fileName: db.name,
    fileUrl: db.file_path,
    fileSize: db.file_size || 0,
    fileType: db.file_type || "",
    category: db.category as Document["category"],
    uploadedBy: db.uploaded_by || "",
    notes: db.notes || null,
    createdAt: db.created_at || "",
    updatedAt: db.updated_at || "",
  };
}

function mapDrawing(db: any): DrawingLog {
  return {
    id: db.id,
    projectId: db.project_id,
    fileName: db.file_name,
    fileUrl: db.file_path,
    fileType: db.file_type || "",
    revisionNumber: (db.version || 1).toString(),
    uploadedBy: db.uploaded_by || "",
    status: db.status as DrawingLog["status"],
    extractedDimensions: db.extracted_data || null,
    extractedQuantities: db.extracted_data || null,
    aiSuggestions: db.extracted_data || null,
    confidenceScore: null,
    notes: db.notes || null,
    aiStatus: db.ai_status || null,
    createdAt: db.created_at || "",
    updatedAt: db.updated_at || "",
  };
}

function mapWeeklyLogistics(db: any): WeeklyLogistics {
  return {
    id: db.id,
    projectId: db.project_id,
    weekStartDate: db.week_start_date,
    weekEndDate: db.week_end_date,
    weekNumber: db.week_number || 1,
    scheduledActivities: [],
    materialsNeeded: db.materials || {},
    estimatedPettyCash: db.estimated_cash || 0,
    suggestedTasks: db.tasks as any || [],
    procurementRisks: [],
    status: db.status as any,
    createdAt: db.created_at || "",
    updatedAt: db.updated_at || "",
  };
}

function mapMarketPrice(db: any): MarketPrice {
  return {
    id: db.id,
    itemName: db.item_name,
    category: db.category,
    unit: db.unit as any,
    pricePerUnit: db.price,
    supplier: db.supplier || null,
    location: db.location || null,
    effectiveDate: db.date_recorded,
    source: db.source || null,
    notes: db.notes || null,
    createdAt: db.created_at || "",
    updatedAt: db.updated_at || "",
  };
}

function mapAuditLog(db: any): AuditLog {
  return {
    id: db.id,
    actorId: db.actor_id,
    action: db.action,
    entityType: db.entity_type,
    entityId: db.entity_id || null,
    oldValue: db.old_value as any || null,
    newValue: db.new_value as any || null,
    createdAt: db.created_at || "",
  };
}

function mapBillingMilestone(milestone: any): BillingMilestone {
  return {
    id: milestone.id,
    projectId: milestone.project_id,
    name: milestone.name,
    description: milestone.description,
    contractAmount: milestone.contract_amount,
    triggerCondition: milestone.trigger_condition,
    percentageOfContract: milestone.percentage_of_contract,
    status: milestone.status,
    triggeredAt: milestone.triggered_at,
    billedAt: milestone.billed_at,
    createdAt: milestone.created_at,
    updatedAt: milestone.updated_at,
  };
}

// ===== PROFILES =====

export async function getAllProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapProfile);
}

export async function getProfile(id: string): Promise<Profile | null> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", id).single();
  if (error) throw error;
  return data ? mapProfile(data) : null;
}

export async function updateProfile(id: string, updates: Partial<Omit<Profile, "id" | "createdAt" | "updatedAt">>): Promise<void> {
  const { error } = await supabase.from("profiles").update({
    display_name: updates.displayName,
    avatar_url: updates.avatarUrl,
    role: updates.role,
    phone: updates.phone,
    is_active: updates.isActive,
  }).eq("id", id);
  if (error) throw error;
}

// ===== LEADS =====

export async function getLeads(): Promise<Lead[]> {
  const { data, error } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapLead);
}

export async function createLead(lead: Partial<Lead>): Promise<void> {
  const { error } = await supabase.from("leads").insert({
    name: lead.name!,
    email: lead.email!,
    phone: lead.phone,
    company: lead.company,
    project_type: lead.projectType,
    budget_range: lead.budgetRange,
    location: lead.location,
    source: lead.source,
    notes: lead.notes,
    message: lead.message,
    status: lead.status || "new",
    assigned_to: lead.assignedTo,
  });
  if (error) throw error;
}

export async function updateLead(id: string, updates: Partial<Lead>): Promise<void> {
  const { error } = await supabase.from("leads").update({
    name: updates.name,
    email: updates.email,
    phone: updates.phone,
    company: updates.company,
    project_type: updates.projectType,
    budget_range: updates.budgetRange,
    location: updates.location,
    source: updates.source,
    notes: updates.notes,
    message: updates.message,
    status: updates.status,
    assigned_to: updates.assignedTo,
  }).eq("id", id);
  if (error) throw error;
}

export async function deleteLead(id: string): Promise<void> {
  const { error } = await supabase.from("leads").delete().eq("id", id);
  if (error) throw error;
}

// ===== PROJECTS =====

export async function getProjects(): Promise<Project[]> {
  const { data, error } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapProject);
}

export async function getProject(id: string): Promise<Project | null> {
  const { data, error } = await supabase.from("projects").select("*").eq("id", id).single();
  if (error) throw error;
  return data ? mapProject(data) : null;
}

export async function createProject(project: Partial<Project>): Promise<void> {
  const { error } = await supabase.from("projects").insert({
    name: project.name!,
    client: project.client!,
    status: project.status || "planning",
    progress: project.progress || 0,
    start_date: project.startDate!,
    end_date: project.endDate,
    budget: project.budget || 0,
    spent: project.spent || 0,
    project_type: project.projectType || "residential_new",
    location: project.location || "",
    contract_amount: project.contractAmount || 0,
    pcab_category: project.pcabCategory,
    permit_no: project.permitNo,
    permit_status: project.permitStatus || "not_applied",
    description: project.description,
  });
  if (error) throw error;
}

export async function updateProject(id: string, updates: Partial<Project>): Promise<void> {
  const { error } = await supabase.from("projects").update({
    name: updates.name,
    client: updates.client,
    status: updates.status,
    progress: updates.progress,
    start_date: updates.startDate,
    end_date: updates.endDate,
    budget: updates.budget,
    spent: updates.spent,
    project_type: updates.projectType,
    location: updates.location,
    contract_amount: updates.contractAmount,
    pcab_category: updates.pcabCategory,
    permit_no: updates.permitNo,
    permit_status: updates.permitStatus,
    description: updates.description,
  }).eq("id", id);
  if (error) throw error;
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw error;
}

// ===== BOQ ITEMS =====

export async function getBOQItems(projectId: string): Promise<BOQItem[]> {
  const { data, error } = await supabase
    .from("boq_items")
    .select("*")
    .eq("project_id", projectId)
    .order("item_no", { ascending: true });

  if (error) throw error;
  return (data || []).map(mapBOQItem);
}

export async function createBOQItem(item: Partial<BOQItem>): Promise<void> {
  const { error } = await supabase.from("boq_items").insert({
    project_id: item.projectId!,
    item_no: item.itemNo!,
    dpwh_item_code: item.dpwhItemCode,
    description: item.description!,
    category: item.category!,
    unit: item.unit!,
    quantity: item.quantity || 0,
    unit_cost: item.unitCost || 0,
    labor_cost: item.laborCost || 0,
    material_cost: item.materialCost || 0,
    total_cost: item.total || 0,
  });
  if (error) throw error;
}

export async function updateBOQItem(id: string, updates: Partial<BOQItem>): Promise<void> {
  const { error } = await supabase.from("boq_items").update({
    item_no: updates.itemNo,
    dpwh_item_code: updates.dpwhItemCode,
    description: updates.description,
    category: updates.category,
    unit: updates.unit,
    quantity: updates.quantity,
    unit_cost: updates.unitCost,
    labor_cost: updates.laborCost,
    material_cost: updates.materialCost,
    total_cost: updates.total,
  }).eq("id", id);
  if (error) throw error;
}

export async function deleteBOQItem(id: string): Promise<void> {
  const { error } = await supabase.from("boq_items").delete().eq("id", id);
  if (error) throw error;
}

// ===== PLANNING PHASES =====

export async function getPlanningPhases(projectId: string): Promise<PlanningPhase[]> {
  const { data, error } = await supabase.from("planning_phases").select("*").eq("project_id", projectId).order("start_date", { ascending: true });
  if (error) throw error;
  return (data || []).map(mapPlanningPhase);
}

export async function createPlanningPhase(phase: Partial<PlanningPhase>): Promise<PlanningPhase> {
  const { data, error } = await supabase.from("planning_phases").insert({
    project_id: phase.projectId!,
    phase: phase.name!,
    start_date: phase.startDate!,
    end_date: phase.endDate!,
    status: phase.status || "not_started",
    progress: phase.progress || 0,
    dependencies: phase.dependencies || [],
  }).select().single();
  if (error) throw error;
  return mapPlanningPhase(data);
}

export async function updatePlanningPhase(id: string, updates: Partial<PlanningPhase>): Promise<void> {
  const { error } = await supabase.from("planning_phases").update({
    phase: updates.name,
    start_date: updates.startDate,
    end_date: updates.endDate,
    status: updates.status,
    progress: updates.progress,
    dependencies: updates.dependencies,
  }).eq("id", id);
  if (error) throw error;
}

export async function deletePlanningPhase(id: string): Promise<void> {
  const { error } = await supabase.from("planning_phases").delete().eq("id", id);
  if (error) throw error;
}

// ===== TASKS =====

export async function getTasks(projectId?: string): Promise<Task[]> {
  let query = supabase.from("tasks").select("*");
  if (projectId) query = query.eq("project_id", projectId);
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapTask);
}

export async function createTask(task: Partial<Task>): Promise<void> {
  const { error } = await supabase.from("tasks").insert({
    project_id: task.projectId,
    phase_id: task.phaseId,
    title: task.title!,
    description: task.description,
    assigned_to: task.assignedTo,
    assigned_role: task.assignedRole,
    due_date: task.dueDate,
    priority: task.priority || "medium",
    status: task.status || "todo",
    source: task.source || "manual",
  });
  if (error) throw error;
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<void> {
  const { error } = await supabase.from("tasks").update({
    title: updates.title,
    description: updates.description,
    assigned_to: updates.assignedTo,
    assigned_role: updates.assignedRole,
    due_date: updates.dueDate,
    priority: updates.priority,
    status: updates.status,
    source: updates.source,
  }).eq("id", id);
  if (error) throw error;
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw error;
}

// ===== PROGRESS REPORTS =====

export async function getProgressReports(projectId: string): Promise<ProgressReport[]> {
  const { data, error } = await supabase.from("progress_reports").select("*").eq("project_id", projectId).order("date", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapProgressReport);
}

export async function createProgressReport(report: Partial<ProgressReport>): Promise<void> {
  const { error } = await supabase.from("progress_reports").insert({
    project_id: report.projectId!,
    title: report.title!,
    date: report.date!,
    author: report.authorId!,
    description: report.description || "",
    progress: report.progressPercentage || 0,
    images: report.sitePhotos || [],
  });
  if (error) throw error;
}

export async function updateProgressReport(id: string, updates: Partial<ProgressReport>): Promise<void> {
  const { error } = await supabase.from("progress_reports").update({
    title: updates.title,
    date: updates.date,
    description: updates.description,
    progress: updates.progressPercentage,
    images: updates.sitePhotos,
  }).eq("id", id);
  if (error) throw error;
}

export async function deleteProgressReport(id: string): Promise<void> {
  const { error } = await supabase.from("progress_reports").delete().eq("id", id);
  if (error) throw error;
}

// ===== BILLING ITEMS =====

export async function getBillingItems(projectId?: string): Promise<BillingItem[]> {
  let query = supabase.from("billing_items").select("*");
  if (projectId) query = query.eq("project_id", projectId);
  const { data, error } = await query.order("date", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapBillingItem);
}

export async function createBillingItem(item: Partial<BillingItem>): Promise<void> {
  const { error } = await supabase.from("billing_items").insert({
    project_id: item.projectId!,
    invoice_no: item.invoiceNo!,
    date: item.date!,
    billing_type: item.billingType!,
    description: item.description || "",
    amount: item.baseAmount || 0,
    progress_percent: item.progressPercent,
    vat_amount: item.vat || 0,
    ewt_amount: item.ewt || 0,
    retention_amount: item.retention || 0,
    net_amount: item.netAmount || 0,
    status: item.status || "draft",
  });
  if (error) throw error;
}

export async function updateBillingItem(id: string, updates: Partial<BillingItem>): Promise<void> {
  const { error } = await supabase.from("billing_items").update({
    invoice_no: updates.invoiceNo,
    date: updates.date,
    billing_type: updates.billingType,
    description: updates.description,
    amount: updates.baseAmount,
    progress_percent: updates.progressPercent,
    vat_amount: updates.vat,
    ewt_amount: updates.ewt,
    retention_amount: updates.retention,
    net_amount: updates.netAmount,
    status: updates.status,
  }).eq("id", id);
  if (error) throw error;
}

export async function deleteBillingItem(id: string): Promise<void> {
  const { error } = await supabase.from("billing_items").delete().eq("id", id);
  if (error) throw error;
}

// ===== DOCUMENTS =====

export async function getDocuments(projectId?: string): Promise<Document[]> {
  let query = supabase.from("documents").select("*");
  if (projectId) query = query.eq("project_id", projectId);
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapDocument);
}

export async function createDocument(document: Partial<Document>): Promise<void> {
  const { error } = await supabase.from("documents").insert({
    project_id: document.projectId!,
    name: document.fileName!,
    file_path: document.fileUrl!,
    file_size: document.fileSize || 0,
    file_type: document.fileType || "",
    category: document.category || "other",
    notes: document.notes || "",
    uploaded_by: document.uploadedBy || "",
  });
  if (error) throw error;
}

export async function deleteDocument(id: string): Promise<void> {
  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) throw error;
}

export async function uploadDocument(projectId: string, category: string, file: File): Promise<void> {
  const filePath = `${projectId}/${Date.now()}_${file.name}`;
  const { error } = await supabase.storage.from("project-documents").upload(filePath, file);
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from("project-documents").getPublicUrl(filePath);

  await createDocument({
    projectId,
    category: category as any,
    fileName: file.name,
    fileUrl: publicUrl,
    fileSize: file.size,
    fileType: file.type || "application/octet-stream",
    uploadedBy: "system",
  });
}

// ===== DRAWINGS =====

export async function getDrawings(projectId?: string): Promise<DrawingLog[]> {
  let query = supabase.from("drawings").select("*");
  if (projectId) query = query.eq("project_id", projectId);
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapDrawing);
}

export async function createDrawing(drawing: Partial<DrawingLog>): Promise<void> {
  const { error } = await supabase.from("drawings").insert({
    project_id: drawing.projectId || null,
    file_name: drawing.fileName!,
    file_path: drawing.fileUrl!,
    file_type: drawing.fileType || "",
    version: parseFloat(drawing.revisionNumber as string) || 1,
    uploaded_by: drawing.uploadedBy || "",
    status: drawing.status || "uploaded",
    extracted_data: drawing.extractedQuantities as any || null,
    ai_status: drawing.aiStatus || null,
    notes: drawing.notes || "",
  } as any);
  if (error) throw error;
}

export async function updateDrawing(id: string, updates: Partial<DrawingLog>): Promise<void> {
  const { error } = await supabase.from("drawings").update({
    status: updates.status,
    extracted_data: updates.extractedQuantities as any,
    ai_status: updates.aiStatus,
    notes: updates.notes,
  } as any).eq("id", id);
  if (error) throw error;
}

export async function deleteDrawing(id: string): Promise<void> {
  const { error } = await supabase.from("drawings").delete().eq("id", id);
  if (error) throw error;
}

export async function uploadDrawing(data: { projectId: string, title: string, description: string, version: string, file: File }): Promise<void> {
  const filePath = `${data.projectId}/${Date.now()}_${data.file.name}`;
  const { error } = await supabase.storage.from("project-documents").upload(filePath, data.file);
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from("project-documents").getPublicUrl(filePath);

  await createDrawing({
    projectId: data.projectId,
    fileName: data.title,
    fileUrl: publicUrl,
    fileType: data.file.type || "application/pdf",
    revisionNumber: data.version,
    status: "uploaded",
    notes: data.description,
    uploadedBy: "system"
  });
}

// ===== WEEKLY LOGISTICS =====

export async function getWeeklyLogistics(projectId: string): Promise<WeeklyLogistics[]> {
  const { data, error } = await supabase.from("weekly_logistics").select("*").eq("project_id", projectId).order("week_start_date", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapWeeklyLogistics);
}

export async function createWeeklyLogistics(logistics: Partial<WeeklyLogistics>): Promise<void> {
  const { error } = await supabase.from("weekly_logistics").insert({
    project_id: logistics.projectId || null,
    week_start_date: logistics.weekStartDate!,
    week_end_date: logistics.weekEndDate!,
    week_number: logistics.weekNumber || 1,
    materials: logistics.materialsNeeded as any || {},
    estimated_cash: logistics.estimatedPettyCash || 0,
    tasks: logistics.suggestedTasks as any || [],
    status: logistics.status || "draft",
  } as any);
  if (error) throw error;
}

export async function updateWeeklyLogistics(id: string, updates: Partial<WeeklyLogistics>): Promise<void> {
  const { error } = await supabase.from("weekly_logistics").update({
    status: updates.status,
    materials: updates.materialsNeeded as any,
    estimated_cash: updates.estimatedPettyCash,
    tasks: updates.suggestedTasks as any,
  } as any).eq("id", id);
  if (error) throw error;
}

export async function deleteWeeklyLogistics(id: string): Promise<void> {
  const { error } = await supabase.from("weekly_logistics").delete().eq("id", id);
  if (error) throw error;
}

// ===== MARKET PRICES =====

export async function getMarketPrices(): Promise<MarketPrice[]> {
  const { data, error } = await supabase
    .from("market_prices")
    .select("*")
    .order("date_recorded", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapMarketPrice);
}

export async function createMarketPrice(
  price: Partial<MarketPrice>
): Promise<MarketPrice> {
  const { data, error } = await supabase
    .from("market_prices")
    .insert({
      item_name: price.itemName,
      category: price.category,
      unit: price.unit,
      price: price.pricePerUnit,
      supplier: price.supplier,
      location: price.location,
      source: price.source,
      notes: price.notes,
    } as any)
    .select()
    .single();
  if (error) throw error;
  return mapMarketPrice(data);
}

export async function updateMarketPrice(
  id: string,
  price: Partial<MarketPrice>
): Promise<void> {
  const { error } = await supabase
    .from("market_prices")
    .update({
      item_name: price.itemName,
      category: price.category,
      unit: price.unit,
      price: price.pricePerUnit,
      supplier: price.supplier,
      location: price.location,
      source: price.source,
      notes: price.notes,
    } as any)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteMarketPrice(id: string): Promise<void> {
  const { error } = await supabase.from("market_prices").delete().eq("id", id);
  if (error) throw error;
}

// ===== AUDIT LOGS =====

export async function getAuditLogs(): Promise<AuditLog[]> {
  const { data, error } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(100);
  if (error) throw error;
  return (data || []).map(mapAuditLog);
}

// Billing Milestones
export async function getBillingMilestones(
  projectId: string
): Promise<BillingMilestone[]> {
  const { data, error } = await supabase
    .from("billing_milestones")
    .select("*")
    .eq("project_id", projectId)
    .order("percentage_of_contract", { ascending: true });

  if (error) throw error;
  return (data || []).map(mapBillingMilestone);
}

export async function createBillingMilestone(
  milestone: Partial<BillingMilestone>
): Promise<void> {
  await createMilestone({
    projectId: milestone.projectId!,
    name: milestone.name!,
    description: milestone.description || "",
    contractAmount: milestone.contractAmount!,
    triggerCondition: milestone.triggerCondition!,
    percentageOfContract: milestone.percentageOfContract!,
  });
}

export async function updateBillingMilestone(
  id: string,
  updates: Partial<BillingMilestone>
): Promise<void> {
  const payload = {
    name: updates.name,
    description: updates.description,
    contract_amount: updates.contractAmount,
    trigger_condition: updates.triggerCondition,
    percentage_of_contract: updates.percentageOfContract,
    status: updates.status,
    triggered_at: updates.triggeredAt,
    billed_at: updates.billedAt,
  };
  
  // Remove undefined values
  Object.keys(payload).forEach(
    (key) => payload[key as keyof typeof payload] === undefined && delete payload[key as keyof typeof payload]
  );

  const { error } = await supabase
    .from("billing_milestones")
    .update(payload)
    .eq("id", id);

  if (error) throw error;
}

export async function deleteBillingMilestone(id: string): Promise<void> {
  const { error } = await supabase.from("billing_milestones").delete().eq("id", id);
  if (error) throw error;
}

// Project Automation Functions
export {
  generateWeeklyMaterialsForecast,
  generateProjectTasks,
  analyzeTaskProfitability,
  computeProgressBilling,
  getProjectCostSummary,
  suggestTaskPrioritization,
};