import { useState, useEffect } from "react";
import { CRMLayout } from "@/components/layout/CRMLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  AlertTriangle,
  CheckCircle,
  FileSpreadsheet,
  ArrowRight,
  BarChart3,
  PieChart,
} from "lucide-react";
import { formatPeso } from "@/lib/boqCalculations";
import { getProjects } from "@/services/crmService";
import type { Project } from "@/types";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

interface ProjectCostSummary {
  project_id: string;
  project_name: string;
  total_boq_cost: number;
  total_actual_cost: number;
  cost_variance: number;
  cost_variance_percentage: number;
  total_items: number;
  over_budget_items: number;
  under_budget_items: number;
  on_budget_items: number;
}

interface BOQActualComparison {
  boq_item_id: string;
  item_no: string;
  description: string;
  category: string;
  boq_quantity: number;
  boq_material_cost: number;
  boq_labor_cost: number;
  boq_total_cost: number;
  actual_quantity: number;
  actual_material_cost: number;
  cost_variance: number;
  cost_variance_percentage: number;
  budget_status: string;
}

interface CategoryBreakdown {
  category: string;
  boq_cost: number;
  actual_cost: number;
  variance: number;
  variance_percentage: number;
}

export default function CostAnalysisPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [projectSummary, setProjectSummary] = useState<ProjectCostSummary | null>(null);
  const [itemComparisons, setItemComparisons] = useState<BOQActualComparison[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdown[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadCostAnalysis();
    }
  }, [selectedProject]);

  async function loadProjects() {
    try {
      const data = await getProjects();
      setProjects(data);
      if (data.length > 0 && !selectedProject) {
        setSelectedProject(data[0].id);
      }
    } catch (error) {
      console.error("Error loading projects:", error);
    }
  }

  async function loadCostAnalysis() {
    setLoading(true);
    try {
      // Load project summary
      const { data: summaryData, error: summaryError } = await supabase
        .from('project_cost_summary' as any)
        .select('*')
        .eq('project_id', selectedProject)
        .single();

      if (summaryError) throw summaryError;
      setProjectSummary(summaryData);

      // Load item comparisons
      const { data: itemsData, error: itemsError } = await supabase
        .from('boq_actual_comparison' as any)
        .select('*')
        .eq('project_id', selectedProject)
        .order('cost_variance_percentage', { ascending: false });

      if (itemsError) throw itemsError;
      setItemComparisons(itemsData || []);

      // Calculate category breakdown
      if (itemsData) {
        const categoryMap = new Map<string, CategoryBreakdown>();
        itemsData.forEach((item: BOQActualComparison) => {
          const existing = categoryMap.get(item.category) || {
            category: item.category,
            boq_cost: 0,
            actual_cost: 0,
            variance: 0,
            variance_percentage: 0,
          };
          existing.boq_cost += item.boq_total_cost;
          existing.actual_cost += item.actual_material_cost;
          existing.variance += item.cost_variance;
          categoryMap.set(item.category, existing);
        });

        const breakdown = Array.from(categoryMap.values()).map(cat => ({
          ...cat,
          variance_percentage: cat.boq_cost > 0 ? ((cat.actual_cost - cat.boq_cost) / cat.boq_cost) * 100 : 0,
        }));
        setCategoryBreakdown(breakdown);
      }
    } catch (error) {
      console.error("Error loading cost analysis:", error);
    } finally {
      setLoading(false);
    }
  }

  const overBudgetItems = itemComparisons.filter(item => item.budget_status === 'over_budget');
  const underBudgetItems = itemComparisons.filter(item => item.budget_status === 'under_budget');
  const significantVariances = itemComparisons.filter(item => Math.abs(item.cost_variance_percentage) > 10);

  return (
    <CRMLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Cost Analysis & Comparison</h1>
            <p className="text-muted-foreground mt-1">
              BOQ Proposed vs Actual Material Costs
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.print()}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Project Selector */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4 items-center">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Select Project</label>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name} - {project.client}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        {selectedProject && projectSummary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-blue-500" />
                  Proposed BOQ Cost
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatPeso(projectSummary.total_boq_cost)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Based on {projectSummary.total_items} items
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Package className="h-4 w-4 text-green-500" />
                  Actual Material Cost
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatPeso(projectSummary.total_actual_cost)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  From progress reports
                </p>
              </CardContent>
            </Card>

            <Card className={projectSummary.cost_variance > 0 ? "border-red-500" : "border-green-500"}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  {projectSummary.cost_variance > 0 ? (
                    <TrendingUp className="h-4 w-4 text-red-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-green-500" />
                  )}
                  Cost Variance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${projectSummary.cost_variance > 0 ? 'text-red-500' : 'text-green-500'}`}>
                  {projectSummary.cost_variance > 0 ? '+' : ''}{formatPeso(projectSummary.cost_variance)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {projectSummary.cost_variance_percentage > 0 ? '+' : ''}
                  {projectSummary.cost_variance_percentage.toFixed(2)}% variance
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Budget Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-red-500">Over Budget:</span>
                    <span className="font-bold">{projectSummary.over_budget_items}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-green-500">Under Budget:</span>
                    <span className="font-bold">{projectSummary.under_budget_items}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">On Budget:</span>
                    <span className="font-bold">{projectSummary.on_budget_items}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Alerts */}
        {selectedProject && significantVariances.length > 0 && (
          <Alert className="border-amber-500">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>{significantVariances.length} items</strong> have significant cost variances ({">"}10%).
              Review these items for budget impact.
            </AlertDescription>
          </Alert>
        )}

        {/* Tabs */}
        {selectedProject && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="items">Item Details</TabsTrigger>
              <TabsTrigger value="categories">By Category</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Quick Insights</CardTitle>
                  <CardDescription>Key findings from cost analysis</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {projectSummary && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Budget Performance */}
                        <div className="p-4 border rounded-lg">
                          <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <PieChart className="h-4 w-4" />
                            Budget Performance
                          </h3>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm">Total Items Tracked:</span>
                              <Badge variant="outline">{projectSummary.total_items}</Badge>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div
                                className="bg-red-500 h-2 rounded-full"
                                style={{
                                  width: `${(projectSummary.over_budget_items / projectSummary.total_items) * 100}%`,
                                }}
                              />
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>{((projectSummary.over_budget_items / projectSummary.total_items) * 100).toFixed(1)}% Over Budget</span>
                              <span>{((projectSummary.under_budget_items / projectSummary.total_items) * 100).toFixed(1)}% Under Budget</span>
                            </div>
                          </div>
                        </div>

                        {/* Top Variances */}
                        <div className="p-4 border rounded-lg">
                          <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            Top Cost Overruns
                          </h3>
                          <div className="space-y-2">
                            {overBudgetItems.slice(0, 3).map((item, idx) => (
                              <div key={idx} className="flex items-center justify-between text-sm">
                                <span className="truncate flex-1">{item.description}</span>
                                <Badge variant="destructive" className="ml-2">
                                  +{item.cost_variance_percentage.toFixed(1)}%
                                </Badge>
                              </div>
                            ))}
                            {overBudgetItems.length === 0 && (
                              <p className="text-sm text-muted-foreground">No items over budget</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action Items */}
                      <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                        <h3 className="font-semibold mb-2 flex items-center gap-2">
                          <CheckCircle className="h-4 w-4" />
                          Recommended Actions
                        </h3>
                        <ul className="space-y-1 text-sm">
                          {projectSummary.cost_variance > 0 && (
                            <li className="flex items-start gap-2">
                              <ArrowRight className="h-4 w-4 mt-0.5 shrink-0" />
                              <span>Review items with high variance and verify actual quantities/prices</span>
                            </li>
                          )}
                          {overBudgetItems.length > 5 && (
                            <li className="flex items-start gap-2">
                              <ArrowRight className="h-4 w-4 mt-0.5 shrink-0" />
                              <span>Consider value engineering for {overBudgetItems.length} over-budget items</span>
                            </li>
                          )}
                          <li className="flex items-start gap-2">
                            <ArrowRight className="h-4 w-4 mt-0.5 shrink-0" />
                            <span>Update BOQ estimates using actual costs for future projects</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <ArrowRight className="h-4 w-4 mt-0.5 shrink-0" />
                            <span>Sync market prices to get latest material rates</span>
                          </li>
                        </ul>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="items" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Item-by-Item Comparison</CardTitle>
                  <CardDescription>
                    Detailed variance analysis for all BOQ items
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b">
                        <tr className="text-left text-sm text-muted-foreground">
                          <th className="pb-3 font-medium">Item No</th>
                          <th className="pb-3 font-medium">Description</th>
                          <th className="pb-3 font-medium">Category</th>
                          <th className="pb-3 font-medium text-right">BOQ Qty</th>
                          <th className="pb-3 font-medium text-right">Actual Qty</th>
                          <th className="pb-3 font-medium text-right">BOQ Cost</th>
                          <th className="pb-3 font-medium text-right">Actual Cost</th>
                          <th className="pb-3 font-medium text-right">Variance</th>
                          <th className="pb-3 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {itemComparisons.map((item) => (
                          <tr key={item.boq_item_id} className="border-b hover:bg-accent/50">
                            <td className="py-3 font-medium">{item.item_no}</td>
                            <td className="py-3 max-w-xs truncate">{item.description}</td>
                            <td className="py-3">
                              <Badge variant="outline" className="text-xs">
                                {item.category}
                              </Badge>
                            </td>
                            <td className="py-3 text-right">{item.boq_quantity}</td>
                            <td className="py-3 text-right">{item.actual_quantity}</td>
                            <td className="py-3 text-right">{formatPeso(item.boq_material_cost)}</td>
                            <td className="py-3 text-right font-medium">
                              {formatPeso(item.actual_material_cost)}
                            </td>
                            <td className={`py-3 text-right font-bold ${item.cost_variance > 0 ? 'text-red-500' : 'text-green-500'}`}>
                              {item.cost_variance > 0 ? '+' : ''}{formatPeso(item.cost_variance)}
                            </td>
                            <td className="py-3">
                              <Badge
                                variant={
                                  item.budget_status === 'over_budget' ? 'destructive' :
                                  item.budget_status === 'under_budget' ? 'default' : 'secondary'
                                }
                              >
                                {item.cost_variance_percentage > 0 ? '+' : ''}
                                {item.cost_variance_percentage.toFixed(1)}%
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="categories" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Category Breakdown</CardTitle>
                  <CardDescription>
                    Cost variance analysis by work category
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {categoryBreakdown.map((cat) => (
                      <div key={cat.category} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold">{cat.category}</h3>
                          <Badge
                            variant={cat.variance > 0 ? 'destructive' : 'default'}
                            className="text-sm"
                          >
                            {cat.variance > 0 ? '+' : ''}{cat.variance_percentage.toFixed(1)}%
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">BOQ Estimate</p>
                            <p className="font-bold text-lg">{formatPeso(cat.boq_cost)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Actual Cost</p>
                            <p className="font-bold text-lg">{formatPeso(cat.actual_cost)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Variance</p>
                            <p className={`font-bold text-lg ${cat.variance > 0 ? 'text-red-500' : 'text-green-500'}`}>
                              {cat.variance > 0 ? '+' : ''}{formatPeso(cat.variance)}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3">
                          <div className="w-full bg-muted rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${cat.variance > 0 ? 'bg-red-500' : 'bg-green-500'}`}
                              style={{
                                width: `${Math.min(Math.abs(cat.variance_percentage), 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {/* Quick Links */}
        {selectedProject && (
          <Card>
            <CardHeader>
              <CardTitle>Related Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Link href="/crm/boq">
                  <Button variant="outline" className="w-full justify-start">
                    <DollarSign className="h-4 w-4 mr-2" />
                    View BOQ
                  </Button>
                </Link>
                <Link href="/crm/reports">
                  <Button variant="outline" className="w-full justify-start">
                    <Package className="h-4 w-4 mr-2" />
                    Progress Reports
                  </Button>
                </Link>
                <Link href="/crm/admin/market-prices">
                  <Button variant="outline" className="w-full justify-start">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Market Prices
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </CRMLayout>
  );
}