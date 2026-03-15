 
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          category: string
          code: string
          created_at: string | null
          description: string | null
          id: string
          name: string
          type: string
          updated_at: string | null
        }
        Insert: {
          category: string
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          type: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          new_value: Json | null
          old_value: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
        }
        Relationships: []
      }
      bank_reconciliations: {
        Row: {
          account_id: string | null
          book_balance: number
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          id: string
          notes: string | null
          reconciled_balance: number | null
          statement_balance: number
          statement_date: string
          status: string | null
        }
        Insert: {
          account_id?: string | null
          book_balance: number
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          reconciled_balance?: number | null
          statement_balance: number
          statement_date: string
          status?: string | null
        }
        Update: {
          account_id?: string | null
          book_balance?: number
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          reconciled_balance?: number | null
          statement_balance?: number
          statement_date?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_reconciliations_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_reconciliations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_transactions: {
        Row: {
          created_at: string | null
          credit: number | null
          debit: number | null
          description: string
          id: string
          is_matched: boolean | null
          matched_journal_entry_id: string | null
          notes: string | null
          reconciliation_id: string | null
          reference_no: string | null
          transaction_date: string
        }
        Insert: {
          created_at?: string | null
          credit?: number | null
          debit?: number | null
          description: string
          id?: string
          is_matched?: boolean | null
          matched_journal_entry_id?: string | null
          notes?: string | null
          reconciliation_id?: string | null
          reference_no?: string | null
          transaction_date: string
        }
        Update: {
          created_at?: string | null
          credit?: number | null
          debit?: number | null
          description?: string
          id?: string
          is_matched?: boolean | null
          matched_journal_entry_id?: string | null
          notes?: string | null
          reconciliation_id?: string | null
          reference_no?: string | null
          transaction_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_matched_journal_entry_id_fkey"
            columns: ["matched_journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_reconciliation_id_fkey"
            columns: ["reconciliation_id"]
            isOneToOne: false
            referencedRelation: "bank_reconciliations"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_items: {
        Row: {
          amount: number
          billing_type: string
          created_at: string
          date: string
          description: string
          ewt_amount: number
          id: string
          invoice_no: string
          net_amount: number
          progress_percent: number
          project_id: string
          retention_amount: number
          status: string
          updated_at: string
          vat_amount: number
        }
        Insert: {
          amount?: number
          billing_type?: string
          created_at?: string
          date: string
          description: string
          ewt_amount?: number
          id?: string
          invoice_no: string
          net_amount?: number
          progress_percent?: number
          project_id: string
          retention_amount?: number
          status?: string
          updated_at?: string
          vat_amount?: number
        }
        Update: {
          amount?: number
          billing_type?: string
          created_at?: string
          date?: string
          description?: string
          ewt_amount?: number
          id?: string
          invoice_no?: string
          net_amount?: number
          progress_percent?: number
          project_id?: string
          retention_amount?: number
          status?: string
          updated_at?: string
          vat_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "billing_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_milestones: {
        Row: {
          billed_at: string | null
          contract_amount: number
          created_at: string | null
          description: string | null
          id: string
          name: string
          percentage_of_contract: number
          project_id: string
          status: string
          trigger_condition: string
          triggered_at: string | null
          updated_at: string | null
        }
        Insert: {
          billed_at?: string | null
          contract_amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          percentage_of_contract?: number
          project_id: string
          status?: string
          trigger_condition: string
          triggered_at?: string | null
          updated_at?: string | null
        }
        Update: {
          billed_at?: string | null
          contract_amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          percentage_of_contract?: number
          project_id?: string
          status?: string
          trigger_condition?: string
          triggered_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      boq_items: {
        Row: {
          calculation_method: string | null
          category: string
          created_at: string
          description: string
          dpwh_item_code: string
          dupa_item_id: string | null
          id: string
          item_no: string
          labor_cost: number
          material_cost: number
          project_id: string
          quantity: number
          total_cost: number
          unit: string
          unit_cost: number
          updated_at: string
        }
        Insert: {
          calculation_method?: string | null
          category: string
          created_at?: string
          description: string
          dpwh_item_code?: string
          dupa_item_id?: string | null
          id?: string
          item_no: string
          labor_cost?: number
          material_cost?: number
          project_id: string
          quantity?: number
          total_cost?: number
          unit: string
          unit_cost?: number
          updated_at?: string
        }
        Update: {
          calculation_method?: string | null
          category?: string
          created_at?: string
          description?: string
          dpwh_item_code?: string
          dupa_item_id?: string | null
          id?: string
          item_no?: string
          labor_cost?: number
          material_cost?: number
          project_id?: string
          quantity?: number
          total_cost?: number
          unit?: string
          unit_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "boq_items_dupa_item_id_fkey"
            columns: ["dupa_item_id"]
            isOneToOne: false
            referencedRelation: "dupa_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boq_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      dividend_payments: {
        Row: {
          amount: number | null
          created_at: string | null
          dividend_id: string | null
          id: string
          net_amount: number | null
          notes: string | null
          payment_date: string | null
          payment_method: string | null
          reference_number: string | null
          shareholder_id: string | null
          shareholder_name: string | null
          shares: number | null
          status: string | null
          withholding_tax: number | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          dividend_id?: string | null
          id?: string
          net_amount?: number | null
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          reference_number?: string | null
          shareholder_id?: string | null
          shareholder_name?: string | null
          shares?: number | null
          status?: string | null
          withholding_tax?: number | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          dividend_id?: string | null
          id?: string
          net_amount?: number | null
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          reference_number?: string | null
          shareholder_id?: string | null
          shareholder_name?: string | null
          shares?: number | null
          status?: string | null
          withholding_tax?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dividend_payments_dividend_id_fkey"
            columns: ["dividend_id"]
            isOneToOne: false
            referencedRelation: "dividends"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dividend_payments_shareholder_id_fkey"
            columns: ["shareholder_id"]
            isOneToOne: false
            referencedRelation: "shareholders"
            referencedColumns: ["id"]
          },
        ]
      }
      dividends: {
        Row: {
          approved_by: string | null
          created_at: string | null
          declaration_date: string | null
          dividend_date: string | null
          dividend_type: string | null
          fiscal_quarter: number | null
          fiscal_year: number | null
          id: string
          notes: string | null
          paid_by: string | null
          payment_date: string | null
          per_share_amount: number | null
          record_date: string | null
          status: string | null
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          approved_by?: string | null
          created_at?: string | null
          declaration_date?: string | null
          dividend_date?: string | null
          dividend_type?: string | null
          fiscal_quarter?: number | null
          fiscal_year?: number | null
          id?: string
          notes?: string | null
          paid_by?: string | null
          payment_date?: string | null
          per_share_amount?: number | null
          record_date?: string | null
          status?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          approved_by?: string | null
          created_at?: string | null
          declaration_date?: string | null
          dividend_date?: string | null
          dividend_type?: string | null
          fiscal_quarter?: number | null
          fiscal_year?: number | null
          id?: string
          notes?: string | null
          paid_by?: string | null
          payment_date?: string | null
          per_share_amount?: number | null
          record_date?: string | null
          status?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dividends_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dividends_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          category: string
          created_at: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          name: string
          notes: string
          project_id: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          file_path: string
          file_size?: number
          file_type?: string
          id?: string
          name: string
          notes?: string
          project_id: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          name?: string
          notes?: string
          project_id?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      drawings: {
        Row: {
          ai_status: string | null
          created_at: string
          extracted_data: Json | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          notes: string | null
          project_id: string | null
          status: string
          updated_at: string
          uploaded_by: string | null
          version: number
        }
        Insert: {
          ai_status?: string | null
          created_at?: string
          extracted_data?: Json | null
          file_name: string
          file_path: string
          file_size?: number
          file_type: string
          id?: string
          notes?: string | null
          project_id?: string | null
          status?: string
          updated_at?: string
          uploaded_by?: string | null
          version?: number
        }
        Update: {
          ai_status?: string | null
          created_at?: string
          extracted_data?: Json | null
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          notes?: string | null
          project_id?: string | null
          status?: string
          updated_at?: string
          uploaded_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "drawings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      dupa_equipment: {
        Row: {
          capacity: string | null
          coefficient: number
          created_at: string | null
          dupa_item_id: string | null
          equipment_code: string | null
          equipment_name: string
          equipment_type: string | null
          id: string
          notes: string | null
          updated_at: string | null
        }
        Insert: {
          capacity?: string | null
          coefficient: number
          created_at?: string | null
          dupa_item_id?: string | null
          equipment_code?: string | null
          equipment_name: string
          equipment_type?: string | null
          id?: string
          notes?: string | null
          updated_at?: string | null
        }
        Update: {
          capacity?: string | null
          coefficient?: number
          created_at?: string | null
          dupa_item_id?: string | null
          equipment_code?: string | null
          equipment_name?: string
          equipment_type?: string | null
          id?: string
          notes?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dupa_equipment_dupa_item_id_fkey"
            columns: ["dupa_item_id"]
            isOneToOne: false
            referencedRelation: "dupa_items"
            referencedColumns: ["id"]
          },
        ]
      }
      dupa_items: {
        Row: {
          category: string
          created_at: string | null
          description: string
          id: string
          is_active: boolean | null
          item_code: string
          notes: string | null
          specification: string | null
          unit: string
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description: string
          id?: string
          is_active?: boolean | null
          item_code: string
          notes?: string | null
          specification?: string | null
          unit: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string
          id?: string
          is_active?: boolean | null
          item_code?: string
          notes?: string | null
          specification?: string | null
          unit?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      dupa_labor: {
        Row: {
          coefficient: number
          created_at: string | null
          dupa_item_id: string | null
          id: string
          labor_code: string | null
          labor_type: string
          notes: string | null
          productivity_rate: number | null
          updated_at: string | null
        }
        Insert: {
          coefficient: number
          created_at?: string | null
          dupa_item_id?: string | null
          id?: string
          labor_code?: string | null
          labor_type: string
          notes?: string | null
          productivity_rate?: number | null
          updated_at?: string | null
        }
        Update: {
          coefficient?: number
          created_at?: string | null
          dupa_item_id?: string | null
          id?: string
          labor_code?: string | null
          labor_type?: string
          notes?: string | null
          productivity_rate?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dupa_labor_dupa_item_id_fkey"
            columns: ["dupa_item_id"]
            isOneToOne: false
            referencedRelation: "dupa_items"
            referencedColumns: ["id"]
          },
        ]
      }
      dupa_materials: {
        Row: {
          coefficient: number
          created_at: string | null
          dupa_item_id: string | null
          id: string
          material_code: string | null
          material_name: string
          notes: string | null
          specification: string | null
          unit: string
          updated_at: string | null
          waste_factor: number | null
        }
        Insert: {
          coefficient: number
          created_at?: string | null
          dupa_item_id?: string | null
          id?: string
          material_code?: string | null
          material_name: string
          notes?: string | null
          specification?: string | null
          unit: string
          updated_at?: string | null
          waste_factor?: number | null
        }
        Update: {
          coefficient?: number
          created_at?: string | null
          dupa_item_id?: string | null
          id?: string
          material_code?: string | null
          material_name?: string
          notes?: string | null
          specification?: string | null
          unit?: string
          updated_at?: string | null
          waste_factor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dupa_materials_dupa_item_id_fkey"
            columns: ["dupa_item_id"]
            isOneToOne: false
            referencedRelation: "dupa_items"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_rates: {
        Row: {
          created_at: string | null
          daily_rate: number
          effective_date: string
          equipment_name: string
          equipment_type: string
          fuel_included: boolean | null
          hourly_rate: number
          id: string
          location: string | null
          monthly_rate: number | null
          notes: string | null
          operator_included: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          daily_rate: number
          effective_date: string
          equipment_name: string
          equipment_type: string
          fuel_included?: boolean | null
          hourly_rate: number
          id?: string
          location?: string | null
          monthly_rate?: number | null
          notes?: string | null
          operator_included?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          daily_rate?: number
          effective_date?: string
          equipment_name?: string
          equipment_type?: string
          fuel_included?: boolean | null
          hourly_rate?: number
          id?: string
          location?: string | null
          monthly_rate?: number | null
          notes?: string | null
          operator_included?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      equity_accounts: {
        Row: {
          account_type: string | null
          balance: number | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          account_type?: string | null
          balance?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          account_type?: string | null
          balance?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      journal_entries: {
        Row: {
          created_at: string | null
          date: string
          description: string
          id: string
          project_id: string | null
          reference_no: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          description: string
          id?: string
          project_id?: string | null
          reference_no: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          description?: string
          id?: string
          project_id?: string | null
          reference_no?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_lines: {
        Row: {
          account_id: string
          created_at: string | null
          credit: number
          debit: number
          description: string | null
          entry_id: string
          id: string
        }
        Insert: {
          account_id: string
          created_at?: string | null
          credit?: number
          debit?: number
          description?: string | null
          entry_id: string
          id?: string
        }
        Update: {
          account_id?: string
          created_at?: string | null
          credit?: number
          debit?: number
          description?: string | null
          entry_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      labor_rates: {
        Row: {
          created_at: string | null
          daily_rate: number
          effective_date: string
          hourly_rate: number
          id: string
          labor_type: string
          location: string | null
          notes: string | null
          overtime_rate: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          daily_rate: number
          effective_date: string
          hourly_rate: number
          id?: string
          labor_type: string
          location?: string | null
          notes?: string | null
          overtime_rate?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          daily_rate?: number
          effective_date?: string
          hourly_rate?: number
          id?: string
          labor_type?: string
          location?: string | null
          notes?: string | null
          overtime_rate?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          assigned_to: string | null
          budget_range: string | null
          company: string | null
          created_at: string
          email: string
          id: string
          location: string | null
          message: string | null
          name: string
          notes: string | null
          phone: string | null
          project_type: string | null
          source: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          budget_range?: string | null
          company?: string | null
          created_at?: string
          email: string
          id?: string
          location?: string | null
          message?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          project_type?: string | null
          source?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          budget_range?: string | null
          company?: string | null
          created_at?: string
          email?: string
          id?: string
          location?: string | null
          message?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          project_type?: string | null
          source?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      market_prices: {
        Row: {
          category: string
          created_at: string
          date_recorded: string
          id: string
          item_name: string
          location: string | null
          notes: string | null
          price: number
          source: string | null
          supplier: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          date_recorded: string
          id?: string
          item_name: string
          location?: string | null
          notes?: string | null
          price?: number
          source?: string | null
          supplier?: string | null
          unit: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          date_recorded?: string
          id?: string
          item_name?: string
          location?: string | null
          notes?: string | null
          price?: number
          source?: string | null
          supplier?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          link: string | null
          message: string
          metadata: Json | null
          read_at: string | null
          severity: string
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message: string
          metadata?: Json | null
          read_at?: string | null
          severity?: string
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string
          metadata?: Json | null
          read_at?: string | null
          severity?: string
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      planning_phases: {
        Row: {
          created_at: string
          dependencies: string[]
          end_date: string
          id: string
          phase: string
          progress: number
          project_id: string
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dependencies?: string[]
          end_date: string
          id?: string
          phase: string
          progress?: number
          project_id: string
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dependencies?: string[]
          end_date?: string
          id?: string
          phase?: string
          progress?: number
          project_id?: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "planning_phases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          email: string | null
          id: string
          is_active: boolean
          phone: string | null
          role: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          email?: string | null
          id: string
          is_active?: boolean
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          email?: string | null
          id?: string
          is_active?: boolean
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      progress_reports: {
        Row: {
          author: string
          created_at: string
          date: string
          description: string
          id: string
          images: string[]
          progress: number
          project_id: string
          title: string
          updated_at: string
        }
        Insert: {
          author: string
          created_at?: string
          date: string
          description?: string
          id?: string
          images?: string[]
          progress?: number
          project_id: string
          title: string
          updated_at?: string
        }
        Update: {
          author?: string
          created_at?: string
          date?: string
          description?: string
          id?: string
          images?: string[]
          progress?: number
          project_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "progress_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          budget: number
          client: string
          contract_amount: number
          created_at: string
          created_by: string | null
          description: string
          end_date: string
          id: string
          location: string
          name: string
          pcab_category: string
          permit_no: string
          permit_status: string
          progress: number
          project_type: string
          spent: number
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          budget?: number
          client: string
          contract_amount?: number
          created_at?: string
          created_by?: string | null
          description?: string
          end_date: string
          id?: string
          location?: string
          name: string
          pcab_category?: string
          permit_no?: string
          permit_status?: string
          progress?: number
          project_type?: string
          spent?: number
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          budget?: number
          client?: string
          contract_amount?: number
          created_at?: string
          created_by?: string | null
          description?: string
          end_date?: string
          id?: string
          location?: string
          name?: string
          pcab_category?: string
          permit_no?: string
          permit_status?: string
          progress?: number
          project_type?: string
          spent?: number
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      recurring_journal_entries: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string
          end_date: string | null
          frequency: string
          id: string
          is_active: boolean | null
          next_occurrence: string
          project_id: string | null
          start_date: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description: string
          end_date?: string | null
          frequency: string
          id?: string
          is_active?: boolean | null
          next_occurrence: string
          project_id?: string | null
          start_date: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string
          end_date?: string | null
          frequency?: string
          id?: string
          is_active?: boolean | null
          next_occurrence?: string
          project_id?: string | null
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_journal_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_journal_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_journal_lines: {
        Row: {
          account_id: string | null
          credit: number | null
          debit: number | null
          description: string | null
          id: string
          recurring_entry_id: string | null
        }
        Insert: {
          account_id?: string | null
          credit?: number | null
          debit?: number | null
          description?: string | null
          id?: string
          recurring_entry_id?: string | null
        }
        Update: {
          account_id?: string | null
          credit?: number | null
          debit?: number | null
          description?: string | null
          id?: string
          recurring_entry_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recurring_journal_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_journal_lines_recurring_entry_id_fkey"
            columns: ["recurring_entry_id"]
            isOneToOne: false
            referencedRelation: "recurring_journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      shareholders: {
        Row: {
          address: string | null
          certificate_numbers: string[] | null
          created_at: string | null
          date_joined: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          par_value: number | null
          percentage_ownership: number | null
          phone: string | null
          shareholder_type: string | null
          status: string | null
          tin_number: string | null
          total_investment: number | null
          total_shares: number | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          certificate_numbers?: string[] | null
          created_at?: string | null
          date_joined?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          par_value?: number | null
          percentage_ownership?: number | null
          phone?: string | null
          shareholder_type?: string | null
          status?: string | null
          tin_number?: string | null
          total_investment?: number | null
          total_shares?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          certificate_numbers?: string[] | null
          created_at?: string | null
          date_joined?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          par_value?: number | null
          percentage_ownership?: number | null
          phone?: string | null
          shareholder_type?: string | null
          status?: string | null
          tin_number?: string | null
          total_investment?: number | null
          total_shares?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_role: string | null
          assigned_to: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          phase_id: string | null
          priority: string
          project_id: string | null
          source: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_role?: string | null
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          phase_id?: string | null
          priority?: string
          project_id?: string | null
          source?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_role?: string | null
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          phase_id?: string | null
          priority?: string
          project_id?: string | null
          source?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "planning_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_logistics: {
        Row: {
          created_at: string
          estimated_cash: number
          id: string
          materials: Json
          project_id: string | null
          status: string
          tasks: Json
          updated_at: string
          week_end_date: string
          week_number: number
          week_start_date: string
        }
        Insert: {
          created_at?: string
          estimated_cash?: number
          id?: string
          materials?: Json
          project_id?: string | null
          status?: string
          tasks?: Json
          updated_at?: string
          week_end_date: string
          week_number: number
          week_start_date: string
        }
        Update: {
          created_at?: string
          estimated_cash?: number
          id?: string
          materials?: Json
          project_id?: string | null
          status?: string
          tasks?: Json
          updated_at?: string
          week_end_date?: string
          week_number?: number
          week_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_logistics_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      analyze_task_profitability: {
        Args: { p_project_id: string }
        Returns: {
          cost_effectiveness_score: number
          profit_impact_score: number
          task_id: string
          title: string
          urgency_score: number
        }[]
      }
      calculate_dupa_costs: {
        Args: {
          p_dupa_item_id: string
          p_location?: string
          p_quantity: number
        }
        Returns: {
          breakdown: Json
          equipment_cost: number
          labor_cost: number
          material_cost: number
          total_cost: number
        }[]
      }
      calculate_labor_cost:
        | {
            Args: {
              p_category: string
              p_labor_mode?: string
              p_material_cost: number
              p_quantity: number
              p_unit: string
            }
            Returns: number
          }
        | {
            Args: { p_labor_percentage?: number; p_material_cost: number }
            Returns: number
          }
      calculate_material_cost: {
        Args: {
          p_category: string
          p_description: string
          p_quantity: number
          p_unit: string
        }
        Returns: number
      }
      check_market_price_changes: {
        Args: { p_days_back?: number }
        Returns: {
          category: string
          days_between: number
          item_name: string
          new_price: number
          old_price: number
          price_change_percent: number
        }[]
      }
      create_boq_item_with_auto_cost: {
        Args: {
          p_category: string
          p_description: string
          p_dpwh_item_code: string
          p_item_no: string
          p_manual_labor_cost?: number
          p_manual_material_cost?: number
          p_project_id: string
          p_quantity: number
          p_unit: string
        }
        Returns: string
      }
      create_notification: {
        Args: {
          p_link?: string
          p_message: string
          p_metadata?: Json
          p_severity?: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      generate_boq_from_drawing_analysis: {
        Args: {
          p_drawing_id: string
          p_extracted_data: Json
          p_project_id: string
        }
        Returns: {
          category: string
          confidence_score: number
          description: string
          dpwh_code: string
          estimated_labor_cost: number
          estimated_material_cost: number
          estimated_total: number
          quantity: number
          suggested_item_no: string
          unit: string
        }[]
      }
      generate_project_tasks: { Args: { p_project_id: string }; Returns: Json }
      generate_weekly_materials_forecast: {
        Args: { p_end_date: string; p_project_id: string; p_start_date: string }
        Returns: {
          category: string
          estimated_cost: number
          estimated_qty: number
          material_name: string
          unit: string
        }[]
      }
      get_boq_summary: {
        Args: { p_project_id: string }
        Returns: {
          category: string
          category_total_cost: number
          item_count: number
          total_labor_cost: number
          total_material_cost: number
        }[]
      }
      get_current_market_price: {
        Args: { p_category?: string; p_item_name: string; p_unit?: string }
        Returns: {
          date_recorded: string
          item_name: string
          location: string
          price: number
          supplier: string
        }[]
      }
      refresh_boq_costs_from_market: {
        Args: { p_project_id: string }
        Returns: {
          total_cost_change: number
          updated_count: number
        }[]
      }
      suggest_market_prices_for_boq: {
        Args: { p_category: string; p_description: string; p_unit: string }
        Returns: {
          date_recorded: string
          item_name: string
          location: string
          match_score: number
          price: number
          supplier: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
