-- Enhance profiles table with role and additional fields
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'client',
ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Add role check constraint
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_role_check'
  ) THEN
    ALTER TABLE profiles
    ADD CONSTRAINT profiles_role_check 
    CHECK (role IN (
      'super_admin',
      'owner',
      'contractor_admin',
      'office_admin',
      'secretary',
      'project_engineer',
      'project_coordinator',
      'draftsman',
      'lead',
      'client'
    ));
  END IF;
END $$;

-- Create leads table
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  company text,
  project_type text,
  budget_range text,
  location text,
  source text,
  message text,
  notes text,
  status text NOT NULL DEFAULT 'new',
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT leads_status_check CHECK (status IN ('new', 'contacted', 'qualified', 'proposal_sent', 'won', 'lost'))
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  phase_id uuid REFERENCES planning_phases(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_role text,
  due_date date,
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'todo',
  source text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT tasks_priority_check CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  CONSTRAINT tasks_status_check CHECK (status IN ('todo', 'in_progress', 'blocked', 'done'))
);

-- Create drawings table
CREATE TABLE IF NOT EXISTS drawings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_type text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  version integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'uploaded',
  ai_status text,
  extracted_data jsonb,
  notes text,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT drawings_status_check CHECK (status IN ('uploaded', 'analyzing', 'needs_review', 'approved', 'superseded'))
);

-- Create market_prices table
CREATE TABLE IF NOT EXISTS market_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name text NOT NULL,
  category text NOT NULL,
  unit text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  supplier text,
  location text,
  source text,
  date_recorded date NOT NULL,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create weekly_logistics table
CREATE TABLE IF NOT EXISTS weekly_logistics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  week_number integer NOT NULL,
  week_start_date date NOT NULL,
  week_end_date date NOT NULL,
  materials jsonb NOT NULL DEFAULT '[]'::jsonb,
  estimated_cash numeric NOT NULL DEFAULT 0,
  tasks jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT weekly_logistics_status_check CHECK (status IN ('draft', 'approved', 'completed'))
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  old_value jsonb,
  new_value jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE drawings ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_logistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for leads
CREATE POLICY "Authenticated users can view all leads" ON leads
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert leads" ON leads
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update leads" ON leads
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete leads" ON leads
  FOR DELETE TO authenticated USING (true);

-- RLS Policies for tasks
CREATE POLICY "Authenticated users can view all tasks" ON tasks
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert tasks" ON tasks
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update tasks" ON tasks
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete tasks" ON tasks
  FOR DELETE TO authenticated USING (true);

-- RLS Policies for drawings
CREATE POLICY "Authenticated users can view all drawings" ON drawings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert drawings" ON drawings
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update drawings" ON drawings
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete drawings" ON drawings
  FOR DELETE TO authenticated USING (true);

-- RLS Policies for market_prices
CREATE POLICY "Authenticated users can view all market_prices" ON market_prices
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert market_prices" ON market_prices
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update market_prices" ON market_prices
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete market_prices" ON market_prices
  FOR DELETE TO authenticated USING (true);

-- RLS Policies for weekly_logistics
CREATE POLICY "Authenticated users can view all weekly_logistics" ON weekly_logistics
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert weekly_logistics" ON weekly_logistics
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update weekly_logistics" ON weekly_logistics
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete weekly_logistics" ON weekly_logistics
  FOR DELETE TO authenticated USING (true);

-- RLS Policies for audit_logs (read-only for most users)
CREATE POLICY "Authenticated users can view audit_logs" ON audit_logs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "System can insert audit_logs" ON audit_logs
  FOR INSERT TO authenticated WITH CHECK (true);

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers to all tables
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN 
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    AND table_name IN ('leads', 'tasks', 'drawings', 'market_prices', 'weekly_logistics')
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS update_%I_updated_at ON %I;
      CREATE TRIGGER update_%I_updated_at
        BEFORE UPDATE ON %I
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    ', t, t, t, t);
  END LOOP;
END $$;

-- Create function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auto-profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create storage bucket for project documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-documents', 'project-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for project-documents
CREATE POLICY "Authenticated users can upload documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'project-documents');

CREATE POLICY "Authenticated users can view documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'project-documents');

CREATE POLICY "Authenticated users can delete documents"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'project-documents');