import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { CRMLayout } from "@/components/layout/CRMLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  BookOpen,
  Search,
  Plus,
  Edit,
  Trash2,
  Upload,
  Download,
  Calculator,
  AlertCircle,
  CheckCircle,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  getDUPAItems,
  getDUPAItemById,
  createDUPAItem,
  updateDUPAItem,
  deleteDUPAItem,
  calculateDUPACosts,
  syncDUPAWithMarketPrices,
  importDUPAFromExcel,
} from "@/services/dupaService";
import { formatPeso } from "@/lib/boqCalculations";
import { BOQ_CATEGORIES, DPWH_UNITS } from "@/constants";
import type { DUPAItem, DUPAMaterialAnalysis, DUPALaborAnalysis, DUPAEquipmentAnalysis } from "@/types";
import { useToast } from "@/components/ui/use-toast";

type FullDUPAItem = DUPAItem & {
  materials?: DUPAMaterialAnalysis[];
  labor?: DUPALaborAnalysis[];
  equipment?: DUPAEquipmentAnalysis[];
};

export default function DUPALibraryPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [dupaItems, setDupaItems] = useState<DUPAItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showDialog, setShowDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<FullDUPAItem | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [calculatedCost, setCalculatedCost] = useState<any>(null);
  const [syncingPrices, setSyncingPrices] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = typeof window !== "undefined" ? document.createElement("input") : null;
  const { toast } = useToast();

  // Setup file input for Excel import
  useEffect(() => {
    if (fileInputRef) {
      fileInputRef.type = "file";
      fileInputRef.accept = ".xlsx, .xls, .csv";
      fileInputRef.onchange = handleFileUpload;
    }
  }, []);

  // Form state
  const [formData, setFormData] = useState({
    itemCode: "",
    description: "",
    category: "",
    unit: "",
    notes: "",
    materials: [] as Omit<DUPAMaterialAnalysis, "id" | "dupaItemId">[],
    labor: [] as Omit<DUPALaborAnalysis, "id" | "dupaItemId">[],
    equipment: [] as Omit<DUPAEquipmentAnalysis, "id" | "dupaItemId">[],
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/crm/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    loadDUPAItems();
  }, []);

  async function loadDUPAItems() {
    try {
      setLoading(true);
      const res = await getDUPAItems();
      setDupaItems(res.items);
    } catch (error) {
      console.error("Failed to load DUPA items:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      const itemData = {
        itemCode: formData.itemCode,
        description: formData.description,
        category: formData.category as any,
        unit: formData.unit as any,
        notes: formData.notes || null,
        materials: formData.materials as any,
        labor: formData.labor as any,
        equipment: formData.equipment as any,
      };

      if (editingItem) {
        await updateDUPAItem(editingItem.id, itemData);
      } else {
        await createDUPAItem(itemData);
      }

      await loadDUPAItems();
      handleCloseDialog();
      toast({ title: editingItem ? "DUPA Item updated" : "DUPA Item created successfully" });
    } catch (error) {
      console.error("Failed to save DUPA item:", error);
      toast({ title: "Failed to save DUPA item", variant: "destructive" });
    }
  }

  async function handleSyncWithMarketPrices(id: string) {
    try {
      setSyncingPrices(true);
      const result = await syncDUPAWithMarketPrices(id);
      if (result.updatedCount > 0) {
        toast({ 
          title: "Market Prices Synced", 
          description: `Updated ${result.updatedCount} material prices from the market database.` 
        });
        
        // Refresh the current dialog if it's open
        if (editingItem && editingItem.id === id) {
          handleEdit({ id } as DUPAItem);
        } else {
          await loadDUPAItems();
        }
      } else {
        toast({ 
          title: "Prices up to date", 
          description: "No material prices needed updating from the market database." 
        });
      }
    } catch (error) {
      console.error("Failed to sync prices:", error);
      toast({ title: "Failed to sync market prices", variant: "destructive" });
    } finally {
      setSyncingPrices(false);
    }
  }

  async function handleFileUpload(event: any) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setImporting(true);
      toast({ title: "Importing DUPA items...", description: "Please wait while we process the file." });
      
      const buffer = await file.arrayBuffer();
      const result = await importDUPAFromExcel(buffer);

      if (result.success > 0) {
        toast({ 
          title: "Import Successful", 
          description: `Successfully imported ${result.success} DUPA items. Failed: ${result.failed}` 
        });
        await loadDUPAItems();
      } else {
        toast({ 
          title: "Import Failed", 
          description: result.errors[0] || "Failed to import items", 
          variant: "destructive" 
        });
      }
    } catch (error) {
      console.error("Import error:", error);
      toast({ title: "Import Failed", description: "An unexpected error occurred", variant: "destructive" });
    } finally {
      setImporting(false);
      // Reset file input
      if (fileInputRef) fileInputRef.value = "";
    }
  }

  async function handleEdit(item: DUPAItem) {
    try {
      const fullItem = await getDUPAItemById(item.id);
      if (!fullItem) return;
      
      setEditingItem(fullItem.item);
      setFormData({
        itemCode: fullItem.item.itemCode,
        description: fullItem.item.description,
        category: fullItem.item.category,
        unit: fullItem.item.unit,
        notes: fullItem.item.notes || "",
        materials: fullItem.materials || [],
        labor: fullItem.labor || [],
        equipment: fullItem.equipment || [],
      });
      
      // Calculate cost preview
      const cost = await calculateDUPACosts(fullItem.item.id, 1);
      setCalculatedCost(cost);
      
      setShowDialog(true);
    } catch (error) {
      console.error("Failed to load DUPA item:", error);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteDUPAItem(id);
      await loadDUPAItems();
      setShowDeleteConfirm(false);
      setItemToDelete(null);
    } catch (error) {
      console.error("Failed to delete DUPA item:", error);
      alert("Failed to delete DUPA item. Please try again.");
    }
  }

  function handleCloseDialog() {
    setShowDialog(false);
    setEditingItem(null);
    setCalculatedCost(null);
    setFormData({
      itemCode: "",
      description: "",
      category: "",
      unit: "",
      notes: "",
      materials: [],
      labor: [],
      equipment: [],
    });
  }

  function addMaterialRow() {
    setFormData({
      ...formData,
      materials: [
        ...formData.materials,
        {
          materialName: "",
          unit: "pcs" as any,
          coefficient: 0,
          unitPrice: 0,
          wastePercentage: 0,
          notes: "",
        },
      ],
    });
  }

  function addLaborRow() {
    setFormData({
      ...formData,
      labor: [
        ...formData.labor,
        {
          laborType: "",
          coefficient: 0,
          hourlyRate: 0,
          notes: "",
        },
      ],
    });
  }

  function addEquipmentRow() {
    setFormData({
      ...formData,
      equipment: [
        ...formData.equipment,
        {
          equipmentName: "",
          coefficient: 0,
          hourlyRate: 0,
          notes: "",
        },
      ],
    });
  }

  const filteredItems = dupaItems.filter((item) => {
    const matchesSearch =
      item.itemCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (authLoading || !user) {
    return null;
  }

  return (
    <CRMLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <BookOpen className="h-8 w-8 text-primary" />
              DUPA Library
            </h1>
            <p className="text-muted-foreground mt-1">
              Detailed Unit Price Analysis - Standard Work Items
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button 
              variant="outline" 
              onClick={() => fileInputRef?.click()}
              disabled={importing}
            >
              {importing ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              {importing ? "Importing..." : "Import"}
            </Button>
            <Button onClick={() => setShowDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add DUPA Item
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by code or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Categories" />
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
          </CardContent>
        </Card>

        {/* DUPA Items Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              Standard Work Items ({filteredItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading DUPA items...
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No DUPA items found. Add your first standard work item to get started.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Code</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <code className="font-mono text-sm bg-accent px-2 py-1 rounded">
                          {item.itemCode}
                        </code>
                      </TableCell>
                      <TableCell className="max-w-md">
                        <div className="font-medium">{item.description}</div>
                        {item.notes && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {item.notes}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {BOQ_CATEGORIES.find((c) => c.value === item.category)?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{item.unit}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Sync with Market Prices"
                            onClick={() => handleSyncWithMarketPrices(item.id)}
                            disabled={syncingPrices}
                          >
                            <RefreshCw className={`h-4 w-4 text-blue-500 ${syncingPrices ? 'animate-spin' : ''}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(item)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setItemToDelete(item.id);
                              setShowDeleteConfirm(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* DUPA Item Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? "Edit DUPA Item" : "Add DUPA Item"}
              </DialogTitle>
              <DialogDescription>
                Define standard unit price analysis with material, labor, and equipment components
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="itemCode">Item Code *</Label>
                  <Input
                    id="itemCode"
                    value={formData.itemCode}
                    onChange={(e) =>
                      setFormData({ ...formData, itemCode: e.target.value })
                    }
                    placeholder="e.g., 300-01"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unit">Unit *</Label>
                  <Select
                    value={formData.unit}
                    onValueChange={(value) =>
                      setFormData({ ...formData, unit: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {DPWH_UNITS.map((unit) => (
                        <SelectItem key={unit.value} value={unit.value}>
                          {unit.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="e.g., Concrete Hollow Blocks (CHB) 100mm"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) =>
                      setFormData({ ...formData, category: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
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
                  <Label htmlFor="notes">Notes / Specifications</Label>
                  <Input
                    id="notes"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    placeholder="e.g., Class A, 28-day strength"
                  />
                </div>
              </div>

              {/* Material Analysis */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Material Analysis</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addMaterialRow}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Material
                  </Button>
                </div>
                {formData.materials.map((material, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-4">
                      <Input
                        placeholder="Material name"
                        value={material.materialName}
                        onChange={(e) => {
                          const newMaterials = [...formData.materials];
                          newMaterials[index].materialName = e.target.value;
                          setFormData({ ...formData, materials: newMaterials });
                        }}
                      />
                    </div>
                    <div className="col-span-2">
                      <Select
                        value={material.unit}
                        onValueChange={(value: any) => {
                          const newMaterials = [...formData.materials];
                          newMaterials[index].unit = value;
                          setFormData({ ...formData, materials: newMaterials });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DPWH_UNITS.map((unit) => (
                            <SelectItem key={unit.value} value={unit.value}>
                              {unit.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Coefficient"
                        value={material.coefficient}
                        onChange={(e) => {
                          const newMaterials = [...formData.materials];
                          newMaterials[index].coefficient = parseFloat(e.target.value) || 0;
                          setFormData({ ...formData, materials: newMaterials });
                        }}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Unit Price"
                        value={material.unitPrice}
                        onChange={(e) => {
                          const newMaterials = [...formData.materials];
                          newMaterials[index].unitPrice = parseFloat(e.target.value) || 0;
                          setFormData({ ...formData, materials: newMaterials });
                        }}
                      />
                    </div>
                    <div className="col-span-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newMaterials = formData.materials.filter((_, i) => i !== index);
                          setFormData({ ...formData, materials: newMaterials });
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Labor Analysis */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Labor Analysis</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addLaborRow}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Labor
                  </Button>
                </div>
                {formData.labor.map((labor, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5">
                      <Input
                        placeholder="Labor type (e.g., Skilled mason)"
                        value={labor.laborType}
                        onChange={(e) => {
                          const newLabor = [...formData.labor];
                          newLabor[index].laborType = e.target.value;
                          setFormData({ ...formData, labor: newLabor });
                        }}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Coefficient"
                        value={labor.coefficient}
                        onChange={(e) => {
                          const newLabor = [...formData.labor];
                          newLabor[index].coefficient = parseFloat(e.target.value) || 0;
                          setFormData({ ...formData, labor: newLabor });
                        }}
                      />
                    </div>
                    <div className="col-span-3">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Hourly rate"
                        value={labor.hourlyRate}
                        onChange={(e) => {
                          const newLabor = [...formData.labor];
                          newLabor[index].hourlyRate = parseFloat(e.target.value) || 0;
                          setFormData({ ...formData, labor: newLabor });
                        }}
                      />
                    </div>
                    <div className="col-span-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newLabor = formData.labor.filter((_, i) => i !== index);
                          setFormData({ ...formData, labor: newLabor });
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Equipment Analysis */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Equipment Analysis</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addEquipmentRow}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Equipment
                  </Button>
                </div>
                {formData.equipment.map((equip, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5">
                      <Input
                        placeholder="Equipment name"
                        value={equip.equipmentName}
                        onChange={(e) => {
                          const newEquip = [...formData.equipment];
                          newEquip[index].equipmentName = e.target.value;
                          setFormData({ ...formData, equipment: newEquip });
                        }}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Coefficient"
                        value={equip.coefficient}
                        onChange={(e) => {
                          const newEquip = [...formData.equipment];
                          newEquip[index].coefficient = parseFloat(e.target.value) || 0;
                          setFormData({ ...formData, equipment: newEquip });
                        }}
                      />
                    </div>
                    <div className="col-span-3">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Hourly rate"
                        value={equip.hourlyRate}
                        onChange={(e) => {
                          const newEquip = [...formData.equipment];
                          newEquip[index].hourlyRate = parseFloat(e.target.value) || 0;
                          setFormData({ ...formData, equipment: newEquip });
                        }}
                      />
                    </div>
                    <div className="col-span-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newEquip = formData.equipment.filter((_, i) => i !== index);
                          setFormData({ ...formData, equipment: newEquip });
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Cost Preview */}
              {calculatedCost && (
                <Alert className="border-primary bg-primary/5">
                  <Calculator className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-semibold mb-2">Cost Preview (per unit)</div>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Material</p>
                        <p className="font-semibold">{formatPeso(calculatedCost.materialCost)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Labor</p>
                        <p className="font-semibold">{formatPeso(calculatedCost.laborCost)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Equipment</p>
                        <p className="font-semibold">{formatPeso(calculatedCost.equipmentCost)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Total</p>
                        <p className="font-semibold text-primary">{formatPeso(calculatedCost.unitCost)}</p>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              {editingItem && (
                <Button 
                  variant="outline" 
                  className="bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200"
                  onClick={() => handleSyncWithMarketPrices(editingItem.id)}
                  disabled={syncingPrices}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${syncingPrices ? 'animate-spin' : ''}`} />
                  Sync Market Prices
                </Button>
              )}
              <Button onClick={handleSave}>
                {editingItem ? "Update" : "Create"} DUPA Item
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete DUPA Item</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this DUPA item? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setItemToDelete(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => itemToDelete && handleDelete(itemToDelete)}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </CRMLayout>
  );
}