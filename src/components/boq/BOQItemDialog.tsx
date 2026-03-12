import { useState, useEffect } from "react";
import { TrendingUp, Calculator, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BOQ_CATEGORIES, DPWH_UNITS } from "@/constants";
import { autoCalculateBOQItem, formatPeso } from "@/lib/boqCalculations";
import { PriceSuggestionModal } from "./PriceSuggestionModal";
import type { BOQItem } from "@/types";
import Link from "next/link";

interface BOQItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: BOQItem | null;
  projectId: string;
  onSave: (data: Partial<BOQItem>) => Promise<void>;
}

export function BOQItemDialog({
  open,
  onOpenChange,
  item,
  projectId,
  onSave,
}: BOQItemDialogProps) {
  const [formData, setFormData] = useState({
    itemNo: "",
    dpwhItemCode: "",
    description: "",
    category: "",
    unit: "",
    quantity: "",
    unitCost: "",
    laborCost: "",
    materialCost: "",
  });
  const [autoMode, setAutoMode] = useState(true);
  const [calculatedCosts, setCalculatedCosts] = useState<any>(null);
  const [calculating, setCalculating] = useState(false);
  const [showPriceSuggestion, setShowPriceSuggestion] = useState(false);

  useEffect(() => {
    if (item) {
      setFormData({
        itemNo: item.itemNo,
        dpwhItemCode: item.dpwhItemCode || "",
        description: item.description,
        category: item.category,
        unit: item.unit,
        quantity: item.quantity.toString(),
        unitCost: item.unitCost?.toString() || "",
        laborCost: item.laborCost?.toString() || "",
        materialCost: item.materialCost?.toString() || "",
      });
      setAutoMode(false);
    } else {
      setFormData({
        itemNo: "",
        dpwhItemCode: "",
        description: "",
        category: "",
        unit: "",
        quantity: "",
        unitCost: "",
        laborCost: "",
        materialCost: "",
      });
      setAutoMode(true);
      setCalculatedCosts(null);
    }
  }, [item, open]);

  useEffect(() => {
    if (
      autoMode &&
      formData.description &&
      formData.category &&
      formData.unit &&
      formData.quantity &&
      parseFloat(formData.quantity) > 0
    ) {
      calculateCosts();
    }
  }, [
    formData.description,
    formData.category,
    formData.unit,
    formData.quantity,
    autoMode,
  ]);

  async function calculateCosts() {
    try {
      setCalculating(true);
      const costs = await autoCalculateBOQItem({
        description: formData.description,
        category: formData.category,
        unit: formData.unit,
        quantity: parseFloat(formData.quantity),
      });
      setCalculatedCosts(costs);
    } catch (error) {
      console.error("Auto-calculation failed:", error);
      setCalculatedCosts(null);
    } finally {
      setCalculating(false);
    }
  }

  function handlePriceSelect(price: number, source: string) {
    const quantity = parseFloat(formData.quantity) || 1;
    const materialCost = price * quantity;
    setFormData({
      ...formData,
      materialCost: materialCost.toString(),
    });
    setAutoMode(false);
  }

  async function handleSubmit() {
    const quantity = parseFloat(formData.quantity);
    const materialCost = autoMode && calculatedCosts
      ? calculatedCosts.materialCost
      : parseFloat(formData.materialCost) || 0;
    const laborCost = autoMode && calculatedCosts
      ? calculatedCosts.laborCost
      : parseFloat(formData.laborCost) || 0;
    const unitCost = (materialCost + laborCost) / quantity;
    const total = materialCost + laborCost;

    await onSave({
      projectId,
      itemNo: formData.itemNo,
      dpwhItemCode: formData.dpwhItemCode || null,
      description: formData.description,
      category: formData.category as any,
      unit: formData.unit as any,
      quantity,
      materialCost,
      laborCost,
      unitCost,
      total,
    });

    onOpenChange(false);
  }

  const canCalculate =
    formData.description &&
    formData.category &&
    formData.unit &&
    formData.quantity &&
    parseFloat(formData.quantity) > 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {item ? "Edit BOQ Item" : "Add BOQ Item"}
            </DialogTitle>
            <DialogDescription>
              {autoMode
                ? "Auto-calculation enabled - costs will be computed from market prices"
                : "Manual mode - enter costs directly"}
            </DialogDescription>
          </DialogHeader>

          {/* Auto Mode Toggle */}
          <div className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              <span className="text-sm font-medium">Auto-calculate costs</span>
            </div>
            <Button
              variant={autoMode ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoMode(!autoMode)}
            >
              {autoMode ? "Auto" : "Manual"}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Item Number */}
            <div className="space-y-2">
              <Label htmlFor="itemNo">Item No. *</Label>
              <Input
                id="itemNo"
                value={formData.itemNo}
                onChange={(e) =>
                  setFormData({ ...formData, itemNo: e.target.value })
                }
                placeholder="e.g., 101.1"
              />
            </div>

            {/* DPWH Code */}
            <div className="space-y-2">
              <Label htmlFor="dpwhItemCode">DPWH Item Code</Label>
              <Input
                id="dpwhItemCode"
                value={formData.dpwhItemCode}
                onChange={(e) =>
                  setFormData({ ...formData, dpwhItemCode: e.target.value })
                }
                placeholder="e.g., 300-01"
              />
            </div>

            {/* Description */}
            <div className="space-y-2 col-span-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="e.g., Solid Wood Door Panel - Narra 2100x900x50mm"
                rows={2}
              />
            </div>

            {/* Category */}
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

            {/* Unit */}
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

            {/* Quantity */}
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({ ...formData, quantity: e.target.value })
                }
                placeholder="0.00"
              />
            </div>

            {/* Price Suggestion Button */}
            {!autoMode && (
              <div className="space-y-2">
                <Label>Market Price Lookup</Label>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowPriceSuggestion(true)}
                  disabled={!canCalculate}
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Get Price Suggestions
                </Button>
              </div>
            )}

            {/* Auto-Calculated Costs Display */}
            {autoMode && calculatedCosts && (
              <div className="col-span-2 p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="default" className="text-xs">
                    Auto-Calculated
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Based on highest current market price
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Material Cost</p>
                    <p className="font-semibold text-lg">
                      {formatPeso(calculatedCosts.materialCost)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Labor Cost (35%)</p>
                    <p className="font-semibold text-lg">
                      {formatPeso(calculatedCosts.laborCost)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total Cost</p>
                    <p className="font-semibold text-lg text-primary">
                      {formatPeso(calculatedCosts.totalCost)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Manual Cost Entry */}
            {!autoMode && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="materialCost">Material Cost (PHP)</Label>
                  <Input
                    id="materialCost"
                    type="number"
                    step="0.01"
                    value={formData.materialCost}
                    onChange={(e) =>
                      setFormData({ ...formData, materialCost: e.target.value })
                    }
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="laborCost">Labor Cost (PHP)</Label>
                  <Input
                    id="laborCost"
                    type="number"
                    step="0.01"
                    value={formData.laborCost}
                    onChange={(e) =>
                      setFormData({ ...formData, laborCost: e.target.value })
                    }
                    placeholder="0.00"
                  />
                </div>
              </>
            )}

            {/* No Market Data Warning */}
            {autoMode && !calculating && !calculatedCosts && canCalculate && (
              <div className="col-span-2">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No matching market prices found. Switch to manual mode or{" "}
                    <Link href="/crm/admin/market-prices" className="underline font-medium">
                      add market prices
                    </Link>.
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!canCalculate}>
              {item ? "Update" : "Create"} Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Price Suggestion Modal */}
      <PriceSuggestionModal
        open={showPriceSuggestion}
        onOpenChange={setShowPriceSuggestion}
        description={formData.description}
        category={formData.category}
        unit={formData.unit}
        onSelectPrice={handlePriceSelect}
      />
    </>
  );
}