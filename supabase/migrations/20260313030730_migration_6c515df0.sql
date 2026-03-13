CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
  category TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  reference_no TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'posted')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS journal_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id),
  description TEXT,
  debit NUMERIC(15,2) NOT NULL DEFAULT 0,
  credit NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Auth view accounts" ON accounts;
CREATE POLICY "Auth view accounts" ON accounts FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Auth insert accounts" ON accounts;
CREATE POLICY "Auth insert accounts" ON accounts FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Auth update accounts" ON accounts;
CREATE POLICY "Auth update accounts" ON accounts FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Auth view journal_entries" ON journal_entries;
CREATE POLICY "Auth view journal_entries" ON journal_entries FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Auth insert journal_entries" ON journal_entries;
CREATE POLICY "Auth insert journal_entries" ON journal_entries FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Auth update journal_entries" ON journal_entries;
CREATE POLICY "Auth update journal_entries" ON journal_entries FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Auth view journal_lines" ON journal_lines;
CREATE POLICY "Auth view journal_lines" ON journal_lines FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Auth insert journal_lines" ON journal_lines;
CREATE POLICY "Auth insert journal_lines" ON journal_lines FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Auth update journal_lines" ON journal_lines;
CREATE POLICY "Auth update journal_lines" ON journal_lines FOR UPDATE TO authenticated USING (true);

-- Insert Default Chart of Accounts for Construction
INSERT INTO accounts (code, name, type, category)
SELECT '1000', 'Cash and Cash Equivalents', 'asset', 'Current Asset' WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE code = '1000');

INSERT INTO accounts (code, name, type, category)
SELECT '1100', 'Accounts Receivable', 'asset', 'Current Asset' WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE code = '1100');

INSERT INTO accounts (code, name, type, category)
SELECT '1200', 'Construction in Progress (CIP)', 'asset', 'Current Asset' WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE code = '1200');

INSERT INTO accounts (code, name, type, category)
SELECT '1300', 'Inventory - Materials', 'asset', 'Current Asset' WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE code = '1300');

INSERT INTO accounts (code, name, type, category)
SELECT '1500', 'Heavy Machinery & Equipment', 'asset', 'Fixed Asset' WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE code = '1500');

INSERT INTO accounts (code, name, type, category)
SELECT '2000', 'Accounts Payable', 'liability', 'Current Liability' WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE code = '2000');

INSERT INTO accounts (code, name, type, category)
SELECT '2200', 'Billings in Excess of Costs', 'liability', 'Current Liability' WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE code = '2200');

INSERT INTO accounts (code, name, type, category)
SELECT '2500', 'Long Term Loans', 'liability', 'Long-term Liability' WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE code = '2500');

INSERT INTO accounts (code, name, type, category)
SELECT '3000', 'Owner''s Equity', 'equity', 'Equity' WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE code = '3000');

INSERT INTO accounts (code, name, type, category)
SELECT '4000', 'Construction Revenue', 'revenue', 'Operating Revenue' WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE code = '4000');

INSERT INTO accounts (code, name, type, category)
SELECT '5000', 'Direct Labor', 'expense', 'Direct Costs (COGS)' WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE code = '5000');

INSERT INTO accounts (code, name, type, category)
SELECT '5100', 'Direct Materials', 'expense', 'Direct Costs (COGS)' WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE code = '5100');

INSERT INTO accounts (code, name, type, category)
SELECT '5200', 'Subcontractor Costs', 'expense', 'Direct Costs (COGS)' WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE code = '5200');

INSERT INTO accounts (code, name, type, category)
SELECT '6000', 'Office Salaries', 'expense', 'Overhead Expenses' WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE code = '6000');

INSERT INTO accounts (code, name, type, category)
SELECT '6100', 'Rent & Utilities', 'expense', 'Overhead Expenses' WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE code = '6100');