import { useState, useEffect } from "react";
import { CRMLayout } from "@/components/layout/CRMLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Upload, FileText, Trash2, Eye, Sparkles } from "lucide-react";
import { getDrawings, uploadDrawing, deleteDrawing, getProjects } from "@/services/crmService";
import type { DrawingLog, Project } from "@/types";
import { format } from "date-fns";

export default function DrawingsPage() {
  const [drawings, setDrawings] = useState<DrawingLog[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    projectId: "",
    title: "",
    description: "",
    version: "1.0",
    file: null as File | null,
  });

  useEffect(() => {
    loadData();
  }, [selectedProject]);

  async function loadData() {
    setLoading(true);
    try {
      const [drawingsData, projectsData] = await Promise.all([
        getDrawings(selectedProject === "all" ? undefined : selectedProject),
        getProjects(),
      ]);
      setDrawings(drawingsData);
      setProjects(projectsData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }

  function handleOpenDialog() {
    setFormData({
      projectId: selectedProject === "all" ? "" : selectedProject,
      title: "",
      description: "",
      version: "1.0",
      file: null,
    });
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.file) return;

    setUploading(true);
    try {
      await uploadDrawing({
        projectId: formData.projectId,
        title: formData.title,
        description: formData.description,
        version: formData.version,
        file: formData.file,
      });
      setDialogOpen(false);
      loadData();
    } catch (error) {
      console.error("Error uploading drawing:", error);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    if (confirm("Are you sure you want to delete this drawing?")) {
      try {
        await deleteDrawing(id);
        loadData();
      } catch (error) {
        console.error("Error deleting drawing:", error);
      }
    }
  }

  const filteredDrawings = drawings;

  function getStatusColor(status: string) {
    switch (status) {
      case "uploaded":
        return "bg-blue-500";
      case "analyzing":
        return "bg-purple-500";
      case "needs_review":
        return "bg-yellow-500";
      case "approved":
        return "bg-green-500";
      case "superseded":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  }

  function getStatusLabel(status: string) {
    return status.split("_").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  }

  return (
    <CRMLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-charcoal">Drawings & Plans</h1>
            <p className="text-muted-foreground mt-1">CAD drawings with AI-assisted quantity extraction</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenDialog} className="bg-gold hover:bg-gold/90">
                <Upload className="h-4 w-4 mr-2" />
                Upload Drawing
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Drawing</DialogTitle>
                <DialogDescription>
                  Upload CAD drawings or perspective images for AI-assisted quantity takeoff
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="projectId">Project *</Label>
                  <Select
                    value={formData.projectId}
                    onValueChange={(value) => setFormData({ ...formData, projectId: value })}
                    required
                  >
                    <SelectTrigger>
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
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Architectural Floor Plan"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="version">Version</Label>
                  <Input
                    id="version"
                    value={formData.version}
                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                    placeholder="1.0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Drawing notes..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="file">File *</Label>
                  <Input
                    id="file"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.dwg,.dxf"
                    onChange={(e) => setFormData({ ...formData, file: e.target.files?.[0] || null })}
                    required
                  />
                  <p className="text-xs text-muted-foreground">Accepted: PDF, JPG, PNG, DWG, DXF</p>
                </div>
                <div className="rounded-lg border p-4 bg-muted/50">
                  <div className="flex items-start gap-2">
                    <Sparkles className="h-5 w-5 text-gold mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium">AI-Assisted Analysis</p>
                      <p className="text-xs text-muted-foreground">
                        After upload, the system will analyze the drawing and suggest quantities for BOQ. 
                        Review and validate all AI suggestions before final approval.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={uploading} className="bg-gold hover:bg-gold/90">
                    {uploading ? "Uploading..." : "Upload"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
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

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading drawings...</div>
        ) : filteredDrawings.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No drawings uploaded yet</p>
              <Button onClick={handleOpenDialog} className="mt-4 bg-gold hover:bg-gold/90">
                <Upload className="h-4 w-4 mr-2" />
                Upload First Drawing
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredDrawings.map((drawing) => {
              const project = projects.find((p) => p.id === drawing.projectId);
              return (
                <Card key={drawing.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-xl">{drawing.fileName}</CardTitle>
                        <CardDescription className="flex items-center gap-2 text-sm">
                          {project && <span>{project.name}</span>}
                          <span>•</span>
                          <span>v{drawing.revisionNumber}</span>
                          <span>•</span>
                          <span>{format(new Date(drawing.createdAt), "MMM dd, yyyy")}</span>
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(drawing.status)}>
                          {getStatusLabel(drawing.status)}
                        </Badge>
                        <Button size="sm" variant="ghost" asChild>
                          <a href={drawing.fileUrl} target="_blank" rel="noopener noreferrer">
                            <Eye className="h-4 w-4" />
                          </a>
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(drawing.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  {(drawing.notes || drawing.extractedQuantities) && (
                    <CardContent>
                      {drawing.notes && (
                        <p className="text-sm text-muted-foreground mb-4">{drawing.notes}</p>
                      )}
                      {drawing.extractedQuantities && drawing.status === "needs_review" && (
                        <div className="rounded-lg border p-4 bg-yellow-50 dark:bg-yellow-950/20">
                          <div className="flex items-start gap-2 mb-2">
                            <Sparkles className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mt-0.5" />
                            <div>
                              <p className="font-medium text-sm text-yellow-900 dark:text-yellow-200">
                                AI Analysis Complete - Review Required
                              </p>
                              <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
                                Extracted quantities are ready for validation. Review and approve before adding to BOQ.
                              </p>
                            </div>
                          </div>
                          <Button size="sm" className="mt-3 bg-gold hover:bg-gold/90">
                            Review AI Suggestions
                          </Button>
                        </div>
                      )}
                      {drawing.extractedQuantities && drawing.status === "approved" && (
                        <div className="rounded-lg border p-4 bg-green-50 dark:bg-green-950/20">
                          <p className="text-sm text-green-900 dark:text-green-200">
                            ✓ Drawing validated and quantities added to BOQ
                          </p>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </CRMLayout>
  );
}