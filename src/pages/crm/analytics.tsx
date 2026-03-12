import { useState, useEffect } from "react";
import { BarChart3, TrendingUp, DollarSign, Calendar, PieChart } from "lucide-react";
import { CRMLayout } from "@/components/layout/CRMLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart as RePieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { getProjects, getBOQItems, getBillingItems } from "@/services/crmService";
import type { Project, BOQItem, BillingItem } from "@/types";

const COLORS = ["#0F172A", "#F59E0B", "#3B82F6", "#10B981", "#6366F1", "#F97316", "#8B5CF6", "#EC4899"];

export default function AnalyticsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  // Analytics data states
  const [budgetVsActual, setBudgetVsActual] = useState<any[]>([]);
  const [projectTypeDistribution, setProjectTypeDistribution] = useState<any[]>([]);
  const [cashFlowData, setCashFlowData] = useState<any[]>([]);
  const [boqCostBreakdown, setBoqCostBreakdown] = useState<any[]>([]);
  const [permitStatusData, setPermitStatusData] = useState<any[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, [selectedProject, timeRange]);

  const loadData = async () => {
    try {
      setLoading(true);
      const projectsData = await getProjects();
      setProjects(projectsData);

      // Filter projects based on selection
      const filteredProjects = selectedProject === "all" 
        ? projectsData 
        : projectsData.filter(p => p.id === selectedProject);

      // Budget vs Actual
      const budgetData = filteredProjects.map(p => ({
        name: p.name.length > 20 ? p.name.substring(0, 20) + "..." : p.name,
        budget: p.budget,
        spent: p.spent,
        variance: p.budget - p.spent,
      }));
      setBudgetVsActual(budgetData);

      // Project Type Distribution
      const typeCount: Record<string, number> = {};
      filteredProjects.forEach(p => {
        typeCount[p.projectType] = (typeCount[p.projectType] || 0) + 1;
      });
      const typeData = Object.entries(typeCount).map(([type, count]) => ({
        name: type.replace(/_/g, " "),
        value: count,
      }));
      setProjectTypeDistribution(typeData);

      // Permit Status Distribution
      const permitCount: Record<string, number> = {};
      filteredProjects.forEach(p => {
        permitCount[p.permitStatus] = (permitCount[p.permitStatus] || 0) + 1;
      });
      const permitData = Object.entries(permitCount).map(([status, count]) => ({
        name: status.replace(/_/g, " "),
        value: count,
      }));
      setPermitStatusData(permitData);

      // BOQ Cost Breakdown (if specific project selected)
      if (selectedProject !== "all") {
        const boqItems = await getBOQItems(selectedProject);
        const categoryTotals: Record<string, { material: number; labor: number }> = {};
        
        boqItems.forEach(item => {
          if (!categoryTotals[item.category]) {
            categoryTotals[item.category] = { material: 0, labor: 0 };
          }
          categoryTotals[item.category].material += item.materialCost;
          categoryTotals[item.category].labor += item.laborCost;
        });

        const boqData = Object.entries(categoryTotals).map(([category, costs]) => ({
          category: category.replace(/_/g, " "),
          material: costs.material,
          labor: costs.labor,
          total: costs.material + costs.labor,
        }));
        setBoqCostBreakdown(boqData);
      }

      // Monthly Trends (last 12 months)
      const monthlyData = generateMonthlyTrends(filteredProjects);
      setMonthlyTrends(monthlyData);

      // Cash Flow Data
      const cashFlow = await generateCashFlowData(filteredProjects);
      setCashFlowData(cashFlow);

    } catch (error) {
      console.error("Failed to load analytics data:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateMonthlyTrends = (projects: Project[]) => {
    const months = [];
    const now = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString("en-PH", { month: "short", year: "numeric" });
      
      const monthProjects = projects.filter(p => {
        const startDate = new Date(p.startDate);
        return startDate.getMonth() === date.getMonth() && 
               startDate.getFullYear() === date.getFullYear();
      });

      months.push({
        month: monthName,
        projects: monthProjects.length,
        budget: monthProjects.reduce((sum, p) => sum + p.budget, 0),
        spent: monthProjects.reduce((sum, p) => sum + p.spent, 0),
      });
    }
    
    return months;
  };

  const generateCashFlowData = async (projects: Project[]) => {
    const cashFlowByMonth: Record<string, { billed: number; paid: number }> = {};
    
    for (const project of projects) {
      try {
        const billingItems = await getBillingItems(project.id);
        
        billingItems.forEach(item => {
          const date = new Date(item.date);
          const monthKey = date.toLocaleDateString("en-PH", { month: "short", year: "numeric" });
          
          if (!cashFlowByMonth[monthKey]) {
            cashFlowByMonth[monthKey] = { billed: 0, paid: 0 };
          }
          
          cashFlowByMonth[monthKey].billed += item.netAmount;
          if (item.status === "paid") {
            cashFlowByMonth[monthKey].paid += item.netAmount;
          }
        });
      } catch (error) {
        console.error(`Failed to load billing for project ${project.id}:`, error);
      }
    }

    return Object.entries(cashFlowByMonth).map(([month, data]) => ({
      month,
      billed: data.billed,
      paid: data.paid,
      outstanding: data.billed - data.paid,
    }));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {typeof entry.value === "number" ? formatCurrency(entry.value) : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <CRMLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading analytics...</p>
          </div>
        </div>
      </CRMLayout>
    );
  }

  return (
    <CRMLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Analytics & Insights</h1>
            <p className="text-muted-foreground">
              Comprehensive project analytics and performance metrics
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="financial" className="space-y-4">
          <TabsList>
            <TabsTrigger value="financial">Financial</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="costs">Cost Analysis</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="financial" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Budget vs Actual Spending</CardTitle>
                  <CardDescription>Compare planned budget with actual expenditure</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={budgetVsActual}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis tickFormatter={(value) => `₱${(value / 1000000).toFixed(1)}M`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar dataKey="budget" fill="#0F172A" name="Budget" />
                      <Bar dataKey="spent" fill="#F59E0B" name="Spent" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Cash Flow Analysis</CardTitle>
                  <CardDescription>Billed vs Paid amounts by month</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={cashFlowData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(value) => `₱${(value / 1000000).toFixed(1)}M`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Area type="monotone" dataKey="billed" stackId="1" stroke="#3B82F6" fill="#3B82F6" name="Billed" />
                      <Area type="monotone" dataKey="paid" stackId="2" stroke="#10B981" fill="#10B981" name="Paid" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="projects" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Project Type Distribution</CardTitle>
                  <CardDescription>Breakdown of projects by type</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RePieChart>
                      <Pie
                        data={projectTypeDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {projectTypeDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RePieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Permit Status Distribution</CardTitle>
                  <CardDescription>Project permit approval status</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RePieChart>
                      <Pie
                        data={permitStatusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {permitStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RePieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="costs" className="space-y-4">
            {selectedProject === "all" ? (
              <Card>
                <CardContent className="flex items-center justify-center h-64">
                  <div className="text-center text-muted-foreground">
                    <PieChart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Select a specific project to view BOQ cost breakdown</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>BOQ Cost Breakdown by Category</CardTitle>
                  <CardDescription>Material and labor costs per category</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={boqCostBreakdown}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" angle={-45} textAnchor="end" height={100} />
                      <YAxis tickFormatter={(value) => `₱${(value / 1000).toFixed(0)}k`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar dataKey="material" stackId="a" fill="#0F172A" name="Material Cost" />
                      <Bar dataKey="labor" stackId="a" fill="#F59E0B" name="Labor Cost" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="trends" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Project Trends</CardTitle>
                <CardDescription>Project starts and budget allocation over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" tickFormatter={(value) => `₱${(value / 1000000).toFixed(1)}M`} />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="budget" stroke="#0F172A" name="Budget" />
                    <Line yAxisId="left" type="monotone" dataKey="spent" stroke="#F59E0B" name="Spent" />
                    <Line yAxisId="right" type="monotone" dataKey="projects" stroke="#3B82F6" name="Projects Started" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </CRMLayout>
  );
}