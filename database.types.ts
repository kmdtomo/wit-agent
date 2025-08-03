export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      compliance_checks: {
        Row: {
          ai_analysis: Json | null
          created_at: string
          id: string
          matches_found: number | null
          recommendations: string[] | null
          risk_level: string
          target_name: string
          target_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_analysis?: Json | null
          created_at?: string
          id?: string
          matches_found?: number | null
          recommendations?: string[] | null
          risk_level: string
          target_name: string
          target_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_analysis?: Json | null
          created_at?: string
          id?: string
          matches_found?: number | null
          recommendations?: string[] | null
          risk_level?: string
          target_name?: string
          target_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_checks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      fraud_types: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          severity_level: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          severity_level?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          severity_level?: number | null
        }
        Relationships: []
      }
      scammer_records: {
        Row: {
          addresses: string[] | null
          alias: Json | null
          amount_scammed: number | null
          bank_accounts: string[] | null
          company_name: string | null
          created_at: string
          description: string
          email_addresses: string[] | null
          evidence_urls: Json | null
          id: string
          is_verified: boolean | null
          name: string
          phone_numbers: string[] | null
          reported_by: string | null
          risk_level: string | null
          scam_type: string
          tags: Json | null
          updated_at: string
          verified_by: string | null
          victim_count: number | null
        }
        Insert: {
          addresses?: string[] | null
          alias?: Json | null
          amount_scammed?: number | null
          bank_accounts?: string[] | null
          company_name?: string | null
          created_at?: string
          description: string
          email_addresses?: string[] | null
          evidence_urls?: Json | null
          id?: string
          is_verified?: boolean | null
          name: string
          phone_numbers?: string[] | null
          reported_by?: string | null
          risk_level?: string | null
          scam_type: string
          tags?: Json | null
          updated_at?: string
          verified_by?: string | null
          victim_count?: number | null
        }
        Update: {
          addresses?: string[] | null
          alias?: Json | null
          amount_scammed?: number | null
          bank_accounts?: string[] | null
          company_name?: string | null
          created_at?: string
          description?: string
          email_addresses?: string[] | null
          evidence_urls?: Json | null
          id?: string
          is_verified?: boolean | null
          name?: string
          phone_numbers?: string[] | null
          reported_by?: string | null
          risk_level?: string | null
          scam_type?: string
          tags?: Json | null
          updated_at?: string
          verified_by?: string | null
          victim_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "scammer_records_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "scammer_records_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      scammer_reports: {
        Row: {
          amount_lost: number | null
          created_at: string
          description: string
          direct_report_alias: Json | null
          direct_report_name: string | null
          evidence_urls: Json | null
          fraud_type: string | null
          id: string
          incident_date: string | null
          is_public: boolean | null
          reporter_id: string
          scammer_id: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          amount_lost?: number | null
          created_at?: string
          description: string
          direct_report_alias?: Json | null
          direct_report_name?: string | null
          evidence_urls?: Json | null
          fraud_type?: string | null
          id?: string
          incident_date?: string | null
          is_public?: boolean | null
          reporter_id: string
          scammer_id?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          amount_lost?: number | null
          created_at?: string
          description?: string
          direct_report_alias?: Json | null
          direct_report_name?: string | null
          evidence_urls?: Json | null
          fraud_type?: string | null
          id?: string
          incident_date?: string | null
          is_public?: boolean | null
          reporter_id?: string
          scammer_id?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scammer_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "scammer_reports_scammer_id_fkey"
            columns: ["scammer_id"]
            isOneToOne: false
            referencedRelation: "scammer_records"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          is_verified: boolean | null
          organization: string | null
          reputation_score: number | null
          role: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          is_verified?: boolean | null
          organization?: string | null
          reputation_score?: number | null
          role?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          is_verified?: boolean | null
          organization?: string | null
          reputation_score?: number | null
          role?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      fraud_statistics: {
        Row: {
          avg_damage_amount: number | null
          pending_reports: number | null
          public_reports: number | null
          rejected_reports: number | null
          total_damage_amount: number | null
          total_reports: number | null
          verified_reports: number | null
        }
        Relationships: []
      }
      fraud_type_statistics: {
        Row: {
          avg_damage: number | null
          fraud_type: string | null
          report_count: number | null
          total_damage: number | null
          verified_count: number | null
        }
        Relationships: []
      }
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
