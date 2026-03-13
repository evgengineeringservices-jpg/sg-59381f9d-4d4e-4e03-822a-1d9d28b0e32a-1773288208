// Common types
export type Role =
  | "super_admin"
  | "owner"
  | "contractor_admin"
  | "office_admin"
  | "secretary"
  | "project_engineer"
  | "project_coordinator"
  | "draftsman"
  | "lead"
  | "client";

export type ProjectStatus =
  | "planning"
  | "active"
  | "on_hold"
  | "completed"
  | "cancelled";

export type ProjectType =
  | "residential_new"
  | "commercial"
  | "renovation"
  | "infrastructure"
  | "industrial"
  | "institutional";

export type PCabCategory = "AAA" | "AA" | "A" | "B" | "C" | "D" | "Small A" | "Small B";

export type PermitStatus =
  | "not_applied"
  | "application_submitted"
  | "approved"
  | "rejected"
  | "expired";

export type LeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "proposal_sent"
  | "won"
  | "lost";

export type TaskStatus = "todo" | "in_progress" | "blocked" | "done";

export type TaskPriority = "low" | "medium" | "high" | "critical";

export type BillingType =
  | "progress"
  | "mobilization"
  | "retention_release"
  | "final"
  | "change_order"
  | "permit"
  | "milestone";

export type BillingStatus =
  | "draft"
  | "ready_for_review"
  | "approved"
  | "invoiced"
  | "paid"
  | "overdue";

export type DrawingStatus =
  | "uploaded"
  | "analyzing"
  | "needs_review"
  | "approved"
  | "superseded";

export type DocumentCategory =
  | "contract"
  | "building_permit"
  | "occupancy_permit"
  | "pcab_license"
  | "blueprint"
  | "change_order"
  | "specification"
  | "insurance"
  | "environmental"
  | "safety"
  | "bir"
  | "other";

export type BOQCategory =
  | "mobilization_demobilization"
  | "earthworks"
  | "substructure_foundation"
  | "concrete_works"
  | "reinforcing_steel"
  | "structural_steel"
  | "masonry"
  | "carpentry"
  | "roofing"
  | "doors_windows"
  | "floor_finishes"
  | "wall_finishes"
  | "ceiling"
  | "painting"
  | "plumbing"
  | "electrical"
  | "mechanical"
  | "fire_protection"
  | "site_development"
  | "miscellaneous";

export type DPWHUnit =
  | "cu_m"
  | "sq_m"
  | "l_m"
  | "kg"
  | "pcs"
  | "lot"
  | "set"
  | "tons"
  | "bags"
  | "sheets"
  | "lengths"
  | "each"
  | "man_day"
  | "ls";

export type PlanningPhaseStatus = "not-started" | "in-progress" | "completed" | "delayed";

export type AccountType = "asset" | "liability" | "equity" | "revenue" | "expense";

export interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  category: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface JournalEntry {
  id: string;
  projectId?: string;
  date: string;
  referenceNo: string;
  description: string;
  status: "draft" | "posted";
  createdAt: string;
  createdBy?: string;
  lines?: JournalLine[];
}

export interface JournalLine {
  id: string;
  entryId: string;
  accountId: string;
  description: string | null;
  debit: number;
  credit: number;
  createdAt: string;
  account?: Account;
}

export interface RecurringJournalEntry {
  id: string;
  projectId?: string;
  description: string;
  frequency: "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
  startDate: string;
  endDate?: string;
  nextOccurrence: string;
  isActive: boolean;
  createdAt: string;
  createdBy?: string;
  lines?: RecurringJournalLine[];
}

export interface RecurringJournalLine {
  id: string;
  recurringEntryId: string;
  accountId: string;
  description?: string;
  debit: number;
  credit: number;
  account?: Account;
}

export interface BankReconciliation {
  id: string;
  accountId: string;
  statementDate: string;
  statementBalance: number;
  bookBalance: number;
  reconciledBalance?: number;
  status: "in_progress" | "completed" | "reviewed";
  notes?: string;
  createdAt: string;
  createdBy?: string;
  completedAt?: string;
  transactions?: BankTransaction[];
  account?: Account;
}

export interface BankTransaction {
  id: string;
  reconciliationId: string;
  transactionDate: string;
  description: string;
  referenceNo?: string;
  debit: number;
  credit: number;
  isMatched: boolean;
  matchedJournalEntryId?: string;
  notes?: string;
  createdAt: string;
}

export interface FinancialPeriod {
  startDate: string;
  endDate: string;
  label: string;
}

