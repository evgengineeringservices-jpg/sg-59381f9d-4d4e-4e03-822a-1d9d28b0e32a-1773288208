import { supabase } from "@/lib/supabase";
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
  MarketPrice,
  WeeklyLogistics,
  SystemSetting,
  AuditLog,
  LeadStatus,
  ProjectStatus,
  ProjectType,
  TaskStatus,
  TaskPriority,
  BillingStatus,
  BillingType,
  BOQCategory,
  DPWHUnit,
  DocumentCategory,
  DrawingStatus,
  Role,
} from "@/types";
import { PH_VAT_RATE, PH_EWT_RATE, PH_RETENTION_RATE } from "@/constants";

// Helper: Convert snake_case to camelCase
function toCamelCase<T>(obj: Record<string, unknown>): T {
  const result: Record<string, unknown> = {};
  for (const key in obj) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = obj[key];
  }
  return result as T;
}

// Helper: Convert camelCase to snake_case
function toSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key in obj) {
    const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    result[snakeKey] = obj[key];
  }
  return result;
}

// ===== PROFILES =====
export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  
  if (error) throw error;
  return toCamelCase<Profile>(data);
}

export async function updateProfile(userId: string, updates: Partial<Profile>) {
  const { data, error } = await supabase
    .from("profiles")
    .update(toSnakeCase(updates as Record<string, unknown>))
    .eq("id", userId)
    .select()
    .single();
  
  if (error) throw error;
  return toCamelCase<Profile>(data);
}

export async function getAllProfiles() {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });
  
  if (error) throw error;
  return data.map(toCamelCase<Profile>);
}

// ===== LEADS =====
export async function getLeads() {
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });
  
  if (error) throw error;
  return data.map(toCamelCase<Lead>);
}

export async function createLead(lead: Omit<Lead, "id" | "createdAt" | "updatedAt">) {
  const { data, error } = await supabase
    .from("leads")
    .insert(toSnakeCase(lead as Record<string, unknown>))
    .select()
    .single();
  
  if (error) throw error;
  return toCamelCase<Lead>(data);
}

export async function updateLead(id: string, updates: Partial<Lead>) {
  const { data, error } = await supabase
    .from("leads")
    .update(toSnakeCase(updates as Record<string, unknown>))
    .eq("id", id)
    .select()
    .single();
  
  if (error) throw error;
  return toCamelCase<Lead>(data);
}

export async function deleteLead(id: string) {
  const { error } = await supabase
    .from("leads")
    .delete()
    .eq("id", id);
  
  if (error) throw error;
}

// ===== PROJECTS =====
export async function getProjects() {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });
  
  if (error) throw error;
  return data.map(toCamelCase<Project>);
}

export async function getProject(id: string) {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();
  
  if (error) throw error;
  return toCamelCase<Project>(data);
}

export async function createProject(project: Omit<Project, "id" | "createdAt" | "updatedAt">) {
  const { data, error } = await supabase
    .from("projects")
    .insert(toSnakeCase(project as Record<string, unknown>))
    .select()
    .single();
  
  if (error) throw error;
  return toCamelCase<Project>(data);
}

export async function updateProject(id: string, updates: Partial<Project>) {
  const { data, error } = await supabase
    .from("projects")
    .update(toSnakeCase(updates as Record<string, unknown>))
    .eq("id", id)
    .select()
    .single();
  
  if (error) throw error;
  return toCamelCase<Project>(data);
}

export async function deleteProject(id: string) {
  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", id);
  
  if (error) throw error;
}

// ===== BOQ ITEMS =====
export async function getBOQItems(projectId: string) {
  const { data, error } = await supabase
    .from("boq_items")
    .select("*")
    .eq("project_id", projectId)
    .order("item_no");
  
  if (error) throw error;
  return data.map(toCamelCase<BOQItem>);
}

export async function createBOQItem(item: Omit<BOQItem, "id" | "createdAt" | "updatedAt">) {
  const { data, error } = await supabase
    .from("boq_items")
    .insert(toSnakeCase(item as Record<string, unknown>))
    .select()
    .single();
  
  if (error) throw error;
  return toCamelCase<BOQItem>(data);
}

export async function updateBOQItem(id: string, updates: Partial<BOQItem>) {
  const { data, error } = await supabase
    .from("boq_items")
    .update(toSnakeCase(updates as Record<string, unknown>))
    .eq("id", id)
    .select()
    .single();
  
  if (error) throw error;
  return toCamelCase<BOQItem>(data);
}

export async function deleteBOQItem(id: string) {
  const { error } = await supabase
    .from("boq_items")
    .delete()
    .eq("id", id);
  
  if (error) throw error;
}

// ===== PLANNING PHASES =====
export async function getPlanningPhases(projectId: string) {
  const { data, error } = await supabase
    .from("planning_phases")
    .select("*")
    .eq("project_id", projectId)
    .order("start_date");
  
  if (error) throw error;
  return data.map(toCamelCase<PlanningPhase>);
}

