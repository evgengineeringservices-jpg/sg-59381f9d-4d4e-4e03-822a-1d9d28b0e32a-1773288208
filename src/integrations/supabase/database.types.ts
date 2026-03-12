 
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
      boq_items: {
        Row: {
          category: string
          created_at: string
          description: string
          dpwh_item_code: string
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
          category: string
          created_at?: string
          description: string
          dpwh_item_code?: string
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
          category?: string
          created_at?: string
          description?: string
          dpwh_item_code?: string
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
            foreignKeyName: "boq_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
