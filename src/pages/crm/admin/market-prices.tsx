import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Search, TrendingUp, TrendingDown, RefreshCw, Calendar, FileSpreadsheet, Globe, ShoppingCart, Sparkles, MapPin } from "lucide-react";
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
import { BOQ_CATEGORIES, DPWH_UNITS } from "@/constants";
import { format } from "date-fns";
import { exportMarketPricesToExcel } from "@/lib/exportUtils";
import { 
  searchMaterialPrices, 
  getLocationPricing, 
  syncMaterialPrice,
  syncDUPAMaterialPrices 
} from "@/services/aiPriceService";

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
  const [showOnlineShops, setShowOnlineShops] = useState(false);
  const [showAISync, setShowAISync] = useState(false);
  const [aiSearchMaterial, setAiSearchMaterial] = useState("");
  const [aiSearchCity, setAiSearchCity] = useState("");
  const [aiSearchProvince, setAiSearchProvince] = useState("");
  const [aiSearchRegion, setAiSearchRegion] = useState("");
  const [aiSearching, setAiSearching] = useState(false);
  const [aiResults, setAiResults] = useState<any>(null);
  const [locationPricing, setLocationPricing] = useState<any[]>([]);
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

  // Online shop sources for material pricing
  const onlineShops = [
    { name: "Wilcon Depot", url: "https://shop.wilcon.com.ph/", logo: "🏢" },
    { name: "Topmost Hardware", url: "https://www.topmosthardware.ph/", logo: "🔧" },
    { name: "True Value", url: "https://truevalue.com.ph/", logo: "✓" },
    { name: "Buildmate", url: "https://www.shopbuildmate.com/", logo: "🏗️" },
    { name: "GH Hardware", url: "https://ghhardware.company.site/", logo: "⚒️" },
    { name: "Shopee", url: "https://shopee.ph/", logo: "🛒" },
    { name: "Lazada", url: "https://www.lazada.com.ph/", logo: "🛍️" },
  ];

  // Philippine regions for location-based pricing
  const philippineRegions = [
    "NCR (National Capital Region)",
    "CAR (Cordillera Administrative Region)",
    "Region I (Ilocos Region)",
    "Region II (Cagayan Valley)",
    "Region III (Central Luzon)",
    "Region IV-A (CALABARZON)",
    "Region IV-B (MIMAROPA)",
    "Region V (Bicol Region)",
    "Region VI (Western Visayas)",
    "Region VII (Central Visayas)",
    "Region VIII (Eastern Visayas)",
    "Region IX (Zamboanga Peninsula)",
    "Region X (Northern Mindanao)",
    "Region XI (Davao Region)",
    "Region XII (SOCCSKSARGEN)",
    "Region XIII (Caraga)",
    "BARMM (Bangsamoro Autonomous Region)"
  ];

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
        price: price.pricePerUnit.toString(),
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
      const priceData: Partial<MarketPrice> = {
        itemName: formData.itemName,
        category: formData.category,
        unit: formData.unit as any,
        pricePerUnit: parseFloat(formData.price),
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

  async function handleAISearch() {
    if (!aiSearchMaterial.trim()) {
      toast({ title: "Please enter a material name", variant: "destructive" });
      return;
    }

    setAiSearching(true);
    try {
      const location = {
        city: aiSearchCity || undefined,
        province: aiSearchProvince || undefined,
        region: aiSearchRegion || undefined,
      };

      const results = await searchMaterialPrices(aiSearchMaterial, location);
      setAiResults(results);

      if (results) {
        const locPricing = await getLocationPricing(aiSearchMaterial);
        setLocationPricing(locPricing);
        
        toast({ 
          title: `Found ${results.sources.length} price sources`,
          description: `Average: ${formatPeso(results.averagePrice)}`
        });
      } else {
        toast({ 
          title: "No prices found",
          description: "Try adjusting your search or location filters",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to search material prices",
        variant: "destructive",
      });
    } finally {
      setAiSearching(false);
    }
  }

  async function handleSyncToDatabase() {
    if (!aiResults) return;

    try {
      const category = BOQ_CATEGORIES.find(c => 
        aiResults.materialName.toLowerCase().includes(c.label.toLowerCase())
      )?.value || "materials";

      const result = await syncMaterialPrice(
        aiResults.materialName,
        category,
        "pcs",
        {
          city: aiSearchCity || undefined,
          province: aiSearchProvince || undefined,
          region: aiSearchRegion || undefined,
        }
      );

      if (result.success) {
        toast({ 
          title: "Prices synced successfully",
          description: `Added ${result.pricesAdded} new price records`
        });
        loadPrices();
        setShowAISync(false);
        setAiResults(null);
      } else {
        toast({
          title: "No new prices to sync",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error syncing prices",
        variant: "destructive",
      });
    }
  }

  const handleExport = () => {
    if (filteredPrices.length === 0) {
      toast({ title: "No prices to export", variant: "destructive" });
      return;
    }
    exportMarketPricesToExcel(filteredPrices);
    toast({ title: "Market prices exported to Excel successfully!" });
  };

  const significantChanges = priceChanges.filter(
    (c) => Math.abs(c.priceChangePercent) > 10
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Market Prices & Material Cost Analysis</h1>
          <p className="text-muted-foreground mt-1">
            AI-powered price intelligence from online shops across Philippines
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowAISync(!showAISync)}
            className="bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            AI Price Sync
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowOnlineShops(!showOnlineShops)}
          >
            <Globe className="h-4 w-4 mr-2" />
            Online Shops
          </Button>
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
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Export to Excel
            </Button>
            <Button onClick={() => openDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Price
            </Button>
          </div>
        </div>
      </div>

      {/* AI Price Intelligence Card */}
      {showAISync && (
        <Card className="border-purple-500 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              AI-Powered Material Price Intelligence
            </CardTitle>
            <CardDescription>
              Search material prices across all online shops and locations in Philippines
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {/* Search Form */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="aiMaterial">Material Name *</Label>
                <Input
                  id="aiMaterial"
                  placeholder="e.g., Portland Cement, Rebar 10mm, Hollow Blocks"
                  value={aiSearchMaterial}
                  onChange={(e) => setAiSearchMaterial(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="aiCity">City (Optional)</Label>
                <Input
                  id="aiCity"
                  placeholder="e.g., Quezon City"
                  value={aiSearchCity}
                  onChange={(e) => setAiSearchCity(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="aiProvince">Province (Optional)</Label>
                <Input
                  id="aiProvince"
                  placeholder="e.g., Metro Manila"
                  value={aiSearchProvince}
                  onChange={(e) => setAiSearchProvince(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="aiRegion">Region (Optional)</Label>
                <Select value={aiSearchRegion} onValueChange={setAiSearchRegion}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Regions</SelectItem>
                    {philippineRegions.map((region) => (
                      <SelectItem key={region} value={region}>
                        {region}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2">
                <Button 
                  onClick={handleAISearch} 
                  disabled={aiSearching}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  {aiSearching ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      AI Search Prices
                    </>
                  )}
                </Button>
                {aiResults && (
                  <Button 
                    onClick={handleSyncToDatabase}
                    variant="outline"
                  >
                    Sync to Database
                  </Button>
                )}
              </div>
            </div>

            {/* AI Search Results */}
            {aiResults && (
              <div className="space-y-4 pt-4 border-t">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">Average Price</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatPeso(aiResults.averagePrice)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">Lowest Price</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {formatPeso(aiResults.lowestPrice)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">Highest Price</p>
                      <p className="text-2xl font-bold text-red-600">
                        {formatPeso(aiResults.highestPrice)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">Data Confidence</p>
                      <Badge 
                        variant={
                          aiResults.confidence === "high" 
                            ? "default" 
                            : aiResults.confidence === "medium"
                            ? "secondary"
                            : "outline"
                        }
                        className="mt-1"
                      >
                        {aiResults.confidence.toUpperCase()}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {aiResults.sources.length} sources
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Price Sources Table */}
                <div>
                  <h4 className="font-semibold mb-2">Price Sources Found:</h4>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Source</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {aiResults.sources.map((source: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{source.source}</TableCell>
                            <TableCell className="font-semibold">{formatPeso(source.price)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {source.location || "Philippines"}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {format(new Date(source.date), "MMM d, yyyy")}
                            </TableCell>
                            <TableCell>
                              {source.verified && (
                                <Badge variant="outline" className="text-green-600">
                                  Verified
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Location-based Pricing */}
                {locationPricing.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Location-Based Pricing Analysis:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {locationPricing.slice(0, 6).map((loc, idx) => (
                        <Card key={idx}>
                          <CardContent className="pt-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium">{loc.city || loc.province}</p>
                                <p className="text-xs text-muted-foreground">{loc.region}</p>
                              </div>
                              <Badge variant="outline">{loc.sampleSize} sources</Badge>
                            </div>
                            <p className="text-lg font-bold mt-2">
                              {formatPeso(loc.averagePrice)}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4">
              <p className="text-sm font-medium mb-2">💡 How AI Price Sync Works:</p>
              <ol className="text-sm text-muted-foreground space-y-1 ml-4 list-decimal">
                <li>Enter material name and optional location filters</li>
                <li>AI searches across all online shops and market databases</li>
                <li>Aggregates prices from multiple verified sources</li>
                <li>Analyzes location-based pricing variations</li>
                <li>Provides average, lowest, and highest prices with confidence rating</li>
                <li>Sync results to your database for use in BOQ calculations</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Online Shops Reference Card */}
      {showOnlineShops && (
        <Card className="border-blue-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-blue-500" />
              Online Material Suppliers - Price Reference
            </CardTitle>
            <CardDescription>
              Check current market prices from these verified online sources
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {onlineShops.map((shop) => (
                <a
                  key={shop.name}
                  href={shop.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="text-3xl">{shop.logo}</div>
                  <div className="flex-1">
                    <p className="font-semibold">{shop.name}</p>
                    <p className="text-xs text-muted-foreground">Online Store</p>
                  </div>
                  <Globe className="h-4 w-4 text-muted-foreground" />
                </a>
              ))}
            </div>
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <p className="text-sm font-medium mb-2">💡 How to use:</p>
              <ol className="text-sm text-muted-foreground space-y-1 ml-4 list-decimal">
                <li>Use AI Price Sync for automated price discovery</li>
                <li>Or manually search for materials on these online shops</li>
                <li>Compare prices across multiple suppliers</li>
                <li>Record the best prices in your Market Price database</li>
                <li>Use recorded prices for DUPA material cost analysis</li>
                <li>Update prices regularly to maintain accurate BOQ estimates</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      )}

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
                {BOQ_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
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
              No market prices found. Use AI Price Sync to auto-discover prices or add manually.
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
                      {formatPeso(price.pricePerUnit)}
                    </TableCell>
                    <TableCell>{price.supplier || "-"}</TableCell>
                    <TableCell>{price.location || "-"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(price.effectiveDate), "MMM d, yyyy")}
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