export async function createPlanningPhase(phase: Omit<PlanningPhase, "id" | "createdAt" | "updatedAt">) {
  const { data, error } = await supabase
    .from("planning_phases")
    .insert(toSnakeCase(phase as Record<string, unknown>))
    .select()
    .single();
  
  if (error) throw error;
  return toCamelCase<PlanningPhase>(data);
}

export async function updatePlanningPhase(id: string, updates: Partial<PlanningPhase>) {
  const { data, error } = await supabase
    .from("planning_phases")
    .update(toSnakeCase(updates as Record<string, unknown>))
    .eq("id", id)
    .select()
    .single();
  
  if (error) throw error;
  return toCamelCase<PlanningPhase>(data);
}

export async function deletePlanningPhase(id: string) {
  const { error } = await supabase
    .from("planning_phases")
    .delete()
    .eq("id", id);
  
  if (error) throw error;
}

// ===== TASKS =====
export async function getTasks(projectId?: string) {
  let query = supabase
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false });
  
  if (projectId) {
    query = query.eq("project_id", projectId);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  return data.map(toCamelCase<Task>);
}

export async function createTask(task: Omit<Task, "id" | "createdAt" | "updatedAt">) {
  const { data, error } = await supabase
    .from("tasks")
    .insert(toSnakeCase(task as Record<string, unknown>))
    .select()
    .single();
  
  if (error) throw error;
  return toCamelCase<Task>(data);
}

export async function updateTask(id: string, updates: Partial<Task>) {
  const { data, error } = await supabase
    .from("tasks")
    .update(toSnakeCase(updates as Record<string, unknown>))
    .eq("id", id)
    .select()
    .single();
  
  if (error) throw error;
  return toCamelCase<Task>(data);
}

export async function deleteTask(id: string) {
  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", id);
  
  if (error) throw error;
}

// ===== PROGRESS REPORTS =====
export async function getProgressReports(projectId: string) {
  const { data, error } = await supabase
    .from("progress_reports")
    .select("*")
    .eq("project_id", projectId)
    .order("date", { ascending: false });
  
  if (error) throw error;
  return data.map(toCamelCase<ProgressReport>);
}

export async function createProgressReport(report: Omit<ProgressReport, "id" | "createdAt" | "updatedAt">) {
  const { data, error } = await supabase
    .from("progress_reports")
    .insert(toSnakeCase(report as Record<string, unknown>))
    .select()
    .single();
  
  if (error) throw error;
  return toCamelCase<ProgressReport>(data);
}

export async function updateProgressReport(id: string, updates: Partial<ProgressReport>) {
  const { data, error } = await supabase
    .from("progress_reports")
    .update(toSnakeCase(updates as Record<string, unknown>))
    .eq("id", id)
    .select()
    .single();
  
  if (error) throw error;
  return toCamelCase<ProgressReport>(data);
}

export async function deleteProgressReport(id: string) {
  const { error } = await supabase
    .from("progress_reports")
    .delete()
    .eq("id", id);
  
  if (error) throw error;
}

// ===== BILLING ITEMS =====
export async function getBillingItems(projectId: string) {
  const { data, error } = await supabase
    .from("billing_items")
    .select("*")
    .eq("project_id", projectId)
    .order("date", { ascending: false });
  
  if (error) throw error;
  return data.map(toCamelCase<BillingItem>);
}

export async function createBillingItem(item: Omit<BillingItem, "id" | "createdAt" | "updatedAt">) {
  const { data, error } = await supabase
    .from("billing_items")
    .insert(toSnakeCase(item as Record<string, unknown>))
    .select()
    .single();
  
  if (error) throw error;
  return toCamelCase<BillingItem>(data);
}

export async function updateBillingItem(id: string, updates: Partial<BillingItem>) {
  const { data, error } = await supabase
    .from("billing_items")
    .update(toSnakeCase(updates as Record<string, unknown>))
    .eq("id", id)
    .select()
    .single();
  
  if (error) throw error;
  return toCamelCase<BillingItem>(data);
}

export async function deleteBillingItem(id: string) {
  const { error } = await supabase
    .from("billing_items")
    .delete()
    .eq("id", id);
  
  if (error) throw error;
}

// ===== DOCUMENTS =====
export async function getDocuments(projectId: string) {
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  
  if (error) throw error;
  return data.map(toCamelCase<Document>);
}

export async function createDocument(doc: Omit<Document, "id" | "createdAt" | "updatedAt">) {
  const { data, error } = await supabase
    .from("documents")
    .insert(toSnakeCase(doc as Record<string, unknown>))
    .select()
    .single();
  
  if (error) throw error;
  return toCamelCase<Document>(data);
}

export async function deleteDocument(id: string) {
  const { error } = await supabase
    .from("documents")
    .delete()
    .eq("id", id);
  
  if (error) throw error;
}

// ===== DRAWING LOGS =====
export async function getDrawingLogs(projectId: string) {
  const { data, error } = await supabase
    .from("drawing_logs")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  
  if (error) throw error;
  return data.map(toCamelCase<DrawingLog>);
}

