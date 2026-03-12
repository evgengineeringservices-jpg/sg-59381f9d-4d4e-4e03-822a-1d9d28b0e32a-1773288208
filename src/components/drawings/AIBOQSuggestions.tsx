import { useState } from "react";
import { Sparkles, CheckCircle, XCircle, Edit, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { formatPeso } from "@/lib/boqCalculations";
import type { BOQItem } from "@/types";

interface AIBOQSuggestionsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  drawingId: string;
  extractedData: any;
  onCreateBOQItems: (items: Partial<BOQItem>[]) => Promise<void>;
}

export function AIBOQSuggestions({
  open,
  onOpenChange,
  drawingId,
  extractedData,
  onCreateBOQItems,
}: AIBOQSuggestionsProps) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState([
    {
      id: "1",
      itemNo: "100.1",
      description: "Excavation for Foundation",
      category: "Earthworks",
      unit: "cu.m",
      quantity: 45,
      estimatedMaterialCost: 135000,
      estimatedLaborCost: 47250,
      confidence: 92,
      source: "Extracted from floor area and foundation depth",
    },
    {
      id: "2",
      itemNo: "200.1",
      description: "Plain Concrete for Foundation",
      category: "Concrete Works",
      unit: "cu.m",
      quantity: 12,
      estimatedMaterialCost: 96000,
      estimatedLaborCost: 33600,
      confidence: 88,
      source: "Based on foundation dimensions",
    },
    {
      id: "3",
      itemNo: "200.2",
      description: "Reinforced Concrete Column",
      category: "Concrete Works",
      unit: "cu.m",
      quantity: 8,
      estimatedMaterialCost: 72000,
      estimatedLaborCost: 25200,
      confidence: 85,
      source: "Estimated from structural layout",
    },
    {
      id: "4",
      itemNo: "300.1",
      description: "CHB Wall Laying - 6 inches",
      category: "Masonry",
      unit: "sq.m",
      quantity: 280,
      estimatedMaterialCost: 168000,
      estimatedLaborCost: 58800,
      confidence: 95,
      source: "Calculated from wall lengths and heights",
    },
    {
      id: "5",
      itemNo: "500.1",
      description: "Solid Wood Door - Main Entrance",
      category: "Doors & Windows",
      unit: "pcs",
      quantity: 1,
      estimatedMaterialCost: 25000,
      estimatedLaborCost: 8750,
      confidence: 90,
      source: "Detected from floor plan symbols",
    },
    {
      id: "6",
      itemNo: "500.2",
      description: "Aluminum Sliding Windows",
      category: "Doors & Windows",
      unit: "pcs",
      quantity: 8,
      estimatedMaterialCost: 64000,
      estimatedLaborCost: 22400,
      confidence: 87,
      source: "Counted from elevation drawings",
    },
  ]);

  function toggleItem(id: string) {
    const newSet = new Set(selectedItems);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedItems(newSet);
  }

  function toggleAll() {
    if (selectedItems.size === suggestions.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(suggestions.map((s) => s.id)));
    }
  }

  function updateQuantity(id: string, newQuantity: number) {
    setSuggestions(
      suggestions.map((s) =>
        s.id === id
          ? {
              ...s,
              quantity: newQuantity,
              estimatedMaterialCost: (s.estimatedMaterialCost / s.quantity) * newQuantity,
              estimatedLaborCost: (s.estimatedLaborCost / s.quantity) * newQuantity,
            }
          : s
      )
    );
    setEditingItem(null);
  }

  async function handleCreateSelected() {
    const itemsToCreate = suggestions
      .filter((s) => selectedItems.has(s.id))
      .map((s) => ({
        itemNo: s.itemNo,
        description: s.description,
        category: s.category as any,
        unit: s.unit as any,
        quantity: s.quantity,
        materialCost: s.estimatedMaterialCost,
        laborCost: s.estimatedLaborCost,
        unitCost: (s.estimatedMaterialCost + s.estimatedLaborCost) / s.quantity,
        total: s.estimatedMaterialCost + s.estimatedLaborCost,
      }));

    await onCreateBOQItems(itemsToCreate);
    onOpenChange(false);
  }

  const totalSelected = suggestions
    .filter((s) => selectedItems.has(s.id))
    .reduce((sum, s) => sum + s.estimatedMaterialCost + s.estimatedLaborCost, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI-Generated BOQ Suggestions
          </DialogTitle>
          <DialogDescription>
            Review and select items to add to your BOQ. You can edit quantities before
            creating.
          </DialogDescription>
        </DialogHeader>

        {/* Selection Header */}
        <div className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={selectedItems.size === suggestions.length}
              onCheckedChange={toggleAll}
            />
            <span className="text-sm font-medium">
              {selectedItems.size} of {suggestions.length} selected
            </span>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">Total: </span>
            <span className="font-bold text-primary">{formatPeso(totalSelected)}</span>
          </div>
        </div>

        {/* Suggestions List */}
        <div className="space-y-2">
          {suggestions.map((item) => (
            <div
              key={item.id}
              className={`p-4 border rounded-lg transition-colors ${
                selectedItems.has(item.id) ? "bg-primary/5 border-primary/30" : ""
              }`}
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={selectedItems.has(item.id)}
                  onCheckedChange={() => toggleItem(item.id)}
                  className="mt-1"
                />

                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{item.itemNo}</span>
                        <h4 className="font-semibold">{item.description}</h4>
                      </div>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline">{item.category}</Badge>
                        <Badge variant="secondary" className="text-xs">
                          {item.confidence}% confidence
                        </Badge>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xl font-bold text-primary">
                        {formatPeso(item.estimatedMaterialCost + item.estimatedLaborCost)}
                      </div>
                      <div className="text-xs text-muted-foreground">Total Cost</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Quantity</p>
                      {editingItem === item.id ? (
                        <div className="flex gap-1">
                          <Input
                            type="number"
                            step="0.01"
                            defaultValue={item.quantity}
                            className="h-7 w-20"
                            onBlur={(e) =>
                              updateQuantity(item.id, parseFloat(e.target.value))
                            }
                            autoFocus
                          />
                          <span className="text-xs self-center">{item.unit}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <p className="font-medium">
                            {item.quantity} {item.unit}
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2"
                            onClick={() => setEditingItem(item.id)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-muted-foreground">Material</p>
                      <p className="font-medium">{formatPeso(item.estimatedMaterialCost)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Labor</p>
                      <p className="font-medium">{formatPeso(item.estimatedLaborCost)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Unit Cost</p>
                      <p className="font-medium">
                        {formatPeso(
                          (item.estimatedMaterialCost + item.estimatedLaborCost) /
                            item.quantity
                        )}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground italic">
                    <strong>Source:</strong> {item.source}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateSelected}
            disabled={selectedItems.size === 0}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Create {selectedItems.size} BOQ Items
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}