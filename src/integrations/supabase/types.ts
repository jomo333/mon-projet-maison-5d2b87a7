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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
