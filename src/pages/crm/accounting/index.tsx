import { useState, useEffect, useMemo } from "react";
import { CRMLayout } from "@/components/layout/CRMLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import type {
  Account,
  JournalEntry,
  JournalLine,
  RecurringJournalEntry,
  RecurringJournalLine,
  BankReconciliation,
  BankTransaction,
  FinancialPeriod,
  Project,
} from "@/types";
import {
  getAccounts,
  getJournalEntries,
  createJournalEntry,
  postJournalEntry,
  getAccountsReceivableAging,
  getAccountsPayableAging,
  getRecurringJournalEntries,
  createRecurringJournalEntry,
  updateRecurringJournalEntry,
  deleteRecurringJournalEntry,
  generateJournalEntriesFromRecurring,
  getBankReconciliations,
  createBankReconciliation,
  updateBankReconciliation,
  updateBankTransaction,
  getFinancialStatementComparison,
} from "@/services/accountingService";
import { getProjects } from "@/services/crmService";
import { Plus, RefreshCw, Trash2, Save, X, FileText, FileSpreadsheet, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
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

  const [balanceSheet, setBalanceSheet] = useState<any>(null);
  const [arAging, setArAging] = useState<any>(null);
  const [apAging, setApAging] = useState<any>(null);

  // Recurring entries state
  const [recurringEntries, setRecurringEntries] = useState<RecurringJournalEntry[]>([]);
  const [recurringDialogOpen, setRecurringDialogOpen] = useState(false);
  const [editingRecurring, setEditingRecurring] = useState<RecurringJournalEntry | null>(null);
  const [recurringFormData, setRecurringFormData] = useState({
    description: "",
    frequency: "monthly" as "daily" | "weekly" | "monthly" | "quarterly" | "yearly",
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    projectId: "",
  });
  const [recurringLines, setRecurringLines] = useState<Omit<RecurringJournalLine, "id" | "recurringEntryId">[]>([]);

  // Bank reconciliation state
  const [reconciliations, setReconciliations] = useState<BankReconciliation[]>([]);
  const [reconciliationDialogOpen, setReconciliationDialogOpen] = useState(false);
  const [editingReconciliation, setEditingReconciliation] = useState<BankReconciliation | null>(null);
  const [reconciliationFormData, setReconciliationFormData] = useState({
    accountId: "",
    statementDate: new Date().toISOString().split("T")[0],
    statementBalance: 0,
    bookBalance: 0,
  });
  const [bankTransactions, setBankTransactions] = useState<Omit<BankTransaction, "id" | "reconciliationId" | "createdAt">[]>([]);

  // Period comparison state
  const [comparisonPeriods, setComparisonPeriods] = useState<FinancialPeriod[]>([
    {
      startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0],
      endDate: new Date(new Date().getFullYear(), 11, 31).toISOString().split("T")[0],
      label: "Current Year",
    },
    {
      startDate: new Date(new Date().getFullYear() - 1, 0, 1).toISOString().split("T")[0],
      endDate: new Date(new Date().getFullYear() - 1, 11, 31).toISOString().split("T")[0],
      label: "Previous Year",
    },
  ]);
  const [comparisonData, setComparisonData] = useState<any>(null);

  // Filters and Pagination
  const [recurringFilters, setRecurringFilters] = useState({
    search: "",
    frequency: "all",
    status: "all",
  });
  const [recurringPage, setRecurringPage] = useState(1);
  const [recurringPerPage] = useState(10);

  const [reconciliationFilters, setReconciliationFilters] = useState({
    accountId: "all",
    status: "all",
    dateFrom: "",
    dateTo: "",
  });
  const [reconciliationPage, setReconciliationPage] = useState(1);
  const [reconciliationPerPage] = useState(10);

  // Chart data for comparisons
  const [comparisonCharts, setComparisonCharts] = useState<any>(null);

  // Filter and paginate recurring entries
  const filteredRecurringEntries = useMemo(() => {
    if (!recurringEntries) return [];

    const filtered = recurringEntries.filter((entry) => {
      // Search filter
      if (
        recurringFilters.search &&
        !entry.description.toLowerCase().includes(recurringFilters.search.toLowerCase())
      ) {
        return false;
      }

      // Frequency filter
      if (recurringFilters.frequency !== "all" && entry.frequency !== recurringFilters.frequency) {
        return false;
      }

      // Status filter
      if (recurringFilters.status !== "all") {
        const isActive = entry.isActive;
        if (recurringFilters.status === "active" && !isActive) return false;
        if (recurringFilters.status === "inactive" && isActive) return false;
      }

      return true;
    });

    return filtered;
  }, [recurringEntries, recurringFilters]);

  const paginatedRecurringEntries = useMemo(() => {
    const start = (recurringPage - 1) * recurringPerPage;
    const end = start + recurringPerPage;
    return filteredRecurringEntries.slice(start, end);
  }, [filteredRecurringEntries, recurringPage, recurringPerPage]);

  const totalRecurringPages = Math.ceil(filteredRecurringEntries.length / recurringPerPage);

  // Filter and paginate bank reconciliations
  const filteredReconciliations = useMemo(() => {
    if (!reconciliations) return [];

    const filtered = reconciliations.filter((rec) => {
      // Account filter
      if (reconciliationFilters.accountId !== "all" && rec.accountId !== reconciliationFilters.accountId) {
        return false;
      }

      // Status filter
      if (reconciliationFilters.status !== "all" && rec.status !== reconciliationFilters.status) {
        return false;
      }

      // Date range filter
      if (reconciliationFilters.dateFrom && rec.statementDate < reconciliationFilters.dateFrom) {
        return false;
      }
      if (reconciliationFilters.dateTo && rec.statementDate > reconciliationFilters.dateTo) {
        return false;
      }

      return true;
    });

    return filtered;
  }, [reconciliations, reconciliationFilters]);

  const paginatedReconciliations = useMemo(() => {
    const start = (reconciliationPage - 1) * reconciliationPerPage;
    const end = start + reconciliationPerPage;
    return filteredReconciliations.slice(start, end);
  }, [filteredReconciliations, reconciliationPage, reconciliationPerPage]);

  const totalReconciliationPages = Math.ceil(filteredReconciliations.length / reconciliationPerPage);

  // Generate chart data from comparison
  useEffect(() => {
    if (!comparisonData) return;

    const charts = {
      revenueComparison: [],
      expenseComparison: [],
      profitMarginTrend: [],
      assetGrowth: [],
    };

    // Extract data for charts
    const periods = Object.keys(comparisonData.profitAndLoss);
    
    periods.forEach((period) => {
      const pl = comparisonData.profitAndLoss[period];
      const bs = comparisonData.balanceSheet[period];

      charts.revenueComparison.push({
        period,
        revenue: pl.totalRevenue,
        cogs: pl.totalCOGS,
        expenses: pl.totalExpenses,
      });

      charts.profitMarginTrend.push({
        period,
        grossMargin: pl.grossMargin,
        netMargin: pl.netMargin,
      });

      charts.assetGrowth.push({
        period,
        currentAssets: bs.totalCurrentAssets,
        nonCurrentAssets: bs.totalNonCurrentAssets,
        totalAssets: bs.totalAssets,
      });
    });

    setComparisonCharts(charts);
  }, [comparisonData]);

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

  const derivedProfitAndLoss = useMemo(() => {
    const revenueAccs = accounts.filter(a => a.type === 'revenue' && (statements.balances[a.id] || 0) !== 0).map(a => ({ accountName: a.name, balance: statements.balances[a.id] || 0 }));
    const cogsAccs = accounts.filter(a => a.type === 'expense' && a.category.includes('Direct') && (statements.balances[a.id] || 0) !== 0).map(a => ({ accountName: a.name, balance: statements.balances[a.id] || 0 }));
    const expAccs = accounts.filter(a => a.type === 'expense' && a.category.includes('Overhead') && (statements.balances[a.id] || 0) !== 0).map(a => ({ accountName: a.name, balance: statements.balances[a.id] || 0 }));
    
    return {
      revenue: revenueAccs,
      totalRevenue: statements.revenue,
      cogs: cogsAccs,
      totalCogs: statements.directCosts,
      grossProfit: statements.grossProfit,
      grossMargin: statements.revenue > 0 ? (statements.grossProfit / statements.revenue) * 100 : 0,
      expenses: expAccs,
      totalExpenses: statements.overhead,
      netIncome: statements.netIncome,
      netMargin: statements.revenue > 0 ? (statements.netIncome / statements.revenue) * 100 : 0,
    };
  }, [statements, accounts]);

  const derivedBalanceSheet = useMemo(() => {
    const currentAssets = accounts.filter(a => a.type === 'asset' && !a.name.includes('Property') && !a.name.includes('Equipment') && !a.name.includes('Accumulated') && (statements.balances[a.id] || 0) !== 0).map(a => ({ accountName: a.name, balance: statements.balances[a.id] || 0 }));
    const nonCurrentAssets = accounts.filter(a => a.type === 'asset' && (a.name.includes('Property') || a.name.includes('Equipment') || a.name.includes('Accumulated')) && (statements.balances[a.id] || 0) !== 0).map(a => ({ accountName: a.name, balance: statements.balances[a.id] || 0 }));
    const currentLiabilities = accounts.filter(a => a.type === 'liability' && !a.name.includes('Long-term') && !a.name.includes('Retention') && (statements.balances[a.id] || 0) !== 0).map(a => ({ accountName: a.name, balance: statements.balances[a.id] || 0 }));
    const longTermLiabilities = accounts.filter(a => a.type === 'liability' && (a.name.includes('Long-term') || a.name.includes('Retention')) && (statements.balances[a.id] || 0) !== 0).map(a => ({ accountName: a.name, balance: statements.balances[a.id] || 0 }));
    const equityAccs = accounts.filter(a => a.type === 'equity' && !a.name.includes('Long-term') && !a.name.includes('Retention') && (statements.balances[a.id] || 0) !== 0).map(a => ({ accountName: a.name, balance: statements.balances[a.id] || 0 }));
    
    if (statements.netIncome !== 0) {
       equityAccs.push({ accountName: "Current Year Earnings", balance: statements.netIncome });
    }

    return {
      currentAssets,
      totalCurrentAssets: currentAssets.reduce((sum, a) => sum + a.balance, 0),
      nonCurrentAssets,
      totalNonCurrentAssets: nonCurrentAssets.reduce((sum, a) => sum + a.balance, 0),
      totalAssets: statements.assets,
      currentLiabilities,
      totalCurrentLiabilities: currentLiabilities.reduce((sum, a) => sum + a.balance, 0),
      longTermLiabilities,
      totalLongTermLiabilities: longTermLiabilities.reduce((sum, a) => sum + a.balance, 0),
      totalLiabilities: statements.liabilities,
      equity: equityAccs,
      totalEquity: statements.totalEquity,
      totalLiabilitiesAndEquity: statements.liabilities + statements.totalEquity
    };
  }, [statements, accounts]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(val);

  async function loadARAgingReport() {
    try {
      const data = await getAccountsReceivableAging();
      setArAging(data);
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to load AR aging", variant: "destructive" });
    }
  }

  async function loadAPAgingReport() {
    try {
      const data = await getAccountsPayableAging();
      setApAging(data);
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to load AP aging", variant: "destructive" });
    }
  }

  async function exportProfitAndLossToPDF() {
    const { jsPDF } = await import("jspdf");
    await import("jspdf-autotable");
    const doc = new jsPDF() as any;
    
    doc.setFontSize(18);
    doc.text("PROFIT & LOSS STATEMENT", 105, 20, { align: "center" });
    doc.setFontSize(11);
    doc.text("Construction Company", 105, 28, { align: "center" });
    doc.text(`Period: ${format(new Date(), "MMMM d, yyyy")}`, 105, 35, { align: "center" });
    
    let yPos = 50;
    doc.setFontSize(12);
    doc.setFont(undefined, "bold");
    doc.text("REVENUE", 14, yPos);
    yPos += 7;
    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    derivedProfitAndLoss.revenue.forEach((item: any) => {
      doc.text(`  ${item.accountName}`, 14, yPos);
      doc.text(formatCurrency(item.balance), 195, yPos, { align: "right" });
      yPos += 6;
    });
    doc.setFont(undefined, "bold");
    doc.text("TOTAL REVENUE", 14, yPos);
    doc.text(formatCurrency(derivedProfitAndLoss.totalRevenue), 195, yPos, { align: "right" });
    yPos += 10;
    
    doc.text("COST OF GOODS SOLD", 14, yPos);
    yPos += 7;
    doc.setFont(undefined, "normal");
    derivedProfitAndLoss.cogs.forEach((item: any) => {
      doc.text(`  ${item.accountName}`, 14, yPos);
      doc.text(formatCurrency(item.balance), 195, yPos, { align: "right" });
      yPos += 6;
    });
    doc.setFont(undefined, "bold");
    doc.text("TOTAL COGS", 14, yPos);
    doc.text(formatCurrency(derivedProfitAndLoss.totalCogs), 195, yPos, { align: "right" });
    yPos += 8;
    
    doc.setFontSize(12);
    doc.text("GROSS PROFIT", 14, yPos);
    doc.text(formatCurrency(derivedProfitAndLoss.grossProfit), 195, yPos, { align: "right" });
    yPos += 6;
    doc.setFont(undefined, "normal");
    doc.text(`GROSS MARGIN: ${derivedProfitAndLoss.grossMargin.toFixed(2)}%`, 14, yPos);
    yPos += 10;
    
    doc.setFontSize(12);
    doc.setFont(undefined, "bold");
    doc.text("OPERATING EXPENSES", 14, yPos);
    yPos += 7;
    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    derivedProfitAndLoss.expenses.forEach((item: any) => {
      doc.text(`  ${item.accountName}`, 14, yPos);
      doc.text(formatCurrency(item.balance), 195, yPos, { align: "right" });
      yPos += 6;
    });
    doc.setFont(undefined, "bold");
    doc.text("TOTAL OPERATING EXPENSES", 14, yPos);
    doc.text(formatCurrency(derivedProfitAndLoss.totalExpenses), 195, yPos, { align: "right" });
    yPos += 10;
    
    doc.setFontSize(12);
    doc.text("NET INCOME", 14, yPos);
    doc.text(formatCurrency(derivedProfitAndLoss.netIncome), 195, yPos, { align: "right" });
    yPos += 6;
    doc.setFont(undefined, "normal");
    doc.text(`NET MARGIN: ${derivedProfitAndLoss.netMargin.toFixed(2)}%`, 14, yPos);
    
    doc.save(`profit-and-loss-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    toast({ title: "Success", description: "Profit & Loss exported to PDF successfully." });
  }

  async function exportProfitAndLossToExcel() {
    const XLSX = await import("xlsx");
    const data = [
      ["PROFIT & LOSS STATEMENT"],
      ["Construction Company"],
      [`Period: ${format(new Date(), "MMMM d, yyyy")}`],
      [],
      ["REVENUE"],
      ...derivedProfitAndLoss.revenue.map((item: any) => [`  ${item.accountName}`, item.balance]),
      ["TOTAL REVENUE", derivedProfitAndLoss.totalRevenue],
      [],
      ["COST OF GOODS SOLD"],
      ...derivedProfitAndLoss.cogs.map((item: any) => [`  ${item.accountName}`, item.balance]),
      ["TOTAL COGS", derivedProfitAndLoss.totalCogs],
      [],
      ["GROSS PROFIT", derivedProfitAndLoss.grossProfit],
      [`GROSS MARGIN`, `${derivedProfitAndLoss.grossMargin.toFixed(2)}%`],
      [],
      ["OPERATING EXPENSES"],
      ...derivedProfitAndLoss.expenses.map((item: any) => [`  ${item.accountName}`, item.balance]),
      ["TOTAL OPERATING EXPENSES", derivedProfitAndLoss.totalExpenses],
      [],
      ["NET INCOME", derivedProfitAndLoss.netIncome],
      [`NET MARGIN`, `${derivedProfitAndLoss.netMargin.toFixed(2)}%`],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Profit & Loss");
    XLSX.writeFile(wb, `profit-and-loss-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    toast({ title: "Success", description: "Profit & Loss exported to Excel successfully." });
  }

  async function exportBalanceSheetToPDF() {
    const { jsPDF } = await import("jspdf");
    await import("jspdf-autotable");
    const doc = new jsPDF() as any;
    
    doc.setFontSize(18);
    doc.text("BALANCE SHEET", 105, 20, { align: "center" });
    doc.setFontSize(11);
    doc.text("Construction Company", 105, 28, { align: "center" });
    doc.text(`As of: ${format(new Date(), "MMMM d, yyyy")}`, 105, 35, { align: "center" });
    
    let yPos = 50;
    doc.setFontSize(12);
    doc.setFont(undefined, "bold");
    doc.text("ASSETS", 14, yPos);
    yPos += 10;
    
    doc.setFontSize(11);
    doc.text("CURRENT ASSETS", 14, yPos);
    yPos += 7;
    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    derivedBalanceSheet.currentAssets.forEach((item: any) => {
      doc.text(`  ${item.accountName}`, 14, yPos);
      doc.text(formatCurrency(item.balance), 195, yPos, { align: "right" });
      yPos += 6;
    });
    doc.setFont(undefined, "bold");
    doc.text("TOTAL CURRENT ASSETS", 14, yPos);
    doc.text(formatCurrency(derivedBalanceSheet.totalCurrentAssets), 195, yPos, { align: "right" });
    yPos += 10;
    
    doc.setFontSize(11);
    doc.text("NON-CURRENT ASSETS", 14, yPos);
    yPos += 7;
    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    derivedBalanceSheet.nonCurrentAssets.forEach((item: any) => {
      doc.text(`  ${item.accountName}`, 14, yPos);
      doc.text(formatCurrency(item.balance), 195, yPos, { align: "right" });
      yPos += 6;
    });
    doc.setFont(undefined, "bold");
    doc.text("TOTAL NON-CURRENT ASSETS", 14, yPos);
    doc.text(formatCurrency(derivedBalanceSheet.totalNonCurrentAssets), 195, yPos, { align: "right" });
    yPos += 8;
    
    doc.setFontSize(12);
    doc.text("TOTAL ASSETS", 14, yPos);
    doc.text(formatCurrency(derivedBalanceSheet.totalAssets), 195, yPos, { align: "right" });
    yPos += 15;
    
    doc.text("LIABILITIES & EQUITY", 14, yPos);
    yPos += 10;
    doc.setFontSize(11);
    doc.text("CURRENT LIABILITIES", 14, yPos);
    yPos += 7;
    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    derivedBalanceSheet.currentLiabilities.forEach((item: any) => {
      doc.text(`  ${item.accountName}`, 14, yPos);
      doc.text(formatCurrency(item.balance), 195, yPos, { align: "right" });
      yPos += 6;
    });
    doc.setFont(undefined, "bold");
    doc.text("TOTAL CURRENT LIABILITIES", 14, yPos);
    doc.text(formatCurrency(derivedBalanceSheet.totalCurrentLiabilities), 195, yPos, { align: "right" });
    yPos += 10;
    
    doc.setFontSize(11);
    doc.text("LONG-TERM LIABILITIES", 14, yPos);
    yPos += 7;
    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    derivedBalanceSheet.longTermLiabilities.forEach((item: any) => {
      doc.text(`  ${item.accountName}`, 14, yPos);
      doc.text(formatCurrency(item.balance), 195, yPos, { align: "right" });
      yPos += 6;
    });
    doc.setFont(undefined, "bold");
    doc.text("TOTAL LONG-TERM LIABILITIES", 14, yPos);
    doc.text(formatCurrency(derivedBalanceSheet.totalLongTermLiabilities), 195, yPos, { align: "right" });
    yPos += 8;
    
    doc.setFontSize(11);
    doc.text("TOTAL LIABILITIES", 14, yPos);
    doc.text(formatCurrency(derivedBalanceSheet.totalLiabilities), 195, yPos, { align: "right" });
    yPos += 10;
    
    doc.text("EQUITY", 14, yPos);
    yPos += 7;
    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    derivedBalanceSheet.equity.forEach((item: any) => {
      doc.text(`  ${item.accountName}`, 14, yPos);
      doc.text(formatCurrency(item.balance), 195, yPos, { align: "right" });
      yPos += 6;
    });
    doc.setFont(undefined, "bold");
    doc.text("TOTAL EQUITY", 14, yPos);
    doc.text(formatCurrency(derivedBalanceSheet.totalEquity), 195, yPos, { align: "right" });
    yPos += 10;
    
    doc.setFontSize(12);
    doc.text("TOTAL LIABILITIES & EQUITY", 14, yPos);
    doc.text(formatCurrency(derivedBalanceSheet.totalLiabilitiesAndEquity), 195, yPos, { align: "right" });
    
    doc.save(`balance-sheet-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    toast({ title: "Success", description: "Balance Sheet exported to PDF successfully." });
  }

  async function exportBalanceSheetToExcel() {
    const XLSX = await import("xlsx");
    const data = [
      ["BALANCE SHEET"],
      ["Construction Company"],
      [`As of: ${format(new Date(), "MMMM d, yyyy")}`],
      [],
      ["ASSETS"],
      [],
      ["CURRENT ASSETS"],
      ...derivedBalanceSheet.currentAssets.map((item: any) => [`  ${item.accountName}`, item.balance]),
      ["TOTAL CURRENT ASSETS", derivedBalanceSheet.totalCurrentAssets],
      [],
      ["NON-CURRENT ASSETS"],
      ...derivedBalanceSheet.nonCurrentAssets.map((item: any) => [`  ${item.accountName}`, item.balance]),
      ["TOTAL NON-CURRENT ASSETS", derivedBalanceSheet.totalNonCurrentAssets],
      [],
      ["TOTAL ASSETS", derivedBalanceSheet.totalAssets],
      [],
      ["LIABILITIES & EQUITY"],
      [],
      ["CURRENT LIABILITIES"],
      ...derivedBalanceSheet.currentLiabilities.map((item: any) => [`  ${item.accountName}`, item.balance]),
      ["TOTAL CURRENT LIABILITIES", derivedBalanceSheet.totalCurrentLiabilities],
      [],
      ["LONG-TERM LIABILITIES"],
      ...derivedBalanceSheet.longTermLiabilities.map((item: any) => [`  ${item.accountName}`, item.balance]),
      ["TOTAL LONG-TERM LIABILITIES", derivedBalanceSheet.totalLongTermLiabilities],
      [],
      ["TOTAL LIABILITIES", derivedBalanceSheet.totalLiabilities],
      [],
      ["EQUITY"],
      ...derivedBalanceSheet.equity.map((item: any) => [`  ${item.accountName}`, item.balance]),
      ["TOTAL EQUITY", derivedBalanceSheet.totalEquity],
      [],
      ["TOTAL LIABILITIES & EQUITY", derivedBalanceSheet.totalLiabilitiesAndEquity],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Balance Sheet");
    XLSX.writeFile(wb, `balance-sheet-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    toast({ title: "Success", description: "Balance Sheet exported to Excel successfully." });
  }

  async function loadRecurringEntries() {
    try {
      const data = await getRecurringJournalEntries();
      setRecurringEntries(data);
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to load recurring entries", variant: "destructive" });
    }
  }

  async function handleSaveRecurringEntry() {
    try {
      if (recurringLines.length === 0) {
        toast({ title: "Validation Error", description: "Add at least one journal line", variant: "destructive" });
        return;
      }

      const totalDebit = recurringLines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
      const totalCredit = recurringLines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0);
      
      if (totalDebit !== totalCredit) {
        toast({ title: "Validation Error", description: "Debits must equal credits", variant: "destructive" });
        return;
      }

      const entryData = {
        projectId: recurringFormData.projectId || undefined,
        description: recurringFormData.description,
        frequency: recurringFormData.frequency,
        startDate: recurringFormData.startDate,
        endDate: recurringFormData.endDate || undefined,
        nextOccurrence: recurringFormData.startDate,
        isActive: true,
      };

      if (editingRecurring) {
        await updateRecurringJournalEntry(editingRecurring.id, entryData);
        toast({ title: "Success", description: "Recurring entry updated successfully" });
      } else {
        await createRecurringJournalEntry(entryData, recurringLines);
        toast({ title: "Success", description: "Recurring entry created successfully" });
      }

      setRecurringDialogOpen(false);
      setEditingRecurring(null);
      setRecurringFormData({
        description: "",
        frequency: "monthly",
        startDate: new Date().toISOString().split("T")[0],
        endDate: "",
        projectId: "",
      });
      setRecurringLines([]);
      loadRecurringEntries();
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to save recurring entry", variant: "destructive" });
    }
  }

  async function handleDeleteRecurringEntry(id: string) {
    if (!confirm("Delete this recurring entry?")) return;
    
    try {
      await deleteRecurringJournalEntry(id);
      toast({ title: "Success", description: "Recurring entry deleted" });
      loadRecurringEntries();
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to delete recurring entry", variant: "destructive" });
    }
  }

  async function handleGenerateRecurringEntries() {
    try {
      const generated = await generateJournalEntriesFromRecurring();
      toast({ 
        title: "Success", 
        description: `Generated ${generated.length} journal entries from recurring templates` 
      });
      loadData();
      loadRecurringEntries();
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to generate entries", variant: "destructive" });
    }
  }

  async function loadBankReconciliations() {
    try {
      const data = await getBankReconciliations();
      setReconciliations(data);
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to load reconciliations", variant: "destructive" });
    }
  }

  async function handleSaveBankReconciliation() {
    try {
      if (!reconciliationFormData.accountId) {
        toast({ title: "Validation Error", description: "Select a bank account", variant: "destructive" });
        return;
      }

      const reconciliationData = {
        accountId: reconciliationFormData.accountId,
        statementDate: reconciliationFormData.statementDate,
        statementBalance: reconciliationFormData.statementBalance,
        bookBalance: reconciliationFormData.bookBalance,
        status: "in_progress" as const,
      };

      if (editingReconciliation) {
        await updateBankReconciliation(editingReconciliation.id, {
          ...reconciliationData,
          status: editingReconciliation.status,
        });
        toast({ title: "Success", description: "Reconciliation updated" });
      } else {
        await createBankReconciliation(reconciliationData, bankTransactions);
        toast({ title: "Success", description: "Bank reconciliation created" });
      }

      setReconciliationDialogOpen(false);
      setEditingReconciliation(null);
      setReconciliationFormData({
        accountId: "",
        statementDate: new Date().toISOString().split("T")[0],
        statementBalance: 0,
        bookBalance: 0,
      });
      setBankTransactions([]);
      loadBankReconciliations();
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to save reconciliation", variant: "destructive" });
    }
  }

  async function handleCompleteReconciliation(id: string) {
    try {
      const reconciliation = reconciliations.find((r: any) => r.id === id);
      if (!reconciliation) return;

      const matchedTotal = reconciliation.transactions?.filter((t: any) => t.isMatched).reduce((sum: number, t: any) => sum + (t.debit - t.credit), 0) || 0;
      
      await updateBankReconciliation(id, {
        status: "completed",
        reconciledBalance: matchedTotal,
      });

      toast({ title: "Success", description: "Reconciliation completed" });
      loadBankReconciliations();
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to complete reconciliation", variant: "destructive" });
    }
  }

  async function loadPeriodComparison() {
    try {
      const data = await getFinancialStatementComparison(comparisonPeriods);
      setComparisonData(data);
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to load comparison", variant: "destructive" });
    }
  }

  if (loading) return <CRMLayout><div className="flex items-center justify-center h-96"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div></CRMLayout>;

  return (
    <CRMLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-3xl md:text-4xl mb-2 tracking-wide">ACCOUNTING</h1>
          <p className="text-muted-foreground">Manage journal entries and financial statements</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="journal-entries">Journal Entries</TabsTrigger>
            <TabsTrigger value="chart-of-accounts">Chart of Accounts</TabsTrigger>
            <TabsTrigger value="financial-statements">Financial Statements</TabsTrigger>
            <TabsTrigger value="ar-aging">AR Aging</TabsTrigger>
            <TabsTrigger value="ap-aging">AP Aging</TabsTrigger>
            <TabsTrigger value="recurring-entries">Recurring Entries</TabsTrigger>
            <TabsTrigger value="bank-reconciliation">Bank Reconciliation</TabsTrigger>
            <TabsTrigger value="period-comparison">Period Comparison</TabsTrigger>
          </TabsList>

          {/* JOURNAL ENTRIES TAB */}
          <TabsContent value="journal-entries" className="space-y-4">
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
          <TabsContent value="chart-of-accounts" className="space-y-4">
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

          {/* Financial Statements Tab */}
          <TabsContent value="financial-statements" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Profit & Loss */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Profit & Loss Statement</CardTitle>
                    <CardDescription>Income statement for the period</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={exportProfitAndLossToPDF}>
                      <FileText className="h-4 w-4 mr-2" />
                      PDF
                    </Button>
                    <Button size="sm" variant="outline" onClick={exportProfitAndLossToExcel}>
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Excel
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex justify-between items-end border-b pb-2">
                    <span className="font-semibold text-lg">Revenue</span>
                    <span className="font-bold text-lg">{formatCurrency(statements.revenue)}</span>
                  </div>
                  
                  <div className="space-y-2 pl-4">
                    <div className="text-sm font-medium text-muted-foreground mb-1">Direct Costs (COGS)</div>
                    {accounts.filter(a => a.type === 'expense' && a.category.includes('Direct') && (statements.balances[a.id] || 0) !== 0).map(acc => (
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
                    <span className="font-bold text-sm uppercase">Gross Profit</span>
                    <span className="font-bold text-primary">{formatCurrency(statements.grossProfit)}</span>
                  </div>

                  <div className="space-y-2 pl-4">
                    <div className="text-sm font-medium text-muted-foreground mb-1">Overhead Expenses</div>
                    {accounts.filter(a => a.type === 'expense' && a.category.includes('Overhead') && (statements.balances[a.id] || 0) !== 0).map(acc => (
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

                  <div className="flex justify-between items-end border-t-2 border-primary pt-3 px-2 mt-4">
                    <span className="font-bold text-sm uppercase">Net Income</span>
                    <span className={`font-bold text-xl ${statements.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(statements.netIncome)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Balance Sheet */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Balance Sheet</CardTitle>
                    <CardDescription>Financial position as of today</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={exportBalanceSheetToPDF}>
                      <FileText className="h-4 w-4 mr-2" />
                      PDF
                    </Button>
                    <Button size="sm" variant="outline" onClick={exportBalanceSheetToExcel}>
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Excel
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  {/* ASSETS */}
                  <div className="space-y-2">
                    <div className="font-semibold text-lg border-b pb-1">Assets</div>
                    {accounts.filter(a => a.type === 'asset' && !a.name.includes('Property') && !a.name.includes('Equipment') && !a.name.includes('Accumulated') && (statements.balances[a.id] || 0) !== 0).map(acc => (
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
                    {accounts.filter(a => a.type === 'liability' && !a.name.includes('Long-term') && !a.name.includes('Retention') && (statements.balances[a.id] || 0) !== 0).map(acc => (
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
                    {accounts.filter(a => a.type === 'equity' && !a.name.includes('Long-term') && !a.name.includes('Retention') && (statements.balances[a.id] || 0) !== 0).map(acc => (
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

          {/* AR Aging Tab */}
          <TabsContent value="ar-aging" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Accounts Receivable Aging Report</CardTitle>
                    <CardDescription>Outstanding customer invoices by aging period</CardDescription>
                  </div>
                  <Button onClick={loadARAgingReport}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {arAging ? (
                  <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardDescription>Current</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-green-600">
                            {new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(arAging.summary.current)}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardDescription>1-30 Days</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-blue-600">
                            {new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(arAging.summary.days1_30)}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardDescription>31-60 Days</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-yellow-600">
                            {new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(arAging.summary.days31_60)}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardDescription>61-90 Days</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-orange-600">
                            {new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(arAging.summary.days61_90)}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardDescription>90+ Days</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-red-600">
                            {new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(arAging.summary.days90Plus)}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardDescription>Total Outstanding</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            {new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(arAging.summary.total)}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Detailed Table */}
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Invoice #</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Client</TableHead>
                            <TableHead>Project</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead className="text-right">Outstanding</TableHead>
                            <TableHead className="text-center">Days</TableHead>
                            <TableHead>Aging Bucket</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {arAging.invoices.map((inv: any) => (
                            <TableRow key={inv.id}>
                              <TableCell className="font-medium">{inv.invoice_no}</TableCell>
                              <TableCell>{format(new Date(inv.date), "MMM d, yyyy")}</TableCell>
                              <TableCell>{inv.client}</TableCell>
                              <TableCell>{inv.projectName}</TableCell>
                              <TableCell className="text-right">
                                {new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(inv.net_amount)}
                              </TableCell>
                              <TableCell className="text-right font-semibold">
                                {new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(inv.outstanding)}
                              </TableCell>
                              <TableCell className="text-center">{inv.daysOutstanding}</TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    inv.agingBucket === "Current"
                                      ? "default"
                                      : inv.agingBucket === "1-30 days"
                                      ? "secondary"
                                      : inv.agingBucket === "31-60 days"
                                      ? "outline"
                                      : "destructive"
                                  }
                                >
                                  {inv.agingBucket}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>Click "Refresh" to load AR Aging Report</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* AP Aging Tab */}
          <TabsContent value="ap-aging" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Accounts Payable Aging Report</CardTitle>
                    <CardDescription>Outstanding vendor bills by aging period</CardDescription>
                  </div>
                  <Button onClick={loadAPAgingReport}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {apAging ? (
                  <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardDescription>Current</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-green-600">
                            {new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(apAging.summary.current)}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardDescription>1-30 Days</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-blue-600">
                            {new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(apAging.summary.days1_30)}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardDescription>31-60 Days</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-yellow-600">
                            {new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(apAging.summary.days31_60)}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardDescription>61-90 Days</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-orange-600">
                            {new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(apAging.summary.days61_90)}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardDescription>90+ Days</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-red-600">
                            {new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(apAging.summary.days90Plus)}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardDescription>Total Payable</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            {new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(apAging.summary.total)}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Detailed Table */}
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Entry #</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Project</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead className="text-right">Outstanding</TableHead>
                            <TableHead className="text-center">Days</TableHead>
                            <TableHead>Aging Bucket</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {apAging.bills.map((bill: any) => (
                            <TableRow key={bill.id}>
                              <TableCell className="font-medium">{bill.entryNumber}</TableCell>
                              <TableCell>{format(new Date(bill.date), "MMM d, yyyy")}</TableCell>
                              <TableCell>{bill.description}</TableCell>
                              <TableCell>{bill.projectName}</TableCell>
                              <TableCell className="text-right">
                                {new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(bill.amount)}
                              </TableCell>
                              <TableCell className="text-right font-semibold">
                                {new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(bill.outstanding)}
                              </TableCell>
                              <TableCell className="text-center">{bill.daysOutstanding}</TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    bill.agingBucket === "Current"
                                      ? "default"
                                      : bill.agingBucket === "1-30 days"
                                      ? "secondary"
                                      : bill.agingBucket === "31-60 days"
                                      ? "outline"
                                      : "destructive"
                                  }
                                >
                                  {bill.agingBucket}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>Click "Refresh" to load AP Aging Report</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* RECURRING ENTRIES TAB */}
          <TabsContent value="recurring-entries" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Recurring Journal Entries</CardTitle>
                    <CardDescription>
                      Automate repetitive monthly transactions like rent, utilities, and salaries
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleGenerateRecurringEntries} variant="outline">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Generate Due Entries
                    </Button>
                    <Button onClick={() => {
                      setEditingRecurringEntry(null);
                      setRecurringFormData({
                        description: "",
                        frequency: "monthly",
                        startDate: new Date().toISOString().split("T")[0],
                        endDate: "",
                        projectId: "",
                        isActive: true,
                        lines: [
                          { accountId: "", description: "", debit: 0, credit: 0 },
                          { accountId: "", description: "", debit: 0, credit: 0 },
                        ],
                      });
                      setRecurringDialogOpen(true);
                    }}>
                      <Plus className="h-4 w-4 mr-2" />
                      New Recurring Entry
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Search</label>
                    <Input
                      placeholder="Search description..."
                      value={recurringFilters.search}
                      onChange={(e) => setRecurringFilters({ ...recurringFilters, search: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Frequency</label>
                    <Select
                      value={recurringFilters.frequency}
                      onValueChange={(value) => {
                        setRecurringFilters({ ...recurringFilters, frequency: value });
                        setRecurringPage(1);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
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
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <Select
                      value={recurringFilters.status}
                      onValueChange={(value) => {
                        setRecurringFilters({ ...recurringFilters, status: value });
                        setRecurringPage(1);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Results count */}
                <div className="text-sm text-muted-foreground">
                  Showing {paginatedRecurringEntries.length} of {filteredRecurringEntries.length} entries
                </div>

                {/* Table */}
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead>Frequency</TableHead>
                        <TableHead>Next Run</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedRecurringEntries.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                            {recurringFilters.search || recurringFilters.frequency !== "all" || recurringFilters.status !== "all"
                              ? "No recurring entries match your filters"
                              : "No recurring entries yet. Click 'New Recurring Entry' to create one."}
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedRecurringEntries.map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell className="font-medium">{entry.description}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {entry.frequency}
                              </Badge>
                            </TableCell>
                            <TableCell>{new Date(entry.nextOccurrence).toLocaleDateString()}</TableCell>
                            <TableCell>
                              {entry.projectId
                                ? projects.find((p) => p.id === entry.projectId)?.name || "Unknown"
                                : "General"}
                            </TableCell>
                            <TableCell>
                              <Badge variant={entry.isActive ? "default" : "secondary"}>
                                {entry.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingRecurringEntry(entry);
                                  setRecurringFormData({
                                    description: entry.description,
                                    frequency: entry.frequency,
                                    startDate: entry.startDate,
                                    endDate: entry.endDate || "",
                                    projectId: entry.projectId || "",
                                    isActive: entry.isActive,
                                    lines: entry.lines || [],
                                  });
                                  setRecurringDialogOpen(true);
                                }}
                              >
                                Edit
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalRecurringPages > 1 && (
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Page {recurringPage} of {totalRecurringPages}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={recurringPage === 1}
                        onClick={() => setRecurringPage(recurringPage - 1)}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={recurringPage === totalRecurringPages}
                        onClick={() => setRecurringPage(recurringPage + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recurring Entry Dialog */}
            <Dialog open={recurringDialogOpen} onOpenChange={setRecurringDialogOpen}>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle>{editingRecurring ? "Edit" : "Create"} Recurring Journal Entry</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Input
                        placeholder="e.g., Monthly office rent"
                        value={recurringFormData.description}
                        onChange={e => setRecurringFormData({ ...recurringFormData, description: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Frequency</Label>
                      <Select
                        value={recurringFormData.frequency}
                        onValueChange={v => setRecurringFormData({ ...recurringFormData, frequency: v as any })}
                      >
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
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Input
                        type="date"
                        value={recurringFormData.startDate}
                        onChange={e => setRecurringFormData({ ...recurringFormData, startDate: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Date (Optional)</Label>
                      <Input
                        type="date"
                        value={recurringFormData.endDate}
                        onChange={e => setRecurringFormData({ ...recurringFormData, endDate: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label>Project (Optional)</Label>
                      <Select
                        value={recurringFormData.projectId}
                        onValueChange={v => setRecurringFormData({ ...recurringFormData, projectId: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select project" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">General (No Project)</SelectItem>
                          {projects.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                        {recurringLines.map((line, i) => (
                          <TableRow key={i}>
                            <TableCell>
                              <Select
                                value={line.accountId}
                                onValueChange={v => {
                                  const updated = [...recurringLines];
                                  updated[i].accountId = v;
                                  setRecurringLines(updated);
                                }}
                              >
                                <SelectTrigger className="w-[200px]">
                                  <SelectValue placeholder="Select Account" />
                                </SelectTrigger>
                                <SelectContent>
                                  {accounts.map(acc => (
                                    <SelectItem key={acc.id} value={acc.id}>
                                      {acc.code} - {acc.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input
                                placeholder="Line description"
                                value={line.description}
                                onChange={e => {
                                  const updated = [...recurringLines];
                                  updated[i].description = e.target.value;
                                  setRecurringLines(updated);
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                className="text-right"
                                value={line.debit || ""}
                                onChange={e => {
                                  const updated = [...recurringLines];
                                  updated[i].debit = Number(e.target.value);
                                  if (Number(e.target.value) > 0) updated[i].credit = 0;
                                  setRecurringLines(updated);
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                className="text-right"
                                value={line.credit || ""}
                                onChange={e => {
                                  const updated = [...recurringLines];
                                  updated[i].credit = Number(e.target.value);
                                  if (Number(e.target.value) > 0) updated[i].debit = 0;
                                  setRecurringLines(updated);
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              {recurringLines.length > 1 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setRecurringLines(recurringLines.filter((_, idx) => idx !== i))}
                                >
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <Button
                      variant="outline"
                      onClick={() =>
                        setRecurringLines([
                          ...recurringLines,
                          { accountId: "", description: "", debit: 0, credit: 0 },
                        ])
                      }
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Line
                    </Button>
                    <div className="flex gap-8 font-semibold">
                      <div>
                        Total Debit: {formatCurrency(recurringLines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0))}
                      </div>
                      <div>
                        Total Credit: {formatCurrency(recurringLines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0))}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setRecurringDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveRecurringEntry}>Save Recurring Entry</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* BANK RECONCILIATION TAB */}
          <TabsContent value="bank-reconciliation" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Bank Reconciliation</CardTitle>
                    <CardDescription>
                      Match your accounting records with bank statements to ensure accuracy
                    </CardDescription>
                  </div>
                  <Button onClick={() => {
                    setEditingReconciliation(null);
                    setReconciliationFormData({
                      accountId: "",
                      statementDate: new Date().toISOString().split("T")[0],
                      statementBalance: 0,
                      bookBalance: 0,
                      reconciledBalance: 0,
                      status: "in_progress",
                      transactions: [],
                    });
                    setReconciliationDialogOpen(true);
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Reconciliation
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Bank Account</label>
                    <Select
                      value={reconciliationFilters.accountId}
                      onValueChange={(value) => {
                        setReconciliationFilters({ ...reconciliationFilters, accountId: value });
                        setReconciliationPage(1);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Accounts" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Accounts</SelectItem>
                        {accounts
                          .filter((acc) => acc.type === "asset" && acc.name.toLowerCase().includes("cash"))
                          .map((acc) => (
                            <SelectItem key={acc.id} value={acc.id}>
                              {acc.code} - {acc.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <Select
                      value={reconciliationFilters.status}
                      onValueChange={(value) => {
                        setReconciliationFilters({ ...reconciliationFilters, status: value });
                        setReconciliationPage(1);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date From</label>
                    <Input
                      type="date"
                      value={reconciliationFilters.dateFrom}
                      onChange={(e) => {
                        setReconciliationFilters({ ...reconciliationFilters, dateFrom: e.target.value });
                        setReconciliationPage(1);
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date To</label>
                    <Input
                      type="date"
                      value={reconciliationFilters.dateTo}
                      onChange={(e) => {
                        setReconciliationFilters({ ...reconciliationFilters, dateTo: e.target.value });
                        setReconciliationPage(1);
                      }}
                    />
                  </div>
                </div>

                {/* Results count */}
                <div className="text-sm text-muted-foreground">
                  Showing {paginatedReconciliations.length} of {filteredReconciliations.length} reconciliations
                </div>

                {/* Table */}
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Bank Account</TableHead>
                        <TableHead>Statement Date</TableHead>
                        <TableHead className="text-right">Statement Balance</TableHead>
                        <TableHead className="text-right">Book Balance</TableHead>
                        <TableHead className="text-right">Difference</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedReconciliations.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                            {reconciliationFilters.accountId !== "all" || reconciliationFilters.status !== "all" || reconciliationFilters.dateFrom || reconciliationFilters.dateTo
                              ? "No reconciliations match your filters"
                              : "No bank reconciliations yet. Click 'New Reconciliation' to start."}
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedReconciliations.map((rec) => {
                          const difference = rec.statementBalance - rec.bookBalance;
                          return (
                            <TableRow key={rec.id}>
                              <TableCell className="font-medium">
                                {rec.account ? `${rec.account.code} - ${rec.account.name}` : "Unknown"}
                              </TableCell>
                              <TableCell>{new Date(rec.statementDate).toLocaleDateString()}</TableCell>
                              <TableCell className="text-right">{formatCurrency(rec.statementBalance)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(rec.bookBalance)}</TableCell>
                              <TableCell className="text-right">
                                <span className={difference !== 0 ? "text-destructive font-semibold" : "text-green-600"}>
                                  {formatCurrency(Math.abs(difference))}
                                  {difference !== 0 && " ⚠️"}
                                </span>
                              </TableCell>
                              <TableCell>
                                <Badge variant={rec.status === "completed" ? "default" : "secondary"}>
                                  {rec.status === "in_progress" ? "In Progress" : "Completed"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditingReconciliation(rec);
                                    setReconciliationFormData({
                                      accountId: rec.accountId,
                                      statementDate: rec.statementDate,
                                      statementBalance: rec.statementBalance,
                                      bookBalance: rec.bookBalance,
                                      reconciledBalance: rec.reconciledBalance,
                                      status: rec.status,
                                      transactions: rec.transactions || [],
                                    });
                                    setReconciliationDialogOpen(true);
                                  }}
                                >
                                  View
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalReconciliationPages > 1 && (
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Page {reconciliationPage} of {totalReconciliationPages}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={reconciliationPage === 1}
                        onClick={() => setReconciliationPage(reconciliationPage - 1)}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={reconciliationPage === totalReconciliationPages}
                        onClick={() => setReconciliationPage(reconciliationPage + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* PERIOD COMPARISON TAB */}
          <TabsContent value="period-comparison" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Period Comparison</CardTitle>
                <CardDescription>
                  Compare financial performance across different time periods
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Period Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-muted/50 rounded-lg">
                  {comparisonPeriods.map((period, index) => (
                    <div key={index} className="space-y-4 p-4 bg-background rounded-lg border">
                      <h3 className="font-semibold mb-4">Period {index + 1}</h3>
                      <div className="space-y-2">
                        <Label>Label</Label>
                        <Input
                          placeholder="e.g., Current Year"
                          value={period.label}
                          onChange={(e) => {
                            const updated = [...comparisonPeriods];
                            updated[index].label = e.target.value;
                            setComparisonPeriods(updated);
                          }}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Start Date</Label>
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
                        <div className="space-y-2">
                          <Label>End Date</Label>
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
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-center">
                  <Button onClick={loadPeriodComparison} size="lg">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Generate Comparison
                  </Button>
                </div>

                {/* Charts */}
                {comparisonCharts && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-6">
                      {/* Revenue Comparison Chart */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Revenue & Expense Comparison</CardTitle>
                          <CardDescription>Track revenue growth and cost trends</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={comparisonCharts.revenueComparison}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="period" />
                              <YAxis />
                              <Tooltip
                                formatter={(value: any) => formatCurrency(value)}
                                contentStyle={{
                                  backgroundColor: "hsl(var(--background))",
                                  border: "1px solid hsl(var(--border))",
                                  borderRadius: "8px",
                                }}
                              />
                              <Legend />
                              <Bar dataKey="revenue" fill="hsl(var(--primary))" name="Revenue" />
                              <Bar dataKey="cogs" fill="hsl(142 76% 36%)" name="COGS" />
                              <Bar dataKey="expenses" fill="hsl(var(--destructive))" name="Expenses" />
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>

                      {/* Profit Margin Trend */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Profit Margin Trend</CardTitle>
                          <CardDescription>Monitor profitability over time</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={comparisonCharts.profitMarginTrend}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="period" />
                              <YAxis tickFormatter={(value) => `${value}%`} />
                              <Tooltip
                                formatter={(value: any) => `${value.toFixed(2)}%`}
                                contentStyle={{
                                  backgroundColor: "hsl(var(--background))",
                                  border: "1px solid hsl(var(--border))",
                                  borderRadius: "8px",
                                }}
                              />
                              <Legend />
                              <Line
                                type="monotone"
                                dataKey="grossMargin"
                                stroke="hsl(var(--primary))"
                                strokeWidth={2}
                                name="Gross Margin %"
                              />
                              <Line
                                type="monotone"
                                dataKey="netMargin"
                                stroke="hsl(142 76% 36%)"
                                strokeWidth={2}
                                name="Net Margin %"
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>

                      {/* Asset Growth */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Asset Growth</CardTitle>
                          <CardDescription>Track company asset expansion</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={comparisonCharts.assetGrowth}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="period" />
                              <YAxis />
                              <Tooltip
                                formatter={(value: any) => formatCurrency(value)}
                                contentStyle={{
                                  backgroundColor: "hsl(var(--background))",
                                  border: "1px solid hsl(var(--border))",
                                  borderRadius: "8px",
                                }}
                              />
                              <Legend />
                              <Bar dataKey="currentAssets" fill="hsl(var(--primary))" name="Current Assets" />
                              <Bar dataKey="nonCurrentAssets" fill="hsl(142 76% 36%)" name="Non-Current Assets" />
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Summary Table */}
                    {comparisonData && (
                      <Card>
                        <CardHeader>
                          <CardTitle>Detailed Comparison</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-6">
                            {/* Profit & Loss Comparison */}
                            <div>
                              <h3 className="font-semibold mb-4">Profit & Loss</h3>
                              <div className="border rounded-lg overflow-hidden">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Category</TableHead>
                                      {comparisonPeriods.map((period) => (
                                        <TableHead key={period.label} className="text-right">
                                          {period.label}
                                        </TableHead>
                                      ))}
                                      <TableHead className="text-right">Variance</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    <TableRow>
                                      <TableCell className="font-medium">Total Revenue</TableCell>
                                      {comparisonPeriods.map((period) => (
                                        <TableCell key={period.label} className="text-right">
                                          {formatCurrency(comparisonData.profitAndLoss[period.label]?.totalRevenue || 0)}
                                        </TableCell>
                                      ))}
                                      <TableCell className="text-right">
                                        {comparisonPeriods.length === 2 && (
                                          <span
                                            className={
                                              (comparisonData.profitAndLoss[comparisonPeriods[0].label]?.totalRevenue || 0) >
                                              (comparisonData.profitAndLoss[comparisonPeriods[1].label]?.totalRevenue || 0)
                                                ? "text-green-600"
                                                : "text-destructive"
                                            }
                                          >
                                            {formatCurrency(
                                              (comparisonData.profitAndLoss[comparisonPeriods[0].label]?.totalRevenue || 0) -
                                                (comparisonData.profitAndLoss[comparisonPeriods[1].label]?.totalRevenue || 0)
                                            )}
                                          </span>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                    <TableRow>
                                      <TableCell className="font-medium">Total COGS</TableCell>
                                      {comparisonPeriods.map((period) => (
                                        <TableCell key={period.label} className="text-right">
                                          {formatCurrency(comparisonData.profitAndLoss[period.label]?.totalCOGS || 0)}
                                        </TableCell>
                                      ))}
                                      <TableCell className="text-right">
                                        {comparisonPeriods.length === 2 && (
                                          <span
                                            className={
                                              (comparisonData.profitAndLoss[comparisonPeriods[0].label]?.totalCOGS || 0) <
                                              (comparisonData.profitAndLoss[comparisonPeriods[1].label]?.totalCOGS || 0)
                                                ? "text-green-600"
                                                : "text-destructive"
                                            }
                                          >
                                            {formatCurrency(
                                              (comparisonData.profitAndLoss[comparisonPeriods[0].label]?.totalCOGS || 0) -
                                                (comparisonData.profitAndLoss[comparisonPeriods[1].label]?.totalCOGS || 0)
                                            )}
                                          </span>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                    <TableRow>
                                      <TableCell className="font-medium">Gross Profit</TableCell>
                                      {comparisonPeriods.map((period) => (
                                        <TableCell key={period.label} className="text-right font-semibold">
                                          {formatCurrency(comparisonData.profitAndLoss[period.label]?.grossProfit || 0)}
                                        </TableCell>
                                      ))}
                                      <TableCell className="text-right font-semibold">
                                        {comparisonPeriods.length === 2 && (
                                          <span
                                            className={
                                              (comparisonData.profitAndLoss[comparisonPeriods[0].label]?.grossProfit || 0) >
                                              (comparisonData.profitAndLoss[comparisonPeriods[1].label]?.grossProfit || 0)
                                                ? "text-green-600"
                                                : "text-destructive"
                                            }
                                          >
                                            {formatCurrency(
                                              (comparisonData.profitAndLoss[comparisonPeriods[0].label]?.grossProfit || 0) -
                                                (comparisonData.profitAndLoss[comparisonPeriods[1].label]?.grossProfit || 0)
                                            )}
                                          </span>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                    <TableRow>
                                      <TableCell className="font-medium">Net Income</TableCell>
                                      {comparisonPeriods.map((period) => (
                                        <TableCell key={period.label} className="text-right font-semibold">
                                          {formatCurrency(comparisonData.profitAndLoss[period.label]?.netIncome || 0)}
                                        </TableCell>
                                      ))}
                                      <TableCell className="text-right font-semibold">
                                        {comparisonPeriods.length === 2 && (
                                          <span
                                            className={
                                              (comparisonData.profitAndLoss[comparisonPeriods[0].label]?.netIncome || 0) >
                                              (comparisonData.profitAndLoss[comparisonPeriods[1].label]?.netIncome || 0)
                                                ? "text-green-600"
                                                : "text-destructive"
                                            }
                                          >
                                            {formatCurrency(
                                              (comparisonData.profitAndLoss[comparisonPeriods[0].label]?.netIncome || 0) -
                                                (comparisonData.profitAndLoss[comparisonPeriods[1].label]?.netIncome || 0)
                                            )}
                                          </span>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  </TableBody>
                                </Table>
                              </div>
                            </div>

                            {/* Balance Sheet Comparison */}
                            <div>
                              <h3 className="font-semibold mb-4">Balance Sheet</h3>
                              <div className="border rounded-lg overflow-hidden">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Category</TableHead>
                                      {comparisonPeriods.map((period) => (
                                        <TableHead key={period.label} className="text-right">
                                          {period.label}
                                        </TableHead>
                                      ))}
                                      <TableHead className="text-right">Variance</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    <TableRow>
                                      <TableCell className="font-medium">Total Assets</TableCell>
                                      {comparisonPeriods.map((period) => (
                                        <TableCell key={period.label} className="text-right">
                                          {formatCurrency(comparisonData.balanceSheet[period.label]?.totalAssets || 0)}
                                        </TableCell>
                                      ))}
                                      <TableCell className="text-right">
                                        {comparisonPeriods.length === 2 && (
                                          <span
                                            className={
                                              (comparisonData.balanceSheet[comparisonPeriods[0].label]?.totalAssets || 0) >
                                              (comparisonData.balanceSheet[comparisonPeriods[1].label]?.totalAssets || 0)
                                                ? "text-green-600"
                                                : "text-destructive"
                                            }
                                          >
                                            {formatCurrency(
                                              (comparisonData.balanceSheet[comparisonPeriods[0].label]?.totalAssets || 0) -
                                                (comparisonData.balanceSheet[comparisonPeriods[1].label]?.totalAssets || 0)
                                            )}
                                          </span>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                    <TableRow>
                                      <TableCell className="font-medium">Total Liabilities</TableCell>
                                      {comparisonPeriods.map((period) => (
                                        <TableCell key={period.label} className="text-right">
                                          {formatCurrency(comparisonData.balanceSheet[period.label]?.totalLiabilities || 0)}
                                        </TableCell>
                                      ))}
                                      <TableCell className="text-right">
                                        {comparisonPeriods.length === 2 && (
                                          <span
                                            className={
                                              (comparisonData.balanceSheet[comparisonPeriods[0].label]?.totalLiabilities || 0) <
                                              (comparisonData.balanceSheet[comparisonPeriods[1].label]?.totalLiabilities || 0)
                                                ? "text-green-600"
                                                : "text-destructive"
                                            }
                                          >
                                            {formatCurrency(
                                              (comparisonData.balanceSheet[comparisonPeriods[0].label]?.totalLiabilities || 0) -
                                                (comparisonData.balanceSheet[comparisonPeriods[1].label]?.totalLiabilities || 0)
                                            )}
                                          </span>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                    <TableRow>
                                      <TableCell className="font-medium">Total Equity</TableCell>
                                      {comparisonPeriods.map((period) => (
                                        <TableCell key={period.label} className="text-right font-semibold">
                                          {formatCurrency(comparisonData.balanceSheet[period.label]?.totalEquity || 0)}
                                        </TableCell>
                                      ))}
                                      <TableCell className="text-right font-semibold">
                                        {comparisonPeriods.length === 2 && (
                                          <span
                                            className={
                                              (comparisonData.balanceSheet[comparisonPeriods[0].label]?.totalEquity || 0) >
                                              (comparisonData.balanceSheet[comparisonPeriods[1].label]?.totalEquity || 0)
                                                ? "text-green-600"
                                                : "text-destructive"
                                            }
                                          >
                                            {formatCurrency(
                                              (comparisonData.balanceSheet[comparisonPeriods[0].label]?.totalEquity || 0) -
                                                (comparisonData.balanceSheet[comparisonPeriods[1].label]?.totalEquity || 0)
                                            )}
                                          </span>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  </TableBody>
                                </Table>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {!comparisonData && (
                      <div className="text-center py-12 text-muted-foreground">
                        Select periods above and click "Generate Comparison" to view charts and analysis
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </CRMLayout>
  );
}