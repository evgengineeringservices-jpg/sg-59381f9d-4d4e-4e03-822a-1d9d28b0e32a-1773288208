-- Shareholders table
CREATE TABLE IF NOT EXISTS shareholders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  tin_number TEXT,
  shareholder_type TEXT CHECK (shareholder_type IN ('individual', 'corporate')),
  total_shares INTEGER DEFAULT 0,
  par_value DECIMAL(12,2) DEFAULT 0,
  total_investment DECIMAL(12,2) DEFAULT 0,
  percentage_ownership DECIMAL(5,2) DEFAULT 0,
  certificate_numbers TEXT[],
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  date_joined DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE shareholders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Shareholders public policy" ON shareholders FOR ALL USING (true);

-- Dividends table
CREATE TABLE IF NOT EXISTS dividends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dividend_date DATE,
  declaration_date DATE,
  record_date DATE,
  payment_date DATE,
  dividend_type TEXT CHECK (dividend_type IN ('cash', 'stock', 'property')),
  total_amount DECIMAL(12,2) DEFAULT 0,
  per_share_amount DECIMAL(12,2) DEFAULT 0,
  fiscal_year INTEGER,
  fiscal_quarter INTEGER,
  status TEXT CHECK (status IN ('declared', 'approved', 'paid', 'cancelled')),
  approved_by UUID REFERENCES profiles(id),
  paid_by UUID REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE dividends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Dividends public policy" ON dividends FOR ALL USING (true);

-- Dividend Payments table
CREATE TABLE IF NOT EXISTS dividend_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dividend_id UUID REFERENCES dividends(id) ON DELETE CASCADE,
  shareholder_id UUID REFERENCES shareholders(id) ON DELETE CASCADE,
  shareholder_name TEXT,
  shares INTEGER DEFAULT 0,
  amount DECIMAL(12,2) DEFAULT 0,
  withholding_tax DECIMAL(12,2) DEFAULT 0,
  net_amount DECIMAL(12,2) DEFAULT 0,
  payment_date DATE,
  payment_method TEXT CHECK (payment_method IN ('check', 'bank_transfer', 'cash')),
  reference_number TEXT,
  status TEXT CHECK (status IN ('pending', 'paid', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE dividend_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Dividend payments public policy" ON dividend_payments FOR ALL USING (true);

-- Equity Accounts table
CREATE TABLE IF NOT EXISTS equity_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_type TEXT CHECK (account_type IN ('capital_stock', 'additional_paid_in_capital', 'retained_earnings', 'treasury_stock', 'other_equity')),
  name TEXT NOT NULL,
  balance DECIMAL(12,2) DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE equity_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Equity accounts public policy" ON equity_accounts FOR ALL USING (true);