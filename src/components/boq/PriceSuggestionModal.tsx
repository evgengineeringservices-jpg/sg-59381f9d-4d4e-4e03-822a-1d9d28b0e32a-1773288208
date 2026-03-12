import { useState, useEffect } from "react";
import { Search, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getMarketPriceSuggestions, formatPeso } from "@/lib/boqCalculations";

interface PriceSuggestionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  description: string;
  category: string;
  unit: string;
  onSelectPrice: (price: number, source: string) => void;
}

export function PriceSuggestionModal({
  open,
  onOpenChange,
  description,
  category,
  unit,
  onSelectPrice,
}: PriceSuggestionModalProps) {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState(description);

  useEffect(() => {
    if (open) {
      setSearchTerm(description);
      loadSuggestions(description);
    }
  }, [open, description]);

  async function loadSuggestions(query: string) {
    if (!query.trim()) return;

    try {
      setLoading(true);
      const data = await getMarketPriceSuggestions(query, category, unit);
      setSuggestions(data);
    } catch (error) {
      console.error("Failed to load price suggestions:", error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch() {
    loadSuggestions(searchTerm);
  }

  function handleSelect(suggestion: any) {
    onSelectPrice(
      suggestion.price,
      `${suggestion.itemName} - ${suggestion.supplier || "Market"}`
    );
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Market Price Suggestions
          </DialogTitle>
          <DialogDescription>
            AI-powered price lookup from current market data
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search for material or item..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-10"
            />
          </div>
          <Button onClick={handleSearch} disabled={loading}>
            Search
          </Button>
        </div>

        {/* Current Query Info */}
        <div className="flex gap-2 text-sm text-muted-foreground">
          <span>Category: <strong>{category}</strong></span>
          <span>•</span>
          <span>Unit: <strong>{unit}</strong></span>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                <Skeleton className="h-12 w-12 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-8 w-24" />
              </div>
            ))}
          </div>
        )}

        {/* No Results */}
        {!loading && suggestions.length === 0 && searchTerm && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No matching market prices found. Try different keywords or{" "}
              <a href="/crm/admin/market-prices" className="underline font-medium">
                add market prices manually
              </a>.
            </AlertDescription>
          </Alert>
        )}

        {/* Suggestions List */}
        {!loading && suggestions.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Found {suggestions.length} matching items (showing highest prices for profit protection):
            </p>
            {suggestions.map((suggestion, idx) => (
              <div
                key={idx}
                className="flex items-start justify-between gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                onClick={() => handleSelect(suggestion)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium">{suggestion.itemName}</h4>
                    <Badge variant="outline" className="text-xs">
                      {Math.round(suggestion.matchScore)}% match
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>
                      <strong>Supplier:</strong> {suggestion.supplier || "N/A"} •{" "}
                      <strong>Location:</strong> {suggestion.location || "N/A"}
                    </p>
                    <p className="text-xs">
                      Last updated: {new Date(suggestion.dateRecorded).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">
                    {formatPeso(suggestion.price)}
                  </div>
                  <div className="text-xs text-muted-foreground">per {unit}</div>
                  <Button
                    size="sm"
                    className="mt-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(suggestion);
                    }}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Use This Price
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Manual Entry Option */}
        <div className="pt-4 border-t">
          <p className="text-sm text-muted-foreground mb-2">
            Can't find the right price?{" "}
            <a href="/crm/admin/market-prices" className="underline font-medium text-primary">
              Add new market price
            </a>{" "}
            or enter manually in the form.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}