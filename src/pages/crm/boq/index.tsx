import { useState, useEffect } from "react";
import { CRMLayout } from "@/components/layout/CRMLayout";
import { Plus, Calculator, TrendingUp, DollarSign, FileSpreadsheet, Printer, RefreshCw, Sparkles, FileImage, Package, Wrench, Search, ArrowUpDown } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { exportBOQToExcel, printBOQ } from "@/lib/exportUtils";
import { GenerateBOQDialog } from "@/components/boq/GenerateBOQDialog";
import { Pagination } from "@/components/shared/Pagination";
import { usePagination } from "@/hooks/usePagination";

type SortField = "itemNo" | "description" | "category" | "quantity" | "materialCost" | "laborCost" | "total";
type SortDirection = "asc" | "desc";
type ViewMode = "flat" | "grouped";

export default function BOQPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [items, setItems] = useState<BOQItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<BOQItem[]>([]);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [minCost, setMinCost] = useState<string>("");
  const [maxCost, setMaxCost] = useState<string>("");
  
  // Sort states
  const [sortField, setSortField] = useState<SortField>("itemNo");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  
  // View states
  const [viewMode, setViewMode] = useState<ViewMode>("flat");
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BOQItem | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [priceChanges, setPriceChanges] = useState<any[]>([]);
  const [showGenerateBOQ, setShowGenerateBOQ] = useState(false);
  const { toast } = useToast();

  const {
    currentPage,
    pageSize,
    totalPages,
    totalItems,
    paginatedData,
    handlePageChange,
    handlePageSizeChange,
  } = usePagination({ data: filteredItems, initialPageSize: 25 });

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
    applyFiltersAndSort();
  }, [selectedCategory, searchQuery, minCost, maxCost, sortField, sortDirection, items]);

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

  function applyFiltersAndSort() {
    let filtered = [...items];

    // Apply category filter
    if (selectedCategory !== "all") {
      filtered = filtered.filter((item) => item.category === selectedCategory);
    }

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.description.toLowerCase().includes(query) ||
          item.itemNo.toLowerCase().includes(query) ||
          (item.dpwhItemCode && item.dpwhItemCode.toLowerCase().includes(query))
      );
    }

    // Apply cost range filter
    if (minCost) {
      const min = parseFloat(minCost);
      filtered = filtered.filter((item) => item.total >= min);
    }
    if (maxCost) {
      const max = parseFloat(maxCost);
      filtered = filtered.filter((item) => item.total <= max);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortField) {
        case "itemNo":
          aVal = a.itemNo;
          bVal = b.itemNo;
          break;
        case "description":
          aVal = a.description;
          bVal = b.description;
          break;
        case "category":
          aVal = a.category;
          bVal = b.category;
          break;
        case "quantity":
          aVal = a.quantity;
          bVal = b.quantity;
          break;
        case "materialCost":
          aVal = a.materialCost;
          bVal = b.materialCost;
          break;
        case "laborCost":
          aVal = a.laborCost;
          bVal = b.laborCost;
          break;
        case "total":
          aVal = a.total;
          bVal = b.total;
          break;
        default:
          aVal = a.itemNo;
          bVal = b.itemNo;
      }

      if (typeof aVal === "string") {
        return sortDirection === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      } else {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }
    });

    setFilteredItems(filtered);
  }

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  }

  function clearFilters() {
    setSearchQuery("");
    setSelectedCategory("all");
    setMinCost("");
    setMaxCost("");
    setSortField("itemNo");
    setSortDirection("asc");
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

  const handleExport = () => {
    if (!selectedProject || items.length === 0) {
      toast({ title: "No data to export", variant: "destructive" });
      return;
    }
    const project = projects.find(p => p.id === selectedProject);
    exportBOQToExcel(items, project?.name || "Project");
    toast({ title: "Exported to Excel successfully!" });
  };

  const handlePrint = () => {
    if (!selectedProject || items.length === 0) {
      toast({ title: "No data to print", variant: "destructive" });
      return;
    }
    const project = projects.find(p => p.id === selectedProject);
    printBOQ(items, project?.name || "Project");
  };

  const handleCreateBOQFromAI = async (items: Partial<BOQItem>[]) => {
    try {
      for (const item of items) {
        await createBOQItem(item);
      }
      toast({
        title: "BOQ items created successfully!",
        description: `Added ${items.length} items from AI analysis`,
      });
      loadBOQItems();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create BOQ items",
        variant: "destructive",
      });
    }
  };

  // Calculate summary
  const totalMaterialCost = filteredItems.reduce((sum, item) => sum + item.materialCost, 0);
  const totalLaborCost = filteredItems.reduce((sum, item) => sum + item.laborCost, 0);
  const totalCost = totalMaterialCost + totalLaborCost;

  const significantChanges = priceChanges.filter((c) => Math.abs(c.priceChangePercent) > 10);

  // Group items by category for grouped view
  const groupedItems = filteredItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, BOQItem[]>);

  const activeFiltersCount = 
    (selectedCategory !== "all" ? 1 : 0) +
    (searchQuery ? 1 : 0) +
    (minCost ? 1 : 0) +
    (maxCost ? 1 : 0);

  return (
    <CRMLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Bill of Quantities (BOQ)</h1>
            <p className="text-muted-foreground mt-1">
              DPWH-style estimation with automated cost calculation
            </p>
          </div>
          <div className="flex gap-2">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={!selectedProject || items.length === 0}
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Export to Excel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                disabled={!selectedProject || items.length === 0}
              >
                <Printer className="w-4 h-4 mr-2" />
                Print BOQ
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshCosts}
                disabled={!selectedProject || refreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
                Refresh Costs
              </Button>

              <Button onClick={() => setShowGenerateBOQ(true)} disabled={!selectedProject}>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate BOQ from Drawings
              </Button>
            </div>
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
                  {activeFiltersCount > 0 && ` • ${activeFiltersCount} filter${activeFiltersCount > 1 ? 's' : ''} active`}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters and Controls */}
        {selectedProject && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Filters & View Options</CardTitle>
                <div className="flex items-center gap-2">
                  <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
                    <TabsList>
                      <TabsTrigger value="flat">Flat List</TabsTrigger>
                      <TabsTrigger value="grouped">Grouped</TabsTrigger>
                    </TabsList>
                  </Tabs>
                  {activeFiltersCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      Clear Filters
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Search */}
                <div className="space-y-2">
                  <Label>Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Item, code, description..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Category Filter */}
                <div className="space-y-2">
                  <Label>Category</Label>
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

                {/* Cost Range */}
                <div className="space-y-2">
                  <Label>Min Cost</Label>
                  <Input
                    type="number"
                    placeholder="₱0"
                    value={minCost}
                    onChange={(e) => setMinCost(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Max Cost</Label>
                  <Input
                    type="number"
                    placeholder="₱999,999"
                    value={maxCost}
                    onChange={(e) => setMaxCost(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* BOQ Table */}
        {selectedProject && (
          <Card>
            <CardHeader>
              <CardTitle>BOQ Items</CardTitle>
              <CardDescription>
                {viewMode === "grouped" ? "Grouped by category" : "Flat list view"}
                {` • ${filteredItems.length} item${filteredItems.length !== 1 ? 's' : ''}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredItems.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  {items.length === 0 
                    ? "No BOQ items found. Add your first item to get started."
                    : "No items match your filters. Try adjusting your search criteria."}
                </div>
              ) : viewMode === "flat" ? (
                // Flat list view
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b">
                      <tr className="text-left text-sm text-muted-foreground">
                        <th className="pb-3 font-medium cursor-pointer hover:text-foreground" onClick={() => handleSort("itemNo")}>
                          <div className="flex items-center gap-1">
                            Item No
                            <ArrowUpDown className="h-3 w-3" />
                          </div>
                        </th>
                        <th className="pb-3 font-medium">DPWH Code</th>
                        <th className="pb-3 font-medium cursor-pointer hover:text-foreground" onClick={() => handleSort("description")}>
                          <div className="flex items-center gap-1">
                            Description
                            <ArrowUpDown className="h-3 w-3" />
                          </div>
                        </th>
                        <th className="pb-3 font-medium cursor-pointer hover:text-foreground" onClick={() => handleSort("category")}>
                          <div className="flex items-center gap-1">
                            Category
                            <ArrowUpDown className="h-3 w-3" />
                          </div>
                        </th>
                        <th className="pb-3 font-medium text-right cursor-pointer hover:text-foreground" onClick={() => handleSort("quantity")}>
                          <div className="flex items-center justify-end gap-1">
                            Qty
                            <ArrowUpDown className="h-3 w-3" />
                          </div>
                        </th>
                        <th className="pb-3 font-medium">Unit</th>
                        <th className="pb-3 font-medium text-right cursor-pointer hover:text-foreground" onClick={() => handleSort("materialCost")}>
                          <div className="flex items-center justify-end gap-1">
                            Material
                            <ArrowUpDown className="h-3 w-3" />
                          </div>
                        </th>
                        <th className="pb-3 font-medium text-right cursor-pointer hover:text-foreground" onClick={() => handleSort("laborCost")}>
                          <div className="flex items-center justify-end gap-1">
                            Labor
                            <ArrowUpDown className="h-3 w-3" />
                          </div>
                        </th>
                        <th className="pb-3 font-medium text-right cursor-pointer hover:text-foreground" onClick={() => handleSort("total")}>
                          <div className="flex items-center justify-end gap-1">
                            Total
                            <ArrowUpDown className="h-3 w-3" />
                          </div>
                        </th>
                        <th className="pb-3 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedData.map((item) => (
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
              ) : (
                // Grouped view
                <div className="space-y-6">
                  {Object.entries(groupedItems).map(([category, categoryItems]) => {
                    const categoryMaterial = categoryItems.reduce((sum, item) => sum + item.materialCost, 0);
                    const categoryLabor = categoryItems.reduce((sum, item) => sum + item.laborCost, 0);
                    const categoryTotal = categoryMaterial + categoryLabor;

                    return (
                      <div key={category} className="border rounded-lg overflow-hidden">
                        <div className="bg-accent/50 px-4 py-3 border-b">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <h3 className="font-semibold">
                                {BOQ_CATEGORIES.find(c => c.value === category)?.label || category}
                              </h3>
                              <Badge variant="secondary">{categoryItems.length} items</Badge>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-primary">
                                {formatPeso(categoryTotal)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Material: {formatPeso(categoryMaterial)} • Labor: {formatPeso(categoryLabor)}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className="border-b bg-muted/30">
                              <tr className="text-left text-xs text-muted-foreground">
                                <th className="p-3 font-medium">Item No</th>
                                <th className="p-3 font-medium">Description</th>
                                <th className="p-3 font-medium text-right">Qty</th>
                                <th className="p-3 font-medium">Unit</th>
                                <th className="p-3 font-medium text-right">Material</th>
                                <th className="p-3 font-medium text-right">Labor</th>
                                <th className="p-3 font-medium text-right">Total</th>
                                <th className="p-3 font-medium text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {categoryItems.map((item) => (
                                <tr key={item.id} className="border-b hover:bg-accent/30">
                                  <td className="p-3 font-medium text-sm">{item.itemNo}</td>
                                  <td className="p-3">
                                    <div className="font-medium text-sm">{item.description}</div>
                                    {item.dpwhItemCode && (
                                      <div className="text-xs text-muted-foreground">{item.dpwhItemCode}</div>
                                    )}
                                  </td>
                                  <td className="p-3 text-right text-sm">{item.quantity}</td>
                                  <td className="p-3 text-sm">{item.unit}</td>
                                  <td className="p-3 text-right text-sm font-medium">
                                    {formatPeso(item.materialCost)}
                                  </td>
                                  <td className="p-3 text-right text-sm font-medium">
                                    {formatPeso(item.laborCost)}
                                  </td>
                                  <td className="p-3 text-right font-bold text-primary text-sm">
                                    {formatPeso(item.total)}
                                  </td>
                                  <td className="p-3 text-right">
                                    <div className="flex justify-end gap-1">
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
                          </table>
                        </div>
                      </div>
                    );
                  })}
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

        {/* Generate BOQ from Drawings Dialog */}
        <GenerateBOQDialog
          open={showGenerateBOQ}
          onOpenChange={setShowGenerateBOQ}
          projectId={selectedProject}
          onCreateBOQItems={handleCreateBOQFromAI}
        />
      </div>
    </CRMLayout>
  );
}