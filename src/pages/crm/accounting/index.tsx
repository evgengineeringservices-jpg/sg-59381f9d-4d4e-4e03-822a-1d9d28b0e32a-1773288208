import { useState, useEffect, useMemo } from "react";
import { CRMLayout } from "@/components/layout/CRMLayout";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Download, FileText, Trash2, CheckCircle, XCircle, Clock, Filter, Calendar, Search, TrendingUp, TrendingDown, Users, DollarSign } from "lucide-react";
import {
  getAccounts,
  getJournalEntries,
  createJournalEntry,
  updateJournalEntry,
  postJournalEntry,
  getAccountsReceivableAging,
  getAccountsPayableAging,
  exportProfitAndLossToPDF,
  exportProfitAndLossToExcel,
  exportBalanceSheetToPDF,
  exportBalanceSheetToExcel,
  getRecurringJournalEntries,
  createRecurringJournalEntry,
  updateRecurringJournalEntry,
  generateJournalEntriesFromRecurring,
  getBankReconciliations,
  createBankReconciliation,
  updateBankReconciliation,
  createBankTransaction,
  updateBankTransaction,
  deleteBankTransaction,
  getFinancialStatementComparison,
  getShareholders,
  createShareholder,
  updateShareholder,
  deleteShareholder,
  getDividends,
  createDividend,
  updateDividend,
  deleteDividend,
  generateDividendPayments,
  updateDividendPayment,
  getEquityAccounts,
  createEquityAccount,
  updateEquityAccount,
} from "@/services/accountingService";
import { getProjects } from "@/services/crmService";
import type { Account, JournalEntry, JournalLine, RecurringJournalEntry, BankReconciliation, BankTransaction, Shareholder, Dividend, DividendPayment, EquityAccount } from "@/types";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function AccountingPage() {
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("journal");
  const [loading, setLoading] = useState(true);
  
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  
  const [journalDialogOpen, setJournalDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [newEntry, setNewEntry] = useState({
    description: "",
    date: new Date().toISOString().split("T")[0],
    projectId: "",
  });
  const [journalLines, setJournalLines] = useState<any[]>([
    { accountId: "", description: "", debit: 0, credit: 0 },
  ]);
  
  const [arAging, setArAging] = useState<any>(null);
  const [apAging, setApAging] = useState<any>(null);

  const [recurringEntries, setRecurringEntries] = useState<RecurringJournalEntry[]>([]);
  const [recurringDialogOpen, setRecurringDialogOpen] = useState(false);
  const [editingRecurring, setEditingRecurring] = useState<RecurringJournalEntry | null>(null);
  const [newRecurring, setNewRecurring] = useState({
    description: "",
    frequency: "monthly" as "daily" | "weekly" | "monthly" | "quarterly" | "yearly",
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    projectId: "",
    isActive: true,
  });
  const [recurringLines, setRecurringLines] = useState<any[]>([
    { accountId: "", description: "", debit: 0, credit: 0 },
  ]);

  const [recurringSearchQuery, setRecurringSearchQuery] = useState("");
  const [recurringFrequencyFilter, setRecurringFrequencyFilter] = useState("all");
  const [recurringStatusFilter, setRecurringStatusFilter] = useState("all");
  const [recurringPage, setRecurringPage] = useState(1);
  const [recurringPerPage, setRecurringPerPage] = useState(10);

  const [reconciliations, setReconciliations] = useState<BankReconciliation[]>([]);
  const [reconciliationDialogOpen, setReconciliationDialogOpen] = useState(false);
  const [editingReconciliation, setEditingReconciliation] = useState<BankReconciliation | null>(null);
  const [newReconciliation, setNewReconciliation] = useState({
    accountId: "",
    statementDate: new Date().toISOString().split("T")[0],
    statementBalance: 0,
    bookBalance: 0,
    status: "pending" as "pending" | "reconciled",
  });
  const [bankTransactions, setBankTransactions] = useState<any[]>([]);

  const [reconAccountFilter, setReconAccountFilter] = useState("all");
  const [reconStatusFilter, setReconStatusFilter] = useState("all");
  const [reconDateFrom, setReconDateFrom] = useState("");
  const [reconDateTo, setReconDateTo] = useState("");
  const [reconPage, setReconPage] = useState(1);
  const [reconPerPage, setReconPerPage] = useState(10);

  const [comparisonPeriods, setComparisonPeriods] = useState<{ startDate: string; endDate: string; label: string }[]>([
    { startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0], endDate: new Date().toISOString().split("T")[0], label: "Current Year" },
    { startDate: new Date(new Date().getFullYear() - 1, 0, 1).toISOString().split("T")[0], endDate: new Date(new Date().getFullYear() - 1, 11, 31).toISOString().split("T")[0], label: "Previous Year" },
  ]);
  const [comparisonData, setComparisonData] = useState<any>(null);
  const [comparisonCharts, setComparisonCharts] = useState<any>(null);

  const [shareholders, setShareholders] = useState<Shareholder[]>([]);
  const [shareholderDialogOpen, setShareholderDialogOpen] = useState(false);
  const [editingShareholder, setEditingShareholder] = useState<Shareholder | null>(null);
  const [newShareholder, setNewShareholder] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    tinNumber: "",
    shareholderType: "individual" as "individual" | "corporate",
    totalShares: 0,
    parValue: 0,
    totalInvestment: 0,
    percentageOwnership: 0,
    certificateNumbers: "",
    status: "active" as "active" | "inactive",
    dateJoined: new Date().toISOString().split("T")[0],
    notes: "",
  });

  const [dividends, setDividends] = useState<Dividend[]>([]);
  const [dividendDialogOpen, setDividendDialogOpen] = useState(false);
  const [editingDividend, setEditingDividend] = useState<Dividend | null>(null);
  const [newDividend, setNewDividend] = useState({
    dividendDate: new Date().toISOString().split("T")[0],
    declarationDate: new Date().toISOString().split("T")[0],
    recordDate: new Date().toISOString().split("T")[0],
    paymentDate: new Date().toISOString().split("T")[0],
    dividendType: "cash" as "cash" | "stock",
    totalAmount: 0,
    perShareAmount: 0,
    fiscalYear: new Date().getFullYear(),
    fiscalQuarter: 1,
    status: "declared" as "declared" | "approved" | "paid",
    approvedBy: "",
    paidBy: "",
    notes: "",
  });

  const [equityAccounts, setEquityAccounts] = useState<EquityAccount[]>([]);
  const [equityDialogOpen, setEquityDialogOpen] = useState(false);
  const [editingEquity, setEditingEquity] = useState<EquityAccount | null>(null);
  const [newEquity, setNewEquity] = useState({
    accountType: "capital_stock" as "capital_stock" | "retained_earnings" | "additional_paid_in_capital" | "treasury_stock" | "other_comprehensive_income",
    name: "",
    balance: 0,
    description: "",
  });

  useEffect(() => {
    if (!authLoading && user) {
      loadData();
    }
  }, [authLoading, user]);

  async function loadData() {
    try {
      setLoading(true);
      const [accs, jEs, projs] = await Promise.all([
        getAccounts(),
        getJournalEntries(),
        getProjects(),
      ]);
      setAccounts(accs);
      setJournalEntries(jEs);
      setProjects(projs);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setLoading(false);
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(amount);
  };

  const totalDebit = journalLines.reduce((sum, line) => sum + (line.debit || 0), 0);
  const totalCredit = journalLines.reduce((sum, line) => sum + (line.credit || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  async function handleSaveEntry() {
    try {
      if (!isBalanced) {
        toast({ variant: "destructive", title: "Error", description: "Journal entry must be balanced (total debit = total credit)" });
        return;
      }

      const entryData = {
        description: newEntry.description,
        date: newEntry.date,
        projectId: newEntry.projectId || undefined,
        status: "draft" as const,
      };

      if (editingEntry) {
        await updateJournalEntry(editingEntry.id, entryData, journalLines);
        toast({ title: "Success", description: "Journal entry updated successfully" });
      } else {
        await createJournalEntry(entryData, journalLines);
        toast({ title: "Success", description: "Journal entry created successfully" });
      }

      setJournalDialogOpen(false);
      setEditingEntry(null);
      setNewEntry({ description: "", date: new Date().toISOString().split("T")[0], projectId: "" });
      setJournalLines([{ accountId: "", description: "", debit: 0, credit: 0 }]);
      loadData();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  }

  async function handlePostEntry(entryId: string) {
    try {
      await postJournalEntry(entryId);
      toast({ title: "Success", description: "Journal entry posted successfully" });
      loadData();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  }

  function handleAddLine() {
    setJournalLines([...journalLines, { accountId: "", description: "", debit: 0, credit: 0 }]);
  }

  function handleRemoveLine(index: number) {
    setJournalLines(journalLines.filter((_, i) => i !== index));
  }

  function handleLineChange(index: number, field: keyof JournalLine, value: any) {
    const updated = [...journalLines];
    (updated[index] as any)[field] = value;
    setJournalLines(updated);
  }

  async function loadARAgingReport() {
    try {
      const data = await getAccountsReceivableAging();
      setArAging(data);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  }

  async function loadAPAgingReport() {
    try {
      const data = await getAccountsPayableAging();
      setApAging(data);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  }

  const statements = useMemo(() => {
    const revenue = accounts.filter(a => a.type === "revenue");
    const cogs = accounts.filter(a => a.type === "cogs");
    const expenses = accounts.filter(a => a.type === "expense");
    const assets = accounts.filter(a => a.type === "asset");
    const liabilities = accounts.filter(a => a.type === "liability");
    const equity = accounts.filter(a => a.type === "equity");

    const totalRevenue = revenue.reduce((sum, a) => sum + a.balance, 0);
    const totalCOGS = cogs.reduce((sum, a) => sum + a.balance, 0);
    const totalExpenses = expenses.reduce((sum, a) => sum + a.balance, 0);
    const grossProfit = totalRevenue - totalCOGS;
    const netIncome = grossProfit - totalExpenses;

    const totalAssets = assets.reduce((sum, a) => sum + a.balance, 0);
    const totalLiabilities = liabilities.reduce((sum, a) => sum + a.balance, 0);
    const totalEquity = equity.reduce((sum, a) => sum + a.balance, 0) + netIncome;

    return {
      profitAndLoss: { revenue, cogs, expenses, totalRevenue, totalCOGS, totalExpenses, grossProfit, netIncome },
      balanceSheet: { assets, liabilities, equity, totalAssets, totalLiabilities, totalEquity },
    };
  }, [accounts]);

  async function loadRecurringEntries() {
    try {
      const data = await getRecurringJournalEntries();
      setRecurringEntries(data);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  }

  async function handleSaveRecurring() {
    try {
      const recurringData: any = {
        description: newRecurring.description,
        frequency: newRecurring.frequency,
        startDate: newRecurring.startDate,
        endDate: newRecurring.endDate || undefined,
        projectId: newRecurring.projectId || undefined,
        isActive: newRecurring.isActive,
        nextOccurrence: newRecurring.startDate,
      };

      if (editingRecurring) {
        await updateRecurringJournalEntry(editingRecurring.id, recurringData, recurringLines);
        toast({ title: "Success", description: "Recurring entry updated successfully" });
      } else {
        await createRecurringJournalEntry(recurringData, recurringLines);
        toast({ title: "Success", description: "Recurring entry created successfully" });
      }

      setRecurringDialogOpen(false);
      setEditingRecurring(null);
      setNewRecurring({ description: "", frequency: "monthly", startDate: new Date().toISOString().split("T")[0], endDate: "", projectId: "", isActive: true });
      setRecurringLines([{ accountId: "", description: "", debit: 0, credit: 0 }]);
      loadRecurringEntries();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  }

  async function handleGenerateRecurringEntries() {
    try {
      const generated = await generateJournalEntriesFromRecurring();
      toast({ title: "Success", description: `Generated ${generated.length} journal entries from recurring templates` });
      loadData();
      loadRecurringEntries();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  }

  const filteredRecurringEntries = useMemo(() => {
    return recurringEntries.filter(entry => {
      const matchesSearch = entry.description.toLowerCase().includes(recurringSearchQuery.toLowerCase());
      const matchesFrequency = recurringFrequencyFilter === "all" || entry.frequency === recurringFrequencyFilter;
      const matchesStatus = recurringStatusFilter === "all" || (recurringStatusFilter === "active" ? entry.isActive : !entry.isActive);
      return matchesSearch && matchesFrequency && matchesStatus;
    });
  }, [recurringEntries, recurringSearchQuery, recurringFrequencyFilter, recurringStatusFilter]);

  const paginatedRecurringEntries = useMemo(() => {
    const startIndex = (recurringPage - 1) * recurringPerPage;
    return filteredRecurringEntries.slice(startIndex, startIndex + recurringPerPage);
  }, [filteredRecurringEntries, recurringPage, recurringPerPage]);

  const recurringTotalPages = Math.ceil(filteredRecurringEntries.length / recurringPerPage);

  async function loadBankReconciliations() {
    try {
      const data = await getBankReconciliations();
      setReconciliations(data);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  }

  async function handleSaveReconciliation() {
    try {
      const reconciliationData = {
        accountId: newReconciliation.accountId,
        statementDate: newReconciliation.statementDate,
        statementBalance: newReconciliation.statementBalance,
        bookBalance: newReconciliation.bookBalance,
        status: newReconciliation.status,
      };

      if (editingReconciliation) {
        await updateBankReconciliation(editingReconciliation.id, reconciliationData, bankTransactions);
        toast({ title: "Success", description: "Bank reconciliation updated successfully" });
      } else {
        await createBankReconciliation(reconciliationData, bankTransactions);
        toast({ title: "Success", description: "Bank reconciliation created successfully" });
      }

      setReconciliationDialogOpen(false);
      setEditingReconciliation(null);
      setNewReconciliation({ accountId: "", statementDate: new Date().toISOString().split("T")[0], statementBalance: 0, bookBalance: 0, status: "pending" });
      setBankTransactions([]);
      loadBankReconciliations();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  }

  const filteredReconciliations = useMemo(() => {
    return reconciliations.filter(recon => {
      const matchesAccount = reconAccountFilter === "all" || recon.accountId === reconAccountFilter;
      const matchesStatus = reconStatusFilter === "all" || recon.status === reconStatusFilter;
      const matchesDateFrom = !reconDateFrom || recon.statementDate >= reconDateFrom;
      const matchesDateTo = !reconDateTo || recon.statementDate <= reconDateTo;
      return matchesAccount && matchesStatus && matchesDateFrom && matchesDateTo;
    });
  }, [reconciliations, reconAccountFilter, reconStatusFilter, reconDateFrom, reconDateTo]);

  const paginatedReconciliations = useMemo(() => {
    const startIndex = (reconPage - 1) * reconPerPage;
    return filteredReconciliations.slice(startIndex, startIndex + reconPerPage);
  }, [filteredReconciliations, reconPage, reconPerPage]);

  const reconTotalPages = Math.ceil(filteredReconciliations.length / reconPerPage);

  async function loadPeriodComparison() {
    try {
      const data = await getFinancialStatementComparison(comparisonPeriods);
      setComparisonData(data);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  }

  async function loadShareholders() {
    try {
      const data = await getShareholders();
      setShareholders(data);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  }

  async function handleSaveShareholder() {
    try {
      if (editingShareholder) {
        await updateShareholder(editingShareholder.id, newShareholder);
        toast({ title: "Success", description: "Shareholder updated successfully" });
      } else {
        await createShareholder(newShareholder);
        toast({ title: "Success", description: "Shareholder created successfully" });
      }
      setShareholderDialogOpen(false);
      setEditingShareholder(null);
      setNewShareholder({
        name: "", email: "", phone: "", address: "", tinNumber: "", shareholderType: "individual",
        totalShares: 0, parValue: 0, totalInvestment: 0, percentageOwnership: 0, certificateNumbers: "",
        status: "active", dateJoined: new Date().toISOString().split("T")[0], notes: ""
      });
      loadShareholders();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  }

  async function handleDeleteShareholder(id: string) {
    if (!confirm("Are you sure you want to delete this shareholder?")) return;
    try {
      await deleteShareholder(id);
      toast({ title: "Success", description: "Shareholder deleted successfully" });
      loadShareholders();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  }

  async function loadDividends() {
    try {
      const data = await getDividends();
      setDividends(data);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  }

  async function handleSaveDividend() {
    try {
      if (editingDividend) {
        await updateDividend(editingDividend.id, newDividend);
        toast({ title: "Success", description: "Dividend updated successfully" });
      } else {
        const dividend = await createDividend(newDividend);
        await generateDividendPayments(dividend.id, shareholders);
        toast({ title: "Success", description: "Dividend created and payments generated" });
      }
      setDividendDialogOpen(false);
      setEditingDividend(null);
      setNewDividend({
        dividendDate: new Date().toISOString().split("T")[0],
        declarationDate: new Date().toISOString().split("T")[0],
        recordDate: new Date().toISOString().split("T")[0],
        paymentDate: new Date().toISOString().split("T")[0],
        dividendType: "cash", totalAmount: 0, perShareAmount: 0,
        fiscalYear: new Date().getFullYear(), fiscalQuarter: 1,
        status: "declared", approvedBy: "", paidBy: "", notes: ""
      });
      loadDividends();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  }

  async function handleDeleteDividend(id: string) {
    if (!confirm("Are you sure you want to delete this dividend?")) return;
    try {
      await deleteDividend(id);
      toast({ title: "Success", description: "Dividend deleted successfully" });
      loadDividends();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  }

  async function loadEquityAccounts() {
    try {
      const data = await getEquityAccounts();
      setEquityAccounts(data);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  }

  async function handleSaveEquity() {
    try {
      if (editingEquity) {
        await updateEquityAccount(editingEquity.id, newEquity);
        toast({ title: "Success", description: "Equity account updated successfully" });
      } else {
        await createEquityAccount(newEquity);
        toast({ title: "Success", description: "Equity account created successfully" });
      }
      setEquityDialogOpen(false);
      setEditingEquity(null);
      setNewEquity({ accountType: "capital_stock", name: "", balance: 0, description: "" });
      loadEquityAccounts();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  }

  useEffect(() => {
    if (!comparisonData) return;

    const periods = Object.keys(comparisonData.profitAndLoss);
    const revenueData = periods.map(period => ({
      period,
      revenue: comparisonData.profitAndLoss[period].totalRevenue,
      cogs: comparisonData.profitAndLoss[period].totalCOGS,
      expenses: comparisonData.profitAndLoss[period].totalExpenses,
    }));

    const marginData = periods.map(period => ({
      period,
      grossMargin: ((comparisonData.profitAndLoss[period].grossProfit / comparisonData.profitAndLoss[period].totalRevenue) * 100).toFixed(1),
      netMargin: ((comparisonData.profitAndLoss[period].netIncome / comparisonData.profitAndLoss[period].totalRevenue) * 100).toFixed(1),
    }));

    const assetData = periods.map(period => ({
      period,
      currentAssets: comparisonData.balanceSheet[period].totalAssets * 0.6,
      nonCurrentAssets: comparisonData.balanceSheet[period].totalAssets * 0.4,
    }));

    const charts = { revenueData, marginData, assetData };
    setComparisonCharts(charts);
  }, [comparisonData]);

  if (authLoading) {
    return (
      <CRMLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </CRMLayout>
    );
  }

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <CRMLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </CRMLayout>
    );
  }

  return (
    <CRMLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Accounting</h1>
          <p className="text-muted-foreground">Manage your financial records and reports</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-11">
            <TabsTrigger value="journal">Journal Entries</TabsTrigger>
            <TabsTrigger value="accounts">Chart of Accounts</TabsTrigger>
            <TabsTrigger value="statements">Financial Statements</TabsTrigger>
            <TabsTrigger value="ar-aging">AR Aging</TabsTrigger>
            <TabsTrigger value="ap-aging">AP Aging</TabsTrigger>
            <TabsTrigger value="recurring">Recurring Entries</TabsTrigger>
            <TabsTrigger value="reconciliation">Bank Reconciliation</TabsTrigger>
            <TabsTrigger value="period-comparison">Period Comparison</TabsTrigger>
            <TabsTrigger value="shareholders">Shareholders</TabsTrigger>
            <TabsTrigger value="dividends">Dividends</TabsTrigger>
            <TabsTrigger value="equity">Equity</TabsTrigger>
          </TabsList>

          <TabsContent value="journal">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Journal Entries</CardTitle>
                    <CardDescription>Record financial transactions</CardDescription>
                  </div>
                  <Dialog open={journalDialogOpen} onOpenChange={setJournalDialogOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={() => { setEditingEntry(null); setNewEntry({ description: "", date: new Date().toISOString().split("T")[0], projectId: "" }); setJournalLines([{ accountId: "", description: "", debit: 0, credit: 0 }]); }}>
                        <Plus className="h-4 w-4 mr-2" />
                        New Entry
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>{editingEntry ? "Edit" : "Create"} Journal Entry</DialogTitle>
                        <DialogDescription>Record a new financial transaction</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="description">Description</Label>
                          <Input id="description" value={newEntry.description} onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })} placeholder="Transaction description" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="date">Date</Label>
                            <Input id="date" type="date" value={newEntry.date} onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })} />
                          </div>
                          <div>
                            <Label htmlFor="project">Project (Optional)</Label>
                            <Select value={newEntry.projectId} onValueChange={(value) => setNewEntry({ ...newEntry, projectId: value })}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select project" />
                              </SelectTrigger>
                              <SelectContent>
                                {projects.map((project) => (
                                  <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label>Journal Lines</Label>
                            <Button type="button" size="sm" variant="outline" onClick={handleAddLine}>
                              <Plus className="h-4 w-4 mr-2" />
                              Add Line
                            </Button>
                          </div>
                          <div className="border rounded-lg overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Account</TableHead>
                                  <TableHead>Description</TableHead>
                                  <TableHead className="text-right">Debit</TableHead>
                                  <TableHead className="text-right">Credit</TableHead>
                                  <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {journalLines.map((line, index) => (
                                  <TableRow key={index}>
                                    <TableCell>
                                      <Select value={line.accountId} onValueChange={(value) => handleLineChange(index, "accountId", value)}>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select account" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {accounts.map((account) => (
                                            <SelectItem key={account.id} value={account.id}>{account.code} - {account.name}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </TableCell>
                                    <TableCell>
                                      <Input value={line.description} onChange={(e) => handleLineChange(index, "description", e.target.value)} placeholder="Line description" />
                                    </TableCell>
                                    <TableCell>
                                      <Input type="number" step="0.01" value={line.debit || ""} onChange={(e) => handleLineChange(index, "debit", parseFloat(e.target.value) || 0)} className="text-right" />
                                    </TableCell>
                                    <TableCell>
                                      <Input type="number" step="0.01" value={line.credit || ""} onChange={(e) => handleLineChange(index, "credit", parseFloat(e.target.value) || 0)} className="text-right" />
                                    </TableCell>
                                    <TableCell>
                                      <Button type="button" size="icon" variant="ghost" onClick={() => handleRemoveLine(index)} disabled={journalLines.length === 1}>
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                          <div className="flex justify-end space-x-4 text-sm font-medium pt-2 border-t">
                            <div>Total Debit: {formatCurrency(totalDebit)}</div>
                            <div>Total Credit: {formatCurrency(totalCredit)}</div>
                          </div>
                          {!isBalanced && <p className="text-sm text-destructive">Entry must be balanced (debit = credit)</p>}
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setJournalDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveEntry} disabled={!isBalanced}>Save Entry</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {journalEntries.map((entry) => {
                      const totalAmount = entry.lines?.reduce((sum, line) => sum + line.debit, 0) || 0;
                      return (
                        <TableRow key={entry.id}>
                          <TableCell>{new Date(entry.date).toLocaleDateString()}</TableCell>
                          <TableCell>{entry.description}</TableCell>
                          <TableCell>{entry.project?.name || "-"}</TableCell>
                          <TableCell className="text-right">{formatCurrency(totalAmount)}</TableCell>
                          <TableCell>
                            <Badge variant={entry.status === "posted" ? "default" : "secondary"}>
                              {entry.status === "posted" ? <CheckCircle className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />}
                              {entry.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {entry.status === "draft" && (
                              <Button size="sm" variant="outline" onClick={() => handlePostEntry(entry.id)}>
                                Post
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="accounts">
            <Card>
              <CardHeader>
                <CardTitle>Chart of Accounts</CardTitle>
                <CardDescription>View all accounts and their balances</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accounts.map((account) => (
                      <TableRow key={account.id}>
                        <TableCell className="font-mono">{account.code}</TableCell>
                        <TableCell>{account.name}</TableCell>
                        <TableCell className="capitalize">{account.type}</TableCell>
                        <TableCell className="text-right">{formatCurrency(account.balance)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="statements">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Profit & Loss Statement</CardTitle>
                      <CardDescription>Income statement for the current period</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => exportProfitAndLossToPDF(statements.profitAndLoss)}>
                        <FileText className="h-4 w-4 mr-2" />
                        Export PDF
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => exportProfitAndLossToExcel(statements.profitAndLoss)}>
                        <Download className="h-4 w-4 mr-2" />
                        Export Excel
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold mb-2">Revenue</h3>
                      <Table>
                        <TableBody>
                          {statements.profitAndLoss.revenue.map((account) => (
                            <TableRow key={account.id}>
                              <TableCell>{account.name}</TableCell>
                              <TableCell className="text-right">{formatCurrency(account.balance)}</TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="font-semibold">
                            <TableCell>Total Revenue</TableCell>
                            <TableCell className="text-right">{formatCurrency(statements.profitAndLoss.totalRevenue)}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Cost of Goods Sold</h3>
                      <Table>
                        <TableBody>
                          {statements.profitAndLoss.cogs.map((account) => (
                            <TableRow key={account.id}>
                              <TableCell>{account.name}</TableCell>
                              <TableCell className="text-right">{formatCurrency(account.balance)}</TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="font-semibold">
                            <TableCell>Total COGS</TableCell>
                            <TableCell className="text-right">{formatCurrency(statements.profitAndLoss.totalCOGS)}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                    <div className="border-t pt-4">
                      <div className="flex justify-between font-semibold text-lg">
                        <span>Gross Profit</span>
                        <span>{formatCurrency(statements.profitAndLoss.grossProfit)}</span>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Operating Expenses</h3>
                      <Table>
                        <TableBody>
                          {statements.profitAndLoss.expenses.map((account) => (
                            <TableRow key={account.id}>
                              <TableCell>{account.name}</TableCell>
                              <TableCell className="text-right">{formatCurrency(account.balance)}</TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="font-semibold">
                            <TableCell>Total Expenses</TableCell>
                            <TableCell className="text-right">{formatCurrency(statements.profitAndLoss.totalExpenses)}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                    <div className="border-t pt-4">
                      <div className="flex justify-between font-bold text-xl">
                        <span>Net Income</span>
                        <span className={statements.profitAndLoss.netIncome >= 0 ? "text-green-600" : "text-red-600"}>
                          {formatCurrency(statements.profitAndLoss.netIncome)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Balance Sheet</CardTitle>
                      <CardDescription>Statement of financial position</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => exportBalanceSheetToPDF(statements.balanceSheet)}>
                        <FileText className="h-4 w-4 mr-2" />
                        Export PDF
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => exportBalanceSheetToExcel(statements.balanceSheet)}>
                        <Download className="h-4 w-4 mr-2" />
                        Export Excel
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold mb-2">Assets</h3>
                        <Table>
                          <TableBody>
                            {statements.balanceSheet.assets.map((account) => (
                              <TableRow key={account.id}>
                                <TableCell>{account.name}</TableCell>
                                <TableCell className="text-right">{formatCurrency(account.balance)}</TableCell>
                              </TableRow>
                            ))}
                            <TableRow className="font-semibold">
                              <TableCell>Total Assets</TableCell>
                              <TableCell className="text-right">{formatCurrency(statements.balanceSheet.totalAssets)}</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold mb-2">Liabilities</h3>
                        <Table>
                          <TableBody>
                            {statements.balanceSheet.liabilities.map((account) => (
                              <TableRow key={account.id}>
                                <TableCell>{account.name}</TableCell>
                                <TableCell className="text-right">{formatCurrency(account.balance)}</TableCell>
                              </TableRow>
                            ))}
                            <TableRow className="font-semibold">
                              <TableCell>Total Liabilities</TableCell>
                              <TableCell className="text-right">{formatCurrency(statements.balanceSheet.totalLiabilities)}</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2">Equity</h3>
                        <Table>
                          <TableBody>
                            {statements.balanceSheet.equity.map((account) => (
                              <TableRow key={account.id}>
                                <TableCell>{account.name}</TableCell>
                                <TableCell className="text-right">{formatCurrency(account.balance)}</TableCell>
                              </TableRow>
                            ))}
                            <TableRow>
                              <TableCell>Net Income</TableCell>
                              <TableCell className="text-right">{formatCurrency(statements.profitAndLoss.netIncome)}</TableCell>
                            </TableRow>
                            <TableRow className="font-semibold">
                              <TableCell>Total Equity</TableCell>
                              <TableCell className="text-right">{formatCurrency(statements.balanceSheet.totalEquity)}</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                      <div className="border-t pt-4">
                        <div className="flex justify-between font-bold">
                          <span>Total Liabilities & Equity</span>
                          <span>{formatCurrency(statements.balanceSheet.totalLiabilities + statements.balanceSheet.totalEquity)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="ar-aging">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Accounts Receivable Aging</CardTitle>
                    <CardDescription>Track outstanding customer invoices</CardDescription>
                  </div>
                  <Button onClick={loadARAgingReport}>Load Report</Button>
                </div>
              </CardHeader>
              <CardContent>
                {arAging ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-5 gap-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Current</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{formatCurrency(arAging.current)}</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">1-30 Days</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{formatCurrency(arAging.days1to30)}</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">31-60 Days</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{formatCurrency(arAging.days31to60)}</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">61-90 Days</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{formatCurrency(arAging.days61to90)}</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">90+ Days</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-destructive">{formatCurrency(arAging.over90)}</div>
                        </CardContent>
                      </Card>
                    </div>
                    <div className="border-t pt-4">
                      <div className="flex justify-between text-lg font-semibold">
                        <span>Total Receivables</span>
                        <span>{formatCurrency(arAging.total)}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Click "Load Report" to view AR aging</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ap-aging">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Accounts Payable Aging</CardTitle>
                    <CardDescription>Track outstanding vendor bills</CardDescription>
                  </div>
                  <Button onClick={loadAPAgingReport}>Load Report</Button>
                </div>
              </CardHeader>
              <CardContent>
                {apAging ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-5 gap-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Current</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{formatCurrency(apAging.current)}</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">1-30 Days</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{formatCurrency(apAging.days1to30)}</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">31-60 Days</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{formatCurrency(apAging.days31to60)}</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">61-90 Days</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{formatCurrency(apAging.days61to90)}</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">90+ Days</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-destructive">{formatCurrency(apAging.over90)}</div>
                        </CardContent>
                      </Card>
                    </div>
                    <div className="border-t pt-4">
                      <div className="flex justify-between text-lg font-semibold">
                        <span>Total Payables</span>
                        <span>{formatCurrency(apAging.total)}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Click "Load Report" to view AP aging</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recurring">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Recurring Journal Entries</CardTitle>
                    <CardDescription>Automate repetitive transactions</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={handleGenerateRecurringEntries}>
                      <Clock className="h-4 w-4 mr-2" />
                      Generate Due Entries
                    </Button>
                    <Button onClick={() => { setRecurringDialogOpen(true); loadRecurringEntries(); }}>
                      <Plus className="h-4 w-4 mr-2" />
                      New Recurring Entry
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search by description..."
                          value={recurringSearchQuery}
                          onChange={(e) => setRecurringSearchQuery(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <Select value={recurringFrequencyFilter} onValueChange={setRecurringFrequencyFilter}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Frequencies</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={recurringStatusFilter} onValueChange={setRecurringStatusFilter}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={() => { setRecurringSearchQuery(""); setRecurringFrequencyFilter("all"); setRecurringStatusFilter("all"); }}>
                      Clear Filters
                    </Button>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    Showing {filteredRecurringEntries.length} of {recurringEntries.length} entries
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead>Frequency</TableHead>
                        <TableHead>Next Run</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedRecurringEntries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell>{entry.description}</TableCell>
                          <TableCell className="capitalize">{entry.frequency}</TableCell>
                          <TableCell>{new Date(entry.nextOccurrence).toLocaleDateString()}</TableCell>
                          <TableCell>{entry.project?.name || "-"}</TableCell>
                          <TableCell>
                            <Badge variant={entry.isActive ? "default" : "secondary"}>
                              {entry.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline" onClick={() => {
                              setEditingRecurring(entry);
                              setNewRecurring({
                                description: entry.description,
                                frequency: entry.frequency,
                                startDate: entry.startDate,
                                endDate: entry.endDate || "",
                                projectId: entry.projectId || "",
                                isActive: entry.isActive,
                              });
                              setRecurringLines(entry.lines.map(l => ({ accountId: l.accountId, description: l.description, debit: l.debit, credit: l.credit })));
                              setRecurringDialogOpen(true);
                            }}>
                              Edit
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Page {recurringPage} of {recurringTotalPages}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setRecurringPage(p => Math.max(1, p - 1))}
                        disabled={recurringPage === 1}
                      >
                        Previous
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setRecurringPage(p => Math.min(recurringTotalPages, p + 1))}
                        disabled={recurringPage === recurringTotalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </div>

                <Dialog open={recurringDialogOpen} onOpenChange={setRecurringDialogOpen}>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{editingRecurring ? "Edit" : "Create"} Recurring Entry</DialogTitle>
                      <DialogDescription>Set up automatic journal entry generation</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Description</Label>
                        <Input value={newRecurring.description} onChange={(e) => setNewRecurring({ ...newRecurring, description: e.target.value })} placeholder="Monthly rent payment" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Frequency</Label>
                          <Select value={newRecurring.frequency} onValueChange={(value: any) => setNewRecurring({ ...newRecurring, frequency: value })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="daily">Daily</SelectItem>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                              <SelectItem value="quarterly">Quarterly</SelectItem>
                              <SelectItem value="yearly">Yearly</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Project (Optional)</Label>
                          <Select value={newRecurring.projectId} onValueChange={(value) => setNewRecurring({ ...newRecurring, projectId: value })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select project" />
                            </SelectTrigger>
                            <SelectContent>
                              {projects.map((project) => (
                                <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Start Date</Label>
                          <Input type="date" value={newRecurring.startDate} onChange={(e) => setNewRecurring({ ...newRecurring, startDate: e.target.value })} />
                        </div>
                        <div>
                          <Label>End Date (Optional)</Label>
                          <Input type="date" value={newRecurring.endDate} onChange={(e) => setNewRecurring({ ...newRecurring, endDate: e.target.value })} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Journal Lines</Label>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Account</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead>Debit</TableHead>
                              <TableHead>Credit</TableHead>
                              <TableHead></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {recurringLines.map((line, index) => (
                              <TableRow key={index}>
                                <TableCell>
                                  <Select value={line.accountId} onValueChange={(value) => {
                                    const updated = [...recurringLines];
                                    updated[index].accountId = value;
                                    setRecurringLines(updated);
                                  }}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Account" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {accounts.map((account) => (
                                        <SelectItem key={account.id} value={account.id}>{account.code} - {account.name}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell>
                                  <Input value={line.description} onChange={(e) => {
                                    const updated = [...recurringLines];
                                    updated[index].description = e.target.value;
                                    setRecurringLines(updated);
                                  }} />
                                </TableCell>
                                <TableCell>
                                  <Input type="number" step="0.01" value={line.debit || ""} onChange={(e) => {
                                    const updated = [...recurringLines];
                                    updated[index].debit = parseFloat(e.target.value) || 0;
                                    setRecurringLines(updated);
                                  }} />
                                </TableCell>
                                <TableCell>
                                  <Input type="number" step="0.01" value={line.credit || ""} onChange={(e) => {
                                    const updated = [...recurringLines];
                                    updated[index].credit = parseFloat(e.target.value) || 0;
                                    setRecurringLines(updated);
                                  }} />
                                </TableCell>
                                <TableCell>
                                  <Button size="icon" variant="ghost" onClick={() => setRecurringLines(recurringLines.filter((_, i) => i !== index))}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        <Button size="sm" variant="outline" onClick={() => setRecurringLines([...recurringLines, { accountId: "", description: "", debit: 0, credit: 0 }])}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Line
                        </Button>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setRecurringDialogOpen(false)}>Cancel</Button>
                      <Button onClick={handleSaveRecurring}>Save</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reconciliation">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Bank Reconciliation</CardTitle>
                    <CardDescription>Match bank statements with accounting records</CardDescription>
                  </div>
                  <Button onClick={() => { setReconciliationDialogOpen(true); loadBankReconciliations(); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Reconciliation
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Select value={reconAccountFilter} onValueChange={setReconAccountFilter}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Bank Account" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Accounts</SelectItem>
                        {accounts.filter(a => a.type === "asset" && a.code.startsWith("1")).map((account) => (
                          <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={reconStatusFilter} onValueChange={setReconStatusFilter}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="reconciled">Reconciled</SelectItem>
                      </SelectContent>
                    </Select>
                    <div>
                      <Label className="text-xs">Date From</Label>
                      <Input type="date" value={reconDateFrom} onChange={(e) => setReconDateFrom(e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs">Date To</Label>
                      <Input type="date" value={reconDateTo} onChange={(e) => setReconDateTo(e.target.value)} />
                    </div>
                    <Button variant="outline" onClick={() => { setReconAccountFilter("all"); setReconStatusFilter("all"); setReconDateFrom(""); setReconDateTo(""); }}>
                      Clear Filters
                    </Button>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    Showing {filteredReconciliations.length} of {reconciliations.length} reconciliations
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Bank Account</TableHead>
                        <TableHead>Statement Date</TableHead>
                        <TableHead>Statement Balance</TableHead>
                        <TableHead>Book Balance</TableHead>
                        <TableHead>Difference</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedReconciliations.map((recon) => {
                        const difference = recon.statementBalance - recon.bookBalance;
                        return (
                          <TableRow key={recon.id}>
                            <TableCell>{recon.account?.name}</TableCell>
                            <TableCell>{new Date(recon.statementDate).toLocaleDateString()}</TableCell>
                            <TableCell>{formatCurrency(recon.statementBalance)}</TableCell>
                            <TableCell>{formatCurrency(recon.bookBalance)}</TableCell>
                            <TableCell className={difference !== 0 ? "text-destructive" : "text-green-600"}>
                              {formatCurrency(Math.abs(difference))}
                            </TableCell>
                            <TableCell>
                              <Badge variant={recon.status === "reconciled" ? "default" : "secondary"}>
                                {recon.status === "reconciled" ? <CheckCircle className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />}
                                {recon.status.replace("_", " ")}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button size="sm" variant="outline" onClick={() => {
                                setEditingReconciliation(recon);
                                setNewReconciliation({
                                  accountId: recon.accountId,
                                  statementDate: recon.statementDate,
                                  statementBalance: recon.statementBalance,
                                  bookBalance: recon.bookBalance,
                                  status: recon.status,
                                });
                                setBankTransactions(recon.transactions.map(t => ({
                                  transactionDate: t.transactionDate,
                                  description: t.description,
                                  referenceNo: t.referenceNo,
                                  debit: t.debit,
                                  credit: t.credit,
                                  isMatched: t.isMatched,
                                })));
                                setReconciliationDialogOpen(true);
                              }}>
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Page {reconPage} of {reconTotalPages}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setReconPage(p => Math.max(1, p - 1))}
                        disabled={reconPage === 1}
                      >
                        Previous
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setReconPage(p => Math.min(reconTotalPages, p + 1))}
                        disabled={reconPage === reconTotalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </div>

                <Dialog open={reconciliationDialogOpen} onOpenChange={setReconciliationDialogOpen}>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{editingReconciliation ? "Edit" : "Create"} Bank Reconciliation</DialogTitle>
                      <DialogDescription>Match bank statement with accounting records</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Bank Account</Label>
                          <Select value={newReconciliation.accountId} onValueChange={(value) => setNewReconciliation({ ...newReconciliation, accountId: value })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select account" />
                            </SelectTrigger>
                            <SelectContent>
                              {accounts.filter(a => a.type === "asset" && a.code.startsWith("1")).map((account) => (
                                <SelectItem key={account.id} value={account.id}>{account.code} - {account.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Statement Date</Label>
                          <Input type="date" value={newReconciliation.statementDate} onChange={(e) => setNewReconciliation({ ...newReconciliation, statementDate: e.target.value })} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Statement Balance</Label>
                          <Input type="number" step="0.01" value={newReconciliation.statementBalance} onChange={(e) => setNewReconciliation({ ...newReconciliation, statementBalance: parseFloat(e.target.value) || 0 })} />
                        </div>
                        <div>
                          <Label>Book Balance</Label>
                          <Input type="number" step="0.01" value={newReconciliation.bookBalance} onChange={(e) => setNewReconciliation({ ...newReconciliation, bookBalance: parseFloat(e.target.value) || 0 })} />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label>Bank Statement Transactions</Label>
                          <Button size="sm" variant="outline" onClick={() => setBankTransactions([...bankTransactions, { transactionDate: new Date().toISOString().split("T")[0], description: "", referenceNo: "", debit: 0, credit: 0, isMatched: false }])}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Transaction
                          </Button>
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead>Ref #</TableHead>
                              <TableHead>Debit</TableHead>
                              <TableHead>Credit</TableHead>
                              <TableHead></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {bankTransactions.map((trans, index) => (
                              <TableRow key={index}>
                                <TableCell>
                                  <Input type="date" value={trans.transactionDate} onChange={(e) => {
                                    const updated = [...bankTransactions];
                                    updated[index].transactionDate = e.target.value;
                                    setBankTransactions(updated);
                                  }} />
                                </TableCell>
                                <TableCell>
                                  <Input value={trans.description} onChange={(e) => {
                                    const updated = [...bankTransactions];
                                    updated[index].description = e.target.value;
                                    setBankTransactions(updated);
                                  }} />
                                </TableCell>
                                <TableCell>
                                  <Input value={trans.referenceNo} onChange={(e) => {
                                    const updated = [...bankTransactions];
                                    updated[index].referenceNo = e.target.value;
                                    setBankTransactions(updated);
                                  }} />
                                </TableCell>
                                <TableCell>
                                  <Input type="number" step="0.01" value={trans.debit || ""} onChange={(e) => {
                                    const updated = [...bankTransactions];
                                    updated[index].debit = parseFloat(e.target.value) || 0;
                                    setBankTransactions(updated);
                                  }} />
                                </TableCell>
                                <TableCell>
                                  <Input type="number" step="0.01" value={trans.credit || ""} onChange={(e) => {
                                    const updated = [...bankTransactions];
                                    updated[index].credit = parseFloat(e.target.value) || 0;
                                    setBankTransactions(updated);
                                  }} />
                                </TableCell>
                                <TableCell>
                                  <Button size="icon" variant="ghost" onClick={() => setBankTransactions(bankTransactions.filter((_, i) => i !== index))}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setReconciliationDialogOpen(false)}>Cancel</Button>
                      <Button onClick={handleSaveReconciliation}>Save</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="period-comparison">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Period Comparison</CardTitle>
                    <CardDescription>Compare financial statements across different time periods</CardDescription>
                  </div>
                  <Button onClick={loadPeriodComparison}>Generate Comparison</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    {comparisonPeriods.map((period, index) => (
                      <Card key={index}>
                        <CardHeader>
                          <CardTitle className="text-sm">Period {index + 1}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div>
                            <Label className="text-xs">Label</Label>
                            <Input
                              value={period.label}
                              onChange={(e) => {
                                const updated = [...comparisonPeriods];
                                updated[index].label = e.target.value;
                                setComparisonPeriods(updated);
                              }}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Start Date</Label>
                            <Input
                              type="date"
                              value={period.startDate}
                              onChange={(e) => {
                                const updated = [...comparisonPeriods];
                                updated[index].startDate = e.target.value;
                                setComparisonPeriods(updated);
                              }}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">End Date</Label>
                            <Input
                              type="date"
                              value={period.endDate}
                              onChange={(e) => {
                                const updated = [...comparisonPeriods];
                                updated[index].endDate = e.target.value;
                                setComparisonPeriods(updated);
                              }}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {comparisonCharts && (
                    <div className="space-y-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Revenue & Expense Comparison</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={comparisonCharts.revenueData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="period" />
                              <YAxis />
                              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                              <Legend />
                              <Bar dataKey="revenue" fill="hsl(var(--primary))" name="Revenue" />
                              <Bar dataKey="cogs" fill="hsl(var(--destructive))" name="COGS" />
                              <Bar dataKey="expenses" fill="hsl(var(--muted))" name="Expenses" />
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>Profit Margin Trend</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={comparisonCharts.marginData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="period" />
                              <YAxis />
                              <Tooltip formatter={(value) => `${value}%`} />
                              <Legend />
                              <Line type="monotone" dataKey="grossMargin" stroke="hsl(var(--primary))" name="Gross Margin %" />
                              <Line type="monotone" dataKey="netMargin" stroke="hsl(var(--chart-2))" name="Net Margin %" />
                            </LineChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>Asset Growth</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={comparisonCharts.assetData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="period" />
                              <YAxis />
                              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                              <Legend />
                              <Bar dataKey="currentAssets" stackId="a" fill="hsl(var(--chart-3))" name="Current Assets" />
                              <Bar dataKey="nonCurrentAssets" stackId="a" fill="hsl(var(--chart-4))" name="Non-Current Assets" />
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="shareholders">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Shareholders Registry</CardTitle>
                    <CardDescription>Manage company shareholders and equity ownership</CardDescription>
                  </div>
                  <Button onClick={() => { setShareholderDialogOpen(true); loadShareholders(); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Shareholder
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Total Shares</TableHead>
                      <TableHead>Par Value</TableHead>
                      <TableHead>Total Investment</TableHead>
                      <TableHead>Ownership %</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shareholders.map((shareholder) => (
                      <TableRow key={shareholder.id}>
                        <TableCell className="font-medium">{shareholder.name}</TableCell>
                        <TableCell className="capitalize">{shareholder.shareholderType}</TableCell>
                        <TableCell>{shareholder.totalShares.toLocaleString()}</TableCell>
                        <TableCell>{formatCurrency(shareholder.parValue)}</TableCell>
                        <TableCell>{formatCurrency(shareholder.totalInvestment)}</TableCell>
                        <TableCell>{shareholder.percentageOwnership.toFixed(2)}%</TableCell>
                        <TableCell>
                          <Badge variant={shareholder.status === "active" ? "default" : "secondary"}>
                            {shareholder.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => {
                              setEditingShareholder(shareholder);
                              setNewShareholder({
                                name: shareholder.name,
                                email: shareholder.email || "",
                                phone: shareholder.phone || "",
                                address: shareholder.address || "",
                                tinNumber: shareholder.tinNumber || "",
                                shareholderType: shareholder.shareholderType,
                                totalShares: shareholder.totalShares,
                                parValue: shareholder.parValue,
                                totalInvestment: shareholder.totalInvestment,
                                percentageOwnership: shareholder.percentageOwnership,
                                certificateNumbers: shareholder.certificateNumbers || "",
                                status: shareholder.status,
                                dateJoined: shareholder.dateJoined,
                                notes: shareholder.notes || "",
                              });
                              setShareholderDialogOpen(true);
                            }}>Edit</Button>
                            <Button size="sm" variant="destructive" onClick={() => handleDeleteShareholder(shareholder.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <Dialog open={shareholderDialogOpen} onOpenChange={setShareholderDialogOpen}>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{editingShareholder ? "Edit" : "Add"} Shareholder</DialogTitle>
                      <DialogDescription>Manage shareholder information and equity ownership</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Name *</Label>
                          <Input value={newShareholder.name} onChange={(e) => setNewShareholder({ ...newShareholder, name: e.target.value })} placeholder="Juan Dela Cruz" />
                        </div>
                        <div>
                          <Label>Type</Label>
                          <Select value={newShareholder.shareholderType} onValueChange={(value: any) => setNewShareholder({ ...newShareholder, shareholderType: value })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="individual">Individual</SelectItem>
                              <SelectItem value="corporate">Corporate</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Email</Label>
                          <Input type="email" value={newShareholder.email} onChange={(e) => setNewShareholder({ ...newShareholder, email: e.target.value })} />
                        </div>
                        <div>
                          <Label>Phone</Label>
                          <Input value={newShareholder.phone} onChange={(e) => setNewShareholder({ ...newShareholder, phone: e.target.value })} />
                        </div>
                      </div>
                      <div>
                        <Label>Address</Label>
                        <Input value={newShareholder.address} onChange={(e) => setNewShareholder({ ...newShareholder, address: e.target.value })} />
                      </div>
                      <div>
                        <Label>TIN Number</Label>
                        <Input value={newShareholder.tinNumber} onChange={(e) => setNewShareholder({ ...newShareholder, tinNumber: e.target.value })} placeholder="000-000-000-000" />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label>Total Shares *</Label>
                          <Input type="number" value={newShareholder.totalShares} onChange={(e) => setNewShareholder({ ...newShareholder, totalShares: Number(e.target.value) })} />
                        </div>
                        <div>
                          <Label>Par Value *</Label>
                          <Input type="number" step="0.01" value={newShareholder.parValue} onChange={(e) => setNewShareholder({ ...newShareholder, parValue: Number(e.target.value) })} />
                        </div>
                        <div>
                          <Label>Total Investment</Label>
                          <Input type="number" step="0.01" value={newShareholder.totalInvestment} onChange={(e) => setNewShareholder({ ...newShareholder, totalInvestment: Number(e.target.value) })} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Ownership %</Label>
                          <Input type="number" step="0.01" value={newShareholder.percentageOwnership} onChange={(e) => setNewShareholder({ ...newShareholder, percentageOwnership: Number(e.target.value) })} />
                        </div>
                        <div>
                          <Label>Certificate Numbers</Label>
                          <Input value={newShareholder.certificateNumbers} onChange={(e) => setNewShareholder({ ...newShareholder, certificateNumbers: e.target.value })} placeholder="001, 002, 003" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Status</Label>
                          <Select value={newShareholder.status} onValueChange={(value: any) => setNewShareholder({ ...newShareholder, status: value })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="inactive">Inactive</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Date Joined</Label>
                          <Input type="date" value={newShareholder.dateJoined} onChange={(e) => setNewShareholder({ ...newShareholder, dateJoined: e.target.value })} />
                        </div>
                      </div>
                      <div>
                        <Label>Notes</Label>
                        <Input value={newShareholder.notes} onChange={(e) => setNewShareholder({ ...newShareholder, notes: e.target.value })} />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShareholderDialogOpen(false)}>Cancel</Button>
                      <Button onClick={handleSaveShareholder}>Save Shareholder</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dividends">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Dividend Management</CardTitle>
                    <CardDescription>Declare and track dividend distributions to shareholders</CardDescription>
                  </div>
                  <Button onClick={() => { setDividendDialogOpen(true); loadDividends(); loadShareholders(); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Declare Dividend
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dividend Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Fiscal Period</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Per Share</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dividends.map((dividend) => (
                      <TableRow key={dividend.id}>
                        <TableCell>{new Date(dividend.dividendDate).toLocaleDateString()}</TableCell>
                        <TableCell className="capitalize">{dividend.dividendType}</TableCell>
                        <TableCell>Q{dividend.fiscalQuarter} {dividend.fiscalYear}</TableCell>
                        <TableCell>{formatCurrency(dividend.totalAmount)}</TableCell>
                        <TableCell>{formatCurrency(dividend.perShareAmount)}</TableCell>
                        <TableCell>
                          <Badge variant={dividend.status === "paid" ? "default" : dividend.status === "approved" ? "secondary" : "outline"}>
                            {dividend.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => {
                              setEditingDividend(dividend);
                              setNewDividend({
                                dividendDate: dividend.dividendDate,
                                declarationDate: dividend.declarationDate,
                                recordDate: dividend.recordDate,
                                paymentDate: dividend.paymentDate,
                                dividendType: dividend.dividendType,
                                totalAmount: dividend.totalAmount,
                                perShareAmount: dividend.perShareAmount,
                                fiscalYear: dividend.fiscalYear,
                                fiscalQuarter: dividend.fiscalQuarter,
                                status: dividend.status,
                                approvedBy: dividend.approvedBy || "",
                                paidBy: dividend.paidBy || "",
                                notes: dividend.notes || "",
                              });
                              setDividendDialogOpen(true);
                            }}>View</Button>
                            <Button size="sm" variant="destructive" onClick={() => handleDeleteDividend(dividend.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <Dialog open={dividendDialogOpen} onOpenChange={setDividendDialogOpen}>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{editingDividend ? "Edit" : "Declare"} Dividend</DialogTitle>
                      <DialogDescription>Manage dividend declaration and payment schedule</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Dividend Type</Label>
                          <Select value={newDividend.dividendType} onValueChange={(value: any) => setNewDividend({ ...newDividend, dividendType: value })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cash">Cash Dividend</SelectItem>
                              <SelectItem value="stock">Stock Dividend</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Status</Label>
                          <Select value={newDividend.status} onValueChange={(value: any) => setNewDividend({ ...newDividend, status: value })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="declared">Declared</SelectItem>
                              <SelectItem value="approved">Approved</SelectItem>
                              <SelectItem value="paid">Paid</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Declaration Date</Label>
                          <Input type="date" value={newDividend.declarationDate} onChange={(e) => setNewDividend({ ...newDividend, declarationDate: e.target.value })} />
                        </div>
                        <div>
                          <Label>Record Date</Label>
                          <Input type="date" value={newDividend.recordDate} onChange={(e) => setNewDividend({ ...newDividend, recordDate: e.target.value })} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Payment Date</Label>
                          <Input type="date" value={newDividend.paymentDate} onChange={(e) => setNewDividend({ ...newDividend, paymentDate: e.target.value })} />
                        </div>
                        <div>
                          <Label>Dividend Date</Label>
                          <Input type="date" value={newDividend.dividendDate} onChange={(e) => setNewDividend({ ...newDividend, dividendDate: e.target.value })} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Fiscal Year</Label>
                          <Input type="number" value={newDividend.fiscalYear} onChange={(e) => setNewDividend({ ...newDividend, fiscalYear: Number(e.target.value) })} />
                        </div>
                        <div>
                          <Label>Fiscal Quarter</Label>
                          <Select value={newDividend.fiscalQuarter.toString()} onValueChange={(value) => setNewDividend({ ...newDividend, fiscalQuarter: Number(value) })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">Q1</SelectItem>
                              <SelectItem value="2">Q2</SelectItem>
                              <SelectItem value="3">Q3</SelectItem>
                              <SelectItem value="4">Q4</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Per Share Amount</Label>
                          <Input type="number" step="0.01" value={newDividend.perShareAmount} onChange={(e) => setNewDividend({ ...newDividend, perShareAmount: Number(e.target.value) })} />
                        </div>
                        <div>
                          <Label>Total Amount</Label>
                          <Input type="number" step="0.01" value={newDividend.totalAmount} onChange={(e) => setNewDividend({ ...newDividend, totalAmount: Number(e.target.value) })} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Approved By</Label>
                          <Input value={newDividend.approvedBy} onChange={(e) => setNewDividend({ ...newDividend, approvedBy: e.target.value })} placeholder="Board Resolution No." />
                        </div>
                        <div>
                          <Label>Paid By</Label>
                          <Input value={newDividend.paidBy} onChange={(e) => setNewDividend({ ...newDividend, paidBy: e.target.value })} placeholder="Check/Transfer No." />
                        </div>
                      </div>
                      <div>
                        <Label>Notes</Label>
                        <Input value={newDividend.notes} onChange={(e) => setNewDividend({ ...newDividend, notes: e.target.value })} />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setDividendDialogOpen(false)}>Cancel</Button>
                      <Button onClick={handleSaveDividend}>Save Dividend</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="equity">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Equity Accounts</CardTitle>
                    <CardDescription>Manage stockholders' equity and capital accounts</CardDescription>
                  </div>
                  <Button onClick={() => { setEquityDialogOpen(true); loadEquityAccounts(); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Equity Account
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account Type</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {equityAccounts.map((equity) => (
                      <TableRow key={equity.id}>
                        <TableCell className="capitalize">{equity.accountType.replace(/_/g, " ")}</TableCell>
                        <TableCell className="font-medium">{equity.name}</TableCell>
                        <TableCell className="text-right">{formatCurrency(equity.balance)}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" onClick={() => {
                            setEditingEquity(equity);
                            setNewEquity({
                              accountType: equity.accountType,
                              name: equity.name,
                              balance: equity.balance,
                              description: equity.description || "",
                            });
                            setEquityDialogOpen(true);
                          }}>Edit</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <Dialog open={equityDialogOpen} onOpenChange={setEquityDialogOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingEquity ? "Edit" : "Create"} Equity Account</DialogTitle>
                      <DialogDescription>Manage stockholders' equity account</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Account Type</Label>
                        <Select value={newEquity.accountType} onValueChange={(value: any) => setNewEquity({ ...newEquity, accountType: value })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="capital_stock">Capital Stock</SelectItem>
                            <SelectItem value="retained_earnings">Retained Earnings</SelectItem>
                            <SelectItem value="additional_paid_in_capital">Additional Paid-in Capital</SelectItem>
                            <SelectItem value="treasury_stock">Treasury Stock</SelectItem>
                            <SelectItem value="other_comprehensive_income">Other Comprehensive Income</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Account Name</Label>
                        <Input value={newEquity.name} onChange={(e) => setNewEquity({ ...newEquity, name: e.target.value })} placeholder="e.g., Common Stock" />
                      </div>
                      <div>
                        <Label>Balance</Label>
                        <Input type="number" step="0.01" value={newEquity.balance} onChange={(e) => setNewEquity({ ...newEquity, balance: Number(e.target.value) })} />
                      </div>
                      <div>
                        <Label>Description</Label>
                        <Input value={newEquity.description} onChange={(e) => setNewEquity({ ...newEquity, description: e.target.value })} />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setEquityDialogOpen(false)}>Cancel</Button>
                      <Button onClick={handleSaveEquity}>Save Account</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </CRMLayout>
  );
}