export async function createDrawingLog(log: Omit<DrawingLog, "id" | "createdAt" | "updatedAt">) {
  const { data, error } = await supabase
    .from("drawing_logs")
    .insert(toSnakeCase(log as Record<string, unknown>))
    .select()
    .single();
  
  if (error) throw error;
  return toCamelCase<DrawingLog>(data);
}

export async function updateDrawingLog(id: string, updates: Partial<DrawingLog>) {
  const { data, error } = await supabase
    .from("drawing_logs")
    .update(toSnakeCase(updates as Record<string, unknown>))
    .eq("id", id)
    .select()
    .single();
  
  if (error) throw error;
  return toCamelCase<DrawingLog>(data);
}

// ===== MARKET PRICES =====
export async function getMarketPrices() {
  const { data, error } = await supabase
    .from("market_prices")
    .select("*")
    .order("effective_date", { ascending: false });
  
  if (error) throw error;
  return data.map(toCamelCase<MarketPrice>);
}

export async function createMarketPrice(price: Omit<MarketPrice, "id" | "createdAt" | "updatedAt">) {
  const { data, error } = await supabase
    .from("market_prices")
    .insert(toSnakeCase(price as Record<string, unknown>))
    .select()
    .single();
  
  if (error) throw error;
  return toCamelCase<MarketPrice>(data);
}

export async function updateMarketPrice(id: string, updates: Partial<MarketPrice>) {
  const { data, error } = await supabase
    .from("market_prices")
    .update(toSnakeCase(updates as Record<string, unknown>))
    .eq("id", id)
    .select()
    .single();
  
  if (error) throw error;
  return toCamelCase<MarketPrice>(data);
}

export async function deleteMarketPrice(id: string) {
  const { error } = await supabase
    .from("market_prices")
    .delete()
    .eq("id", id);
  
  if (error) throw error;
}

// ===== WEEKLY LOGISTICS =====
export async function getWeeklyLogistics(projectId: string) {
  const { data, error } = await supabase
    .from("weekly_logistics")
    .select("*")
    .eq("project_id", projectId)
    .order("week_start_date", { ascending: false });
  
  if (error) throw error;
  return data.map(toCamelCase<WeeklyLogistics>);
}

export async function createWeeklyLogistics(logistics: Omit<WeeklyLogistics, "id" | "createdAt" | "updatedAt">) {
  const { data, error } = await supabase
    .from("weekly_logistics")
    .insert(toSnakeCase(logistics as Record<string, unknown>))
    .select()
    .single();
  
  if (error) throw error;
  return toCamelCase<WeeklyLogistics>(data);
}

// ===== SYSTEM SETTINGS =====
export async function getSystemSettings() {
  const { data, error } = await supabase
    .from("system_settings")
    .select("*")
    .order("category");
  
  if (error) throw error;
  return data.map(toCamelCase<SystemSetting>);
}

export async function updateSystemSetting(id: string, value: string, updatedBy: string) {
  const { data, error } = await supabase
    .from("system_settings")
    .update({ value, updated_by: updatedBy, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  
  if (error) throw error;
  return toCamelCase<SystemSetting>(data);
}

// ===== AUDIT LOGS =====
export async function getAuditLogs(limit = 100) {
  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  return data.map(toCamelCase<AuditLog>);
}

// ===== HELPER FUNCTIONS =====
export function calculateBilling(baseAmount: number, progressPercent?: number) {
  const actualBase = progressPercent ? baseAmount * (progressPercent / 100) : baseAmount;
  const vat = actualBase * PH_VAT_RATE;
  const ewt = actualBase * PH_EWT_RATE;
  const retention = actualBase * PH_RETENTION_RATE;
  const netAmount = actualBase + vat - ewt - retention;
  
  return {
    baseAmount: actualBase,
    vat,
    ewt,
    retention,
    netAmount,
  };
}

export function formatPeso(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(amount);
}

export function getHighestMarketPrice(prices: MarketPrice[], itemName: string, unit: DPWHUnit): number {
  const relevantPrices = prices.filter(
    (p) => p.itemName.toLowerCase().includes(itemName.toLowerCase()) && p.unit === unit
  );
  
  if (relevantPrices.length === 0) return 0;
  
  return Math.max(...relevantPrices.map((p) => p.pricePerUnit));
}

export function calculateLaborCost(
  materialCost: number,
  laborRate: number,
  mode: "percentage_of_material" | "percentage_of_total" | "manual" = "percentage_of_material"
): number {
  if (mode === "percentage_of_material") {
    return materialCost * (laborRate / 100);
  }
  if (mode === "percentage_of_total") {
    return (materialCost / (1 - laborRate / 100)) * (laborRate / 100) - materialCost;
  }
  return laborRate;
}

export async function uploadFile(
  bucket: string,
  filePath: string,
  file: File
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });
  
  if (error) throw error;
  
  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);
  
  return urlData.publicUrl;
}

export async function deleteFile(bucket: string, filePath: string) {
  const { error } = await supabase.storage
    .from(bucket)
    .remove([filePath]);
  
  if (error) throw error;
}