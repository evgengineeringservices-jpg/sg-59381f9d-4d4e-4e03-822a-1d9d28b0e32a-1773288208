import { useState, useEffect } from "react";
import { Plus, RefreshCw, TrendingUp, DollarSign, Wrench, Package } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { formatPeso } from "@/lib/boqCalculations";
import {
  getProjects,
  getBOQItems,
  createBOQItem,
  updateBOQItem,
  deleteBOQItem,
} from "@/services/crmService";
import { refreshBOQCostsFromMarket, checkMarketPriceChanges } from "@/lib/boqCalculations";
import { BOQItemDialog } from "@/components/boq/BOQItemDialog";
import type { Project, BOQItem } from "@/types";
import { BOQ_CATEGORIES } from "@/constants";

export default function BOQPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [items, setItems] = useState<BOQItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<BOQItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BOQItem | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [priceChanges, setPriceChanges] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadProjects();
    loadPriceChanges();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadBOQItems();
    }
  }, [selectedProject]);

  useEffect(() => {
    filterItems();
  }, [selectedCategory, items]);

  async function loadProjects() {
    try {
      const data = await getProjects();
      setProjects(data);
      if (data.length > 0 && !selectedProject) {
        setSelectedProject(data[0].id);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load projects",
        variant: "destructive",
      });
    }
  }

  async function loadBOQItems() {
    try {
      const data = await getBOQItems(selectedProject);
      setItems(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load BOQ items",
        variant: "destructive",
      });
    }
  }

  async function loadPriceChanges() {
    try {
      const changes = await checkMarketPriceChanges(30);
      setPriceChanges(changes);
    } catch (error) {
      console.error("Failed to load price changes:", error);
    }
  }

  function filterItems() {
    if (selectedCategory === "all") {
      setFilteredItems(items);
    } else {
      setFilteredItems(items.filter((item) => item.category === selectedCategory));
    }
  }

  async function handleSave(data: Partial<BOQItem>) {
    try {
      if (editingItem) {
        await updateBOQItem(editingItem.id, data);
        toast({ title: "BOQ item updated successfully" });
      } else {
        await createBOQItem(data);
        toast({ title: "BOQ item created successfully" });
      }
      loadBOQItems();
      loadPriceChanges();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save BOQ item",
        variant: "destructive",
      });
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this BOQ item?")) return;

    try {
      await deleteBOQItem(id);
      toast({ title: "BOQ item deleted successfully" });
      loadBOQItems();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete BOQ item",
        variant: "destructive",
      });
    }
  }

  async function handleRefreshCosts() {
    if (!selectedProject) return;

    try {
      setRefreshing(true);
      const result = await refreshBOQCostsFromMarket(selectedProject);
      toast({
        title: "BOQ costs refreshed",
        description: `Updated ${result.updatedCount} items. Total cost change: ${formatPeso(result.totalCostChange)}`,
      });
      loadBOQItems();
      loadPriceChanges();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh BOQ costs",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  }

  // Calculate summary
  const totalMaterialCost = filteredItems.reduce((sum, item) => sum + item.materialCost, 0);
  const totalLaborCost = filteredItems.reduce((sum, item) => sum + item.laborCost, 0);
  const totalCost = totalMaterialCost + totalLaborCost;

  const significantChanges = priceChanges.filter((c) => Math.abs(c.priceChangePercent) > 10);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Bill of Quantities (BOQ)</h1>
          <p className="text-muted-foreground mt-1">
            DPWH-style estimation with automated cost calculation
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRefreshCosts}
            disabled={!selectedProject || refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh Costs
          </Button>
          <Button
            onClick={() => {
              setEditingItem(null);
              setDialogOpen(true);
            }}
            disabled={!selectedProject}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Price Change Alert */}
      {significantChanges.length > 0 && (
        <Alert className="border-amber-500">
          <TrendingUp className="h-4 w-4" />
          <AlertDescription>
            <strong>{significantChanges.length} items</strong> have significant price changes
            in the last 30 days. Click "Refresh Costs" to update BOQ.
          </AlertDescription>
        </Alert>
      )}

      {/* Project Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Select Project</label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name} - {project.client}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Filter by Category</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {BOQ_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {selectedProject && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Package className="h-4 w-4" />
                Total Material Cost
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPeso(totalMaterialCost)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                Total Labor Cost
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPeso(totalLaborCost)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Total BOQ Cost
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{formatPeso(totalCost)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredItems.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {selectedCategory === "all" ? "All categories" : BOQ_CATEGORIES.find(c => c.value === selectedCategory)?.label}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* BOQ Table */}
      {selectedProject && (
        <Card>
          <CardHeader>
            <CardTitle>BOQ Items</CardTitle>
            <CardDescription>
              {selectedCategory === "all"
                ? "All BOQ items"
                : `Filtered by ${BOQ_CATEGORIES.find(c => c.value === selectedCategory)?.label}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredItems.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No BOQ items found. Add your first item to get started.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b">
                    <tr className="text-left text-sm text-muted-foreground">
                      <th className="pb-3 font-medium">Item No</th>
                      <th className="pb-3 font-medium">DPWH Code</th>
                      <th className="pb-3 font-medium">Description</th>
                      <th className="pb-3 font-medium">Category</th>
                      <th className="pb-3 font-medium text-right">Qty</th>
                      <th className="pb-3 font-medium">Unit</th>
                      <th className="pb-3 font-medium text-right">Material</th>
                      <th className="pb-3 font-medium text-right">Labor</th>
                      <th className="pb-3 font-medium text-right">Total</th>
                      <th className="pb-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => (
                      <tr key={item.id} className="border-b hover:bg-accent/50">
                        <td className="py-3 font-medium">{item.itemNo}</td>
                        <td className="py-3 text-sm text-muted-foreground">
                          {item.dpwhItemCode || "-"}
                        </td>
                        <td className="py-3 max-w-xs">
                          <div className="font-medium">{item.description}</div>
                        </td>
                        <td className="py-3">
                          <Badge variant="outline" className="text-xs">
                            {BOQ_CATEGORIES.find(c => c.value === item.category)?.label}
                          </Badge>
                        </td>
                        <td className="py-3 text-right">{item.quantity}</td>
                        <td className="py-3 text-sm">{item.unit}</td>
                        <td className="py-3 text-right font-medium">
                          {formatPeso(item.materialCost)}
                        </td>
                        <td className="py-3 text-right font-medium">
                          {formatPeso(item.laborCost)}
                        </td>
                        <td className="py-3 text-right font-bold text-primary">
                          {formatPeso(item.total)}
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingItem(item);
                                setDialogOpen(true);
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(item.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 bg-accent/30">
                    <tr className="font-bold">
                      <td colSpan={6} className="py-4 text-right">
                        TOTAL:
                      </td>
                      <td className="py-4 text-right">{formatPeso(totalMaterialCost)}</td>
                      <td className="py-4 text-right">{formatPeso(totalLaborCost)}</td>
                      <td className="py-4 text-right text-primary text-lg">
                        {formatPeso(totalCost)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* BOQ Item Dialog */}
      <BOQItemDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        item={editingItem}
        projectId={selectedProject}
        onSave={handleSave}
      />
    </div>
  );
}