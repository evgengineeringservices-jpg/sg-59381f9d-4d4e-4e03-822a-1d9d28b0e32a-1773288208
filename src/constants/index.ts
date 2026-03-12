// Philippine Tax Constants
export const PH_VAT_RATE = 0.12;
export const PH_EWT_RATE = 0.02;
export const PH_RETENTION_RATE = 0.10;

// Project Types
export const PROJECT_TYPES = [
  { value: "residential_new", label: "Residential (New Build)" },
  { value: "commercial", label: "Commercial Construction" },
  { value: "renovation", label: "Renovation / Retrofit" },
  { value: "infrastructure", label: "Infrastructure / Civil Works" },
  { value: "industrial", label: "Industrial" },
  { value: "institutional", label: "Institutional" },
] as const;

// PCAB Categories
export const PCAB_CATEGORIES = [
  { value: "AAA", label: "AAA" },
  { value: "AA", label: "AA" },
  { value: "A", label: "A" },
  { value: "B", label: "B" },
  { value: "C", label: "C" },
  { value: "D", label: "D" },
  { value: "Small A", label: "Small A" },
  { value: "Small B", label: "Small B" },
] as const;

// BOQ Categories
export const BOQ_CATEGORIES = [
  { value: "mobilization", label: "Mobilization / Demobilization" },
  { value: "earthworks", label: "Earthworks" },
  { value: "substructure", label: "Substructure / Foundation" },
  { value: "concrete", label: "Concrete Works" },
  { value: "reinforcing_steel", label: "Reinforcing Steel" },
  { value: "structural_steel", label: "Structural Steel" },
  { value: "masonry", label: "Masonry" },
  { value: "carpentry", label: "Carpentry & Joinery" },
  { value: "roofing", label: "Roofing & Waterproofing" },
  { value: "doors_windows", label: "Doors & Windows" },
  { value: "floor_finishes", label: "Floor Finishes" },
  { value: "wall_finishes", label: "Wall Finishes" },
  { value: "ceiling", label: "Ceiling Works" },
  { value: "painting", label: "Painting" },
  { value: "plumbing", label: "Plumbing & Sanitary" },
  { value: "electrical", label: "Electrical Works" },
  { value: "mechanical", label: "Mechanical / HVAC" },
  { value: "fire_protection", label: "Fire Protection" },
  { value: "site_development", label: "Site Development" },
  { value: "miscellaneous", label: "Miscellaneous" },
] as const;

// DPWH Units
export const DPWH_UNITS = [
  { value: "cu.m", label: "cu.m (Cubic Meter)" },
  { value: "sq.m", label: "sq.m (Square Meter)" },
  { value: "l.m", label: "l.m (Linear Meter)" },
  { value: "kg", label: "kg (Kilogram)" },
  { value: "pcs", label: "pcs (Pieces)" },
  { value: "lot", label: "lot (Lot)" },
  { value: "set", label: "set (Set)" },
  { value: "tons", label: "tons (Tons)" },
  { value: "bags", label: "bags (Bags)" },
  { value: "sheets", label: "sheets (Sheets)" },
  { value: "lengths", label: "lengths (Lengths)" },
  { value: "each", label: "each (Each)" },
  { value: "man-day", label: "man-day (Man-Day)" },
  { value: "ls", label: "ls (Lump Sum)" },
] as const;

// Roles
export const ROLES = [
  { value: "super_admin", label: "Super Administrator" },
  { value: "owner", label: "Owner" },
  { value: "contractor_admin", label: "Contractor / Admin" },
  { value: "office_admin", label: "Office Admin" },
  { value: "secretary", label: "Secretary" },
  { value: "project_engineer", label: "Project Engineer" },
  { value: "project_coordinator", label: "Project Coordinator" },
  { value: "draftsman", label: "Draftsman" },
  { value: "lead", label: "Lead / Sales" },
  { value: "client", label: "Client" },
] as const;

// Document Categories
export const DOCUMENT_CATEGORIES = [
  { value: "contract", label: "Contract" },
  { value: "building_permit", label: "Building Permit" },
  { value: "occupancy_permit", label: "Occupancy Permit" },
  { value: "pcab_license", label: "PCAB License" },
  { value: "blueprint", label: "Blueprint / Drawing" },
  { value: "change_order", label: "Change Order" },
  { value: "specification", label: "Specification" },
  { value: "insurance", label: "Insurance" },
  { value: "environmental", label: "Environmental Compliance" },
  { value: "safety", label: "Safety Plan" },
  { value: "bir", label: "BIR Documents" },
  { value: "other", label: "Other" },
] as const;

// Billing Types
export const BILLING_TYPES = [
  { value: "progress", label: "Progress Billing" },
  { value: "mobilization", label: "Mobilization" },
  { value: "retention_release", label: "Retention Release" },
  { value: "final", label: "Final Billing" },
  { value: "change_order", label: "Change Order" },
  { value: "permit", label: "Permit" },
  { value: "milestone", label: "Milestone" },
] as const;

// Utility function for currency formatting
export const formatPeso = (amount: number): string => {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(amount);
};

// Utility function for billing calculations
export const calculateBilling = (baseAmount: number) => {
  const vat = baseAmount * PH_VAT_RATE;
  const ewt = baseAmount * PH_EWT_RATE;
  const retention = baseAmount * PH_RETENTION_RATE;
  const netAmount = baseAmount + vat - ewt - retention;
  
  return {
    baseAmount,
    vat,
    ewt,
    retention,
    netAmount,
  };
};