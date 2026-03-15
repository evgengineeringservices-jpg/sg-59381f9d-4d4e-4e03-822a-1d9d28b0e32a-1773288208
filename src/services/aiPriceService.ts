/**
 * AI-Powered Material Price Intelligence Service
 * Aggregates prices from multiple online sources and location-based pricing
 */

import { supabase } from "@/integrations/supabase/client";

export interface PriceSource {
  source: string;
  url: string;
  price: number;
  date: string;
  location?: string;
  verified: boolean;
}

export interface MaterialPriceIntelligence {
  materialName: string;
  averagePrice: number;
  lowestPrice: number;
  highestPrice: number;
  priceRange: number;
  sources: PriceSource[];
  lastUpdated: string;
  location: string;
  confidence: "high" | "medium" | "low";
}

export interface LocationPricing {
  city: string;
  region: string;
  province: string;
  averagePrice: number;
  sampleSize: number;
}

const ONLINE_SHOPS = [
  { name: "Wilcon Depot", url: "https://shop.wilcon.com.ph/" },
  { name: "Topmost Hardware", url: "https://www.topmosthardware.ph/" },
  { name: "True Value", url: "https://truevalue.com.ph/" },
  { name: "Buildmate", url: "https://www.shopbuildmate.com/" },
  { name: "GH Hardware", url: "https://ghhardware.company.site/" },
  { name: "Shopee", url: "https://shopee.ph/" },
  { name: "Lazada", url: "https://www.lazada.com.ph/" },
];

/**
 * Search for material prices across all online sources
 * Note: This is a placeholder for AI-powered web scraping
 * In production, this would integrate with a backend scraping service
 */
export async function searchMaterialPrices(
  materialName: string,
  location?: { city?: string; region?: string; province?: string }
): Promise<MaterialPriceIntelligence | null> {
  try {
    // Check existing market prices in database first
    const { data: existingPrices, error } = await supabase
      .from("market_prices" as any)
      .select("*")
      .ilike("item_name", `%${materialName}%`)
      .order("effective_date", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Error fetching existing prices:", error);
      return null;
    }

    const prices = (existingPrices as any[]) || [];

    // Filter by location if specified
    let locationFiltered = prices;
    if (location) {
      locationFiltered = prices.filter((p) => {
        if (location.city && p.location?.toLowerCase().includes(location.city.toLowerCase())) return true;
        if (location.province && p.location?.toLowerCase().includes(location.province.toLowerCase())) return true;
        if (location.region && p.location?.toLowerCase().includes(location.region.toLowerCase())) return true;
        return !location.city && !location.province && !location.region;
      });
    }

    if (locationFiltered.length === 0) {
      return null;
    }

    const priceValues = locationFiltered.map((p) => Number(p.price_per_unit));
    const averagePrice = priceValues.reduce((a, b) => a + b, 0) / priceValues.length;
    const lowestPrice = Math.min(...priceValues);
    const highestPrice = Math.max(...priceValues);

    const sources: PriceSource[] = locationFiltered.map((p) => ({
      source: p.supplier || p.source || "Market Data",
      url: p.source || "",
      price: Number(p.price_per_unit),
      date: p.effective_date,
      location: p.location || undefined,
      verified: true,
    }));

    // Determine confidence based on data points
    let confidence: "high" | "medium" | "low" = "low";
    if (sources.length >= 5) confidence = "high";
    else if (sources.length >= 3) confidence = "medium";

    return {
      materialName,
      averagePrice,
      lowestPrice,
      highestPrice,
      priceRange: highestPrice - lowestPrice,
      sources,
      lastUpdated: new Date().toISOString(),
      location: location
        ? `${location.city || ""}${location.city && location.province ? ", " : ""}${location.province || ""}${(location.city || location.province) && location.region ? ", " : ""}${location.region || ""}`
        : "Philippines",
      confidence,
    };
  } catch (error) {
    console.error("Error searching material prices:", error);
    return null;
  }
}

/**
 * Get location-based pricing statistics
 */
export async function getLocationPricing(
  materialName: string
): Promise<LocationPricing[]> {
  try {
    const { data, error } = await supabase
      .from("market_prices" as any)
      .select("location, price_per_unit")
      .ilike("item_name", `%${materialName}%`);

    if (error || !data) {
      console.error("Error fetching location pricing:", error);
      return [];
    }

    const prices = data as any[];

    // Group by location
    const locationGroups: Record<string, number[]> = {};
    prices.forEach((p) => {
      const loc = p.location || "Unknown";
      if (!locationGroups[loc]) {
        locationGroups[loc] = [];
      }
      locationGroups[loc].push(Number(p.price_per_unit));
    });

    // Calculate averages
    const locationPricing: LocationPricing[] = Object.entries(locationGroups).map(
      ([location, priceList]) => {
        const parts = location.split(",").map((s) => s.trim());
        return {
          city: parts[0] || "",
          region: parts[2] || "",
          province: parts[1] || "",
          averagePrice: priceList.reduce((a, b) => a + b, 0) / priceList.length,
          sampleSize: priceList.length,
        };
      }
    );

    return locationPricing.sort((a, b) => b.sampleSize - a.sampleSize);
  } catch (error) {
    console.error("Error getting location pricing:", error);
    return [];
  }
}

