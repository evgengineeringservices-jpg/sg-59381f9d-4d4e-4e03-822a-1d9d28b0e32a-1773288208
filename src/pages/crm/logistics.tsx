import { useState, useEffect } from "react";
import { Truck, Calendar, DollarSign, Package, AlertTriangle, CheckCircle } from "lucide-react";
import { CRMLayout } from "@/components/layout/CRMLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getProjects } from "@/services/crmService";
import { generateWeeklyMaterialsForecast } from "@/lib/projectAutomation";
import type { Project } from "@/types";

interface WeeklyForecast {
  weekNumber: number;
  weekStartDate: string;
  weekEndDate: string;
  scheduledActivities: string[];
  materialsNeeded: Record<string, any>;
  estimatedPettyCash: number;
  suggestedTasks: string[];
  procurementRisks: string[];
  status: string;
}

export default function LogisticsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [forecasts, setForecasts] = useState<WeeklyForecast[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(0);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadWeeklyForecasts();
    }
  }, [selectedProject]);

  const loadProjects = async () => {
    try {
      const data = await getProjects();
      setProjects(data.filter(p => p.status === "active" || p.status === "planning"));
    } catch (error) {
      console.error("Failed to load projects:", error);
    }
  };

  const loadWeeklyForecasts = async () => {
    try {
      setLoading(true);
      
      // Calculate date range: 12 weeks from today
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + (12 * 7)); // 12 weeks ahead
      
      const result = await generateWeeklyMaterialsForecast(selectedProject, startDate, endDate);
      
      if (result && result.length > 0) {
        setForecasts(result);
        // Set current week to the first upcoming week
        const today = new Date();
        const upcomingWeek = result.findIndex(f => new Date(f.weekStartDate) >= today);
        setCurrentWeek(upcomingWeek >= 0 ? upcomingWeek : 0);
      }
    } catch (error) {
      console.error("Failed to load forecasts:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getWeekStatus = (forecast: WeeklyForecast) => {
    const startDate = new Date(forecast.weekStartDate);
    const today = new Date();
    
    if (startDate > today) {
      return { label: "Upcoming", variant: "secondary" as const };
    } else if (startDate <= today && new Date(forecast.weekEndDate) >= today) {
      return { label: "Current Week", variant: "default" as const };
    } else {
      return { label: "Past", variant: "outline" as const };
    }
  };

  if (loading) {
    return (
      <CRMLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Generating weekly forecasts...</p>
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
            <h1 className="text-3xl font-bold tracking-tight">Weekly Logistics Planning</h1>
            <p className="text-muted-foreground">
              Automated materials forecast and petty cash planning
            </p>
          </div>
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!selectedProject ? (
          <Card>
            <CardContent className="flex items-center justify-center h-64">
              <div className="text-center text-muted-foreground">
                <Truck className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Select a project to view weekly logistics forecasts</p>
              </div>
            </CardContent>
          </Card>
        ) : forecasts.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center h-64">
              <div className="text-center text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No forecast data available</p>
                <p className="text-sm mt-2">Make sure the project has BOQ items and timeline phases</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {forecasts.map((forecast, index) => {
                const status = getWeekStatus(forecast);
                return (
                  <Button
                    key={index}
                    variant={currentWeek === index ? "default" : "outline"}
                    onClick={() => setCurrentWeek(index)}
                    className="shrink-0"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Week {forecast.weekNumber}
                    <Badge variant={status.variant} className="ml-2">
                      {status.label}
                    </Badge>
                  </Button>
                );
              })}
            </div>

            {forecasts[currentWeek] && (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Week {forecasts[currentWeek].weekNumber}</CardTitle>
                        <CardDescription>
                          {formatDate(forecasts[currentWeek].weekStartDate)} - {formatDate(forecasts[currentWeek].weekEndDate)}
                        </CardDescription>
                      </div>
                      <Badge variant={getWeekStatus(forecasts[currentWeek]).variant} className="text-lg px-4 py-2">
                        {getWeekStatus(forecasts[currentWeek]).label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Estimated Petty Cash */}
                    <div className="flex items-center gap-4 p-4 bg-accent/50 rounded-lg">
                      <div className="p-3 bg-background rounded-lg">
                        <DollarSign className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Estimated Petty Cash Needed</p>
                        <p className="text-2xl font-bold">{formatCurrency(forecasts[currentWeek].estimatedPettyCash)}</p>
                      </div>
                    </div>

                    {/* Procurement Risks */}
                    {forecasts[currentWeek].procurementRisks && forecasts[currentWeek].procurementRisks.length > 0 && (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <p className="font-semibold mb-2">Procurement Risks:</p>
                          <ul className="list-disc list-inside space-y-1">
                            {forecasts[currentWeek].procurementRisks.map((risk, idx) => (
                              <li key={idx}>{risk}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}

                    <Tabs defaultValue="activities" className="space-y-4">
                      <TabsList>
                        <TabsTrigger value="activities">Scheduled Activities</TabsTrigger>
                        <TabsTrigger value="materials">Materials Needed</TabsTrigger>
                        <TabsTrigger value="tasks">Suggested Tasks</TabsTrigger>
                      </TabsList>

                      <TabsContent value="activities" className="space-y-2">
                        {forecasts[currentWeek].scheduledActivities && forecasts[currentWeek].scheduledActivities.length > 0 ? (
                          forecasts[currentWeek].scheduledActivities.map((activity, idx) => (
                            <div key={idx} className="flex items-start gap-3 p-3 border rounded-lg">
                              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                              <div>
                                <p className="font-medium">{activity}</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-muted-foreground text-center py-8">No scheduled activities</p>
                        )}
                      </TabsContent>

                      <TabsContent value="materials" className="space-y-2">
                        {forecasts[currentWeek].materialsNeeded && Object.keys(forecasts[currentWeek].materialsNeeded).length > 0 ? (
                          Object.entries(forecasts[currentWeek].materialsNeeded).map(([material, details]: [string, any], idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex items-center gap-3">
                                <Package className="w-5 h-5 text-primary" />
                                <div>
                                  <p className="font-medium">{material}</p>
                                  {details.category && (
                                    <p className="text-sm text-muted-foreground">{details.category}</p>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold">
                                  {details.quantity} {details.unit}
                                </p>
                                {details.estimatedCost && (
                                  <p className="text-sm text-muted-foreground">
                                    {formatCurrency(details.estimatedCost)}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-muted-foreground text-center py-8">No materials forecast</p>
                        )}
                      </TabsContent>

                      <TabsContent value="tasks" className="space-y-2">
                        {forecasts[currentWeek].suggestedTasks && forecasts[currentWeek].suggestedTasks.length > 0 ? (
                          forecasts[currentWeek].suggestedTasks.map((task, idx) => (
                            <div key={idx} className="flex items-start gap-3 p-3 border rounded-lg">
                              <CheckCircle className="w-5 h-5 text-blue-500 mt-0.5" />
                              <p>{task}</p>
                            </div>
                          ))
                        ) : (
                          <p className="text-muted-foreground text-center py-8">No suggested tasks</p>
                        )}
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}
      </div>
    </CRMLayout>
  );
}