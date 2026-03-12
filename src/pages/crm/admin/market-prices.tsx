import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Search, TrendingUp, TrendingDown, RefreshCw, Calendar } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { formatPeso, checkMarketPriceChanges } from "@/lib/boqCalculations";
import {
  getMarketPrices,
  createMarketPrice,
  updateMarketPrice,
  deleteMarketPrice,
} from "@/services/crmService";
import type { MarketPrice } from "@/types";
import { DPWH_CATEGORIES, DPWH_UNITS } from "@/constants";
import { format } from "date-fns";

export default function MarketPricesPage() {
  const [prices, setPrices] = useState<MarketPrice[]>([]);
  const [filteredPrices, setFilteredPrices] = useState<MarketPrice[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPrice, setEditingPrice] = useState<MarketPrice | null>(null);
  const [priceChanges, setPriceChanges] = useState<any[]>([]);
  const [showPriceChanges, setShowPriceChanges] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    itemName: "",
    category: "",
    unit: "",
    price: "",
    supplier: "",
    location: "",
    source: "",
    notes: "",
  });

  useEffect(() => {
    loadPrices();
    loadPriceChanges();
  }, []);

  useEffect(() => {
    filterPrices();
  }, [searchTerm, selectedCategory, prices]);

  async function loadPrices() {
    try {
      setLoading(true);
      const data = await getMarketPrices();
      setPrices(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load market prices",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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

  function filterPrices() {
    let filtered = prices;

    if (searchTerm) {
      filtered = filtered.filter(
        (p) =>
          p.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.supplier?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategory && selectedCategory !== "all") {
      filtered = filtered.filter((p) => p.category === selectedCategory);
    }

    setFilteredPrices(filtered);
  }

  function openDialog(price?: MarketPrice) {
    if (price) {
      setEditingPrice(price);
      setFormData({
        itemName: price.itemName,
        category: price.category,
        unit: price.unit,
        price: price.price.toString(),
        supplier: price.supplier || "",
        location: price.location || "",
        source: price.source || "",
        notes: price.notes || "",
      });
    } else {
      setEditingPrice(null);
      setFormData({
        itemName: "",
        category: "",
        unit: "",
        price: "",
        supplier: "",
        location: "",
        source: "",
        notes: "",
      });
    }
    setIsDialogOpen(true);
  }

  async function handleSubmit() {
    try {
      const priceData = {
        itemName: formData.itemName,
        category: formData.category,
        unit: formData.unit,
        price: parseFloat(formData.price),
        supplier: formData.supplier || null,
        location: formData.location || null,
        source: formData.source || null,
        notes: formData.notes || null,
      };

      if (editingPrice) {
        await updateMarketPrice(editingPrice.id, priceData);
        toast({ title: "Market price updated successfully" });
      } else {
        await createMarketPrice(priceData);
        toast({ title: "Market price created successfully" });
      }

      setIsDialogOpen(false);
      loadPrices();
      loadPriceChanges();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save market price",
        variant: "destructive",
      });
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this market price?")) return;

    try {
      await deleteMarketPrice(id);
      toast({ title: "Market price deleted successfully" });
      loadPrices();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete market price",
        variant: "destructive",
      });
    }
  }

  const significantChanges = priceChanges.filter(
    (c) => Math.abs(c.priceChangePercent) > 10
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Market Prices</h1>
          <p className="text-muted-foreground mt-1">
            Manage construction material market prices for automated BOQ costing
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowPriceChanges(!showPriceChanges)}
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Price Changes
            {significantChanges.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {significantChanges.length}
              </Badge>
            )}
          </Button>
          <Button onClick={() => openDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Price
          </Button>
        </div>
      </div>

      {/* Price Change Alerts */}
      {showPriceChanges && significantChanges.length > 0 && (
        <Card className="border-amber-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-amber-500" />
              Significant Price Changes (Last 30 Days)
            </CardTitle>
            <CardDescription>
              Items with price changes greater than 10%
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {significantChanges.map((change, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium">{change.itemName}</p>
                    <p className="text-sm text-muted-foreground">
                      {change.category}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground line-through">
                        {formatPeso(change.oldPrice)}
                      </p>
                      <p className="font-semibold">
                        {formatPeso(change.newPrice)}
                      </p>
                    </div>
                    <Badge
                      variant={
                        change.priceChangePercent > 0
                          ? "destructive"
                          : "default"
                      }
                    >
                      {change.priceChangePercent > 0 ? "+" : ""}
                      {change.priceChangePercent.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by item name or supplier..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {DPWH_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={loadPrices}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Market Prices Table */}
      <Card>
        <CardHeader>
          <CardTitle>Market Prices ({filteredPrices.length})</CardTitle>
          <CardDescription>
            Current construction material prices from various suppliers
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading market prices...</div>
          ) : filteredPrices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No market prices found. Add your first price to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPrices.map((price) => (
                  <TableRow key={price.id}>
                    <TableCell className="font-medium">
                      {price.itemName}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{price.category}</Badge>
                    </TableCell>
                    <TableCell>{price.unit}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatPeso(price.price)}
                    </TableCell>
                    <TableCell>{price.supplier || "-"}</TableCell>
                    <TableCell>{price.location || "-"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(price.dateRecorded), "MMM d, yyyy")}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDialog(price)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(price.id)}
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

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingPrice ? "Edit Market Price" : "Add Market Price"}
            </DialogTitle>
            <DialogDescription>
              Enter the current market price for construction materials
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="itemName">Item Name *</Label>
              <Input
                id="itemName"
                value={formData.itemName}
                onChange={(e) =>
                  setFormData({ ...formData, itemName: e.target.value })
                }
                placeholder="e.g., Portland Cement Type 1"
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
                  {DPWH_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Price (PHP) *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) =>
                  setFormData({ ...formData, price: e.target.value })
                }
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier">Supplier</Label>
              <Input
                id="supplier"
                value={formData.supplier}
                onChange={(e) =>
                  setFormData({ ...formData, supplier: e.target.value })
                }
                placeholder="e.g., ABC Hardware"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                placeholder="e.g., Manila"
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="source">Source / Reference</Label>
              <Input
                id="source"
                value={formData.source}
                onChange={(e) =>
                  setFormData({ ...formData, source: e.target.value })
                }
                placeholder="e.g., Retail Price, Supplier Quote"
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Additional information..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingPrice ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}