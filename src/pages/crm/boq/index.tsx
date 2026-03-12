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
import { getProjects, getBOQItems, createBOQItem, updateBOQItem, deleteBOQItem } from "@/services/crmService";
import { formatPeso, BOQ_CATEGORIES, DPWH_UNITS } from "@/constants";
import { Plus, Edit2, Trash2, Calculator, TrendingUp, Package, Wrench } from "lucide-react";
import type { Project, BOQItem, BOQCategory, DPWHUnit } from "@/types";

export default function BOQPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [boqItems, setBOQItems] = useState<BOQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BOQItem | null>(null);

  const [formData, setFormData] = useState({
    itemNo: "",
    dpwhItemCode: "",
    description: "",
    category: "concrete" as BOQCategory,
    unit: "cu.m" as DPWHUnit,
    quantity: 0,
    unitCost: 0,
    laborCost: 0,
    materialCost: 0,
    markup: 0,
  });

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      loadBOQItems();
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

  async function loadBOQItems() {
    try {
      const data = await getBOQItems(selectedProjectId);
      setBOQItems(data);
    } catch (error) {
      console.error("Error loading BOQ items:", error);
    }
  }

  function handleOpenDialog(item?: BOQItem) {
    if (item) {
      setEditingItem(item);
      setFormData({
        itemNo: item.itemNo,
        dpwhItemCode: item.dpwhItemCode || "",
        description: item.description,
        category: item.category,
        unit: item.unit,
        quantity: item.quantity,
        unitCost: item.unitCost,
        laborCost: item.laborCost,
        materialCost: item.materialCost,
        markup: item.markup || 0,
      });
    } else {
      setEditingItem(null);
      setFormData({
        itemNo: "",
        dpwhItemCode: "",
        description: "",
        category: "concrete",
        unit: "cu.m",
        quantity: 0,
        unitCost: 0,
        laborCost: 0,
        materialCost: 0,
        markup: 0,
      });
    }
    setDialogOpen(true);
  }

  async function handleSubmit() {
    try {
      if (editingItem) {
        await updateBOQItem(editingItem.id, formData as Partial<BOQItem>);
      } else {
        await createBOQItem({
          ...formData,
          projectId: selectedProjectId,
        } as Omit<BOQItem, "id" | "createdAt" | "updatedAt">);
      }
      setDialogOpen(false);
      loadBOQItems();
    } catch (error) {
      console.error("Error saving BOQ item:", error);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this BOQ item?")) return;
    try {
      await deleteBOQItem(id);
      loadBOQItems();
    } catch (error) {
      console.error("Error deleting BOQ item:", error);
    }
  }

  const groupedItems = boqItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<BOQCategory, BOQItem[]>);

  const totalMaterial = boqItems.reduce((sum, item) => sum + item.materialCost * item.quantity, 0);
  const totalLabor = boqItems.reduce((sum, item) => sum + item.laborCost * item.quantity, 0);
  const totalCost = boqItems.reduce((sum, item) => sum + item.unitCost * item.quantity, 0);
  const totalMarkup = boqItems.reduce((sum, item) => sum + (item.markup || 0) * item.quantity, 0);
  const estimatedGrossProfit = totalMarkup;

  if (loading) {
    return (
      <CRMLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-muted-foreground">Loading BOQ...</div>
        </div>
      </CRMLayout>
    );
  }

  return (
    <CRMLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-3xl md:text-4xl mb-2 tracking-wide">BILL OF QUANTITIES</h1>
            <p className="text-muted-foreground">DPWH-style BOQ / Estimation</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <Plus className="w-4 h-4 mr-2" />
                Add BOQ Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingItem ? "Edit BOQ Item" : "Add BOQ Item"}</DialogTitle>
                <DialogDescription>
                  {editingItem ? "Update BOQ item details" : "Add a new item to the bill of quantities"}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="itemNo">Item No *</Label>
                    <Input
                      id="itemNo"
                      value={formData.itemNo}
                      onChange={(e) => setFormData({ ...formData, itemNo: e.target.value })}
                      placeholder="1.0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dpwhItemCode">DPWH Code</Label>
                    <Input
                      id="dpwhItemCode"
                      value={formData.dpwhItemCode}
                      onChange={(e) => setFormData({ ...formData, dpwhItemCode: e.target.value })}
                      placeholder="300-01"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Excavation and Embankment"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value as BOQCategory })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BOQ_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit">Unit *</Label>
                    <Select
                      value={formData.unit}
                      onValueChange={(value) => setFormData({ ...formData, unit: value as DPWHUnit })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DPWH_UNITS.map((unit) => (
                          <SelectItem key={unit.value} value={unit.value}>
                            {unit.label || unit.value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity *</Label>
                    <Input
                      id="quantity"
                      type="number"
                      step="0.01"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) })}
                      placeholder="100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="materialCost">Material Cost (per unit)</Label>
                    <Input
                      id="materialCost"
                      type="number"
                      step="0.01"
                      value={formData.materialCost}
                      onChange={(e) => setFormData({ ...formData, materialCost: parseFloat(e.target.value) })}
                      placeholder="500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="laborCost">Labor Cost (per unit)</Label>
                    <Input
                      id="laborCost"
                      type="number"
                      step="0.01"
                      value={formData.laborCost}
                      onChange={(e) => setFormData({ ...formData, laborCost: parseFloat(e.target.value) })}
                      placeholder="200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="unitCost">Unit Cost *</Label>
                    <Input
                      id="unitCost"
                      type="number"
                      step="0.01"
                      value={formData.unitCost}
                      onChange={(e) => setFormData({ ...formData, unitCost: parseFloat(e.target.value) })}
                      placeholder="750"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="markup">Markup (per unit)</Label>
                    <Input
                      id="markup"
                      type="number"
                      step="0.01"
                      value={formData.markup}
                      onChange={(e) => setFormData({ ...formData, markup: parseFloat(e.target.value) })}
                      placeholder="50"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                  {editingItem ? "Update Item" : "Add Item"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-chart-1/10 flex items-center justify-center">
                  <Calculator className="w-6 h-6 text-chart-1" />
                </div>
              </div>
              <div className="text-2xl font-bold mb-1">{formatPeso(totalCost)}</div>
              <div className="text-sm text-muted-foreground">Total Cost</div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-chart-2/10 flex items-center justify-center">
                  <Wrench className="w-6 h-6 text-chart-2" />
                </div>
              </div>
              <div className="text-2xl font-bold mb-1">{formatPeso(totalLabor)}</div>
              <div className="text-sm text-muted-foreground">Total Labor</div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-chart-3/10 flex items-center justify-center">
                  <Package className="w-6 h-6 text-chart-3" />
                </div>
              </div>
              <div className="text-2xl font-bold mb-1">{formatPeso(totalMaterial)}</div>
              <div className="text-sm text-muted-foreground">Total Material</div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <div className="text-2xl font-bold mb-1">{formatPeso(estimatedGrossProfit)}</div>
              <div className="text-sm text-muted-foreground">Est. Gross Profit</div>
            </CardContent>
          </Card>
        </div>

        {boqItems.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="text-muted-foreground mb-4">No BOQ items yet</div>
              <Button onClick={() => handleOpenDialog()} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Item
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedItems).map(([category, items]) => (
              <Card key={category} className="shadow-card">
                <CardHeader>
                  <CardTitle className="text-lg">
                    {BOQ_CATEGORIES.find(c => c.value === category)?.label || category}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b">
                        <tr className="text-sm text-muted-foreground">
                          <th className="text-left py-3 px-4">Item No</th>
                          <th className="text-left py-3 px-4">DPWH Code</th>
                          <th className="text-left py-3 px-4">Description</th>
                          <th className="text-right py-3 px-4">Unit</th>
                          <th className="text-right py-3 px-4">Qty</th>
                          <th className="text-right py-3 px-4">Unit Cost</th>
                          <th className="text-right py-3 px-4">Total</th>
                          <th className="text-right py-3 px-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item) => (
                          <tr key={item.id} className="border-b last:border-0">
                            <td className="py-3 px-4 text-sm">{item.itemNo}</td>
                            <td className="py-3 px-4 text-sm text-muted-foreground">{item.dpwhItemCode || "-"}</td>
                            <td className="py-3 px-4 text-sm">{item.description}</td>
                            <td className="py-3 px-4 text-sm text-right">{item.unit}</td>
                            <td className="py-3 px-4 text-sm text-right">{item.quantity}</td>
                            <td className="py-3 px-4 text-sm text-right">{formatPeso(item.unitCost)}</td>
                            <td className="py-3 px-4 text-sm font-semibold text-right">
                              {formatPeso(item.unitCost * item.quantity)}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenDialog(item)}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(item.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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