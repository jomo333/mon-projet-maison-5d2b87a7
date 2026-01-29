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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          target_id: string | null
          target_table: string | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_table?: string | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_table?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      ai_analysis_usage: {
        Row: {
          analysis_type: string
          created_at: string
          id: string
          project_id: string | null
          user_id: string
        }
        Insert: {
          analysis_type: string
          created_at?: string
          id?: string
          project_id?: string | null
          user_id: string
        }
        Update: {
          analysis_type?: string
          created_at?: string
          id?: string
          project_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ai_usage: {
        Row: {
          count: number
          created_at: string
          id: string
          month: string
          updated_at: string
          user_id: string
        }
        Insert: {
          count?: number
          created_at?: string
          id?: string
          month: string
          updated_at?: string
          user_id: string
        }
        Update: {
          count?: number
          created_at?: string
          id?: string
          month?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bug_reports: {
        Row: {
          admin_notes: string | null
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          page_path: string | null
          resolved: boolean
          source: string
          type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          page_path?: string | null
          resolved?: boolean
          source: string
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          page_path?: string | null
          resolved?: boolean
          source?: string
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      completed_tasks: {
        Row: {
          completed_at: string
          created_at: string
          id: string
          project_id: string
          step_id: string
          task_id: string
        }
        Insert: {
          completed_at?: string
          created_at?: string
          id?: string
          project_id: string
          step_id: string
          task_id: string
        }
        Update: {
          completed_at?: string
          created_at?: string
          id?: string
          project_id?: string
          step_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "completed_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          invoice_url: string | null
          payment_method: string | null
          provider_id: string | null
          status: string
          subscription_id: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          invoice_url?: string | null
          payment_method?: string | null
          provider_id?: string | null
          status?: string
          subscription_id?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          invoice_url?: string | null
          payment_method?: string | null
          provider_id?: string | null
          status?: string
          subscription_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          features: Json | null
          id: string
          is_active: boolean
          is_featured: boolean
          limits: Json | null
          name: string
          price_monthly: number
          price_yearly: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          features?: Json | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          limits?: Json | null
          name: string
          price_monthly?: number
          price_yearly?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          features?: Json | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          limits?: Json | null
          name?: string
          price_monthly?: number
          price_yearly?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_budgets: {
        Row: {
          budget: number | null
          category_name: string
          color: string | null
          created_at: string
          description: string | null
          id: string
          items: Json | null
          project_id: string
          spent: number | null
        }
        Insert: {
          budget?: number | null
          category_name: string
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          items?: Json | null
          project_id: string
          spent?: number | null
        }
        Update: {
          budget?: number | null
          category_name?: string
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          items?: Json | null
          project_id?: string
          spent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_budgets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_photos: {
        Row: {
          created_at: string
          description: string | null
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          project_id: string
          step_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          project_id: string
          step_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          project_id?: string
          step_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_photos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_schedules: {
        Row: {
          actual_days: number | null
          created_at: string
          end_date: string | null
          estimated_days: number
          fabrication_lead_days: number | null
          fabrication_start_date: string | null
          id: string
          is_manual_date: boolean
          measurement_after_step_id: string | null
          measurement_notes: string | null
          measurement_required: boolean | null
          notes: string | null
          project_id: string
          start_date: string | null
          status: string | null
          step_id: string
          step_name: string
          supplier_name: string | null
          supplier_phone: string | null
          supplier_schedule_lead_days: number | null
          trade_color: string
          trade_type: string
          updated_at: string
        }
        Insert: {
          actual_days?: number | null
          created_at?: string
          end_date?: string | null
          estimated_days?: number
          fabrication_lead_days?: number | null
          fabrication_start_date?: string | null
          id?: string
          is_manual_date?: boolean
          measurement_after_step_id?: string | null
          measurement_notes?: string | null
          measurement_required?: boolean | null
          notes?: string | null
          project_id: string
          start_date?: string | null
          status?: string | null
          step_id: string
          step_name: string
          supplier_name?: string | null
          supplier_phone?: string | null
          supplier_schedule_lead_days?: number | null
          trade_color?: string
          trade_type: string
          updated_at?: string
        }
        Update: {
          actual_days?: number | null
          created_at?: string
          end_date?: string | null
          estimated_days?: number
          fabrication_lead_days?: number | null
          fabrication_start_date?: string | null
          id?: string
          is_manual_date?: boolean
          measurement_after_step_id?: string | null
          measurement_notes?: string | null
          measurement_required?: boolean | null
          notes?: string | null
          project_id?: string
          start_date?: string | null
          status?: string | null
          step_id?: string
          step_name?: string
          supplier_name?: string | null
          supplier_phone?: string | null
          supplier_schedule_lead_days?: number | null
          trade_color?: string
          trade_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_schedules_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          description: string | null
          has_garage: boolean | null
          id: string
          name: string
          number_of_floors: number | null
          project_type: string | null
          square_footage: number | null
          starting_step_id: string | null
          status: string | null
          target_start_date: string | null
          total_budget: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          has_garage?: boolean | null
          id?: string
          name: string
          number_of_floors?: number | null
          project_type?: string | null
          square_footage?: number | null
          starting_step_id?: string | null
          status?: string | null
          target_start_date?: string | null
          total_budget?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          has_garage?: boolean | null
          id?: string
          name?: string
          number_of_floors?: number | null
          project_type?: string | null
          square_footage?: number | null
          starting_step_id?: string | null
          status?: string | null
          target_start_date?: string | null
          total_budget?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      schedule_alerts: {
        Row: {
          alert_date: string
          alert_type: string
          created_at: string
          id: string
          is_dismissed: boolean | null
          message: string
          project_id: string
          schedule_id: string
        }
        Insert: {
          alert_date: string
          alert_type: string
          created_at?: string
          id?: string
          is_dismissed?: boolean | null
          message: string
          project_id: string
          schedule_id: string
        }
        Update: {
          alert_date?: string
          alert_type?: string
          created_at?: string
          id?: string
          is_dismissed?: boolean | null
          message?: string
          project_id?: string
          schedule_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_alerts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_alerts_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "project_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_reference_durations: {
        Row: {
          base_duration_days: number
          base_square_footage: number
          created_at: string
          id: string
          max_duration_days: number | null
          min_duration_days: number | null
          notes: string | null
          scaling_factor: number | null
          step_id: string
          step_name: string
          updated_at: string
        }
        Insert: {
          base_duration_days: number
          base_square_footage?: number
          created_at?: string
          id?: string
          max_duration_days?: number | null
          min_duration_days?: number | null
          notes?: string | null
          scaling_factor?: number | null
          step_id: string
          step_name: string
          updated_at?: string
        }
        Update: {
          base_duration_days?: number
          base_square_footage?: number
          created_at?: string
          id?: string
          max_duration_days?: number | null
          min_duration_days?: number | null
          notes?: string | null
          scaling_factor?: number | null
          step_id?: string
          step_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          billing_cycle: string
          cancel_at: string | null
          cancelled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_id: string | null
          start_date: string
          status: string
          trial_end_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_cycle?: string
          cancel_at?: string | null
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id?: string | null
          start_date?: string
          status?: string
          trial_end_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_cycle?: string
          cancel_at?: string | null
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id?: string | null
          start_date?: string
          status?: string
          trial_end_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      task_attachments: {
        Row: {
          category: string
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string
          file_url: string
          id: string
          project_id: string | null
          step_id: string
          task_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type: string
          file_url: string
          id?: string
          project_id?: string | null
          step_id: string
          task_id: string
        }
        Update: {
          category?: string
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
          project_id?: string | null
          step_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_attachments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      task_dates: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          notes: string | null
          project_id: string
          start_date: string | null
          step_id: string
          task_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          notes?: string | null
          project_id: string
          start_date?: string | null
          step_id: string
          task_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          notes?: string | null
          project_id?: string
          start_date?: string | null
          step_id?: string
          task_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_analytics_aggregated: {
        Row: {
          first_project_at: string | null
          first_session_at: string | null
          id: string
          last_updated_at: string
          time_to_first_project_seconds: number | null
          total_sessions: number | null
          total_time_seconds: number | null
          user_id: string
        }
        Insert: {
          first_project_at?: string | null
          first_session_at?: string | null
          id?: string
          last_updated_at?: string
          time_to_first_project_seconds?: number | null
          total_sessions?: number | null
          total_time_seconds?: number | null
          user_id: string
        }
        Update: {
          first_project_at?: string | null
          first_session_at?: string | null
          id?: string
          last_updated_at?: string
          time_to_first_project_seconds?: number | null
          total_sessions?: number | null
          total_time_seconds?: number | null
          user_id?: string
        }
        Relationships: []
      }
      user_analytics_events: {
        Row: {
          created_at: string
          event_name: string
          event_type: string
          id: string
          metadata: Json | null
          page_path: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_name: string
          event_type: string
          id?: string
          metadata?: Json | null
          page_path?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_name?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          page_path?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_consents: {
        Row: {
          cookie_accepted_at: string | null
          cookie_analytics: boolean | null
          cookie_functional: boolean | null
          cookie_marketing: boolean | null
          created_at: string
          id: string
          ip_address: string | null
          privacy_accepted_at: string
          privacy_version: string
          terms_accepted_at: string
          terms_version: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          cookie_accepted_at?: string | null
          cookie_analytics?: boolean | null
          cookie_functional?: boolean | null
          cookie_marketing?: boolean | null
          created_at?: string
          id?: string
          ip_address?: string | null
          privacy_accepted_at?: string
          privacy_version: string
          terms_accepted_at?: string
          terms_version: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          cookie_accepted_at?: string | null
          cookie_analytics?: boolean | null
          cookie_functional?: boolean | null
          cookie_marketing?: boolean | null
          created_at?: string
          id?: string
          ip_address?: string | null
          privacy_accepted_at?: string
          privacy_version?: string
          terms_accepted_at?: string
          terms_version?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string
          duration_seconds: number | null
          id: string
          session_end: string | null
          session_start: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          session_end?: string | null
          session_start?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          session_end?: string | null
          session_start?: string
          user_id?: string
        }
        Relationships: []
      }
      user_storage_usage: {
        Row: {
          bytes_used: number
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bytes_used?: number
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bytes_used?: number
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_ai_usage: { Args: { p_user_id: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_ai_usage: { Args: { p_user_id: string }; Returns: number }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      update_storage_usage: {
        Args: { p_bytes_delta: number; p_user_id: string }
        Returns: number
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
