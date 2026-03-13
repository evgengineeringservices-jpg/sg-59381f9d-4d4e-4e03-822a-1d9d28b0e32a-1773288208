import { supabase } from "@/integrations/supabase/client";
import type { Account, JournalEntry, JournalLine, RecurringJournalEntry, RecurringJournalLine, BankReconciliation, BankTransaction, Shareholder, Dividend, DividendPayment, EquityAccount } from "@/types";

export async function getAccounts(): Promise<Account[]> {
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .order("code");
    
  if (error) throw error;
  
  return data.map(account => ({
    id: account.id,
    code: account.code,
    name: account.name,
    type: account.type as any,
    category: account.category,
    description: account.description,
    balance: (account as any).balance ? parseFloat((account as any).balance) : 0,
    createdAt: account.created_at,
    updatedAt: account.updated_at
  }));
}

export async function getJournalEntries(): Promise<JournalEntry[]> {
  const { data, error } = await supabase
    .from("journal_entries")
    .select(`
      *,
      lines:journal_lines(
        *,
        account:accounts(*)
      )
    `)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
    
  if (error) throw error;
  
  return data.map(entry => ({
    id: entry.id,
    projectId: entry.project_id,
    date: entry.date,
    referenceNo: entry.reference_no,
    description: entry.description,
    status: entry.status as "draft" | "posted",
    createdAt: entry.created_at,
    updatedAt: entry.updated_at,
    lines: (entry.lines || []).map((line: any) => ({
      id: line.id,
      entryId: line.entry_id,
      accountId: line.account_id,
      description: line.description,
      debit: Number(line.debit),
      credit: Number(line.credit),
      createdAt: line.created_at,
      account: line.account ? {
        id: line.account.id,
        code: line.account.code,
        name: line.account.name,
        type: line.account.type as any,
        category: line.account.category,
        description: line.account.description,
        balance: (line.account as any).balance ? parseFloat((line.account as any).balance) : 0,
        createdAt: line.account.created_at,
        updatedAt: line.account.updated_at
      } : undefined
    }))
  }));
}

export async function createJournalEntry(
  entry: Partial<JournalEntry>, 
  lines: Partial<JournalLine>[]
): Promise<JournalEntry> {
  // Insert Entry Header
  const { data: newEntry, error: entryError } = await supabase
    .from("journal_entries")
    .insert({
      project_id: entry.projectId,
      date: entry.date,
      reference_no: entry.referenceNo,
      description: entry.description,
      status: entry.status || "draft"
    })
    .select()
    .single();
    
  if (entryError) throw entryError;

  // Insert Lines
  const linesToInsert = lines.map(line => ({
    entry_id: newEntry.id,
    account_id: line.accountId,
    description: line.description,
    debit: line.debit || 0,
    credit: line.credit || 0
  }));

  const { error: linesError } = await supabase
    .from("journal_lines")
    .insert(linesToInsert);

  if (linesError) {
    // Basic rollback
    await supabase.from("journal_entries").delete().eq("id", newEntry.id);
    throw linesError;
  }

  // Return the newly created entry by re-fetching it to include lines
  const { data: fullEntry, error: fetchError } = await supabase
    .from("journal_entries")
    .select(`*, lines:journal_lines(*, account:accounts(*))`)
    .eq("id", newEntry.id)
    .single();
    
  if (fetchError) throw fetchError;
  
  return fullEntry as any; // Map proper type in production, casting for now to avoid extensive mapping
}

export async function postJournalEntry(id: string): Promise<void> {
  const { error } = await supabase
    .from("journal_entries")
    .update({ status: "posted" })
    .eq("id", id);
    
  if (error) throw error;
}

export async function createAccount(account: Partial<Account>): Promise<Account> {
  const { data, error } = await supabase
    .from("accounts")
    .insert({
      code: account.code,
      name: account.name,
      type: account.type,
      category: account.category,
      description: account.description
    })
    .select()
    .single();
    
  if (error) throw error;
  
  return data as any;
}

/**
 * Calculate accounts receivable aging report
 */
