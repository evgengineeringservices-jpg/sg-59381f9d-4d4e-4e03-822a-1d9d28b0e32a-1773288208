import { useState, useEffect } from "react";
import { CRMLayout } from "@/components/layout/CRMLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { getProjects, getLeads, getBillingItems } from "@/services/crmService";
import { formatPeso } from "@/constants";
import {
  Building2,
  FolderKanban,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import type { Project, Lead, BillingItem } from "@/types";

export default function DashboardPage() {
  const { profile } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [billingItems, setBillingItems] = useState<BillingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      const [projectsData, leadsData] = await Promise.all([
        getProjects(),
        getLeads(),
      ]);
      
      setProjects(projectsData);
      setLeads(leadsData);
      
      const allBilling: BillingItem[] = [];
      for (const project of projectsData) {
        const items = await getBillingItems(project.id);
        allBilling.push(...items);
      }
      setBillingItems(allBilling);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }

  const activeProjects = projects.filter(p => p.status === "active");
  const totalContractValue = projects.reduce((sum, p) => sum + p.contractAmount, 0);
  const totalBudget = projects.reduce((sum, p) => sum + p.budget, 0);
  const totalSpent = projects.reduce((sum, p) => sum + p.spent, 0);
  const totalBilled = billingItems
    .filter(b => b.status !== "draft")
    .reduce((sum, b) => sum + b.netAmount, 0);
  const totalPaid = billingItems
    .filter(b => b.status === "paid")
    .reduce((sum, b) => sum + b.netAmount, 0);
  const outstandingReceivables = totalBilled - totalPaid;
  const collectionRate = totalBilled > 0 ? (totalPaid / totalBilled) * 100 : 0;

  const kpis = [
    {
      title: "Total Projects",
      value: projects.length.toString(),
      icon: Building2,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Active Projects",
      value: activeProjects.length.toString(),
      icon: FolderKanban,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: "Contract Value",
      value: formatPeso(totalContractValue),
      icon: DollarSign,
      color: "text-chart-1",
      bgColor: "bg-chart-1/10",
    },
    {
      title: "Budget vs Spent",
      value: `${formatPeso(totalSpent)} / ${formatPeso(totalBudget)}`,
      icon: TrendingUp,
      color: "text-chart-3",
      bgColor: "bg-chart-3/10",
    },
    {
      title: "Total Billed",
      value: formatPeso(totalBilled),
      icon: CheckCircle2,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Outstanding",
      value: formatPeso(outstandingReceivables),
      icon: Clock,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      title: "Collection Rate",
      value: `${collectionRate.toFixed(1)}%`,
      icon: TrendingUp,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "New Leads",
      value: leads.filter(l => l.status === "new").length.toString(),
      icon: AlertCircle,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
  ];

  if (loading) {
    return (
      <CRMLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-muted-foreground">Loading dashboard...</div>
        </div>
      </CRMLayout>
    );
  }

  return (
    <CRMLayout>
      <div className="space-y-8">
        <div>
          <h1 className="font-heading text-3xl md:text-4xl mb-2 tracking-wide">DASHBOARD</h1>
          <p className="text-muted-foreground">
            Welcome back, {profile?.displayName || profile?.email}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <Card key={kpi.title} className="shadow-card">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl ${kpi.bgColor} flex items-center justify-center`}>
                      <Icon className={`w-6 h-6 ${kpi.color}`} />
                    </div>
                  </div>
                  <div className="text-2xl font-bold mb-1">{kpi.value}</div>
                  <div className="text-sm text-muted-foreground">{kpi.title}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Active Projects</CardTitle>
            </CardHeader>
            <CardContent>
              {activeProjects.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No active projects
                </div>
              ) : (
                <div className="space-y-4">
                  {activeProjects.slice(0, 5).map((project) => (
                    <div key={project.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-semibold mb-1">{project.name}</div>
                        <div className="text-sm text-muted-foreground">{project.client}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{project.progress}%</div>
                        <div className="text-xs text-muted-foreground">
                          {formatPeso(project.spent)} / {formatPeso(project.budget)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Recent Leads</CardTitle>
            </CardHeader>
            <CardContent>
              {leads.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No leads yet
                </div>
              ) : (
                <div className="space-y-4">
                  {leads.slice(0, 5).map((lead) => (
                    <div key={lead.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-semibold mb-1">{lead.name}</div>
                        <div className="text-sm text-muted-foreground">{lead.company || lead.email}</div>
                      </div>
                      <div className="text-right">
                        <div className={`text-xs font-medium px-2 py-1 rounded-full ${
                          lead.status === "new" ? "bg-blue-100 text-blue-700" :
                          lead.status === "contacted" ? "bg-yellow-100 text-yellow-700" :
                          lead.status === "qualified" ? "bg-purple-100 text-purple-700" :
                          lead.status === "won" ? "bg-green-100 text-green-700" :
                          "bg-gray-100 text-gray-700"
                        }`}>
                          {lead.status.replace("_", " ")}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </CRMLayout>
  );
}