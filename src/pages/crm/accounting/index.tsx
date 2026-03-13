import { useState, useEffect, useMemo } from "react";
import { CRMLayout } from "@/components/layout/CRMLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { getAccounts, getJournalEntries, createJournalEntry, postJournalEntry } from "@/services/accountingService";
import { getProjects } from "@/services/crmService";
import type { Account, JournalEntry, Project } from "@/types";
import { Plus, Calculator, Landmark, BookOpen, CheckCircle2, Trash2 } from "lucide-react";
import { format } from "date-fns";

export default function AccountingPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("journal");
  const [loading, setLoading] = useState(true);
  
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  
  const [dialogOpen, setDialogOpen] = useState(false);

  // New Journal Entry State
  const [newEntry, setNewEntry] = useState({
    date: new Date().toISOString().split("T")[0],
    referenceNo: "",
    description: "",
    projectId: "none",
  });
  const [newLines, setNewLines] = useState([
    { accountId: "", description: "", debit: 0, credit: 0 },
    { accountId: "", description: "", debit: 0, credit: 0 },
  ]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [accs, jEs, projs] = await Promise.all([
        getAccounts(),
        getJournalEntries(),
        getProjects(),
      ]);
      setAccounts(accs);
      setEntries(jEs);
      setProjects(projs);
    } catch (error) {
      console.error("Error loading accounting data:", error);
      toast({ title: "Error", description: "Failed to load accounting data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  const handleAddLine = () => {
    setNewLines([...newLines, { accountId: "", description: "", debit: 0, credit: 0 }]);
  };

  const handleRemoveLine = (index: number) => {
    setNewLines(newLines.filter((_, i) => i !== index));
  };

  const handleLineChange = (index: number, field: string, value: string | number) => {
    const updated = [...newLines];
    (updated[index] as any)[field] = value;
    
    // Auto-balance logic helper
    if (field === 'debit' && Number(value) > 0) updated[index].credit = 0;
    if (field === 'credit' && Number(value) > 0) updated[index].debit = 0;
    
    setNewLines(updated);
  };

  const totalDebit = newLines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
  const totalCredit = newLines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0);
  const isBalanced = totalDebit > 0 && totalDebit === totalCredit;

  const handleSaveEntry = async (postImmediately: boolean) => {
    if (!isBalanced) {
      toast({ title: "Validation Error", description: "Debits must equal credits.", variant: "destructive" });
      return;
    }
    if (newLines.some(l => !l.accountId)) {
      toast({ title: "Validation Error", description: "All lines must have an account selected.", variant: "destructive" });
      return;
    }

    try {
      await createJournalEntry(
        {
          date: newEntry.date,
          referenceNo: newEntry.referenceNo || `JE-${Date.now().toString().slice(-6)}`,
          description: newEntry.description,
          projectId: newEntry.projectId === "none" ? null : newEntry.projectId,
          status: postImmediately ? "posted" : "draft"
        },
        newLines.map(l => ({ ...l, debit: Number(l.debit), credit: Number(l.credit) }))
      );
      
      toast({ title: "Success", description: `Journal entry ${postImmediately ? "posted" : "saved as draft"}.` });
      setDialogOpen(false);
      setNewEntry({ date: new Date().toISOString().split("T")[0], referenceNo: "", description: "", projectId: "none" });
      setNewLines([{ accountId: "", description: "", debit: 0, credit: 0 }, { accountId: "", description: "", debit: 0, credit: 0 }]);
      loadData();
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to save journal entry", variant: "destructive" });
    }
  };

  const handlePostEntry = async (id: string) => {
    try {
      await postJournalEntry(id);
      toast({ title: "Success", description: "Entry posted successfully." });
      loadData();
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to post entry", variant: "destructive" });
    }
  };

  // --- Financial Statements Calculations ---
  const statements = useMemo(() => {
    const balances: Record<string, number> = {};
    
    // Only use posted entries
    const postedEntries = entries.filter(e => e.status === "posted");
    
    // Calculate balances per account
    postedEntries.forEach(entry => {
      entry.lines?.forEach(line => {
        if (!balances[line.accountId]) balances[line.accountId] = 0;
        
        const account = accounts.find(a => a.id === line.accountId);
        if (!account) return;
        
        // Asset/Expense: Debit +, Credit -
        // Liab/Equity/Revenue: Credit +, Debit -
        if (['asset', 'expense'].includes(account.type)) {
          balances[line.accountId] += (line.debit - line.credit);
        } else {
          balances[line.accountId] += (line.credit - line.debit);
        }
      });
    });

    let revenue = 0, directCosts = 0, overhead = 0;
    let assets = 0, liabilities = 0, equity = 0;

    accounts.forEach(acc => {
      const bal = balances[acc.id] || 0;
      if (acc.type === 'revenue') revenue += bal;
      if (acc.type === 'expense' && acc.category.includes('Direct')) directCosts += bal;
      if (acc.type === 'expense' && acc.category.includes('Overhead')) overhead += bal;
      
      if (acc.type === 'asset') assets += bal;
      if (acc.type === 'liability') liabilities += bal;
      if (acc.type === 'equity') equity += bal;
    });

    const grossProfit = revenue - directCosts;
    const netIncome = grossProfit - overhead;

    return {
      balances,
      revenue, directCosts, overhead, grossProfit, netIncome,
      assets, liabilities, equity, totalEquity: equity + netIncome
    };
  }, [entries, accounts]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(val);

  if (loading) return <CRMLayout><div className="flex justify-center p-12"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div></CRMLayout>;

  return (
    <CRMLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-3xl md:text-4xl mb-2 tracking-wide">ACCOUNTING</h1>
          <p className="text-muted-foreground">Manage journal entries and financial statements</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6 bg-muted/50 p-1">
            <TabsTrigger value="journal" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><BookOpen className="w-4 h-4 mr-2" /> Journal Entries</TabsTrigger>
            <TabsTrigger value="accounts" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Landmark className="w-4 h-4 mr-2" /> Chart of Accounts</TabsTrigger>
            <TabsTrigger value="statements" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Calculator className="w-4 h-4 mr-2" /> Financial Statements</TabsTrigger>
          </TabsList>

          {/* JOURNAL ENTRIES TAB */}
          <TabsContent value="journal" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Recent Entries</h2>
              
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button><Plus className="w-4 h-4 mr-2" /> New Journal Entry</Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl">
                  <DialogHeader>
                    <DialogTitle>Create Journal Entry</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label>Date</Label>
                        <Input type="date" value={newEntry.date} onChange={e => setNewEntry({ ...newEntry, date: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Reference No</Label>
                        <Input placeholder="Auto-generated if blank" value={newEntry.referenceNo} onChange={e => setNewEntry({ ...newEntry, referenceNo: e.target.value })} />
                      </div>
                      <div className="space-y-2 col-span-2">
                        <Label>Project (Optional)</Label>
                        <Select value={newEntry.projectId} onValueChange={v => setNewEntry({ ...newEntry, projectId: v })}>
                          <SelectTrigger><SelectValue placeholder="Select Project" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No Project</SelectItem>
                            {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2 col-span-4">
                        <Label>Description</Label>
                        <Input placeholder="Entry description" value={newEntry.description} onChange={e => setNewEntry({ ...newEntry, description: e.target.value })} />
                      </div>
                    </div>

                    <div className="border rounded-md mt-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Account</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="w-32 text-right">Debit</TableHead>
                            <TableHead className="w-32 text-right">Credit</TableHead>
                            <TableHead className="w-12"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {newLines.map((line, i) => (
                            <TableRow key={i}>
                              <TableCell>
                                <Select value={line.accountId} onValueChange={v => handleLineChange(i, 'accountId', v)}>
                                  <SelectTrigger className="w-[200px]"><SelectValue placeholder="Select Account" /></SelectTrigger>
                                  <SelectContent>
                                    {accounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.code} - {acc.name}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell><Input placeholder="Line desc..." value={line.description} onChange={e => handleLineChange(i, 'description', e.target.value)} /></TableCell>
                              <TableCell><Input type="number" className="text-right" value={line.debit || ''} onChange={e => handleLineChange(i, 'debit', e.target.value)} /></TableCell>
                              <TableCell><Input type="number" className="text-right" value={line.credit || ''} onChange={e => handleLineChange(i, 'credit', e.target.value)} /></TableCell>
                              <TableCell>
                                {newLines.length > 2 && (
                                  <Button variant="ghost" size="sm" onClick={() => handleRemoveLine(i)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    
                    <div className="flex justify-between items-center pt-2">
                      <Button variant="outline" onClick={handleAddLine}><Plus className="w-4 h-4 mr-2" /> Add Line</Button>
                      <div className="flex gap-8 font-semibold">
                        <div className={totalDebit !== totalCredit ? "text-destructive" : ""}>Total Debit: {formatCurrency(totalDebit)}</div>
                        <div className={totalDebit !== totalCredit ? "text-destructive" : ""}>Total Credit: {formatCurrency(totalCredit)}</div>
                      </div>
                    </div>
                    
                    <div className="flex justify-end gap-2 pt-4">
                      <Button variant="outline" onClick={() => handleSaveEntry(false)} disabled={!isBalanced}>Save as Draft</Button>
                      <Button onClick={() => handleSaveEntry(true)} disabled={!isBalanced}>Post Entry</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No journal entries found</TableCell></TableRow>
                  ) : entries.map((entry) => {
                    const amount = entry.lines?.reduce((sum, line) => sum + line.debit, 0) || 0;
                    return (
                      <TableRow key={entry.id}>
                        <TableCell>{format(new Date(entry.date), "MMM d, yyyy")}</TableCell>
                        <TableCell className="font-mono text-sm">{entry.referenceNo}</TableCell>
                        <TableCell>
                          <div>{entry.description}</div>
                          <div className="text-xs text-muted-foreground">{entry.lines?.length || 0} lines</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={entry.status === 'posted' ? 'default' : 'secondary'}>
                            {entry.status.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(amount)}</TableCell>
                        <TableCell className="text-right">
                          {entry.status === 'draft' && (
                            <Button variant="ghost" size="sm" onClick={() => handlePostEntry(entry.id)} className="text-green-600">
                              <CheckCircle2 className="w-4 h-4 mr-1" /> Post
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* CHART OF ACCOUNTS TAB */}
          <TabsContent value="accounts" className="space-y-4">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Code</TableHead>
                    <TableHead>Account Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Current Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map(acc => (
                    <TableRow key={acc.id}>
                      <TableCell className="font-mono">{acc.code}</TableCell>
                      <TableCell className="font-medium">{acc.name}</TableCell>
                      <TableCell className="capitalize">{acc.type}</TableCell>
                      <TableCell>{acc.category}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(statements.balances[acc.id] || 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* FINANCIAL STATEMENTS TAB */}
          <TabsContent value="statements" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              
              {/* PROFIT & LOSS */}
              <Card className="shadow-md border-t-4 border-t-primary">
                <CardHeader className="bg-muted/20 border-b">
                  <CardTitle>Income Statement (P&L)</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex justify-between items-end border-b pb-2">
                    <span className="font-semibold text-lg">Revenue</span>
                    <span className="font-bold text-lg">{formatCurrency(statements.revenue)}</span>
                  </div>
                  
                  <div className="space-y-2 pl-4">
                    <div className="text-sm font-medium text-muted-foreground mb-1">Direct Costs (COGS)</div>
                    {accounts.filter(a => a.type === 'expense' && a.category.includes('Direct') && (statements.balances[a.id] || 0) > 0).map(acc => (
                      <div key={acc.id} className="flex justify-between text-sm">
                        <span>{acc.name}</span>
                        <span>{formatCurrency(statements.balances[acc.id] || 0)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between font-semibold border-t pt-2">
                      <span>Total Direct Costs</span>
                      <span>{formatCurrency(statements.directCosts)}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-end border-b border-t py-3 bg-muted/10 px-2 rounded">
                    <span className="font-bold">Gross Profit</span>
                    <span className="font-bold text-primary">{formatCurrency(statements.grossProfit)}</span>
                  </div>

                  <div className="space-y-2 pl-4">
                    <div className="text-sm font-medium text-muted-foreground mb-1">Overhead Expenses</div>
                    {accounts.filter(a => a.type === 'expense' && a.category.includes('Overhead') && (statements.balances[a.id] || 0) > 0).map(acc => (
                      <div key={acc.id} className="flex justify-between text-sm">
                        <span>{acc.name}</span>
                        <span>{formatCurrency(statements.balances[acc.id] || 0)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between font-semibold border-t pt-2">
                      <span>Total Overhead</span>
                      <span>{formatCurrency(statements.overhead)}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-end border-t-2 border-primary pt-3 px-2">
                    <span className="font-bold text-xl uppercase tracking-wider">Net Income</span>
                    <span className={`font-bold text-xl ${statements.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(statements.netIncome)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* BALANCE SHEET */}
              <Card className="shadow-md border-t-4 border-t-accent">
                <CardHeader className="bg-muted/20 border-b">
                  <CardTitle>Balance Sheet</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  {/* ASSETS */}
                  <div className="space-y-2">
                    <div className="font-semibold text-lg border-b pb-1">Assets</div>
                    {accounts.filter(a => a.type === 'asset' && (statements.balances[a.id] || 0) !== 0).map(acc => (
                      <div key={acc.id} className="flex justify-between text-sm pl-4">
                        <span>{acc.name}</span>
                        <span>{formatCurrency(statements.balances[acc.id] || 0)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between font-bold border-t pt-2 bg-muted/10 px-2 rounded">
                      <span>Total Assets</span>
                      <span>{formatCurrency(statements.assets)}</span>
                    </div>
                  </div>

                  {/* LIABILITIES */}
                  <div className="space-y-2 pt-4">
                    <div className="font-semibold text-lg border-b pb-1">Liabilities</div>
                    {accounts.filter(a => a.type === 'liability' && (statements.balances[a.id] || 0) !== 0).map(acc => (
                      <div key={acc.id} className="flex justify-between text-sm pl-4">
                        <span>{acc.name}</span>
                        <span>{formatCurrency(statements.balances[acc.id] || 0)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between font-bold border-t pt-2 bg-muted/10 px-2 rounded">
                      <span>Total Liabilities</span>
                      <span>{formatCurrency(statements.liabilities)}</span>
                    </div>
                  </div>

                  {/* EQUITY */}
                  <div className="space-y-2 pt-4">
                    <div className="font-semibold text-lg border-b pb-1">Equity</div>
                    {accounts.filter(a => a.type === 'equity' && (statements.balances[a.id] || 0) !== 0).map(acc => (
                      <div key={acc.id} className="flex justify-between text-sm pl-4">
                        <span>{acc.name}</span>
                        <span>{formatCurrency(statements.balances[acc.id] || 0)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm pl-4 text-muted-foreground italic">
                      <span>Current Year Net Income</span>
                      <span>{formatCurrency(statements.netIncome)}</span>
                    </div>
                    <div className="flex justify-between font-bold border-t pt-2 bg-muted/10 px-2 rounded">
                      <span>Total Equity</span>
                      <span>{formatCurrency(statements.totalEquity)}</span>
                    </div>
                  </div>

                  {/* CHECK */}
                  <div className="flex justify-between items-end border-t-2 border-primary pt-3 px-2 mt-4">
                    <span className="font-bold text-sm uppercase">Total Liab. & Equity</span>
                    <span className="font-bold">
                      {formatCurrency(statements.liabilities + statements.totalEquity)}
                    </span>
                  </div>
                </CardContent>
              </Card>

            </div>
          </TabsContent>
        </Tabs>
      </div>
    </CRMLayout>
  );
}