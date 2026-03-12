/**
 * Project Automation & Intelligence Engine
 * Auto-generates weekly forecasts, tasks, and billing
 */

import { supabase } from "@/integrations/supabase/client";
import type { BOQItem, PlanningPhase, Task, ProgressReport, BillingItem } from "@/types";

/**
 * Generate weekly materials forecast from BOQ and timeline
 */
export async function generateWeeklyMaterialsForecast(
  projectId: string,
  startDate: Date,
  endDate: Date
): Promise<any[]> {
  try {
    const { data, error } = await supabase.rpc("generate_weekly_materials_forecast" as any, {
      p_project_id: projectId,
      p_start_date: startDate.toISOString().split("T")[0],
      p_end_date: endDate.toISOString().split("T")[0],
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Failed to generate weekly forecast:", error);
    throw error;
  }
}

/**
 * Generate tasks for Project Engineer based on BOQ and timeline
 */
export async function generateProjectTasks(
  projectId: string
): Promise<{ created: number; tasks: any[] }> {
  try {
    const { data, error } = await supabase.rpc("generate_project_tasks" as any, {
      p_project_id: projectId,
    });

    if (error) throw error;
    return (data as any) || { created: 0, tasks: [] };
  } catch (error) {
    console.error("Failed to generate tasks:", error);
    throw error;
  }
}

/**
 * Analyze tasks for profit impact and cost effectiveness
 */
export async function analyzeTaskProfitability(
  projectId: string
): Promise<any[]> {
  try {
    const { data, error } = await supabase.rpc("analyze_task_profitability" as any, {
      p_project_id: projectId,
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Failed to analyze tasks:", error);
    throw error;
  }
}

/**
 * Auto-compute progress billing from accomplishment report
 */
export async function computeProgressBilling(
  projectId: string,
  reportId: string,
  accomplishments: Array<{
    milestoneId: string;
    percentComplete: number;
  }>
): Promise<string> {
  try {
    // Get billing milestones for project
    const { data: milestones, error: milestonesError } = await supabase
      .from("billing_milestones")
      .select("*")
      .eq("project_id", projectId);

    if (milestonesError) throw milestonesError;

    let totalBillable = 0;
    const billingDetails: any[] = [];

    // Calculate billable amount for each accomplishment
    for (const acc of accomplishments) {
      const milestone = milestones?.find((m) => m.id === acc.milestoneId);
      if (!milestone) continue;

      const billableAmount = milestone.contract_amount * (acc.percentComplete / 100);
      totalBillable += billableAmount;

      billingDetails.push({
        milestone: milestone.name,
        percent: acc.percentComplete,
        amount: billableAmount,
      });
    }

    // Philippine billing constants
    const VAT_RATE = 0.12;
    const EWT_RATE = 0.02;
    const RETENTION_RATE = 0.10;

    const baseAmount = totalBillable;
    const vat = baseAmount * VAT_RATE;
    const ewt = baseAmount * EWT_RATE;
    const retention = baseAmount * RETENTION_RATE;
    const netAmount = baseAmount + vat - ewt - retention;

    // Create billing item
    const { data: billing, error: billingError } = await supabase
      .from("billing_items")
      .insert({
        project_id: projectId,
        invoice_no: `INV-${Date.now()}`,
        date: new Date().toISOString().split("T")[0],
        billing_type: "progress",
        description: `Progress billing based on accomplishment report`,
        amount: baseAmount,
        vat,
        ewt,
        retention,
        net_amount: netAmount,
        progress_percent: accomplishments.reduce((sum, a) => sum + a.percentComplete, 0) / accomplishments.length,
        status: "draft",
        notes: JSON.stringify(billingDetails),
      })
      .select()
      .single();

    if (billingError) throw billingError;

    return billing.id;
  } catch (error) {
    console.error("Failed to compute billing:", error);
    throw error;
  }
}

/**
 * Get weekly logistics summary for a project
 */
export async function getWeeklyLogistics(
  projectId: string,
  weekNumber: number
): Promise<any> {
  try {
    const { data, error } = await supabase
      .from("weekly_logistics")
      .select("*")
      .eq("project_id", projectId)
      .eq("week_number", weekNumber)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Failed to get weekly logistics:", error);
    throw error;
  }
}

/**
 * Create billing milestone for a project
 */
export async function createBillingMilestone(data: {
  projectId: string;
  name: string;
  description: string;
  contractAmount: number;
  triggerCondition: string;
  percentageOfContract: number;
}): Promise<void> {
  try {
    const { error } = await supabase.from("billing_milestones").insert({
      project_id: data.projectId,
      name: data.name,
      description: data.description,
      contract_amount: data.contractAmount,
      trigger_condition: data.triggerCondition,
      percentage_of_contract: data.percentageOfContract,
      status: "pending",
    });

    if (error) throw error;
  } catch (error) {
    console.error("Failed to create billing milestone:", error);
    throw error;
  }
}

/**
 * Get project cost summary with variance analysis
 */
export async function getProjectCostSummary(projectId: string): Promise<{
  budgeted: number;
  actual: number;
  variance: number;
  variancePercent: number;
  categorySummary: any[];
}> {
  try {
    const { data: boqSummary, error } = await supabase.rpc("get_boq_summary", {
      p_project_id: projectId,
    });

    if (error) throw error;

    const { data: project } = await supabase
      .from("projects")
      .select("budget, spent")
      .eq("id", projectId)
      .single();

    const budgeted = project?.budget || 0;
    const actual = project?.spent || 0;
    const variance = budgeted - actual;
    const variancePercent = budgeted > 0 ? (variance / budgeted) * 100 : 0;

    return {
      budgeted,
      actual,
      variance,
      variancePercent,
      categorySummary: boqSummary || [],
    };
  } catch (error) {
    console.error("Failed to get cost summary:", error);
    throw error;
  }
}

/**
 * Suggest optimal task prioritization based on profit impact
 */
export async function suggestTaskPrioritization(
  projectId: string
): Promise<{
  highProfitTasks: any[];
  costEffectiveTasks: any[];
  urgentTasks: any[];
  recommendations: string[];
}> {
  try {
    const analysis = await analyzeTaskProfitability(projectId);

    const highProfitTasks = analysis
      .filter((t) => t.profit_impact_score > 7)
      .sort((a, b) => b.profit_impact_score - a.profit_impact_score)
      .slice(0, 5);

    const costEffectiveTasks = analysis
      .filter((t) => t.cost_effectiveness_score > 7)
      .sort((a, b) => b.cost_effectiveness_score - a.cost_effectiveness_score)
      .slice(0, 5);

    const urgentTasks = analysis
      .filter((t) => t.urgency_score > 7)
      .sort((a, b) => b.urgency_score - a.urgency_score)
      .slice(0, 5);

    const recommendations: string[] = [];

    if (highProfitTasks.length > 0) {
      recommendations.push(
        `Focus on "${highProfitTasks[0].title}" - highest profit impact (${highProfitTasks[0].profit_impact_score}/10)`
      );
    }

    if (costEffectiveTasks.length > 0) {
      recommendations.push(
        `Prioritize "${costEffectiveTasks[0].title}" - most cost-effective (${costEffectiveTasks[0].cost_effectiveness_score}/10)`
      );
    }

    if (urgentTasks.length > 0) {
      recommendations.push(
        `Urgent: "${urgentTasks[0].title}" - blocks critical path (${urgentTasks[0].urgency_score}/10)`
      );
    }

    return {
      highProfitTasks,
      costEffectiveTasks,
      urgentTasks,
      recommendations,
    };
  } catch (error) {
    console.error("Failed to suggest prioritization:", error);
    throw error;
  }
}