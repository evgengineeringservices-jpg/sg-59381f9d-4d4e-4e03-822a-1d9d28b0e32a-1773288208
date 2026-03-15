import { useState, useEffect } from "react";
import { CRMLayout } from "@/components/layout/CRMLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Settings, DollarSign, FileText, Globe, Upload, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { PH_VAT_RATE, PH_EWT_RATE, PH_RETENTION_RATE } from "@/constants";
import { importDUPAFromExcel } from "@/services/dupaService";

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

export default function SettingsPage() {
  const [vatRate, setVatRate] = useState((PH_VAT_RATE * 100).toString());
  const [ewtRate, setEwtRate] = useState((PH_EWT_RATE * 100).toString());
  const [retentionRate, setRetentionRate] = useState((PH_RETENTION_RATE * 100).toString());
  const [companyName, setCompanyName] = useState("Premier Construction Inc.");
  const [companyAddress, setCompanyAddress] = useState("123 Construction Ave, Makati City, Metro Manila");
  const [companyTIN, setCompanyTIN] = useState("000-000-000-000");
  
  // DUPA Import State
  const [dupaFile, setDupaFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  function handleSaveSettings() {
    console.log("Saving settings:", {
      vatRate: parseFloat(vatRate) / 100,
      ewtRate: parseFloat(ewtRate) / 100,
      retentionRate: parseFloat(retentionRate) / 100,
      companyName,
      companyAddress,
      companyTIN,
    });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv'
      ];
      
      if (validTypes.includes(file.type) || file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv')) {
        setDupaFile(file);
        setImportResult(null);
      } else {
        alert('Please upload a valid Excel (.xlsx, .xls) or CSV (.csv) file');
      }
    }
  }

  async function handleImportDUPA() {
    if (!dupaFile) return;

    setImporting(true);
    setImportProgress(0);
    setImportResult(null);

    try {
      // Read file
      const reader = new FileReader();
      
      reader.onprogress = (e) => {
        if (e.lengthComputable) {
          setImportProgress((e.loaded / e.total) * 50);
        }
      };

      reader.onload = async (e) => {
        try {
          const data = e.target?.result;
          if (!data) throw new Error("Failed to read file");

          setImportProgress(60);

          // Parse and import
          const result = await importDUPAFromExcel(data as ArrayBuffer);
          
          setImportProgress(100);
          setImportResult(result);
          setImporting(false);

          if (result.success > 0) {
            setTimeout(() => {
              setDupaFile(null);
              setImportProgress(0);
            }, 3000);
          }
        } catch (error) {
          console.error("Import error:", error);
          setImportResult({
            success: 0,
            failed: 1,
            errors: [error instanceof Error ? error.message : "Unknown error occurred"]
          });
          setImporting(false);
        }
      };

      reader.onerror = () => {
        setImportResult({
          success: 0,
          failed: 1,
          errors: ["Failed to read file"]
        });
        setImporting(false);
      };

      reader.readAsArrayBuffer(dupaFile);
    } catch (error) {
      console.error("Import error:", error);
      setImportResult({
        success: 0,
        failed: 1,
        errors: [error instanceof Error ? error.message : "Unknown error occurred"]
      });
      setImporting(false);
    }
  }

  return (
    <CRMLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-charcoal">System Settings</h1>
            <p className="text-muted-foreground mt-1">Configure system-wide parameters and defaults</p>
          </div>
        </div>

        <div className="grid gap-6">
          {/* DUPA Import Section */}
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-primary" />
                DUPA Library Import
              </CardTitle>
              <CardDescription>
                Upload your complete DUPA reference file (Excel or CSV) to populate the entire library with material, labor, and equipment analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Required Format:</strong> Excel file with columns: Item Code, Description, Unit, Category, Material Name, Material Quantity, Material Unit, Labor Type, Labor Hours, Labor Rate, Equipment Name, Equipment Hours, Equipment Rate
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="flex items-end gap-4">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="dupaFile">Select DUPA File</Label>
                    <Input
                      id="dupaFile"
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileChange}
                      disabled={importing}
                    />
                  </div>
                  <Button
                    onClick={handleImportDUPA}
                    disabled={!dupaFile || importing}
                    className="min-w-[120px]"
                  >
                    {importing ? (
                      <>
                        <Settings className="mr-2 h-4 w-4 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Import
                      </>
                    )}
                  </Button>
                </div>

                {dupaFile && !importing && !importResult && (
                  <Alert>
                    <FileText className="h-4 w-4" />
                    <AlertDescription>
                      Ready to import: <strong>{dupaFile.name}</strong> ({(dupaFile.size / 1024).toFixed(2)} KB)
                    </AlertDescription>
                  </Alert>
                )}

                {importing && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Importing DUPA items...</span>
                      <span className="font-medium">{Math.round(importProgress)}%</span>
                    </div>
                    <Progress value={importProgress} className="h-2" />
                  </div>
                )}

                {importResult && (
                  <div className="space-y-3">
                    {importResult.success > 0 && (
                      <Alert className="border-green-200 bg-green-50">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-800">
                          <strong>Success!</strong> Imported {importResult.success} DUPA item{importResult.success !== 1 ? 's' : ''} successfully
                        </AlertDescription>
                      </Alert>
                    )}

                    {importResult.failed > 0 && (
                      <Alert className="border-red-200 bg-red-50">
                        <XCircle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-red-800">
                          <strong>Errors:</strong> {importResult.failed} item{importResult.failed !== 1 ? 's' : ''} failed to import
                          <details className="mt-2">
                            <summary className="cursor-pointer font-medium">View errors</summary>
                            <ul className="mt-2 space-y-1 text-xs">
                              {importResult.errors.map((error, index) => (
                                <li key={index} className="text-red-700">• {error}</li>
                              ))}
                            </ul>
                          </details>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}

                <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                  <h4 className="font-medium text-sm">Import Instructions</h4>
                  <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Prepare your DUPA file in Excel or CSV format</li>
                    <li>Ensure all required columns are present and properly formatted</li>
                    <li>Each row should represent a complete DUPA item with analysis</li>
                    <li>Material, labor, and equipment entries can be comma-separated for multiple items</li>
                    <li>Click "Select DUPA File" and choose your file</li>
                    <li>Review the file details and click "Import" to begin</li>
                    <li>Monitor the progress bar during import</li>
                    <li>Review the import summary for any errors</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Philippine Tax & Billing Rates
              </CardTitle>
              <CardDescription>Configure default tax rates for automatic billing calculations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vatRate">VAT Rate (%)</Label>
                  <Input
                    id="vatRate"
                    type="number"
                    step="0.01"
                    value={vatRate}
                    onChange={(e) => setVatRate(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Currently: {vatRate}%</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ewtRate">EWT Rate (%)</Label>
                  <Input
                    id="ewtRate"
                    type="number"
                    step="0.01"
                    value={ewtRate}
                    onChange={(e) => setEwtRate(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Currently: {ewtRate}%</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="retentionRate">Retention Rate (%)</Label>
                  <Input
                    id="retentionRate"
                    type="number"
                    step="0.01"
                    value={retentionRate}
                    onChange={(e) => setRetentionRate(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Currently: {retentionRate}%</p>
                </div>
              </div>
              <Separator />
              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <h4 className="font-medium text-sm">Formula Preview</h4>
                <p className="text-xs text-muted-foreground">
                  Net Amount = Base + VAT - EWT - Retention
                </p>
                <p className="text-xs text-muted-foreground">
                  Example: ₱100,000 base → ₱100,000 + ₱12,000 (VAT) - ₱2,000 (EWT) - ₱10,000 (Retention) = ₱100,000 net
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Company Information
              </CardTitle>
              <CardDescription>Displayed on invoices, reports, and official documents</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyAddress">Address</Label>
                <Input
                  id="companyAddress"
                  value={companyAddress}
                  onChange={(e) => setCompanyAddress(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyTIN">TIN</Label>
                <Input
                  id="companyTIN"
                  value={companyTIN}
                  onChange={(e) => setCompanyTIN(e.target.value)}
                  placeholder="000-000-000-000"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Labor Costing Defaults
              </CardTitle>
              <CardDescription>Configure default labor cost calculation methods</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="laborMethod">Default Labor Costing Method</Label>
                <select
                  id="laborMethod"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                >
                  <option value="percentage_material">Percentage of Material Cost</option>
                  <option value="percentage_total">Percentage of Total Direct Cost</option>
                  <option value="manual">Manual Entry Per Item</option>
                  <option value="hybrid">Hybrid (Override Per Project)</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="laborPercentage">Default Labor Percentage (%)</Label>
                <Input
                  id="laborPercentage"
                  type="number"
                  step="1"
                  defaultValue="30"
                />
                <p className="text-xs text-muted-foreground">Applied when using percentage-based labor costing</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                AI & Integrations
              </CardTitle>
              <CardDescription>Configure AI-assisted features and third-party services</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="aiProvider">AI Drawing Analysis Provider</Label>
                <select
                  id="aiProvider"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                >
                  <option value="disabled">Disabled</option>
                  <option value="openai">OpenAI Vision API</option>
                  <option value="claude">Claude Vision</option>
                  <option value="custom">Custom Integration</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  placeholder="sk-..."
                />
                <p className="text-xs text-muted-foreground">Securely stored and encrypted</p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button variant="outline">Reset to Defaults</Button>
            <Button onClick={handleSaveSettings}>
              <Settings className="mr-2 h-4 w-4" />
              Save Settings
            </Button>
          </div>
        </div>
      </div>
    </CRMLayout>
  );
}