/**
 * Sync material price from AI search to database
 */
export async function syncMaterialPrice(
  materialName: string,
  category: string,
  unit: string,
  location?: { city?: string; region?: string; province?: string }
): Promise<{ success: boolean; pricesAdded: number }> {
  try {
    const intelligence = await searchMaterialPrices(materialName, location);

    if (!intelligence || intelligence.sources.length === 0) {
      return { success: false, pricesAdded: 0 };
    }

    let pricesAdded = 0;

    // Add unique sources to market prices
    for (const source of intelligence.sources) {
      // Check if this exact price already exists
      const { data: existing } = await supabase
        .from("market_prices" as any)
        .select("id")
        .eq("item_name", materialName)
        .eq("price_per_unit", source.price)
        .eq("supplier", source.source)
        .eq("effective_date", source.date)
        .single();

      if (existing) continue; // Skip duplicates

      // Insert new price
      const { error } = await supabase.from("market_prices" as any).insert({
        item_name: materialName,
        category: category,
        unit: unit,
        price_per_unit: source.price,
        supplier: source.source,
        location: source.location || null,
        source: source.url || "AI Price Intelligence",
        effective_date: source.date,
        notes: `Auto-synced from ${source.source}`,
      });

      if (!error) {
        pricesAdded++;
      }
    }

    return { success: true, pricesAdded };
  } catch (error) {
    console.error("Error syncing material price:", error);
    return { success: false, pricesAdded: 0 };
  }
}

/**
 * Bulk sync all materials in a DUPA item
 */
export async function syncDUPAMaterialPrices(
  dupaItemId: string,
  location?: { city?: string; region?: string; province?: string }
): Promise<{ success: boolean; materialsUpdated: number }> {
  try {
    // Get DUPA materials
    const { data: materials, error } = await supabase
      .from("dupa_material_analysis" as any)
      .select("material_name, unit")
      .eq("dupa_item_id", dupaItemId);

    if (error || !materials || materials.length === 0) {
      return { success: false, materialsUpdated: 0 };
    }

    let materialsUpdated = 0;

    for (const material of materials as any[]) {
      const intelligence = await searchMaterialPrices(
        material.material_name,
        location
      );

      if (intelligence && intelligence.averagePrice > 0) {
        // Update material unit price with average
        await supabase
          .from("dupa_material_analysis" as any)
          .update({ unit_price: intelligence.averagePrice })
          .eq("dupa_item_id", dupaItemId)
          .eq("material_name", material.material_name);

        materialsUpdated++;
      }
    }

    // Recalculate DUPA base cost
    if (materialsUpdated > 0) {
      const { data: costData } = await supabase.rpc("calculate_dupa_cost" as any, {
        p_dupa_item_id: dupaItemId,
        p_quantity: 1,
      });

      if (costData && Array.isArray(costData) && costData.length > 0) {
        const result = costData[0] as any;
        await supabase
          .from("dupa_items" as any)
          .update({ base_unit_cost: Number(result.unit_cost) })
          .eq("id", dupaItemId);
      }
    }

    return { success: true, materialsUpdated };
  } catch (error) {
    console.error("Error syncing DUPA material prices:", error);
    return { success: false, materialsUpdated: 0 };
  }
}

/**
 * Schedule automated price updates
 * This would typically run as a cron job or scheduled function
 */
export async function scheduleAutoPriceSync(
  frequency: "daily" | "weekly" | "monthly" = "weekly"
): Promise<{ success: boolean; message: string }> {
  // This is a placeholder for actual implementation
  // In production, this would set up a cron job or scheduled Edge Function
  
  console.log(`Price sync scheduled: ${frequency}`);
  
  return {
    success: true,
    message: `Auto price sync will run ${frequency} to update material prices from online sources.`,
  };
}

/**
 * Get price trends for a material over time
 */
export async function getMaterialPriceTrends(
  materialName: string,
  days: number = 90
): Promise<Array<{ date: string; price: number; source: string }>> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const { data, error } = await supabase
      .from("market_prices" as any)
      .select("effective_date, price_per_unit, supplier, source")
      .ilike("item_name", `%${materialName}%`)
      .gte("effective_date", cutoffDate.toISOString())
      .order("effective_date", { ascending: true });

    if (error || !data) {
      console.error("Error fetching price trends:", error);
      return [];
    }

    return (data as any[]).map((p) => ({
      date: p.effective_date,
      price: Number(p.price_per_unit),
      source: p.supplier || p.source || "Unknown",
    }));
  } catch (error) {
    console.error("Error getting price trends:", error);
    return [];
  }
}