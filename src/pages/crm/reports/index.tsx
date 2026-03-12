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
import { Plus, Calendar, User, FileText, Image, Trash2, Edit } from "lucide-react";
import { getProgressReports, createProgressReport, updateProgressReport, deleteProgressReport, getProjects } from "@/services/crmService";
import type { ProgressReport, Project } from "@/types";
import { format } from "date-fns";

export default function ProgressReportsPage() {
  const [reports, setReports] = useState<ProgressReport[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<ProgressReport | null>(null);
  const [formData, setFormData] = useState({
    projectId: "",
    title: "",
    reportDate: new Date().toISOString().split("T")[0],
    description: "",
    progressPercent: 0,
    weather: "",
    manpower: 0,
    remarks: "",
    linkedPhaseId: "",
    linkedBoqItemId: "",
    sitePhotos: [] as string[],
  });

  useEffect(() => {
    loadData();
  }, [selectedProject]);

  async function loadData() {
    setLoading(true);
    try {
      const [reportsData, projectsData] = await Promise.all([
        getProgressReports(selectedProject === "all" ? undefined : selectedProject),
        getProjects(),
      ]);
      setReports(reportsData);
      setProjects(projectsData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }

  function handleOpenDialog(report?: ProgressReport) {
    if (report) {
      setEditingReport(report);
      setFormData({
        projectId: report.projectId,
        title: report.title,
        reportDate: report.reportDate,
        description: report.description || "",
        progressPercent: report.progressPercent,
        weather: report.weather || "",
        manpower: report.manpower || 0,
        remarks: report.remarks || "",
        linkedPhaseId: report.linkedPhaseId || "",
        linkedBoqItemId: report.linkedBoqItemId || "",
        sitePhotos: report.sitePhotos || [],
      });
    } else {
      setEditingReport(null);
      setFormData({
        projectId: selectedProject === "all" ? "" : selectedProject,
        title: "",
        reportDate: new Date().toISOString().split("T")[0],
        description: "",
        progressPercent: 0,
        weather: "",
        manpower: 0,
        remarks: "",
        linkedPhaseId: "",
        linkedBoqItemId: "",
        sitePhotos: [],
      });
    }
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingReport) {
        await updateProgressReport(editingReport.id, formData);
      } else {
        await createProgressReport(formData);
      }
      setDialogOpen(false);
      loadData();
    } catch (error) {
      console.error("Error saving report:", error);
    }
  }

  async function handleDelete(id: string) {
    if (confirm("Are you sure you want to delete this report?")) {
      try {
        await deleteProgressReport(id);
        loadData();
      } catch (error) {
        console.error("Error deleting report:", error);
      }
    }
  }

  const filteredReports = reports;

  return (
    <CRMLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-charcoal">Progress Reports</h1>
            <p className="text-muted-foreground mt-1">Track project accomplishments and site updates</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()} className="bg-gold hover:bg-gold/90">
                <Plus className="h-4 w-4 mr-2" />
                New Report
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingReport ? "Edit Report" : "Create Progress Report"}</DialogTitle>
                <DialogDescription>
                  Document project progress and accomplishments
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
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
                    <Label htmlFor="reportDate">Report Date *</Label>
                    <Input
                      id="reportDate"
                      type="date"
                      value={formData.reportDate}
                      onChange={(e) => setFormData({ ...formData, reportDate: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Week 3 Progress - Foundation Complete"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="progressPercent">Progress Percentage *</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="progressPercent"
                      type="number"
                      min="0"
                      max="100"
                      value={formData.progressPercent}
                      onChange={(e) => setFormData({ ...formData, progressPercent: parseFloat(e.target.value) })}
                      required
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Detailed accomplishment description..."
                    rows={4}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="weather">Weather</Label>
                    <Input
                      id="weather"
                      value={formData.weather}
                      onChange={(e) => setFormData({ ...formData, weather: e.target.value })}
                      placeholder="e.g., Sunny, Rainy"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manpower">Manpower</Label>
                    <Input
                      id="manpower"
                      type="number"
                      min="0"
                      value={formData.manpower}
                      onChange={(e) => setFormData({ ...formData, manpower: parseInt(e.target.value) })}
                      placeholder="Number of workers"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="remarks">Remarks</Label>
                  <Textarea
                    id="remarks"
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    placeholder="Additional notes..."
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-gold hover:bg-gold/90">
                    {editingReport ? "Update Report" : "Create Report"}
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
          <div className="text-center py-12 text-muted-foreground">Loading reports...</div>
        ) : filteredReports.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No progress reports yet</p>
              <Button onClick={() => handleOpenDialog()} className="mt-4 bg-gold hover:bg-gold/90">
                <Plus className="h-4 w-4 mr-2" />
                Create First Report
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredReports.map((report) => {
              const project = projects.find((p) => p.id === report.projectId);
              return (
                <Card key={report.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-xl">{report.title}</CardTitle>
                        <CardDescription className="flex items-center gap-4 text-sm">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(report.reportDate), "MMM dd, yyyy")}
                          </span>
                          {project && (
                            <span className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              {project.name}
                            </span>
                          )}
                          {report.authorName && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {report.authorName}
                            </span>
                          )}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-gold text-charcoal">
                          {report.progressPercent}% Complete
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenDialog(report)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(report.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  {report.description && (
                    <CardContent>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {report.description}
                      </p>
                      {(report.weather || report.manpower || report.remarks) && (
                        <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                          {report.weather && (
                            <div>
                              <span className="font-medium">Weather:</span> {report.weather}
                            </div>
                          )}
                          {report.manpower && (
                            <div>
                              <span className="font-medium">Manpower:</span> {report.manpower}
                            </div>
                          )}
                          {report.remarks && (
                            <div className="col-span-3">
                              <span className="font-medium">Remarks:</span> {report.remarks}
                            </div>
                          )}
                        </div>
                      )}
                      {report.sitePhotos && report.sitePhotos.length > 0 && (
                        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                          <Image className="h-4 w-4" />
                          <span>{report.sitePhotos.length} site photo(s) attached</span>
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