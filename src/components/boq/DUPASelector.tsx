/**
 * DUPA Item Selector Component
 * Allows users to search and select standard DUPA items for BOQ
 */

import React, { useState, useEffect } from "react";
import { Search, Info, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getDUPAItems, getDUPAItemById, calculateDUPACosts } from "@/services/dupaService";
import type { DUPAItem, DUPAMaterialAnalysis, DUPALaborAnalysis, DUPAEquipmentAnalysis } from "@/types";
import { formatPeso } from "@/lib/boqCalculations";

interface DUPASelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (dupaItem: {
    id: string;
    itemCode: string;
    description: string;
    unit: string;
    materialCost: number;
    laborCost: number;
    equipmentCost: number;
    unitCost: number;
    totalCost: number;
  }) => void;
  quantity: number;
}

export function DUPASelector({ open, onClose, onSelect, quantity }: DUPASelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [items, setItems] = useState<DUPAItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<DUPAItem | null>(null);
  const [itemDetails, setItemDetails] = useState<{
    materials: DUPAMaterialAnalysis[];
    labor: DUPALaborAnalysis[];
    equipment: DUPAEquipmentAnalysis[];
  } | null>(null);
  const [calculatedCost, setCalculatedCost] = useState<{
    materialCost: number;
    laborCost: number;
    equipmentCost: number;
    unitCost: number;
    totalCost: number;
  } | null>(null);

  useEffect(() => {
    if (open) {
      loadDUPAItems();
    }
  }, [open, searchTerm]);

  useEffect(() => {
    if (selectedItem && quantity > 0) {
      loadItemDetails(selectedItem.id);
    }
  }, [selectedItem, quantity]);

  const loadDUPAItems = async () => {
    setLoading(true);
    try {
      const result = await getDUPAItems({
        searchTerm,
        limit: 50,
      });
      setItems(result.items);
    } catch (error) {
      console.error("Error loading DUPA items:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadItemDetails = async (dupaItemId: string) => {
    try {
      const details = await getDUPAItemById(dupaItemId);
      if (details) {
        setItemDetails({
          materials: details.materials,
          labor: details.labor,
          equipment: details.equipment,
        });

        // Calculate costs
        const costs = await calculateDUPACosts(dupaItemId, quantity);
        if (costs) {
          setCalculatedCost({
            materialCost: costs.materialCost,
            laborCost: costs.laborCost,
            equipmentCost: costs.equipmentCost,
            unitCost: costs.unitCost,
            totalCost: costs.totalCost,
          });
        }
      }
    } catch (error) {
      console.error("Error loading item details:", error);
    }
  };

  const handleSelect = () => {
    if (selectedItem && calculatedCost) {
      onSelect({
        id: selectedItem.id,
        itemCode: selectedItem.itemCode,
        description: selectedItem.description,
        unit: selectedItem.unit,
        ...calculatedCost,
      });
      onClose();
      setSelectedItem(null);
      setItemDetails(null);
      setCalculatedCost(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select DUPA Standard Item</DialogTitle>
          <DialogDescription>
            Search and select a standard work item with predefined material, labor, and equipment analysis
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by item code or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Items List */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted px-4 py-2 font-medium">Available DUPA Items</div>
              <div className="max-h-[400px] overflow-y-auto">
                {loading ? (
                  <div className="p-8 text-center text-muted-foreground">Loading...</div>
                ) : items.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    No DUPA items found. Try a different search term.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Base Cost</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow
                          key={item.id}
                          className={`cursor-pointer ${
                            selectedItem?.id === item.id ? "bg-accent" : ""
                          }`}
                          onClick={() => setSelectedItem(item)}
                        >
                          <TableCell className="font-mono text-xs">{item.itemCode}</TableCell>
                          <TableCell className="text-sm">{item.description}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.unit}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">{formatPeso(item.baseUnitCost)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>

            {/* Item Details */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted px-4 py-2 font-medium">Item Analysis</div>
              <div className="max-h-[400px] overflow-y-auto p-4">
                {!selectedItem ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <Info className="h-12 w-12 mb-2" />
                    <p>Select an item to view details</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Item Info */}
                    <div>
                      <h3 className="font-semibold mb-2">{selectedItem.description}</h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Code:</span>{" "}
                          <span className="font-mono">{selectedItem.itemCode}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Unit:</span>{" "}
                          <Badge variant="outline">{selectedItem.unit}</Badge>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Category:</span>{" "}
                          {selectedItem.category}
                        </div>
                      </div>
                    </div>

                    {/* Cost Summary */}
                    {calculatedCost && (
                      <div className="border rounded-lg p-3 bg-accent/50">
                        <h4 className="font-semibold mb-2">Cost Summary (Qty: {quantity})</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Material Cost:</span>
                            <span className="font-mono">{formatPeso(calculatedCost.materialCost)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Labor Cost:</span>
                            <span className="font-mono">{formatPeso(calculatedCost.laborCost)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Equipment Cost:</span>
                            <span className="font-mono">{formatPeso(calculatedCost.equipmentCost)}</span>
                          </div>
                          <div className="border-t pt-1 mt-1 flex justify-between font-semibold">
                            <span>Total Cost:</span>
                            <span className="font-mono">{formatPeso(calculatedCost.totalCost)}</span>
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Unit Cost:</span>
                            <span className="font-mono">{formatPeso(calculatedCost.unitCost)}/{selectedItem.unit}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Material Analysis */}
                    {itemDetails && itemDetails.materials.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2 text-sm">Material Analysis</h4>
                        <div className="space-y-1">
                          {itemDetails.materials.map((m) => (
                            <div key={m.id} className="text-xs flex justify-between">
                              <span>{m.materialName}</span>
                              <span className="text-muted-foreground">
                                {m.coefficient} {m.unit} @ {formatPeso(m.unitPrice)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Labor Analysis */}
                    {itemDetails && itemDetails.labor.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2 text-sm">Labor Analysis</h4>
                        <div className="space-y-1">
                          {itemDetails.labor.map((l) => (
                            <div key={l.id} className="text-xs flex justify-between">
                              <span>{l.laborType}</span>
                              <span className="text-muted-foreground">
                                {l.coefficient} hrs @ {formatPeso(l.hourlyRate)}/hr
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Equipment Analysis */}
                    {itemDetails && itemDetails.equipment.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2 text-sm">Equipment Analysis</h4>
                        <div className="space-y-1">
                          {itemDetails.equipment.map((e) => (
                            <div key={e.id} className="text-xs flex justify-between">
                              <span>{e.equipmentName}</span>
                              <span className="text-muted-foreground">
                                {e.coefficient} hrs @ {formatPeso(e.hourlyRate)}/hr
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSelect}
              disabled={!selectedItem || !calculatedCost}
              className="gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              Use This DUPA Item
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}