import { useState, useEffect } from "react";
import { CRMLayout } from "@/components/layout/CRMLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Truck, Calendar, AlertTriangle, CheckCircle2, DollarSign } from "lucide-react";
import { getProjects, getPlanningPhases, getBOQItems } from "@/services/crmService";
import { formatPeso } from "@/constants";
import type { Project, PlanningPhase, BOQItem } from "@/types";
import { format, addDays, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";

export default function LogisticsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [phases, setPhases] = useState<PlanningPhase[]>([]);
  const [boqItems, setBOQItems] = useState<BOQItem[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [selectedWeek, setSelectedWeek] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [selectedProject]);

  async function loadData() {
    setLoading(true);
    try {
      const [projectsData, phasesData, boqData] = await Promise.all([
        getProjects(),
        getPlanningPhases(selectedProject === "all" ? undefined : selectedProject),
        getBOQItems(selectedProject === "all" ? undefined : selectedProject),
      ]);
      setProjects(projectsData);
      setPhases(phasesData);
      setBOQItems(boqData);
    } catch (error) {
      console.error("Error loading logistics data:", error);
    } finally {
      setLoading(false);
    }
  }

  const weekStart = startOfWeek(selectedWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedWeek, { weekStartsOn: 1 });

  const phasesThisWeek = phases.filter((phase) => {
    const phaseStart = new Date(phase.startDate);
    const phaseEnd = new Date(phase.endDate);
    return (
      isWithinInterval(phaseStart, { start: weekStart, end: weekEnd }) ||
      isWithinInterval(phaseEnd, { start: weekStart, end: weekEnd }) ||
      (phaseStart <= weekStart && phaseEnd >= weekEnd)
    );
  });

  const materialsNeeded = phasesThisWeek.flatMap((phase) => {
    const relatedBOQ = boqItems.filter((item) => item.projectId === phase.projectId);
    return relatedBOQ.slice(0, 3).map((item) => ({
      phase: phase.name,
      projectId: phase.projectId,
      item: item.description,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
      estimatedCost: (item.unitCost || 0) * (item.quantity || 0),
    }));
  });

  const totalMaterialCost = materialsNeeded.reduce((sum, m) => sum + m.estimatedCost, 0);
  const estimatedPettyCash = totalMaterialCost * 0.15;

  return (
    <CRMLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-charcoal">Weekly Logistics</h1>
            <p className="text-muted-foreground mt-1">Automated procurement and petty cash forecasting</p>
          </div>
          <div className="flex items-center gap-4">
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
        </div>

        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => setSelectedWeek(addDays(selectedWeek, -7))}
          >
            Previous Week
          </Button>
          <div className="flex items-center gap-2 text-lg font-medium">
            <Calendar className="h-5 w-5" />
            <span>
              {format(weekStart, "MMM dd")} - {format(weekEnd, "MMM dd, yyyy")}
            </span>
          </div>
          <Button
            variant="outline"
            onClick={() => setSelectedWeek(addDays(selectedWeek, 7))}
          >
            Next Week
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Materials Forecast
              </CardDescription>
              <CardTitle className="text-2xl text-gold">{materialsNeeded.length} items</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Estimated Material Cost
              </CardDescription>
              <CardTitle className="text-2xl">{formatPeso(totalMaterialCost)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Estimated Petty Cash
              </CardDescription>
              <CardTitle className="text-2xl text-green-600">{formatPeso(estimatedPettyCash)}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading logistics data...</div>
        ) : phasesThisWeek.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CheckCircle2 className="h-12 w-12 text-green-600 mb-4" />
              <p className="text-muted-foreground">No scheduled activities for this week</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Scheduled Activities</CardTitle>
                <CardDescription>Project phases happening this week</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {phasesThisWeek.map((phase) => {
                    const project = projects.find((p) => p.id === phase.projectId);
                    return (
                      <div
                        key={phase.id}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="font-medium">{phase.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {project?.name} • {format(new Date(phase.startDate), "MMM dd")} - {format(new Date(phase.endDate), "MMM dd")}
                          </div>
                        </div>
                        <Badge
                          className={
                            phase.status === "completed"
                              ? "bg-green-500"
                              : phase.status === "in_progress"
                              ? "bg-blue-500"
                              : phase.status === "delayed"
                              ? "bg-red-500"
                              : "bg-gray-500"
                          }
                        >
                          {phase.status}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Materials & Procurement Forecast
                </CardTitle>
                <CardDescription>AI-suggested materials needed based on scheduled phases</CardDescription>
              </CardHeader>
              <CardContent>
                {materialsNeeded.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No materials forecast for this week</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Phase</TableHead>
                          <TableHead>Item</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead>Unit</TableHead>
                          <TableHead className="text-right">Est. Cost</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {materialsNeeded.map((material, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{material.phase}</TableCell>
                            <TableCell className="max-w-xs truncate">{material.item}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{material.category}</Badge>
                            </TableCell>
                            <TableCell className="text-right">{material.quantity?.toFixed(2) || 0}</TableCell>
                            <TableCell>{material.unit}</TableCell>
                            <TableCell className="text-right font-medium">{formatPeso(material.estimatedCost)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
                  <AlertTriangle className="h-5 w-5" />
                  Procurement Alerts
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-amber-800 dark:text-amber-300">
                <ul className="space-y-2">
                  <li>• Ensure materials are ordered 3-5 days in advance for timely delivery</li>
                  <li>• Verify current market prices before large procurements</li>
                  <li>• Coordinate with Office Admin for petty cash preparation</li>
                  <li>• Check supplier lead times for specialized materials</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </CRMLayout>
  );
}