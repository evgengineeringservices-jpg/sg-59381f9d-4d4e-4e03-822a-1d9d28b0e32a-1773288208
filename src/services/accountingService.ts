import { supabase } from "@/integrations/supabase/client";
import type { Account, JournalEntry, JournalLine, RecurringJournalEntry, RecurringJournalLine, BankReconciliation, BankTransaction } from "@/types";

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
  updates: Partial<RecurringJournalEntry>
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
  updates: Partial<BankReconciliation>
) {
  const updateData: any = {
    statement_balance: updates.statementBalance,
    book_balance: updates.bookBalance,
    reconciled_balance: updates.reconciledBalance,
    status: updates.status,
    notes: updates.notes,
  };

  if (updates.status === "completed" && !updates.completedAt) {
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