export async function getAccountsReceivableAging(): Promise<{
  invoices: any[];
  summary: { current: number; days1_30: number; days31_60: number; days61_90: number; days90Plus: number; total: number };
}> {
  const { data: invoices, error } = await supabase
    .from("billing_items")
    .select(`
      *,
      projects (
        id,
        name,
        client
      )
    `)
    .in("status", ["sent", "overdue"])
    .order("date", { ascending: false });

  if (error) throw error;

  const today = new Date();
  let current = 0, days1_30 = 0, days31_60 = 0, days61_90 = 0, days90Plus = 0;

  const agingInvoices = (invoices || []).map((inv: any) => {
    const invoiceDate = new Date(inv.date);
    const daysOutstanding = Math.floor((today.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24));
    const outstanding = inv.net_amount - (inv.paid_amount || 0);

    let agingBucket = "Current";
    if (daysOutstanding > 90) {
      agingBucket = "90+ days";
      days90Plus += outstanding;
    } else if (daysOutstanding > 60) {
      agingBucket = "61-90 days";
      days61_90 += outstanding;
    } else if (daysOutstanding > 30) {
      agingBucket = "31-60 days";
      days31_60 += outstanding;
    } else if (daysOutstanding > 0) {
      agingBucket = "1-30 days";
      days1_30 += outstanding;
    } else {
      current += outstanding;
    }

    return {
      ...inv,
      projectName: inv.projects?.name || "N/A",
      client: inv.projects?.client || "N/A",
      daysOutstanding,
      agingBucket,
      outstanding,
    };
  });

  const total = current + days1_30 + days31_60 + days61_90 + days90Plus;

  return {
    invoices: agingInvoices,
    summary: { current, days1_30, days31_60, days61_90, days90Plus, total },
  };
}

/**
 * Calculate accounts payable aging report
 */
export async function getAccountsPayableAging(): Promise<{
  bills: any[];
  summary: { current: number; days1_30: number; days31_60: number; days61_90: number; days90Plus: number; total: number };
}> {
  // Get all journal entries related to accounts payable
  const { data: journalLines, error } = await supabase
    .from("journal_lines")
    .select(`
      *,
      journal_entries (
        id,
        reference_no,
        date,
        description,
        project_id,
        projects (
          id,
          name
        )
      ),
      accounts (
        id,
        code,
        name
      )
    `)
    .eq("accounts.code", "2000");

  if (error) throw error;

  const today = new Date();
  let current = 0, days1_30 = 0, days31_60 = 0, days61_90 = 0, days90Plus = 0;

  // Group by journal entry and calculate outstanding amounts
  const billMap = new Map();
  
  (journalLines || []).forEach((line: any) => {
    const entry = line.journal_entries;
    if (!entry) return;

    const entryId = entry.id;
    if (!billMap.has(entryId)) {
      billMap.set(entryId, {
        id: entryId,
        entryNumber: entry.reference_no,
        date: entry.date,
        description: entry.description,
        projectName: entry.projects?.name || "N/A",
        amount: 0,
        paid: 0,
      });
    }

    const bill = billMap.get(entryId);
    // Credit increases payable (amount owed)
    if (line.credit > 0) {
      bill.amount += line.credit;
    }
    // Debit decreases payable (payment made)
    if (line.debit > 0) {
      bill.paid += line.debit;
    }
  });

  const agingBills = Array.from(billMap.values())
    .filter(bill => bill.amount > bill.paid) // Only unpaid/partially paid bills
    .map(bill => {
      const billDate = new Date(bill.date);
      const daysOutstanding = Math.floor((today.getTime() - billDate.getTime()) / (1000 * 60 * 60 * 24));
      const outstanding = bill.amount - bill.paid;

      let agingBucket = "Current";
      if (daysOutstanding > 90) {
        agingBucket = "90+ days";
        days90Plus += outstanding;
      } else if (daysOutstanding > 60) {
        agingBucket = "61-90 days";
        days61_90 += outstanding;
      } else if (daysOutstanding > 30) {
        agingBucket = "31-60 days";
        days31_60 += outstanding;
      } else if (daysOutstanding > 0) {
        agingBucket = "1-30 days";
        days1_30 += outstanding;
      } else {
        current += outstanding;
      }

      return {
        ...bill,
        daysOutstanding,
        agingBucket,
        outstanding,
      };
    });

  const total = current + days1_30 + days31_60 + days61_90 + days90Plus;

  return {
    bills: agingBills,
    summary: { current, days1_30, days31_60, days61_90, days90Plus, total },
  };
}

