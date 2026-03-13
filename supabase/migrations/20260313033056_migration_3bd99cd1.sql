-- Create recurring journal entries table
CREATE TABLE IF NOT EXISTS recurring_journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  description TEXT NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
  start_date DATE NOT NULL,
  end_date DATE,
  next_occurrence DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- Create recurring journal lines table
CREATE TABLE IF NOT EXISTS recurring_journal_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recurring_entry_id UUID REFERENCES recurring_journal_entries(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id),
  description TEXT,
  debit DECIMAL(15,2) DEFAULT 0 CHECK (debit >= 0),
  credit DECIMAL(15,2) DEFAULT 0 CHECK (credit >= 0),
  CHECK (debit = 0 OR credit = 0)
);

-- Create bank reconciliation table
CREATE TABLE IF NOT EXISTS bank_reconciliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id),
  statement_date DATE NOT NULL,
  statement_balance DECIMAL(15,2) NOT NULL,
  book_balance DECIMAL(15,2) NOT NULL,
  reconciled_balance DECIMAL(15,2),
  status TEXT CHECK (status IN ('in_progress', 'completed', 'reviewed')) DEFAULT 'in_progress',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create bank transactions table
CREATE TABLE IF NOT EXISTS bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reconciliation_id UUID REFERENCES bank_reconciliations(id) ON DELETE CASCADE,
  transaction_date DATE NOT NULL,
  description TEXT NOT NULL,
  reference_no TEXT,
  debit DECIMAL(15,2) DEFAULT 0,
  credit DECIMAL(15,2) DEFAULT 0,
  is_matched BOOLEAN DEFAULT false,
  matched_journal_entry_id UUID REFERENCES journal_entries(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE recurring_journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_journal_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;

-- Policies for recurring journal entries
CREATE POLICY "Users can view recurring journal entries" ON recurring_journal_entries FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can insert recurring journal entries" ON recurring_journal_entries FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update recurring journal entries" ON recurring_journal_entries FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can delete recurring journal entries" ON recurring_journal_entries FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view recurring journal lines" ON recurring_journal_lines FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can insert recurring journal lines" ON recurring_journal_lines FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update recurring journal lines" ON recurring_journal_lines FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can delete recurring journal lines" ON recurring_journal_lines FOR DELETE USING (auth.uid() IS NOT NULL);

-- Policies for bank reconciliation
CREATE POLICY "Users can view bank reconciliations" ON bank_reconciliations FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can insert bank reconciliations" ON bank_reconciliations FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update bank reconciliations" ON bank_reconciliations FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can delete bank reconciliations" ON bank_reconciliations FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view bank transactions" ON bank_transactions FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can insert bank transactions" ON bank_transactions FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update bank transactions" ON bank_transactions FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can delete bank transactions" ON bank_transactions FOR DELETE USING (auth.uid() IS NOT NULL);