import { useState, useEffect } from "react";
import { CRMLayout } from "@/components/layout/CRMLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
import { formatPeso, PROJECT_TYPES, PCAB_CATEGORIES } from "@/constants";
import { Plus, Search, Edit2, Trash2, MapPin, Calendar, DollarSign } from "lucide-react";
import type { Project, ProjectStatus, ProjectType, PCabCategory, PermitStatus } from "@/types";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
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
    const filtered = projects.filter((project) =>
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.location.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredProjects(filtered);
  }, [searchQuery, projects]);

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

  function handleOpenDialog(project?: Project) {
    if (project) {
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
    }
    setDialogOpen(true);
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

  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case "planning": return "bg-blue-100 text-blue-700";
      case "active": return "bg-green-100 text-green-700";
      case "on_hold": return "bg-yellow-100 text-yellow-700";
      case "completed": return "bg-purple-100 text-purple-700";
      case "cancelled": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const getPermitColor = (status: PermitStatus) => {
    switch (status) {
      case "approved": return "bg-green-100 text-green-700";
      case "application_submitted": return "bg-blue-100 text-blue-700";
      case "rejected": return "bg-red-100 text-red-700";
      case "expired": return "bg-orange-100 text-orange-700";
      default: return "bg-gray-100 text-gray-700";
    }
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-3xl md:text-4xl mb-2 tracking-wide">PROJECTS</h1>
            <p className="text-muted-foreground">Manage your construction projects</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <Plus className="w-4 h-4 mr-2" />
                New Project
              </Button>
            </DialogTrigger>
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

        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {filteredProjects.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="text-muted-foreground mb-4">No projects found</div>
              <Button onClick={() => handleOpenDialog()} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Project
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredProjects.map((project) => (
              <Card key={project.id} className="shadow-card hover:shadow-premium transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-xl mb-1">{project.name}</h3>
                      <p className="text-sm text-muted-foreground">{project.client}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(project)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(project.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge className={getStatusColor(project.status)}>
                      {project.status.replace("_", " ")}
                    </Badge>
                    <Badge variant="outline">
                      {PROJECT_TYPES.find(t => t.value === project.projectType)?.label}
                    </Badge>
                    {project.pcabCategory && (
                      <Badge variant="outline">PCAB {project.pcabCategory}</Badge>
                    )}
                    <Badge className={getPermitColor(project.permitStatus)}>
                      {project.permitStatus.replace("_", " ")}
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span>{project.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {new Date(project.startDate).toLocaleDateString()} - {project.endDate ? new Date(project.endDate).toLocaleDateString() : "Ongoing"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <DollarSign className="w-4 h-4" />
                      <span>Contract: {formatPeso(project.contractAmount)}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-semibold">{project.progress}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent transition-all"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Budget</span>
                      <span className="font-semibold">
                        {formatPeso(project.spent)} / {formatPeso(project.budget)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </CRMLayout>
  );
}