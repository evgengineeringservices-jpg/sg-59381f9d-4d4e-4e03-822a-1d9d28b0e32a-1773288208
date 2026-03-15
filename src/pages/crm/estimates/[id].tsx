import React, { useState, useEffect, useMemo, useCallback } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { CRMLayout } from "@/components/layout/CRMLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  getEstimateDetails, 
  updateEstimateItemQuantity, 
  updateEstimateSettings,
  type EstimateProject 
} from "@/services/estimateService";
import { calculateBOETotals, formatCurrency, type ProjectSettings } from "@/lib/estimateCalculations";
import { Printer, Save, FileSpreadsheet, ArrowLeft, Loader2, MapPin, Calculator } from "lucide-react";
import debounce from "lodash/debounce";

export default function EstimateWorkbook() {
  const router = useRouter();
  const { id } = router.query;
  const { toast } = useToast();

  const [project, setProject] = useState<EstimateProject | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Settings
  const [settings, setSettings] = useState<ProjectSettings>({
    ocm_percent: 15,
    profit_percent: 10,
    vat_percent: 5
  });

  useEffect(() => {
    if (id) loadWorkbook();
  }, [id]);

  const loadWorkbook = async () => {
    try {
      const data = await getEstimateDetails(id as string);
      setProject(data.project);
      setItems(data.items);
      setSettings({
        ocm_percent: data.project.ocm_percent || 15,
        profit_percent: data.project.profit_percent || 10,
        vat_percent: data.project.vat_percent || 5,
      });
    } catch (error) {
      toast({ title: "Error", description: "Failed to load workbook", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // Group items by category for the INPUT DATA sheet
  const groupedItems = useMemo(() => {
    return items.reduce((acc, item) => {
      const cat = item.category || "General";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    }, {} as Record<string, any[]>);
  }, [items]);

  // Compute BOE totals on the fly based on current items state
  const boeTotals = useMemo(() => {
    return calculateBOETotals(items as any[], settings);
  }, [items, settings]);

  // Handle immediate local state update + debounced DB save to give Excel-like feel
  const handleQuantityChange = (itemId: string, val: string) => {
    const qty = parseFloat(val) || 0;
    
    // Optimistic UI update
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const total_labor = qty * Number(item.labor_unit_cost || 0);
        const total_material = qty * Number(item.material_unit_cost || 0);
        const total_equipment = qty * Number(item.equipment_unit_cost || 0);
        const direct_cost = qty * Number(item.direct_cost_per_unit || 0);
        const ocm = direct_cost * (settings.ocm_percent / 100);
        
        return {
          ...item,
          quantity: qty,
          total_labor_cost: total_labor,
          total_material_cost: total_material,
          total_equipment_cost: total_equipment,
          total_direct_cost: direct_cost,
          ocm_amount: ocm,
          total_price: direct_cost + ocm
        };
      }
      return item;
    }));

    debouncedSave(itemId, qty);
  };

  const debouncedSave = useCallback(
    debounce(async (itemId: string, qty: number) => {
      setIsSaving(true);
      try {
        const itemToSave = items.find(i => i.id === itemId);
        if (itemToSave) {
          await updateEstimateItemQuantity(itemId, qty, settings, itemToSave);
        }
      } catch (error) {
        toast({ title: "Sync Error", description: "Failed to save quantity", variant: "destructive" });
      } finally {
        setIsSaving(false);
      }
    }, 800),
    [items, settings]
  );

  const handleSettingsChange = async (key: keyof ProjectSettings, value: number) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    setIsSaving(true);
    try {
      await updateEstimateSettings(id as string, newSettings);
      
      // Recalculate all items' OCM and totals locally to reflect new setting immediately
      setItems(prev => prev.map(item => {
        const ocm = Number(item.total_direct_cost || 0) * (newSettings.ocm_percent / 100);
        return {
          ...item,
          ocm_amount: ocm,
          total_price: Number(item.total_direct_cost || 0) + ocm
        };
      }));
      
      toast({ title: "Settings Updated", description: "Project rates applied successfully." });
    } catch (err) {
      toast({ title: "Error", description: "Failed to update settings", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <CRMLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading Workbook...</span>
        </div>
      </CRMLayout>
    );
  }

  if (!project) return <CRMLayout>Project not found.</CRMLayout>;

  return (
    <CRMLayout>
      <Head>
        <title>{project.name} | Estimate | Softgen</title>
        <style>{`
          @media print {
            body { background: white; }
            .no-print { display: none !important; }
            .print-only { display: block !important; }
            .print-page { padding: 0; box-shadow: none; border: none; }
            .page-break { page-break-before: always; }
          }
        `}</style>
      </Head>

      <div className="no-print">
        <div className="flex items-center mb-4 text-sm text-muted-foreground">
          <button onClick={() => router.push('/crm/estimates')} className="hover:text-primary flex items-center transition-colors">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Estimates
          </button>
        </div>

        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
            <div className="flex items-center text-muted-foreground mt-2">
              <MapPin className="h-4 w-4 mr-1" /> {project.location || "No location specified"}
              <Badge variant="outline" className="ml-4">{project.status}</Badge>
              {isSaving && <span className="ml-4 flex items-center text-xs text-blue-500"><Loader2 className="h-3 w-3 animate-spin mr-1"/> Auto-saving...</span>}
            </div>
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" /> Print Reports
            </Button>
            <Button>
              <Save className="h-4 w-4 mr-2" /> Finalize
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="input" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-2xl mb-8 no-print">
          <TabsTrigger value="input" className="text-sm font-semibold">INPUT DATA</TabsTrigger>
          <TabsTrigger value="boe" className="text-sm font-semibold">BOE Report</TabsTrigger>
          <TabsTrigger value="abc" className="text-sm font-semibold">ABC Report</TabsTrigger>
        </TabsList>

        {/* =========================================
            SHEET 1: INPUT DATA
        ========================================= */}
        <TabsContent value="input" className="no-print space-y-6">
          <Card className="border-t-4 border-t-yellow-500">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl flex items-center">
                  <FileSpreadsheet className="h-5 w-5 mr-2 text-yellow-600" />
                  INPUT DATA
                </CardTitle>
                <CardDescription>Enter quantities in the yellow cells. Direct costs compute automatically based on DUPA templates.</CardDescription>
              </div>
              <div className="flex space-x-4 bg-muted/50 p-3 rounded-lg border">
                <div>
                  <Label className="text-xs text-muted-foreground">OCM (%)</Label>
                  <Input 
                    type="number" 
                    className="h-8 w-20 text-right bg-white" 
                    value={settings.ocm_percent} 
                    onChange={e => handleSettingsChange('ocm_percent', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Profit (%)</Label>
                  <Input 
                    type="number" 
                    className="h-8 w-20 text-right bg-white" 
                    value={settings.profit_percent} 
                    onChange={e => handleSettingsChange('profit_percent', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">VAT (%)</Label>
                  <Input 
                    type="number" 
                    className="h-8 w-20 text-right bg-white" 
                    value={settings.vat_percent} 
                    onChange={e => handleSettingsChange('vat_percent', parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-100 dark:bg-slate-900">
                    <TableRow>
                      <TableHead className="w-[100px] font-bold text-black dark:text-white border-r">Item No.</TableHead>
                      <TableHead className="w-[300px] font-bold text-black dark:text-white border-r">Item of Works</TableHead>
                      <TableHead className="w-[80px] font-bold text-black dark:text-white border-r">Unit</TableHead>
                      <TableHead className="w-[120px] font-bold text-black dark:text-white border-r bg-yellow-50 dark:bg-yellow-900/20">Quantity</TableHead>
                      <TableHead className="text-right text-xs">Material Rate</TableHead>
                      <TableHead className="text-right text-xs">Labor Rate</TableHead>
                      <TableHead className="text-right text-xs border-r">Equip. Rate</TableHead>
                      <TableHead className="text-right font-bold text-black dark:text-white bg-slate-50 dark:bg-slate-800">Total Direct Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(groupedItems).map(([category, catItems]) => (
                      <React.Fragment key={category}>
                        <TableRow className="bg-blue-50/50 dark:bg-blue-900/20">
                          <TableCell colSpan={8} className="font-bold text-blue-800 dark:text-blue-300 py-2">
                            {category.toUpperCase()}
                          </TableCell>
                        </TableRow>
                        {catItems.map((item) => (
                          <TableRow key={item.id} className="hover:bg-muted/50 group">
                            <TableCell className="font-medium border-r">{item.item_code}</TableCell>
                            <TableCell className="border-r">{item.description}</TableCell>
                            <TableCell className="border-r text-center">{item.unit}</TableCell>
                            <TableCell className="border-r p-1">
                              <Input
                                type="number"
                                className="h-9 font-semibold text-right bg-yellow-100/80 hover:bg-yellow-100 focus:bg-yellow-100 dark:bg-yellow-900/40 border-yellow-300 focus-visible:ring-yellow-500 rounded-sm"
                                value={item.quantity || ""}
                                placeholder="0"
                                onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                              />
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">{formatCurrency(Number(item.material_unit_cost || 0))}</TableCell>
                            <TableCell className="text-right text-muted-foreground">{formatCurrency(Number(item.labor_unit_cost || 0))}</TableCell>
                            <TableCell className="text-right text-muted-foreground border-r">{formatCurrency(Number(item.equipment_unit_cost || 0))}</TableCell>
                            <TableCell className="text-right font-semibold bg-slate-50/50 dark:bg-slate-800/50">
                              {formatCurrency(Number(item.total_direct_cost || 0))}
                            </TableCell>
                          </TableRow>
                        ))}
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* =========================================
            SHEET 2: BOE REPORT
        ========================================= */}
        <TabsContent value="boe" className="print-page">
          <Card className="max-w-4xl mx-auto shadow-lg print:shadow-none print:border-none print:w-full print:max-w-none">
            <CardContent className="p-12 print:p-0">
              {/* Report Header */}
              <div className="text-center mb-10 border-b-2 border-black pb-6">
                <h2 className="text-2xl font-bold uppercase tracking-widest mb-1">PROGRAM OF WORKS</h2>
                <h3 className="text-xl font-semibold uppercase mb-4 text-muted-foreground">BILL OF ESTIMATES (BOE)</h3>
                
                <div className="grid grid-cols-4 gap-4 text-left text-sm mt-6">
                  <div className="col-span-1 font-bold">Project Name:</div>
                  <div className="col-span-3 font-semibold uppercase border-b border-black/20 pb-1">{project.name}</div>
                  
                  <div className="col-span-1 font-bold">Location:</div>
                  <div className="col-span-3 uppercase border-b border-black/20 pb-1">{project.location || "N/A"}</div>
                </div>
              </div>

              {/* BOE Computations */}
              <div className="mb-12">
                <table className="w-full text-sm">
                  <tbody>
                    {/* DIRECT COST */}
                    <tr>
                      <td colSpan={2} className="font-bold text-lg pb-4">A. DIRECT COST</td>
                    </tr>
                    <tr>
                      <td className="pl-8 py-2">1. Materials</td>
                      <td className="text-right py-2 font-medium">{formatCurrency(boeTotals.direct_material_total)}</td>
                    </tr>
                    <tr>
                      <td className="pl-8 py-2">2. Labor / Manpower</td>
                      <td className="text-right py-2 font-medium">{formatCurrency(boeTotals.direct_labor_total)}</td>
                    </tr>
                    <tr>
                      <td className="pl-8 py-2 border-b border-black">3. Equipment / Tools Expenses</td>
                      <td className="text-right py-2 font-medium border-b border-black">{formatCurrency(boeTotals.direct_equipment_total)}</td>
                    </tr>
                    <tr className="bg-muted/30">
                      <td className="font-bold py-3 pl-4">SUB-TOTAL DIRECT COST</td>
                      <td className="text-right py-3 font-bold text-base">{formatCurrency(boeTotals.direct_cost_subtotal)}</td>
                    </tr>

                    <tr><td colSpan={2} className="py-4"></td></tr>

                    {/* INDIRECT COST */}
                    <tr>
                      <td colSpan={2} className="font-bold text-lg pb-4">B. INDIRECT COST</td>
                    </tr>
                    <tr>
                      <td className="pl-8 py-2">1. Overhead, Contingency & Misc. ({settings.ocm_percent}%)</td>
                      <td className="text-right py-2 font-medium">{formatCurrency(boeTotals.overhead_contingency_misc)}</td>
                    </tr>
                    <tr>
                      <td className="pl-8 py-2">2. Contractor's Profit ({settings.profit_percent}%)</td>
                      <td className="text-right py-2 font-medium">{formatCurrency(boeTotals.contractors_profit)}</td>
                    </tr>
                    <tr>
                      <td className="pl-8 py-2 border-b border-black">3. Value Added Tax ({settings.vat_percent}%)</td>
                      <td className="text-right py-2 font-medium border-b border-black">{formatCurrency(boeTotals.vat)}</td>
                    </tr>
                    <tr className="bg-muted/30">
                      <td className="font-bold py-3 pl-4">SUB-TOTAL INDIRECT COST</td>
                      <td className="text-right py-3 font-bold text-base">{formatCurrency(boeTotals.indirect_cost_subtotal)}</td>
                    </tr>

                    <tr><td colSpan={2} className="py-6"></td></tr>

                    {/* TOTAL */}
                    <tr className="border-t-2 border-b-4 border-double border-black">
                      <td className="font-black text-xl py-4">TOTAL PROJECT COST</td>
                      <td className="text-right font-black text-xl py-4">{formatCurrency(boeTotals.total_project_cost)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-16 mt-20 pt-8">
                <div>
                  <p className="text-sm mb-12">Prepared by:</p>
                  <div className="border-b border-black pt-8"></div>
                  <p className="font-bold text-sm mt-2 text-center uppercase">Project Engineer</p>
                </div>
                <div>
                  <p className="text-sm mb-12">Approved by:</p>
                  <div className="border-b border-black pt-8"></div>
                  <p className="font-bold text-sm mt-2 text-center uppercase">General Manager</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* =========================================
            SHEET 3: ABC REPORT
        ========================================= */}
        <TabsContent value="abc" className="print-page">
          <Card className="max-w-[1000px] mx-auto shadow-lg print:shadow-none print:border-none print:w-full print:max-w-none">
            <CardContent className="p-8 print:p-0">
               {/* Report Header */}
               <div className="text-center mb-8 border-b-2 border-black pb-4">
                <h2 className="text-xl font-bold uppercase tracking-widest mb-1">APPROVED BUDGET FOR THE CONTRACT (ABC)</h2>
                <div className="text-sm mt-4 font-semibold uppercase">{project.name}</div>
              </div>

              {/* ABC Table */}
              <table className="w-full text-sm border-collapse border border-black">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 print:bg-gray-200">
                    <th className="border border-black p-2 text-center w-16">Item No.</th>
                    <th className="border border-black p-2 text-left">Description</th>
                    <th className="border border-black p-2 text-center w-20">Quantity</th>
                    <th className="border border-black p-2 text-center w-16">Unit</th>
                    <th className="border border-black p-2 text-right w-32">Direct Cost</th>
                    <th className="border border-black p-2 text-right w-32">Mark-ups (OCM)</th>
                    <th className="border border-black p-2 text-right w-32 font-bold">Total Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {items.filter(i => (i.quantity || 0) > 0).length === 0 && (
                    <tr><td colSpan={7} className="p-8 text-center text-muted-foreground border border-black">No quantities entered yet. Enter quantities in the INPUT DATA tab.</td></tr>
                  )}
                  {items.filter(i => (i.quantity || 0) > 0).map((item) => (
                    <tr key={item.id}>
                      <td className="border border-black p-2 text-center">{item.item_code}</td>
                      <td className="border border-black p-2 font-medium">{item.description}</td>
                      <td className="border border-black p-2 text-center">{item.quantity}</td>
                      <td className="border border-black p-2 text-center">{item.unit}</td>
                      <td className="border border-black p-2 text-right">{formatCurrency(Number(item.total_direct_cost || 0))}</td>
                      <td className="border border-black p-2 text-right">{formatCurrency(Number(item.ocm_amount || 0))}</td>
                      <td className="border border-black p-2 text-right font-bold bg-muted/20">{formatCurrency(Number(item.total_price || 0))}</td>
                    </tr>
                  ))}
                  
                  {/* ABC TOTAL */}
                  {items.filter(i => (i.quantity || 0) > 0).length > 0 && (
                    <tr className="border-t-2 border-black bg-slate-100 dark:bg-slate-800 print:bg-gray-200">
                      <td colSpan={6} className="border border-black p-3 text-right font-bold uppercase tracking-wider">
                        Grand Total
                      </td>
                      <td className="border border-black p-3 text-right font-black">
                        {formatCurrency(items.reduce((sum, item) => sum + Number(item.total_price || 0), 0))}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className="mt-12 text-sm text-muted-foreground no-print flex items-center justify-center">
                <Calculator className="w-4 h-4 mr-2"/>
                Tip: Items with a quantity of zero are automatically excluded from the printed ABC Report.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </CRMLayout>
  );
}