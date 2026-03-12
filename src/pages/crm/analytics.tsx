import { useState, useEffect } from "react";
import { CRMLayout } from "@/components/layout/CRMLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { getProjects, getBOQItems, getBillingItems } from "@/services/crmService";
import { formatPeso } from "@/constants";
import type { Project, BOQItem, BillingItem } from "@/types";

const COLORS = ["hsl(42 100% 50%)", "hsl(225 35% 15%)", "hsl(210 40% 45%)", "hsl(30 90% 55%)", "hsl(150 50% 45%)"];

export default function AnalyticsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [boqItems, setBOQItems] = useState<BOQItem[]>([]);
  const [billingItems, setBillingItems] = useState<BillingItem[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [selectedProject]);

  async function loadData() {
    setLoading(true);
    try {
      const [projectsData, boqData, billingData] = await Promise.all([
        getProjects(),
        getBOQItems(selectedProject === "all" ? undefined : selectedProject),
        getBillingItems(selectedProject === "all" ? undefined : selectedProject),
      ]);
      setProjects(projectsData);
      setBOQItems(boqData);
      setBillingItems(billingData);
    } catch (error) {
      console.error("Error loading analytics:", error);
    } finally {
      setLoading(false);
    }
  }

  const budgetVsActual = projects
    .filter((p) => selectedProject === "all" || p.id === selectedProject)
    .map((project) => ({
      name: project.name.slice(0, 20),
      budget: project.budget,
      spent: project.spent,
    }));

  const projectTypeDistribution = projects.reduce((acc, project) => {
    const type = project.projectType || "Other";
    const existing = acc.find((item) => item.name === type);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: type, value: 1 });
    }
    return acc;
  }, [] as { name: string; value: number }[]);

  const boqCostBreakdown = boqItems.reduce((acc, item) => {
    const category = item.category || "Other";
    const existing = acc.find((cat) => cat.name === category);
    const total = (item.unitCost || 0) * (item.quantity || 0);
    if (existing) {
      existing.value += total;
    } else {
      acc.push({ name: category, value: total });
    }
    return acc;
  }, [] as { name: string; value: number }[]);

  const monthlyCashFlow = billingItems.reduce((acc, item) => {
    const month = new Date(item.date).toLocaleDateString("en-US", { month: "short", year: "numeric" });
    const existing = acc.find((m) => m.month === month);
    const netAmount = item.baseAmount * 1.12 - item.baseAmount * 0.02 - item.baseAmount * 0.10;
    if (existing) {
      existing.billed += item.baseAmount;
      if (item.status === "paid") {
        existing.paid += netAmount;
      }
    } else {
      acc.push({
        month,
        billed: item.baseAmount,
        paid: item.status === "paid" ? netAmount : 0,
      });
    }
    return acc;
  }, [] as { month: string; billed: number; paid: number }[]);

  return (
    <CRMLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-charcoal">Analytics</h1>
            <p className="text-muted-foreground mt-1">Project insights and financial analysis</p>
          </div>
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-64">
              <SelectValue />
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

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading analytics...</div>
        ) : (
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Budget vs Actual Spent</CardTitle>
                <CardDescription>Compare planned budget against actual spending</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={budgetVsActual}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number) => formatPeso(value)}
                    />
                    <Legend />
                    <Bar dataKey="budget" fill="hsl(42 100% 50%)" name="Budget" />
                    <Bar dataKey="spent" fill="hsl(225 35% 15%)" name="Spent" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Project Type Distribution</CardTitle>
                  <CardDescription>Breakdown by construction category</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={projectTypeDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={80}
                        fill="hsl(42 100% 50%)"
                        dataKey="value"
                      >
                        {projectTypeDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>BOQ Cost Breakdown</CardTitle>
                  <CardDescription>Total cost by category</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={boqCostBreakdown.slice(0, 5)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name.slice(0, 15)} (${formatPeso(value)})`}
                        outerRadius={80}
                        fill="hsl(42 100% 50%)"
                        dataKey="value"
                      >
                        {boqCostBreakdown.slice(0, 5).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatPeso(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Monthly Cash Flow</CardTitle>
                <CardDescription>Billed vs actual collections</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyCashFlow}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number) => formatPeso(value)}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="billed" stroke="hsl(42 100% 50%)" strokeWidth={2} name="Billed" />
                    <Line type="monotone" dataKey="paid" stroke="hsl(150 50% 45%)" strokeWidth={2} name="Collected" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </CRMLayout>
  );
}