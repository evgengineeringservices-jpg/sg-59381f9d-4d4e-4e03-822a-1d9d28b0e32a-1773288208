import { useState, useEffect } from "react";
import { CRMLayout } from "@/components/layout/CRMLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, Image, Trash2, Edit, ClipboardCheck, CheckCircle, DollarSign, Package } from "lucide-react";
import { getProgressReports, createProgressReport, updateProgressReport, deleteProgressReport, getProjects, getBOQItems, getPlanningPhases } from "@/services/crmService";
import type { ProgressReport, Project, BOQItem, PlanningPhase } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { formatPeso } from "@/lib/boqCalculations";

export default function ReportsPage() {
  const [reports, setReports] = useState<ProgressReport[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<ProgressReport | null>(null);
  const [formData, setFormData] = useState({
    projectId: "",
    title: "",
    date: new Date().toISOString().split("T")[0],
    description: "",
    progressPercentage: 0,
    weather: "",
    manpower: 0,
    remarks: "",
    linkedPhaseId: "",
    linkedBoqItemId: "",
    sitePhotos: [] as string[],
    authorId: "system",
    milestoneCompleted: false,
  });
  const [boqItems, setBoqItems] = useState<BOQItem[]>([]);
  const [phases, setPhases] = useState<PlanningPhase[]>([]);
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [expenseFormData, setExpenseFormData] = useState({
    materialName: "",
    category: "",
    quantity: 0,
    unit: "",
    unitPrice: 0,
    supplier: "",
    invoiceNumber: "",
    deliveryDate: "",
    notes: "",
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
      
      if (selectedProject && selectedProject !== "all") {
        const [boqData, phaseData] = await Promise.all([
          getBOQItems(selectedProject),
          getPlanningPhases(selectedProject),
        ]);
        setBoqItems(boqData);
        setPhases(phaseData);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveExpense(reportId: string) {
    if (!selectedProject || selectedProject === "all") return;
    
    try {
      const totalCost = expenseFormData.quantity * expenseFormData.unitPrice;
      
      const { error } = await supabase
        .from('actual_material_expenses' as any)
        .insert({
          project_id: selectedProject,
          progress_report_id: reportId,
          material_name: expenseFormData.materialName,
          category: expenseFormData.category,
          quantity: expenseFormData.quantity,
          unit: expenseFormData.unit,
          unit_price: expenseFormData.unitPrice,
          total_cost: totalCost,
          supplier: expenseFormData.supplier || null,
          purchase_date: new Date().toISOString().split('T')[0],
          invoice_number: expenseFormData.invoiceNumber || null,
          delivery_date: expenseFormData.deliveryDate || null,
          status: 'delivered',
          notes: expenseFormData.notes || null,
        });
      
      if (error) throw error;
      
      setShowExpenseDialog(false);
      setExpenseFormData({
        materialName: "",
        category: "",
        quantity: 0,
        unit: "",
        unitPrice: 0,
        supplier: "",
        invoiceNumber: "",
        deliveryDate: "",
        notes: "",
      });
    } catch (error) {
      console.error("Error saving expense:", error);
    }
  }

  function handleEdit(report: ProgressReport) {
    setEditingReport(report);
    setFormData({
      projectId: report.projectId,
      title: report.title,
      date: report.date,
      description: report.description || "",
      progressPercentage: report.progressPercentage,
      weather: report.weather || "",
      manpower: report.manpower || 0,
      remarks: report.remarks || "",
      linkedPhaseId: report.linkedPhaseId || "",
      linkedBoqItemId: report.linkedBoqItemId || "",
      sitePhotos: report.sitePhotos || [],
      authorId: report.authorId || "system",
      milestoneCompleted: report.milestoneCompleted || false,
    });
    setDialogOpen(true);
  }

  function handleOpenDialog(report?: ProgressReport) {
    if (report) {
      handleEdit(report);
    } else {
      setEditingReport(null);
      setFormData({
        projectId: selectedProject === "all" ? "" : selectedProject,
        title: "",
        date: new Date().toISOString().split("T")[0],
        description: "",
        progressPercentage: 0,
        weather: "",
        manpower: 0,
        remarks: "",
        linkedPhaseId: "",
        linkedBoqItemId: "",
        sitePhotos: [],
        authorId: "system",
        milestoneCompleted: false,
      });
      setDialogOpen(true);
    }
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
      <div className="space-y-4 sm:space-y-6">
        {/* Header - Mobile Optimized */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Progress Reports</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Track accomplishments and actual material expenses
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => handleOpenDialog()} size="default" className="touch-manipulation">
              <Plus className="mr-2 w-4 h-4" />
              New Report
            </Button>
          </div>
        </div>

        {/* Filters - Mobile Optimized */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="flex-1 touch-manipulation">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Reports List - Mobile Optimized Timeline */}
        <div className="space-y-4">
          {filteredReports.map((report) => (
            <Card key={report.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 sm:p-6">
                <div className="space-y-4">
                  {/* Header with Actions */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <ClipboardCheck className="w-5 h-5 text-primary shrink-0" />
                        <h3 className="font-semibold text-base sm:text-lg truncate">{report.title}</h3>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {new Date(report.date).toLocaleDateString("en-PH", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setShowExpenseDialog(true);
                        }}
                        className="touch-manipulation h-9 w-9"
                        title="Add Material Expense"
                      >
                        <Package className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(report)}
                        className="touch-manipulation h-9 w-9"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(report.id)}
                        className="touch-manipulation h-9 w-9"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Progress Badge - Large for Mobile */}
                  <div className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
                    <span className="text-sm font-medium">Progress Update</span>
                    <Badge variant="default" className="text-base px-3 py-1">
                      {report.progressPercentage}%
                    </Badge>
                  </div>

                  {/* Description */}
                  {report.description && (
                    <p className="text-sm text-muted-foreground">{report.description}</p>
                  )}

                  {/* Site Photos - Mobile Gallery */}
                  {report.sitePhotos && report.sitePhotos.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Image className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Site Photos ({report.sitePhotos.length})</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {report.sitePhotos.slice(0, 6).map((photo, idx) => (
                          <div
                            key={idx}
                            className="aspect-video bg-muted rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => window.open(photo, "_blank")}
                          >
                            <img
                              src={photo}
                              alt={`Site photo ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Additional Info - Mobile Grid */}
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t text-sm">
                    {report.weather && (
                      <div>
                        <span className="text-muted-foreground">Weather</span>
                        <p className="font-medium">{report.weather}</p>
                      </div>
                    )}
                    {report.manpower && (
                      <div>
                        <span className="text-muted-foreground">Manpower</span>
                        <p className="font-medium">{report.manpower} workers</p>
                      </div>
                    )}
                    {report.milestoneCompleted && (
                      <div className="col-span-2">
                        <Badge variant="default" className="w-full justify-center py-2">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Milestone Completed
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredReports.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ClipboardCheck className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-center text-muted-foreground">
                {selectedProject && selectedProject !== "all"
                  ? "No reports for this project yet"
                  : "No reports yet. Create your first progress report."}
              </p>
            </CardContent>
          </Card>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
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
                    value={formData.progressPercentage}
                    onChange={(e) => setFormData({ ...formData, progressPercentage: parseFloat(e.target.value) })}
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
                <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                  {editingReport ? "Update Report" : "Create Report"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Material Expense Dialog */}
        <Dialog open={showExpenseDialog} onOpenChange={setShowExpenseDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Record Material Expense</DialogTitle>
              <DialogDescription>
                Track actual material costs for cost comparison analysis
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Material Name *</Label>
                <Input
                  value={expenseFormData.materialName}
                  onChange={(e) => setExpenseFormData({ ...expenseFormData, materialName: e.target.value })}
                  placeholder="e.g., Portland Cement"
                />
              </div>
              <div className="space-y-2">
                <Label>Category *</Label>
                <Input
                  value={expenseFormData.category}
                  onChange={(e) => setExpenseFormData({ ...expenseFormData, category: e.target.value })}
                  placeholder="e.g., Concrete Works"
                />
              </div>
              <div className="space-y-2">
                <Label>Quantity *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={expenseFormData.quantity}
                  onChange={(e) => setExpenseFormData({ ...expenseFormData, quantity: parseFloat(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Unit *</Label>
                <Input
                  value={expenseFormData.unit}
                  onChange={(e) => setExpenseFormData({ ...expenseFormData, unit: e.target.value })}
                  placeholder="e.g., bags, cu_m"
                />
              </div>
              <div className="space-y-2">
                <Label>Unit Price (₱) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={expenseFormData.unitPrice}
                  onChange={(e) => setExpenseFormData({ ...expenseFormData, unitPrice: parseFloat(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Total Cost</Label>
                <div className="text-2xl font-bold text-primary pt-2">
                  {formatPeso(expenseFormData.quantity * expenseFormData.unitPrice)}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Supplier</Label>
                <Input
                  value={expenseFormData.supplier}
                  onChange={(e) => setExpenseFormData({ ...expenseFormData, supplier: e.target.value })}
                  placeholder="e.g., ABC Hardware"
                />
              </div>
              <div className="space-y-2">
                <Label>Invoice Number</Label>
                <Input
                  value={expenseFormData.invoiceNumber}
                  onChange={(e) => setExpenseFormData({ ...expenseFormData, invoiceNumber: e.target.value })}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Delivery Date</Label>
                <Input
                  type="date"
                  value={expenseFormData.deliveryDate}
                  onChange={(e) => setExpenseFormData({ ...expenseFormData, deliveryDate: e.target.value })}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Notes</Label>
                <Textarea
                  value={expenseFormData.notes}
                  onChange={(e) => setExpenseFormData({ ...expenseFormData, notes: e.target.value })}
                  placeholder="Additional details..."
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowExpenseDialog(false)}>
                Cancel
              </Button>
              <Button onClick={() => handleSaveExpense(filteredReports[0]?.id)}>
                Save Expense
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </CRMLayout>
  );
}