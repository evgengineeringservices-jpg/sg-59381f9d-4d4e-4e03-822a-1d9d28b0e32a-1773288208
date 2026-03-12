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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Receipt, Calendar, Edit, Trash2, FileSpreadsheet, Printer } from "lucide-react";
import { getBillingItems, createBillingItem, updateBillingItem, deleteBillingItem, getProjects } from "@/services/crmService";
import { BILLING_TYPES, BILLING_STATUSES, formatPeso, PH_VAT_RATE, PH_EWT_RATE, PH_RETENTION_RATE, calculateBilling } from "@/constants";
import type { BillingItem, Project, BillingType, BillingStatus } from "@/types";
import { format } from "date-fns";
import { exportBillingToExcel, printElement } from "@/lib/exportUtils";
import { toast } from "@/components/ui/use-toast";

export default function BillingPage() {
  const [billingItems, setBillingItems] = useState<BillingItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BillingItem | null>(null);
  const [formData, setFormData] = useState({
    projectId: "",
    invoiceNo: "",
    date: new Date().toISOString().split("T")[0],
    billingType: "progress" as BillingType,
    description: "",
    baseAmount: 0,
    progressPercent: 0,
    status: "draft" as BillingStatus,
    notes: "",
    vat: 0,
    ewt: 0,
    retention: 0,
    netAmount: 0,
    relatedMilestoneId: null as string | null,
  });

  useEffect(() => {
    loadData();
  }, [selectedProject]);

  async function loadData() {
    setLoading(true);
    try {
      const [itemsData, projectsData] = await Promise.all([
        getBillingItems(selectedProject === "all" ? undefined : selectedProject),
        getProjects(),
      ]);
      setBillingItems(itemsData);
      setProjects(projectsData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }

  function handleOpenDialog(item?: BillingItem) {
    if (item) {
      setEditingItem(item);
      setFormData({
        projectId: item.projectId,
        invoiceNo: item.invoiceNo,
        date: item.date,
        billingType: item.billingType,
        description: item.description || "",
        baseAmount: item.baseAmount,
        progressPercent: item.progressPercent || 0,
        status: item.status,
        notes: item.notes || "",
        vat: item.vat,
        ewt: item.ewt,
        retention: item.retention,
        netAmount: item.netAmount,
        relatedMilestoneId: item.relatedMilestoneId,
      });
    } else {
      setEditingItem(null);
      setFormData({
        projectId: selectedProject === "all" ? "" : selectedProject,
        invoiceNo: "",
        date: new Date().toISOString().split("T")[0],
        billingType: "progress",
        description: "",
        baseAmount: 0,
        progressPercent: 0,
        status: "draft",
        notes: "",
        vat: 0,
        ewt: 0,
        retention: 0,
        netAmount: 0,
        relatedMilestoneId: null,
      });
    }
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingItem) {
        await updateBillingItem(editingItem.id, formData);
      } else {
        await createBillingItem(formData);
      }
      setDialogOpen(false);
      loadData();
    } catch (error) {
      console.error("Error saving billing item:", error);
    }
  }

  async function handleDelete(id: string) {
    if (confirm("Are you sure you want to delete this billing item?")) {
      try {
        await deleteBillingItem(id);
        loadData();
      } catch (error) {
        console.error("Error deleting billing item:", error);
      }
    }
  }

  const handleExport = () => {
    if (!selectedProject || billingItems.length === 0) {
      toast({ title: "No billing items to export", variant: "destructive" });
      return;
    }
    const project = projects.find(p => p.id === selectedProject);
    exportBillingToExcel(billingItems, project?.name || "Project");
    toast({ title: "Billing exported to Excel successfully!" });
  };

  const handlePrint = () => {
    if (!selectedProject || billingItems.length === 0) {
      toast({ title: "No billing items to print", variant: "destructive" });
      return;
    }
    printElement("billing-list", "BILLING STATEMENT");
  };

  const filteredItems = billingItems;

  const summary = filteredItems.reduce(
    (acc, item) => {
      const amounts = calculateBilling(item.baseAmount);
      acc.totalBilled += item.baseAmount;
      acc.vat += amounts.vat;
      acc.ewt += amounts.ewt;
      acc.retention += amounts.retention;
      acc.netAmount += amounts.netAmount;
      if (item.status === "paid") {
        acc.paid += amounts.netAmount;
      } else {
        acc.outstanding += amounts.netAmount;
      }
      return acc;
    },
    { totalBilled: 0, vat: 0, ewt: 0, retention: 0, netAmount: 0, paid: 0, outstanding: 0 }
  );

  function getStatusColor(status: string) {
    switch (status) {
      case "draft":
        return "bg-gray-500";
      case "ready_for_review":
        return "bg-blue-500";
      case "approved":
        return "bg-green-500";
      case "sent":
        return "bg-purple-500";
      case "paid":
        return "bg-emerald-500";
      case "overdue":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  }

  return (
    <CRMLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-charcoal">Billing & Invoicing</h1>
            <p className="text-muted-foreground mt-1">Manage progress billing and BIR compliance</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()} className="bg-gold hover:bg-gold/90">
                <Plus className="h-4 w-4 mr-2" />
                New Invoice
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingItem ? "Edit Invoice" : "Create Invoice"}</DialogTitle>
                <DialogDescription>
                  Generate BIR-compliant billing with automatic VAT/EWT/Retention calculation
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
                    <Label htmlFor="invoiceNo">Invoice No *</Label>
                    <Input
                      id="invoiceNo"
                      value={formData.invoiceNo}
                      onChange={(e) => setFormData({ ...formData, invoiceNo: e.target.value })}
                      placeholder="e.g., INV-2026-001"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="billingDate">Billing Date *</Label>
                    <Input
                      id="billingDate"
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="billingType">Type *</Label>
                    <Select
                      value={formData.billingType}
                      onValueChange={(value: any) => setFormData({ ...formData, billingType: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BILLING_TYPES.map(({ value, label }) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
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
                    placeholder="Billing description..."
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="baseAmount">Base Amount *</Label>
                    <Input
                      id="baseAmount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.baseAmount}
                      onChange={(e) => setFormData({ ...formData, baseAmount: parseFloat(e.target.value) })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="progressPercent">Progress %</Label>
                    <Input
                      id="progressPercent"
                      type="number"
                      min="0"
                      max="100"
                      value={formData.progressPercent}
                      onChange={(e) => setFormData({ ...formData, progressPercent: parseFloat(e.target.value) })}
                    />
                  </div>
                </div>
                {formData.baseAmount > 0 && (
                  <div className="rounded-lg border p-4 space-y-2 bg-muted/50">
                    <h4 className="font-medium text-sm">Calculated Amounts</h4>
                    {(() => {
                      const amounts = calculateBilling(formData.baseAmount);
                      return (
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>Base Amount:</div>
                          <div className="font-medium">{formatPeso(amounts.baseAmount)}</div>
                          <div>VAT ({(PH_VAT_RATE * 100).toFixed(0)}%):</div>
                          <div className="font-medium">{formatPeso(amounts.vat)}</div>
                          <div>EWT ({(PH_EWT_RATE * 100).toFixed(0)}%):</div>
                          <div className="font-medium text-red-600">-{formatPeso(amounts.ewt)}</div>
                          <div>Retention ({(PH_RETENTION_RATE * 100).toFixed(0)}%):</div>
                          <div className="font-medium text-red-600">-{formatPeso(amounts.retention)}</div>
                          <div className="font-bold">Net Payable:</div>
                          <div className="font-bold text-gold">{formatPeso(amounts.netAmount)}</div>
                        </div>
                      );
                    })()}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="status">Status *</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BILLING_STATUSES.map(({ value, label }) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes..."
                    rows={2}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-gold hover:bg-gold/90">
                    {editingItem ? "Update Invoice" : "Create Invoice"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Billed</CardDescription>
              <CardTitle className="text-2xl text-gold">{formatPeso(summary.totalBilled)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>VAT (12%)</CardDescription>
              <CardTitle className="text-2xl">{formatPeso(summary.vat)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Net Payable</CardDescription>
              <CardTitle className="text-2xl text-green-600">{formatPeso(summary.netAmount)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Outstanding</CardDescription>
              <CardTitle className="text-2xl text-red-600">{formatPeso(summary.outstanding)}</CardTitle>
            </CardHeader>
          </Card>
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
          <div className="text-center py-12 text-muted-foreground">Loading billing items...</div>
        ) : filteredItems.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No billing items yet</p>
              <Button onClick={() => handleOpenDialog()} className="mt-4 bg-gold hover:bg-gold/90">
                <Plus className="h-4 w-4 mr-2" />
                Create First Invoice
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Invoices</CardTitle>
              <CardDescription>BIR-compliant billing with automatic calculations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                  disabled={!selectedProject || billingItems.length === 0}
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Export</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrint}
                  disabled={!selectedProject || billingItems.length === 0}
                >
                  <Printer className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Print</span>
                </Button>
                <Button onClick={() => setDialogOpen(true)} disabled={!selectedProject}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Billing Item
                </Button>
              </div>
              <div id="billing-list">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice No</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Base Amount</TableHead>
                        <TableHead className="text-right">VAT</TableHead>
                        <TableHead className="text-right">Net</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map((item) => {
                        const amounts = calculateBilling(item.baseAmount);
                        const project = projects.find((p) => p.id === item.projectId);
                        return (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.invoiceNo}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(item.date), "MMM dd, yyyy")}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {BILLING_TYPES.find(t => t.value === item.billingType)?.label || item.billingType}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-xs truncate">
                              {item.description || project?.name || "-"}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatPeso(item.baseAmount)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatPeso(amounts.vat)}
                            </TableCell>
                            <TableCell className="text-right font-medium text-green-600">
                              {formatPeso(amounts.netAmount)}
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(item.status)}>
                                {BILLING_STATUSES.find(s => s.value === item.status)?.label || item.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleOpenDialog(item)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDelete(item.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </CRMLayout>
  );
}