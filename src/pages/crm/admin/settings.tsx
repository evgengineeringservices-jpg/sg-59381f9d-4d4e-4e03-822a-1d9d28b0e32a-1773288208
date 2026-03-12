import { useState, useEffect } from "react";
import { CRMLayout } from "@/components/layout/CRMLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Settings, DollarSign, FileText, Globe } from "lucide-react";
import { PH_VAT_RATE, PH_EWT_RATE, PH_RETENTION_RATE } from "@/constants";

export default function SettingsPage() {
  const [vatRate, setVatRate] = useState((PH_VAT_RATE * 100).toString());
  const [ewtRate, setEwtRate] = useState((PH_EWT_RATE * 100).toString());
  const [retentionRate, setRetentionRate] = useState((PH_RETENTION_RATE * 100).toString());
  const [companyName, setCompanyName] = useState("Premier Construction Inc.");
  const [companyAddress, setCompanyAddress] = useState("123 Construction Ave, Makati City, Metro Manila");
  const [companyTIN, setCompanyTIN] = useState("000-000-000-000");

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