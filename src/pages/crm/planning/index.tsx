import { useState, useEffect } from "react";
import { CRMLayout } from "@/components/layout/CRMLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  getProjects, 
  getPlanningPhases, 
  createPlanningPhase, 
  updatePlanningPhase, 
  deletePlanningPhase,
  getBOQItems
} from "@/services/crmService";
import { Plus, Edit2, Trash2, Calendar, TrendingUp, GanttChart, Sparkles, Loader2, RefreshCw } from "lucide-react";
import type { Project, PlanningPhase } from "@/types";

export default function PlanningPage() {
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [phases, setPhases] = useState<PlanningPhase[]>([]);
  const [viewMode, setViewMode] = useState<"gantt" | "list">("list");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPhase, setEditingPhase] = useState<PlanningPhase | null>(null);
  const [generatingSchedule, setGeneratingSchedule] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    startDate: "",
    endDate: "",
    status: "not_started" as "not_started" | "in_progress" | "completed" | "delayed",
    progress: 0,
    dependencies: "",
    assignedRole: "",
    isMilestone: false,
    isBillingTrigger: false,
    notes: "",
  });

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      loadPhases();
    }
  }, [selectedProjectId]);

  async function loadProjects() {
    try {
      const data = await getProjects();
      setProjects(data);
      if (data.length > 0) {
        setSelectedProjectId(data[0].id);
      }
    } catch (error) {
      console.error("Error loading projects:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadPhases() {
    try {
      const data = await getPlanningPhases(selectedProjectId);
      setPhases(data);
    } catch (error) {
      console.error("Error loading phases:", error);
    }
  }

  function handleOpenDialog(phase?: PlanningPhase) {
    if (phase) {
      setEditingPhase(phase);
      setFormData({
        name: phase.name,
        startDate: phase.startDate,
        endDate: phase.endDate,
        status: phase.status,
        progress: phase.progress,
        dependencies: phase.dependencies?.join(", ") || "",
        assignedRole: phase.assignedRole || "",
        isMilestone: phase.isMilestone || false,
        isBillingTrigger: phase.isBillingTrigger || false,
        notes: phase.notes || "",
      });
    } else {
      setEditingPhase(null);
      setFormData({
        name: "",
        startDate: "",
        endDate: "",
        status: "not_started",
        progress: 0,
        dependencies: "",
        assignedRole: "",
        isMilestone: false,
        isBillingTrigger: false,
        notes: "",
      });
    }
    setDialogOpen(true);
  }

  async function handleSubmit() {
    try {
      const phaseData = {
        ...formData,
        dependencies: formData.dependencies ? formData.dependencies.split(",").map(d => d.trim()).filter(Boolean) : [],
        assignedRole: formData.assignedRole as any,
      };

      if (editingPhase) {
        await updatePlanningPhase(editingPhase.id, phaseData as Partial<PlanningPhase>);
      } else {
        await createPlanningPhase({
          ...phaseData,
          projectId: selectedProjectId,
          assignedUserId: null,
        } as Omit<PlanningPhase, "id" | "createdAt" | "updatedAt">);
      }
      setDialogOpen(false);
      loadPhases();
    } catch (error) {
      console.error("Error saving phase:", error);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this phase?")) return;
    try {
      await deletePlanningPhase(id);
      loadPhases();
    } catch (error) {
      console.error("Error deleting phase:", error);
    }
  }

  const handleGenerateSchedule = async () => {
    if (!selectedProjectId) return;

    try {
      setGeneratingSchedule(true);
      toast({ title: "Generating project schedule from BOQ..." });

      // Get BOQ items for the project
      const boqItems = await getBOQItems(selectedProjectId);
      
      if (boqItems.length === 0) {
        toast({
          title: "No BOQ items found",
          description: "Please create BOQ items first before generating schedule",
          variant: "destructive",
        });
        return;
      }

      // Get project details for date range
      const projectData = projects.find(p => p.id === selectedProjectId);
      if (!projectData) return;

      const startDate = new Date(projectData.startDate);
      const endDate = new Date(projectData.endDate);

      // Auto-generate phases from BOQ categories
      const categories = [...new Set(boqItems.map(item => item.category))];
      const totalDuration = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const daysPerPhase = Math.floor(totalDuration / categories.length);

      let currentDate = new Date(startDate);
      const generatedPhases = [];

      for (let i = 0; i < categories.length; i++) {
        const category = categories[i];
        const phaseStartDate = new Date(currentDate);
        const phaseEndDate = new Date(currentDate);
        phaseEndDate.setDate(phaseEndDate.getDate() + daysPerPhase);

        // Adjust last phase to match project end date
        if (i === categories.length - 1) {
          phaseEndDate.setTime(endDate.getTime());
        }

        const phaseData = {
          projectId: selectedProjectId,
          phaseName: category,
          startDate: phaseStartDate.toISOString().split('T')[0],
          endDate: phaseEndDate.toISOString().split('T')[0],
          status: 'not_started' as const,
          progress: 0,
          dependencies: i > 0 ? [generatedPhases[i - 1].id] : [],
          assignedRole: getDefaultRoleForCategory(category) as any,
          isMilestone: false,
          isBillingTrigger: false,
        };

        const createdPhase = await createPlanningPhase(phaseData);
        generatedPhases.push(createdPhase);

        currentDate = new Date(phaseEndDate);
        currentDate.setDate(currentDate.getDate() + 1);
      }

      toast({
        title: "Schedule generated successfully!",
        description: `Created ${generatedPhases.length} phases from BOQ categories`,
      });

      await loadPhases();
    } catch (error) {
      console.error("Failed to generate schedule:", error);
      toast({
        title: "Error",
        description: "Failed to generate project schedule",
        variant: "destructive",
      });
    } finally {
      setGeneratingSchedule(false);
    }
  };

  const getDefaultRoleForCategory = (category: string): string => {
    const roleMapping: Record<string, string> = {
      "Mobilization / Demobilization": "project_engineer",
      "Earthworks": "project_engineer",
      "Substructure / Foundation": "project_engineer",
      "Concrete Works": "project_engineer",
      "Reinforcing Steel": "project_engineer",
      "Structural Steel": "project_engineer",
      "Masonry": "project_coordinator",
      "Carpentry & Joinery": "project_coordinator",
      "Roofing & Waterproofing": "project_coordinator",
      "Doors & Windows": "project_coordinator",
      "Floor Finishes": "project_coordinator",
      "Wall Finishes": "project_coordinator",
      "Ceiling Works": "project_coordinator",
      "Painting": "project_coordinator",
      "Plumbing & Sanitary": "project_coordinator",
      "Electrical Works": "project_coordinator",
      "Mechanical / HVAC": "project_coordinator",
      "Fire Protection": "project_coordinator",
      "Site Development": "project_engineer",
      "Miscellaneous": "project_coordinator",
    };

    return roleMapping[category] || "project_coordinator";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "not_started": return "bg-gray-100 text-gray-700";
      case "in_progress": return "bg-blue-100 text-blue-700";
      case "completed": return "bg-green-100 text-green-700";
      case "delayed": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  if (loading) {
    return (
      <CRMLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-muted-foreground">Loading planning...</div>
        </div>
      </CRMLayout>
    );
  }

  return (
    <CRMLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-3xl md:text-4xl mb-2 tracking-wide">PROJECT PLANNING</h1>
            <p className="text-muted-foreground">Timeline and milestone management</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 border rounded-lg p-1">
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
              >
                List
              </Button>
              <Button
                variant={viewMode === "gantt" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("gantt")}
              >
                Gantt
              </Button>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Phase
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingPhase ? "Edit Phase" : "Add Phase"}</DialogTitle>
                  <DialogDescription>
                    {editingPhase ? "Update phase details" : "Add a new project phase"}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Phase Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Mobilization & Site Preparation"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startDate">Start Date *</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endDate">End Date *</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="status">Status *</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value) => setFormData({ ...formData, status: value as any })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="not_started">Not Started</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="delayed">Delayed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="progress">Progress %</Label>
                      <Input
                        id="progress"
                        type="number"
                        min="0"
                        max="100"
                        value={formData.progress}
                        onChange={(e) => setFormData({ ...formData, progress: parseFloat(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dependencies">Dependencies</Label>
                      <Input
                        id="dependencies"
                        value={formData.dependencies}
                        onChange={(e) => setFormData({ ...formData, dependencies: e.target.value })}
                        placeholder="Phase IDs (comma-separated)"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="assignedRole">Assigned Role</Label>
                      <Input
                        id="assignedRole"
                        value={formData.assignedRole}
                        onChange={(e) => setFormData({ ...formData, assignedRole: e.target.value })}
                        placeholder="Project Engineer"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="isMilestone"
                        checked={formData.isMilestone}
                        onChange={(e) => setFormData({ ...formData, isMilestone: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <Label htmlFor="isMilestone">Milestone</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="isBillingTrigger"
                        checked={formData.isBillingTrigger}
                        onChange={(e) => setFormData({ ...formData, isBillingTrigger: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <Label htmlFor="isBillingTrigger">Billing Trigger</Label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Additional phase details..."
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                    {editingPhase ? "Update Phase" : "Add Phase"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Label htmlFor="projectSelect">Select Project</Label>
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger>
                <SelectValue />
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
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={handleGenerateSchedule}
            disabled={!selectedProjectId || generatingSchedule}
            variant="outline"
          >
            {generatingSchedule ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            Generate Schedule from BOQ
          </Button>
        </div>

        {phases.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="text-muted-foreground mb-4">No phases defined</div>
              <Button onClick={() => handleOpenDialog()} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Phase
              </Button>
            </CardContent>
          </Card>
        ) : viewMode === "list" ? (
          <div className="space-y-4">
            {phases.map((phase) => (
              <Card key={phase.id} className="shadow-card hover:shadow-premium transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{phase.name}</h3>
                        {phase.isMilestone && (
                          <Badge variant="outline" className="border-accent text-accent">
                            Milestone
                          </Badge>
                        )}
                        {phase.isBillingTrigger && (
                          <Badge variant="outline" className="border-green-500 text-green-700">
                            Billing
                          </Badge>
                        )}
                      </div>
                      <Badge className={getStatusColor(phase.status)}>
                        {phase.status.replace("_", " ")}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(phase)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(phase.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {new Date(phase.startDate).toLocaleDateString()} - {new Date(phase.endDate).toLocaleDateString()}
                      </span>
                    </div>
                    {phase.assignedRole && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <TrendingUp className="w-4 h-4" />
                        <span>Assigned: {phase.assignedRole}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-semibold">{phase.progress}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent transition-all"
                        style={{ width: `${phase.progress}%` }}
                      />
                    </div>
                  </div>

                  {phase.notes && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm text-muted-foreground">{phase.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Gantt Chart</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                Gantt chart visualization coming soon
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </CRMLayout>
  );
}