/**
 * Auto-generate journal entry from billing invoice
 */
export async function generateJournalEntryFromBilling(billingItemId: string): Promise<JournalEntry> {
  // Fetch the billing item with project details
  const { data: billingData, error: billingError } = await supabase
    .from("billing_items")
    .select(`
      *,
      projects (
        id,
        name,
        client
      )
    `)
    .eq("id", billingItemId)
    .single();

  if (billingError) throw billingError;
  if (!billingData) throw new Error("Billing item not found");
  
  const billing: any = billingData;

  // Create journal entry
  const entryData = {
    date: billing.date,
    referenceNo: `JE-INV-${billing.invoice_no}`,
    description: `Billing: ${billing.description || billing.billing_type} - ${billing.projects?.name || "Project"}`,
    projectId: billing.project_id,
    status: "posted" as const,
  };

  const lines = [];

  // DR: Accounts Receivable (1110)
  lines.push({
    accountId: await getAccountIdByCode("1110"), // AR Trade
    debit: billing.net_amount,
    credit: 0,
    description: `AR for ${billing.invoice_no}`,
  });

  // CR: Construction Revenue (4100)
  lines.push({
    accountId: await getAccountIdByCode("4100"), // Contract Revenue
    debit: 0,
    credit: billing.amount,
    description: `Revenue from ${billing.invoice_no}`,
  });

  // If there's VAT
  if (billing.vat && billing.vat > 0) {
    lines.push({
      accountId: await getAccountIdByCode("2120"), // Accrued Taxes (VAT Payable)
      debit: 0,
      credit: billing.vat,
      description: `VAT on ${billing.invoice_no}`,
    });
  }

  // If there's EWT
  if (billing.ewt && billing.ewt > 0) {
    lines.push({
      accountId: await getAccountIdByCode("1300"), // Prepaid Expenses (EWT Receivable)
      debit: billing.ewt,
      credit: 0,
      description: `EWT on ${billing.invoice_no}`,
    });
  }

  // If there's retention
  if (billing.retention && billing.retention > 0) {
    lines.push({
      accountId: await getAccountIdByCode("1120"), // AR Retention
      debit: billing.retention,
      credit: 0,
      description: `Retention on ${billing.invoice_no}`,
    });
  }

  return await createJournalEntry(entryData, lines);
}

/**
 * Recurring Journal Entries
 */
export async function getRecurringJournalEntries() {
  const { data, error } = await supabase
    .from("recurring_journal_entries")
    .select(`
      *,
      recurring_journal_lines:recurring_journal_lines(*, account:accounts(*))
    `)
    .order("next_occurrence", { ascending: true });

  if (error) throw error;

  return (data || []).map((entry: any) => ({
    id: entry.id,
    projectId: entry.project_id,
    description: entry.description,
    frequency: entry.frequency,
    startDate: entry.start_date,
    endDate: entry.end_date,
    nextOccurrence: entry.next_occurrence,
    isActive: entry.is_active,
    createdAt: entry.created_at,
    createdBy: entry.created_by,
    lines: (entry.recurring_journal_lines || []).map((line: any) => ({
      id: line.id,
      recurringEntryId: line.recurring_entry_id,
      accountId: line.account_id,
      description: line.description,
      debit: parseFloat(line.debit || 0),
      credit: parseFloat(line.credit || 0),
      account: line.account ? {
        id: line.account.id,
        code: line.account.code,
        name: line.account.name,
        type: line.account.type,
        category: line.account.category,
        balance: parseFloat(line.account.balance || 0),
        isActive: line.account.is_active,
        createdAt: line.account.created_at,
        description: line.account.description,
        updatedAt: line.account.updated_at,
      } : undefined,
    })),
  }));
}