export interface PeriodComparison {
  periods: FinancialPeriod[];
  profitAndLoss: {
    [key: string]: {
      revenue: number;
      cogs: number;
      grossProfit: number;
      expenses: number;
      netIncome: number;
    };
  };
  balanceSheet: {
    [key: string]: {
      totalAssets: number;
      totalLiabilities: number;
      totalEquity: number;
    };
  };
}

// Database entities
export interface Profile {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: Role;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  projectType: ProjectType | null;
  budgetRange: string | null;
  location: string | null;
  source: string | null;
  notes: string | null;
  message: string | null;
  status: LeadStatus;
  assignedTo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  client: string;
  status: ProjectStatus;
  progress: number;
  startDate: string;
  endDate: string | null;
  budget: number;
  spent: number;
  projectType: ProjectType;
  location: string;
  contractAmount: number;
  pcabCategory: PCabCategory | null;
  permitNo: string | null;
  permitStatus: PermitStatus;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: Role;
  createdAt: string;
}

export interface BOQItem {
  id: string;
  projectId: string;
  itemNo: string;
  dpwhItemCode: string | null;
  description: string;
  category: BOQCategory;
  unit: DPWHUnit;
  quantity: number;
  unitCost: number;
  laborCost: number;
  materialCost: number;
  total: number;
  markup: number;
  createdAt: string;
  updatedAt: string;
}

export interface PlanningPhase {
  id: string;
  projectId: string;
  name: string;
  startDate: string;
  endDate: string;
  status: PlanningPhaseStatus;
  progress: number;
  dependencies: string[];
  assignedRole: Role | null;
  assignedUserId: string | null;
  isMilestone: boolean;
  isBillingTrigger: boolean;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  projectId: string | null;
  phaseId: string | null;
  assignedTo: string | null;
  assignedRole: Role | null;
  dueDate: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  estimatedCostImpact: number | null;
  estimatedProfitImpact: number | null;
  dependency: string | null;
  source: "manual" | "auto_generated";
  createdAt: string;
  updatedAt: string;
}

export interface ProgressReport {
  id: string;
  projectId: string;
  title: string;
  date: string;
  authorId: string;
  description: string | null;
  progressPercentage: number;
  sitePhotos: string[];
  linkedPhaseId: string | null;
  linkedBoqItemId: string | null;
  milestoneCompleted: boolean;
  weather: string | null;
  manpower: number | null;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BillingItem {
  id: string;
  projectId: string;
  invoiceNo: string;
  date: string;
  billingType: BillingType;
  description: string;
  baseAmount: number;
  progressPercent: number | null;
  vat: number;
  ewt: number;
  retention: number;
  netAmount: number;
  status: BillingStatus;
  relatedMilestoneId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Document {
  id: string;
  projectId: string;
  category: DocumentCategory;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  uploadedBy: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DrawingLog {
  id: string;
  projectId: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  revisionNumber: string;
  status: DrawingStatus;
  extractedDimensions: Record<string, unknown> | null;
  extractedQuantities: Record<string, unknown> | null;
  aiSuggestions: Record<string, unknown> | null;
  confidenceScore: number | null;
  aiStatus: string | null;
  uploadedBy: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MarketPrice {
  id: string;
  itemName: string;
  category: string;
  supplier: string | null;
  source: string | null;
  pricePerUnit: number;
  unit: DPWHUnit;
  location: string | null;
  effectiveDate: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyLogistics {
  id: string;
  projectId: string;
  weekStartDate: string;
  weekEndDate: string;
  weekNumber: number;
  status: string;
  scheduledActivities: string[];
  materialsNeeded: Record<string, unknown>;
  estimatedPettyCash: number;
  suggestedTasks: string[];
  procurementRisks: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SystemSetting {
  id: string;
  key: string;
  value: string;
  category: "tax" | "ai" | "general" | "billing";
  description: string | null;
  updatedBy: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string | null;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  createdAt: string;
}

export interface BillingMilestone {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  contractAmount: number;
  triggerCondition: string;
  percentageOfContract: number;
  status: "pending" | "triggered" | "billed" | "paid";
  triggeredAt: string | null;
  billedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskProfitAnalysis {
  id: string;
  taskId: string;
  profitImpactScore: number;
  costEffectivenessScore: number;
  urgencyScore: number;
  recommendation: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type:
    | "price_change"
    | "task_assigned"
    | "billing_ready"
    | "milestone_complete"
    | "document_uploaded"
    | "drawing_analyzed"
    | "budget_alert"
    | "timeline_delay"
    | "approval_needed"
    | "system_alert";
  title: string;
  message: string;
  severity: "info" | "warning" | "error" | "success";
  link?: string;
  isRead: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
  readAt?: string;
}