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