import { supabase } from "@/integrations/supabase/client";
import type { Account, JournalEntry, JournalLine } from "@/types";

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