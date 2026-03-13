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
import { Plus, Edit2, Trash2, Calendar, TrendingUp, Sparkles, Loader2, RefreshCw, Download, FileText, FileSpreadsheet } from "lucide-react";
import { GanttChart as GanttIcon } from "lucide-react";
import { GanttChart } from "@/components/planning/GanttChart";
import type { Project, PlanningPhase, Role, PlanningPhaseStatus } from "@/types";

export default function PlanningPage() {
  const { toast } = useToast();
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [phases, setPhases] = useState<PlanningPhase[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPhase, setEditingPhase] = useState<PlanningPhase | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "gantt">("list");
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
    if (selectedProject) {
      loadPhases();
    }
  }, [selectedProject]);

  async function loadProjects() {
    try {
      const data = await getProjects();
      setProjects(data);
      if (data.length > 0) {
        setSelectedProject(data[0].id);
      }
    } catch (error) {
      console.error("Error loading projects:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadPhases() {
    try {
      const data = await getPlanningPhases(selectedProject);
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
        projectId: selectedProject,
        name: formData.name,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
        status: (formData.status || "not-started") as PlanningPhaseStatus,
        progress: formData.progress || 0,
        dependencies: formData.dependencies ? formData.dependencies.split(",").map(d => d.trim()).filter(Boolean) : [],
        assignedRole: formData.assignedRole as any,
      };

      if (editingPhase) {
        await updatePlanningPhase(editingPhase.id, phaseData as Partial<PlanningPhase>);
      } else {
        await createPlanningPhase({
          ...phaseData,
          projectId: selectedProject,
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

  const handlePhaseDateChange = async (phaseId: string, newStartDate: Date, newEndDate: Date) => {
    try {
      await updatePlanningPhase(phaseId, {
        startDate: newStartDate.toISOString(),
        endDate: newEndDate.toISOString(),
      });
      await loadPhases();
      toast({
        title: "Phase updated",
        description: "Phase dates have been updated successfully.",
      });
    } catch (error) {
      console.error("Error updating phase:", error);
      toast({
        title: "Error",
        description: "Failed to update phase dates",
        variant: "destructive",
      });
    }
  };

  const exportToPDF = async () => {
    const { jsPDF } = await import("jspdf");
    await import("jspdf-autotable");
    
    const doc = new jsPDF() as any;
    
    // Title
    doc.setFontSize(18);
    doc.text("Project Schedule", 14, 20);
    
    // Project info
    const project = projects.find(p => p.id === selectedProject);
    if (project) {
      doc.setFontSize(12);
      doc.text(`Project: ${project.name}`, 14, 30);
      doc.text(`Client: ${project.client}`, 14, 37);
    }
    
    // Table
    const tableData = phases.map(phase => [
      phase.name,
      phase.status.replace("_", " "),
      new Date(phase.startDate).toLocaleDateString(),
      new Date(phase.endDate).toLocaleDateString(),
      `${phase.progress}%`,
      phase.assignedRole || "-",
      phase.isMilestone ? "Yes" : "No",
    ]);
    
    doc.autoTable({
      startY: 45,
      head: [["Phase", "Status", "Start Date", "End Date", "Progress", "Role", "Milestone"]],
      body: tableData,
      theme: "grid",
      headStyles: { fillColor: [31, 41, 55] },
    });
    
    doc.save(`project-schedule-${Date.now()}.pdf`);
    
    toast({
      title: "Exported to PDF",
      description: "Project schedule has been exported successfully.",
    });
  };

  const exportToExcel = async () => {
    const XLSX = await import("xlsx");
    
    const project = projects.find(p => p.id === selectedProject);
    
    const worksheetData = [
      ["Project Schedule"],
      [`Project: ${project?.name || "N/A"}`],
      [`Client: ${project?.client || "N/A"}`],
      [],
      ["Phase Name", "Status", "Start Date", "End Date", "Progress", "Assigned Role", "Milestone", "Billing Trigger"],
      ...phases.map(phase => [
        phase.name,
        phase.status.replace("_", " "),
        new Date(phase.startDate).toLocaleDateString(),
        new Date(phase.endDate).toLocaleDateString(),
        `${phase.progress}%`,
        phase.assignedRole || "-",
        phase.isMilestone ? "Yes" : "No",
        phase.isBillingTrigger ? "Yes" : "No",
      ]),
    ];
    
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Schedule");
    
    XLSX.writeFile(workbook, `project-schedule-${Date.now()}.xlsx`);
    
    toast({
      title: "Exported to Excel",
      description: "Project schedule has been exported successfully.",
    });
  };

  const handleGenerateSchedule = async () => {
    if (!selectedProject) {
      toast({
        title: "Error",
        description: "Please select a project first",
        variant: "destructive",
      });
      return;
    }

    setGeneratingSchedule(true);
    try {
      // Get BOQ items for the project
      const boqItems = await getBOQItems(selectedProject);
      
      if (boqItems.length === 0) {
        toast({
          title: "No BOQ Items",
          description: "Please create BOQ items first before generating schedule",
          variant: "destructive",
        });
        setGeneratingSchedule(false);
        return;
      }

      // Group BOQ items by category
      const categoryGroups = boqItems.reduce((acc, item) => {
        const category = item.category;
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(item);
        return acc;
      }, {} as Record<string, typeof boqItems>);

      // Define phase duration mapping (in days per item)
      const durationMapping: Record<string, number> = {
        mobilization_demobilization: 7,
        earthworks: 2,
        substructure_foundation: 3,
        concrete_works: 4,
        reinforcing_steel: 4,
        structural_steel: 4,
        masonry: 2.5,
        carpentry_joinery: 2,
        roofing_waterproofing: 3,
        doors_windows: 2,
        floor_finishes: 2,
        wall_finishes: 2,
        ceiling_works: 2,
        painting: 2,
        plumbing_sanitary: 3,
        electrical_works: 3,
        mechanical_hvac: 3,
        fire_protection: 2,
        site_development: 3,
        miscellaneous: 1,
      };

      // Define role assignment per category
      const roleMapping: Record<string, string> = {
        mobilization_demobilization: "project_coordinator",
        earthworks: "project_engineer",
        substructure_foundation: "project_engineer",
        concrete_works: "project_engineer",
        reinforcing_steel: "project_engineer",
        structural_steel: "project_engineer",
        masonry: "project_engineer",
        carpentry_joinery: "project_engineer",
        roofing_waterproofing: "project_engineer",
        doors_windows: "project_coordinator",
        floor_finishes: "project_coordinator",
        wall_finishes: "project_coordinator",
        ceiling_works: "project_coordinator",
        painting: "project_coordinator",
        plumbing_sanitary: "project_engineer",
        electrical_works: "project_engineer",
        mechanical_hvac: "project_engineer",
        fire_protection: "project_engineer",
        site_development: "project_engineer",
        miscellaneous: "project_coordinator",
      };

      // Define category display names
      const categoryNames: Record<string, string> = {
        mobilization_demobilization: "Mobilization & Demobilization",
        earthworks: "Earthworks",
        substructure_foundation: "Substructure & Foundation",
        concrete_works: "Concrete Works",
        reinforcing_steel: "Reinforcing Steel",
        structural_steel: "Structural Steel",
        masonry: "Masonry Works",
        carpentry_joinery: "Carpentry & Joinery",
        roofing_waterproofing: "Roofing & Waterproofing",
        doors_windows: "Doors & Windows",
        floor_finishes: "Floor Finishes",
        wall_finishes: "Wall Finishes",
        ceiling_works: "Ceiling Works",
        painting: "Painting Works",
        plumbing_sanitary: "Plumbing & Sanitary",
        electrical_works: "Electrical Works",
        mechanical_hvac: "Mechanical & HVAC",
        fire_protection: "Fire Protection",
        site_development: "Site Development",
        miscellaneous: "Miscellaneous Works",
      };

      // Generate phases from BOQ categories
      const generatedPhases = [];
      let currentStartDate = new Date();
      let previousPhase: string | null = null;

      for (const [category, items] of Object.entries(categoryGroups)) {
        const itemCount = items.length;
        const baseDuration = durationMapping[category] || 3;
        const duration = category === "mobilization_demobilization" 
          ? baseDuration 
          : Math.ceil(itemCount * baseDuration);

        const endDate = new Date(currentStartDate);
        endDate.setDate(endDate.getDate() + duration);

        const phaseName = categoryNames[category] || category.replace(/_/g, " ");
        const assignedRole = roleMapping[category] || "project_engineer";

        // Determine if this is a milestone
        const isMilestone = [
          "mobilization_demobilization",
          "substructure_foundation",
          "concrete_works",
          "roofing_waterproofing",
        ].includes(category);

        const phaseData = {
          projectId: selectedProject,
          name: phaseName,
          startDate: currentStartDate.toISOString(),
          endDate: endDate.toISOString(),
          status: "not-started" as PlanningPhaseStatus,
          progress: 0,
          assignedRole: assignedRole as Role,
          dependencies: previousPhase ? [previousPhase] : [],
          isMilestone,
          isBillingTrigger: isMilestone,
        };

        const createdPhase = await createPlanningPhase(phaseData);
        generatedPhases.push(createdPhase);

        // Set next phase start date (1 day after current phase ends)
        currentStartDate = new Date(endDate);
        currentStartDate.setDate(currentStartDate.getDate() + 1);

        // Track previous phase for dependencies
        previousPhase = createdPhase.id;
      }

      toast({
        title: "Success",
        description: `Generated ${generatedPhases.length} project phases from BOQ`,
      });

      // Reload phases
      loadPhases();
    } catch (error) {
      console.error("Error generating schedule:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate schedule",
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
            <Button
              variant="outline"
              onClick={exportToPDF}
              disabled={!selectedProject || phases.length === 0}
            >
              <FileText className="h-4 w-4 mr-2" />
              Export PDF
            </Button>

            <Button
              variant="outline"
              onClick={exportToExcel}
              disabled={!selectedProject || phases.length === 0}
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export Excel
            </Button>

            <Button
              variant="outline"
              onClick={() => setViewMode(viewMode === "list" ? "gantt" : "list")}
              disabled={!selectedProject}
            >
              {viewMode === "list" ? <GanttIcon className="h-4 w-4 mr-2" /> : <Calendar className="h-4 w-4 mr-2" />}
              {viewMode === "list" ? "Gantt View" : "List View"}
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Label htmlFor="projectSelect">Select Project</Label>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
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
            disabled={!selectedProject || generating || refreshing}
            className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Schedule from BOQ
              </>
            )}
          </Button>
        </div>

        {/* Phases Display */}
        {loading ? (
          <div>Loading phases...</div>
        ) : phases.length === 0 ? (
          <div>No phases found...</div>
        ) : viewMode === "gantt" ? (
          <GanttChart 
            phases={phases}
            onPhaseClick={(phase) => setEditingPhase(phase)}
            onPhaseDateChange={handlePhaseDateChange}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
        )}
      </div>
    </CRMLayout>
  );
}