export async function createRecurringJournalEntry(
  entry: Omit<RecurringJournalEntry, "id" | "createdAt" | "createdBy">,
  lines: Omit<RecurringJournalLine, "id" | "recurringEntryId">[]
) {
  const { data: user } = await supabase.auth.getUser();

  const { data: newEntry, error: entryError } = await supabase
    .from("recurring_journal_entries")
    .insert({
      project_id: entry.projectId,
      description: entry.description,
      frequency: entry.frequency,
      start_date: entry.startDate,
      end_date: entry.endDate,
      next_occurrence: entry.nextOccurrence,
      is_active: entry.isActive,
      created_by: user?.user?.id,
    })
    .select()
    .single();

  if (entryError) throw entryError;

  if (lines.length > 0) {
    const { error: linesError } = await supabase
      .from("recurring_journal_lines")
      .insert(
        lines.map((line) => ({
          recurring_entry_id: newEntry.id,
          account_id: line.accountId,
          description: line.description,
          debit: line.debit,
          credit: line.credit,
        }))
      );

    if (linesError) throw linesError;
  }

  return newEntry;
}

export async function updateRecurringJournalEntry(
  id: string,
  updates: Partial<RecurringJournalEntry>,
  lines?: any[]
) {
  const { data, error } = await supabase
    .from("recurring_journal_entries")
    .update({
      project_id: updates.projectId,
      description: updates.description,
      frequency: updates.frequency,
      start_date: updates.startDate,
      end_date: updates.endDate,
      next_occurrence: updates.nextOccurrence,
      is_active: updates.isActive,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteRecurringJournalEntry(id: string) {
  const { error } = await supabase
    .from("recurring_journal_entries")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function updateJournalEntry(id: string, entry: Partial<JournalEntry>, lines: any[]) { return; }
export function exportProfitAndLossToPDF(data: any) { console.log("Exporting P&L PDF", data); }
export function exportProfitAndLossToExcel(data: any) { console.log("Exporting P&L Excel", data); }
export function exportBalanceSheetToPDF(data: any) { console.log("Exporting BS PDF", data); }
export function exportBalanceSheetToExcel(data: any) { console.log("Exporting BS Excel", data); }
export async function createBankTransaction(data: any) { return; }
export async function deleteBankTransaction(id: string) { return; }

export async function generateJournalEntriesFromRecurring() {
  const today = new Date().toISOString().split("T")[0];

  const { data: dueEntries, error } = await supabase
    .from("recurring_journal_entries")
    .select(`
      *,
      recurring_journal_lines:recurring_journal_lines(*)
    `)
    .lte("next_occurrence", today)
    .eq("is_active", true);

  if (error) throw error;

  const generated = [];

  for (const entry of dueEntries || []) {
    const entryData = {
      projectId: entry.project_id,
      date: entry.next_occurrence,
      referenceNo: `REC-${entry.id.substring(0, 8)}-${Date.now()}`,
      description: `${entry.description} (Recurring)`,
      status: "posted" as const,
    };

    const lines = (entry.recurring_journal_lines || []).map((line: any) => ({
      accountId: line.account_id,
      description: line.description,
      debit: parseFloat(line.debit || 0),
      credit: parseFloat(line.credit || 0),
    }));

    const journalEntry = await createJournalEntry(entryData, lines);
    generated.push(journalEntry);

    const nextDate = calculateNextOccurrence(
      entry.next_occurrence,
      entry.frequency
    );

    await supabase
      .from("recurring_journal_entries")
      .update({ next_occurrence: nextDate })
      .eq("id", entry.id);
  }

  return generated;
}

function calculateNextOccurrence(currentDate: string, frequency: string): string {
  const date = new Date(currentDate);

  switch (frequency) {
    case "daily":
      date.setDate(date.getDate() + 1);
      break;
    case "weekly":
      date.setDate(date.getDate() + 7);
      break;
    case "monthly":
      date.setMonth(date.getMonth() + 1);
      break;
    case "quarterly":
      date.setMonth(date.getMonth() + 3);
      break;
    case "yearly":
      date.setFullYear(date.getFullYear() + 1);
      break;
  }

  return date.toISOString().split("T")[0];
}

/**
 * Bank Reconciliation
 */
export async function getBankReconciliations() {
  const { data, error } = await supabase
    .from("bank_reconciliations")
    .select(`
      *,
      account:accounts(*),
      bank_transactions:bank_transactions(*)
    `)
    .order("statement_date", { ascending: false });

  if (error) throw error;

  return (data || []).map((rec: any) => ({
    id: rec.id,
    accountId: rec.account_id,
    statementDate: rec.statement_date,
    statementBalance: parseFloat(rec.statement_balance || 0),
    bookBalance: parseFloat(rec.book_balance || 0),
    reconciledBalance: rec.reconciled_balance ? parseFloat(rec.reconciled_balance) : undefined,
    status: rec.status,
    notes: rec.notes,
    createdAt: rec.created_at,
    createdBy: rec.created_by,
    completedAt: rec.completed_at,
    account: rec.account ? {
      id: rec.account.id,
      code: rec.account.code,
      name: rec.account.name,
      type: rec.account.type,
      category: rec.account.category,
      balance: parseFloat(rec.account.balance || 0),
      isActive: rec.account.is_active,
      createdAt: rec.account.created_at,
      description: rec.account.description,
      updatedAt: rec.account.updated_at,
    } : undefined,
    transactions: (rec.bank_transactions || []).map((t: any) => ({
      id: t.id,
      reconciliationId: t.reconciliation_id,
      transactionDate: t.transaction_date,
      description: t.description,
      referenceNo: t.reference_no,
      debit: parseFloat(t.debit || 0),
      credit: parseFloat(t.credit || 0),
      isMatched: t.is_matched,
      matchedJournalEntryId: t.matched_journal_entry_id,
      notes: t.notes,
      createdAt: t.created_at,
    })),
  }));
}

export async function createBankReconciliation(
  reconciliation: Omit<BankReconciliation, "id" | "createdAt" | "createdBy">,
  transactions: Omit<BankTransaction, "id" | "reconciliationId" | "createdAt">[]
) {
  const { data: user } = await supabase.auth.getUser();

  const { data: newRec, error: recError } = await supabase
    .from("bank_reconciliations")
    .insert({
      account_id: reconciliation.accountId,
      statement_date: reconciliation.statementDate,
      statement_balance: reconciliation.statementBalance,
      book_balance: reconciliation.bookBalance,
      reconciled_balance: reconciliation.reconciledBalance,
      status: reconciliation.status,
      notes: reconciliation.notes,
      created_by: user?.user?.id,
    })
    .select()
    .single();

  if (recError) throw recError;

  if (transactions.length > 0) {
    const { error: transError } = await supabase
      .from("bank_transactions")
      .insert(
        transactions.map((t) => ({
          reconciliation_id: newRec.id,
          transaction_date: t.transactionDate,
          description: t.description,
          reference_no: t.referenceNo,
          debit: t.debit,
          credit: t.credit,
          is_matched: t.isMatched,
          matched_journal_entry_id: t.matchedJournalEntryId,
          notes: t.notes,
        }))
      );

    if (transError) throw transError;
  }

  return newRec;
}

export async function updateBankReconciliation(
  id: string,
  updates: Partial<BankReconciliation>,
  transactions?: any[]
) {
  const updateData: any = {
    statement_balance: updates.statementBalance,
    book_balance: updates.bookBalance,
    reconciled_balance: updates.reconciledBalance,
    status: updates.status,
    notes: updates.notes,
  };

  if (updates.status === "reconciled" && !updates.completedAt) {
    updateData.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("bank_reconciliations")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateBankTransaction(
  id: string,
  updates: Partial<BankTransaction>
) {
  const { data, error } = await supabase
    .from("bank_transactions")
    .update({
      is_matched: updates.isMatched,
      matched_journal_entry_id: updates.matchedJournalEntryId,
      notes: updates.notes,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Period Comparison
 */
export async function getProfitAndLoss(startDate: string, endDate: string) {
  const { data: lines, error } = await supabase
    .from("journal_lines")
    .select(`
      debit, credit,
      accounts!inner(type, category),
      journal_entries!inner(date, status)
    `)
    .eq("journal_entries.status", "posted")
    .gte("journal_entries.date", startDate)
    .lte("journal_entries.date", endDate);

  if (error) throw error;

  let revenue = 0, directCosts = 0, expenses = 0;
  lines?.forEach((line: any) => {
    const isAssetExpense = line.accounts.type === 'expense';
    const amount = isAssetExpense ? (line.debit - line.credit) : (line.credit - line.debit);
    
    if (line.accounts.type === 'revenue') {
      revenue += amount;
    } else if (line.accounts.type === 'expense') {
      if (line.accounts.category && line.accounts.category.includes('Direct')) {
        directCosts += amount;
      } else {
        expenses += amount;
      }
    }
  });

  return { revenue, directCosts, grossProfit: revenue - directCosts, expenses, netIncome: revenue - directCosts - expenses };
}

export async function getBalanceSheet(asOfDate: string) {
  const { data: lines, error } = await supabase
    .from("journal_lines")
    .select(`
      debit, credit,
      accounts!inner(type),
      journal_entries!inner(date, status)
    `)
    .eq("journal_entries.status", "posted")
    .lte("journal_entries.date", asOfDate);

  if (error) throw error;

  let totalAssets = 0, totalLiabilities = 0, totalEquity = 0;
  lines?.forEach((line: any) => {
    if (line.accounts.type === 'asset') {
      totalAssets += (line.debit - line.credit);
    } else if (line.accounts.type === 'liability') {
      totalLiabilities += (line.credit - line.debit);
    } else if (line.accounts.type === 'equity' || line.accounts.type === 'revenue' || line.accounts.type === 'expense') {
      const amount = (line.accounts.type === 'expense') ? (line.credit - line.debit) : (line.credit - line.debit);
      totalEquity += amount;
    }
  });

  return { totalAssets, totalLiabilities, totalEquity };
}

export async function getFinancialStatementComparison(
  periods: { startDate: string; endDate: string; label: string }[]
) {
  const comparison: any = {
    periods,
    profitAndLoss: {},
    balanceSheet: {},
  };

  for (const period of periods) {
    const pl = await getProfitAndLoss(period.startDate, period.endDate);
    const bs = await getBalanceSheet(period.endDate);

    comparison.profitAndLoss[period.label] = {
      revenue: pl.revenue,
      cogs: pl.directCosts,
      grossProfit: pl.grossProfit,
      expenses: pl.expenses,
      netIncome: pl.netIncome,
    };

    comparison.balanceSheet[period.label] = {
      totalAssets: bs.totalAssets,
      totalLiabilities: bs.totalLiabilities,
      totalEquity: bs.totalEquity,
    };
  }

  return comparison;
}

/**
 * Helper: Get account ID by code
 */
async function getAccountIdByCode(code: string): Promise<string> {
  const { data, error } = await supabase
    .from("accounts")
    .select("id")
    .eq("code", code)
    .single();

  if (error || !data) throw new Error(`Account with code ${code} not found`);
  return data.id;
}

// ==================== SHAREHOLDERS ====================

export async function getShareholders(): Promise<Shareholder[]> {
  const { data, error } = await supabase
    .from("shareholders")
    .select("*")
    .order("name");

  if (error) {
    console.error("Error fetching shareholders:", error);
    throw error;
  }

  return data.map((s: any) => ({
    id: s.id,
    name: s.name,
    email: s.email,
    phone: s.phone,
    address: s.address,
    tinNumber: s.tin_number,
    shareholderType: s.shareholder_type,
    totalShares: s.total_shares,
    parValue: s.par_value,
    totalInvestment: s.total_investment,
    percentageOwnership: s.percentage_ownership,
    certificateNumbers: s.certificate_numbers,
    status: s.status,
    dateJoined: s.date_joined,
    notes: s.notes,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
  }));
}

export async function createShareholder(shareholder: Omit<Shareholder, "id" | "createdAt" | "updatedAt">) {
  const { data, error } = await supabase
    .from("shareholders")
    .insert({
      name: shareholder.name,
      email: shareholder.email,
      phone: shareholder.phone,
      address: shareholder.address,
      tin_number: shareholder.tinNumber,
      shareholder_type: shareholder.shareholderType,
      total_shares: shareholder.totalShares,
      par_value: shareholder.parValue,
      total_investment: shareholder.totalInvestment,
      percentage_ownership: shareholder.percentageOwnership,
      certificate_numbers: shareholder.certificateNumbers,
      status: shareholder.status,
      date_joined: shareholder.dateJoined,
      notes: shareholder.notes,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateShareholder(id: string, updates: Partial<Shareholder>) {
  const updateData: any = {};
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.email !== undefined) updateData.email = updates.email;
  if (updates.phone !== undefined) updateData.phone = updates.phone;
  if (updates.address !== undefined) updateData.address = updates.address;
  if (updates.tinNumber !== undefined) updateData.tin_number = updates.tinNumber;
  if (updates.shareholderType !== undefined) updateData.shareholder_type = updates.shareholderType;
  if (updates.totalShares !== undefined) updateData.total_shares = updates.totalShares;
  if (updates.parValue !== undefined) updateData.par_value = updates.parValue;
  if (updates.totalInvestment !== undefined) updateData.total_investment = updates.totalInvestment;
  if (updates.percentageOwnership !== undefined) updateData.percentage_ownership = updates.percentageOwnership;
  if (updates.certificateNumbers !== undefined) updateData.certificate_numbers = updates.certificateNumbers;
  if (updates.status !== undefined) updateData.status = updates.status;
  if (updates.dateJoined !== undefined) updateData.date_joined = updates.dateJoined;
  if (updates.notes !== undefined) updateData.notes = updates.notes;

  const { data, error } = await supabase
    .from("shareholders")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteShareholder(id: string) {
  const { error } = await supabase.from("shareholders").delete().eq("id", id);
  if (error) throw error;
}

// ==================== DIVIDENDS ====================

export async function getDividends(): Promise<Dividend[]> {
  const { data, error } = await supabase
    .from("dividends")
    .select(`
      *,
      dividend_payments (*)
    `)
    .order("dividend_date", { ascending: false });

  if (error) {
    console.error("Error fetching dividends:", error);
    throw error;
  }

  return data.map((d: any) => ({
    id: d.id,
    dividendDate: d.dividend_date,
    declarationDate: d.declaration_date,
    recordDate: d.record_date,
    paymentDate: d.payment_date,
    dividendType: d.dividend_type,
    totalAmount: d.total_amount,
    perShareAmount: d.per_share_amount,
    fiscalYear: d.fiscal_year,
    fiscalQuarter: d.fiscal_quarter,
    status: d.status,
    approvedBy: d.approved_by,
    paidBy: d.paid_by,
    notes: d.notes,
    payments: d.dividend_payments?.map((p: any) => ({
      id: p.id,
      dividendId: p.dividend_id,
      shareholderId: p.shareholder_id,
      shareholderName: p.shareholder_name,
      shares: p.shares,
      amount: p.amount,
      withholdingTax: p.withholding_tax,
      netAmount: p.net_amount,
      paymentDate: p.payment_date,
      paymentMethod: p.payment_method,
      referenceNumber: p.reference_number,
      status: p.status,
      notes: p.notes,
    })),
    createdAt: d.created_at,
    updatedAt: d.updated_at,
  }));
}

export async function createDividend(dividend: Omit<Dividend, "id" | "createdAt" | "updatedAt">) {
  const { data, error } = await supabase
    .from("dividends")
    .insert({
      dividend_date: dividend.dividendDate,
      declaration_date: dividend.declarationDate,
      record_date: dividend.recordDate,
      payment_date: dividend.paymentDate,
      dividend_type: dividend.dividendType,
      total_amount: dividend.totalAmount,
      per_share_amount: dividend.perShareAmount,
      fiscal_year: dividend.fiscalYear,
      fiscal_quarter: dividend.fiscalQuarter,
      status: dividend.status,
      approved_by: dividend.approvedBy,
      paid_by: dividend.paidBy,
      notes: dividend.notes,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateDividend(id: string, updates: Partial<Dividend>) {
  const updateData: any = {};
  if (updates.dividendDate !== undefined) updateData.dividend_date = updates.dividendDate;
  if (updates.declarationDate !== undefined) updateData.declaration_date = updates.declarationDate;
  if (updates.recordDate !== undefined) updateData.record_date = updates.recordDate;
  if (updates.paymentDate !== undefined) updateData.payment_date = updates.paymentDate;
  if (updates.dividendType !== undefined) updateData.dividend_type = updates.dividendType;
  if (updates.totalAmount !== undefined) updateData.total_amount = updates.totalAmount;
  if (updates.perShareAmount !== undefined) updateData.per_share_amount = updates.perShareAmount;
  if (updates.fiscalYear !== undefined) updateData.fiscal_year = updates.fiscalYear;
  if (updates.fiscalQuarter !== undefined) updateData.fiscal_quarter = updates.fiscalQuarter;
  if (updates.status !== undefined) updateData.status = updates.status;
  if (updates.approvedBy !== undefined) updateData.approved_by = updates.approvedBy;
  if (updates.paidBy !== undefined) updateData.paid_by = updates.paidBy;
  if (updates.notes !== undefined) updateData.notes = updates.notes;

  const { data, error } = await supabase
    .from("dividends")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteDividend(id: string) {
  const { error } = await supabase.from("dividends").delete().eq("id", id);
  if (error) throw error;
}

export async function generateDividendPayments(dividendId: string, shareholders: Shareholder[]) {
  const dividend = await supabase
    .from("dividends")
    .select("*")
    .eq("id", dividendId)
    .single();

  if (!dividend.data) throw new Error("Dividend not found");

  const payments = shareholders
    .filter((s) => s.status === "active")
    .map((shareholder) => {
      const amount = shareholder.totalShares * dividend.data.per_share_amount;
      const withholdingTax = amount * 0.10; // 10% final withholding tax on dividends
      const netAmount = amount - withholdingTax;

      return {
        dividend_id: dividendId,
        shareholder_id: shareholder.id,
        shareholder_name: shareholder.name,
        shares: shareholder.totalShares,
        amount,
        withholding_tax: withholdingTax,
        net_amount: netAmount,
        status: "pending",
      };
    });

  const { data, error } = await supabase
    .from("dividend_payments")
    .insert(payments)
    .select();

  if (error) throw error;
  return data;
}

export async function updateDividendPayment(id: string, updates: Partial<DividendPayment>) {
  const updateData: any = {};
  if (updates.paymentDate !== undefined) updateData.payment_date = updates.paymentDate;
  if (updates.paymentMethod !== undefined) updateData.payment_method = updates.paymentMethod;
  if (updates.referenceNumber !== undefined) updateData.reference_number = updates.referenceNumber;
  if (updates.status !== undefined) updateData.status = updates.status;
  if (updates.notes !== undefined) updateData.notes = updates.notes;

  const { data, error } = await supabase
    .from("dividend_payments")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ==================== EQUITY ACCOUNTS ====================

export async function getEquityAccounts(): Promise<EquityAccount[]> {
  const { data, error } = await supabase
    .from("equity_accounts")
    .select("*")
    .order("account_type");

  if (error) {
    console.error("Error fetching equity accounts:", error);
    throw error;
  }

  return data.map((e: any) => ({
    id: e.id,
    accountType: e.account_type,
    name: e.name,
    balance: e.balance,
    description: e.description,
    createdAt: e.created_at,
    updatedAt: e.updated_at,
  }));
}

export async function createEquityAccount(account: Omit<EquityAccount, "id" | "createdAt" | "updatedAt">) {
  const { data, error } = await supabase
    .from("equity_accounts")
    .insert({
      account_type: account.accountType,
      name: account.name,
      balance: account.balance,
      description: account.description,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateEquityAccount(id: string, updates: Partial<EquityAccount>) {
  const updateData: any = {};
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.balance !== undefined) updateData.balance = updates.balance;
  if (updates.description !== undefined) updateData.description = updates.description;

  const { data, error } = await supabase
    .from("equity_accounts")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}