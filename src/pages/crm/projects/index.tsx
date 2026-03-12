import { useState, useEffect } from "react";
import { CRMLayout } from "@/components/layout/CRMLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { getProjects, createProject, updateProject, deleteProject } from "@/services/crmService";
import { formatPeso, PROJECT_TYPES, PCAB_CATEGORIES, PROJECT_STATUS, PERMIT_STATUS } from "@/constants";
import { Plus, Search, Edit2, Trash2, MapPin, Calendar, DollarSign, Edit, FolderKanban, FileSpreadsheet, Printer } from "lucide-react";
import type { Project, ProjectStatus, ProjectType, PCabCategory, PermitStatus } from "@/types";
import { toast } from "@/sonnerie";
import { exportProjectsToExcel, printElement } from "@/lib/exportUtils";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPermit, setFilterPermit] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    client: "",
    status: "planning" as ProjectStatus,
    progress: 0,
    startDate: "",
    endDate: "",
    budget: 0,
    spent: 0,
    projectType: "residential_new" as ProjectType,
    location: "",
    contractAmount: 0,
    pcabCategory: null as PCabCategory | null,
    permitNo: "",
    permitStatus: "not_applied" as PermitStatus,
    description: "",
  });

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    const filtered = projects.filter((project) => {
      const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.location.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === "all" || project.projectType === filterType;
      const matchesStatus = filterStatus === "all" || project.status === filterStatus;
      const matchesPermit = filterPermit === "all" || project.permitStatus === filterPermit;
      return matchesSearch && matchesType && matchesStatus && matchesPermit;
    });
    setFilteredProjects(filtered);
  }, [searchQuery, filterType, filterStatus, filterPermit, projects]);

  async function loadProjects() {
    try {
      const data = await getProjects();
      setProjects(data);
      setFilteredProjects(data);
    } catch (error) {
      console.error("Error loading projects:", error);
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(project: Project) {
    setEditingProject(project);
    setFormData({
      name: project.name,
      client: project.client,
      status: project.status,
      progress: project.progress,
      startDate: project.startDate,
      endDate: project.endDate || "",
      budget: project.budget,
      spent: project.spent,
      projectType: project.projectType,
      location: project.location,
      contractAmount: project.contractAmount,
      pcabCategory: project.pcabCategory,
      permitNo: project.permitNo || "",
      permitStatus: project.permitStatus,
      description: project.description || "",
    });
    setDialogOpen(true);
  }

  function handleOpenDialog(project?: Project) {
    if (project) {
      handleEdit(project);
    } else {
      setEditingProject(null);
      setFormData({
        name: "",
        client: "",
        status: "planning",
        progress: 0,
        startDate: "",
        endDate: "",
        budget: 0,
        spent: 0,
        projectType: "residential_new",
        location: "",
        contractAmount: 0,
        pcabCategory: null,
        permitNo: "",
        permitStatus: "not_applied",
        description: "",
      });
      setDialogOpen(true);
    }
  }

  async function handleSubmit() {
    try {
      if (editingProject) {
        await updateProject(editingProject.id, formData as Partial<Project>);
      } else {
        await createProject(formData as Omit<Project, "id" | "createdAt" | "updatedAt">);
      }
      setDialogOpen(false);
      loadProjects();
    } catch (error) {
      console.error("Error saving project:", error);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this project?")) return;
    try {
      await deleteProject(id);
      loadProjects();
    } catch (error) {
      console.error("Error deleting project:", error);
    }
  }

  const handleExport = () => {
    if (filteredProjects.length === 0) {
      toast({ title: "No projects to export", variant: "destructive" });
      return;
    }
    exportProjectsToExcel(filteredProjects);
    toast({ title: "Projects exported to Excel successfully!" });
  };

  const handlePrint = () => {
    if (filteredProjects.length === 0) {
      toast({ title: "No projects to print", variant: "destructive" });
      return;
    }
    printElement("projects-list", "PROJECTS REPORT");
  };

  if (loading) {
    return (
      <CRMLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-muted-foreground">Loading projects...</div>
        </div>
      </CRMLayout>
    );
  }

  return (
    <CRMLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header - Mobile Optimized */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Projects</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Manage construction projects and track progress
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Export</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Print</span>
            </Button>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Project
            </Button>
          </div>
        </div>

        {/* Filters - Mobile Optimized */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 touch-manipulation"
            />
          </div>
          <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 sm:pb-0">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[140px] sm:w-[180px] touch-manipulation">
                <SelectValue placeholder="Project Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {PROJECT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[130px] sm:w-[160px] touch-manipulation">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.entries(PROJECT_STATUS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterPermit} onValueChange={setFilterPermit}>
              <SelectTrigger className="w-[130px] sm:w-[160px] touch-manipulation">
                <SelectValue placeholder="Permit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Permits</SelectItem>
                {Object.entries(PERMIT_STATUS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div id="projects-list">
          {/* Projects Grid - Mobile Optimized */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {filteredProjects.map((project) => (
              <Card key={project.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg sm:text-xl truncate">{project.name}</CardTitle>
                      <CardDescription className="mt-1 text-sm truncate">{project.client}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(project)}
                        className="touch-manipulation shrink-0"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(project.id)}
                        className="touch-manipulation shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Badges - Responsive */}
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={project.status === "active" ? "default" : "secondary"}>
                      {PROJECT_STATUS[project.status as keyof typeof PROJECT_STATUS]}
                    </Badge>
                    <Badge variant="outline">{PROJECT_TYPES.find(t => t.value === project.projectType)?.label}</Badge>
                    {project.pcabCategory && (
                      <Badge variant="outline">PCAB {project.pcabCategory}</Badge>
                    )}
                    <Badge
                      variant={
                        project.permitStatus === "approved"
                          ? "default"
                          : project.permitStatus === "rejected"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {PERMIT_STATUS[project.permitStatus as keyof typeof PERMIT_STATUS]}
                    </Badge>
                  </div>

                  {/* Details Grid - Mobile Optimized */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="truncate">{project.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="truncate">
                        {new Date(project.startDate).toLocaleDateString("en-PH", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{project.progress}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2.5">
                      <div
                        className="bg-primary h-2.5 rounded-full transition-all"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Budget Info - Mobile Optimized */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t">
                    <div>
                      <p className="text-xs text-muted-foreground">Contract Amount</p>
                      <p className="text-base sm:text-lg font-semibold">
                        {new Intl.NumberFormat("en-PH", {
                          style: "currency",
                          currency: "PHP",
                          minimumFractionDigits: 0,
                        }).format(project.contractAmount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Budget Spent</p>
                      <p className="text-base sm:text-lg font-semibold">
                        {new Intl.NumberFormat("en-PH", {
                          style: "currency",
                          currency: "PHP",
                          minimumFractionDigits: 0,
                        }).format(project.spent)}{" "}
                        <span className="text-xs text-muted-foreground">
                          / {new Intl.NumberFormat("en-PH", {
                            style: "currency",
                            currency: "PHP",
                            minimumFractionDigits: 0,
                          }).format(project.budget)}
                        </span>
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredProjects.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FolderKanban className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-center text-muted-foreground">
                  {searchQuery || filterType !== "all" || filterStatus !== "all"
                    ? "No projects match your filters"
                    : "No projects yet. Create your first project to get started."}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProject ? "Edit Project" : "Create New Project"}</DialogTitle>
              <DialogDescription>
                {editingProject ? "Update project details" : "Add a new construction project"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Project Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Metro Manila Corporate HQ"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client">Client *</Label>
                  <Input
                    id="client"
                    value={formData.client}
                    onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                    placeholder="Acme Corporation"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="projectType">Project Type *</Label>
                  <Select
                    value={formData.projectType}
                    onValueChange={(value) => setFormData({ ...formData, projectType: value as ProjectType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROJECT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location *</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Makati City, Metro Manila"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status *</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value as ProjectStatus })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planning">Planning</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="on_hold">On Hold</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pcabCategory">PCAB Category</Label>
                  <Select
                    value={formData.pcabCategory || ""}
                    onValueChange={(value) => setFormData({ ...formData, pcabCategory: value as PCabCategory })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {PCAB_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
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
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contractAmount">Contract Amount *</Label>
                  <Input
                    id="contractAmount"
                    type="number"
                    value={formData.contractAmount}
                    onChange={(e) => setFormData({ ...formData, contractAmount: parseFloat(e.target.value) })}
                    placeholder="5000000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="budget">Budget *</Label>
                  <Input
                    id="budget"
                    type="number"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: parseFloat(e.target.value) })}
                    placeholder="4500000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="spent">Spent</Label>
                  <Input
                    id="spent"
                    type="number"
                    value={formData.spent}
                    onChange={(e) => setFormData({ ...formData, spent: parseFloat(e.target.value) })}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="permitNo">Permit Number</Label>
                  <Input
                    id="permitNo"
                    value={formData.permitNo}
                    onChange={(e) => setFormData({ ...formData, permitNo: e.target.value })}
                    placeholder="BP-2026-001"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="permitStatus">Permit Status</Label>
                  <Select
                    value={formData.permitStatus}
                    onValueChange={(value) => setFormData({ ...formData, permitStatus: value as PermitStatus })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_applied">Not Applied</SelectItem>
                      <SelectItem value="application_submitted">Application Submitted</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Project overview and key details..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                {editingProject ? "Update Project" : "Create Project"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </CRMLayout>
  );
}