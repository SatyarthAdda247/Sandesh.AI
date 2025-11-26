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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      audits: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          object_id: string | null
          object_type: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          object_id?: string | null
          object_type: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          object_id?: string | null
          object_type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      live_events: {
        Row: {
          created_at: string | null
          end_date: string | null
          id: string
          importance: number | null
          metadata: Json | null
          source_url: string | null
          start_date: string
          title: string
          vertical_id: string
        }
        Insert: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          importance?: number | null
          metadata?: Json | null
          source_url?: string | null
          start_date: string
          title: string
          vertical_id: string
        }
        Update: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          importance?: number | null
          metadata?: Json | null
          source_url?: string | null
          start_date?: string
          title?: string
          vertical_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_events_vertical_id_fkey"
            columns: ["vertical_id"]
            isOneToOne: false
            referencedRelation: "verticals"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          created_at: string | null
          id: string
          link: string
          metadata: Json | null
          price: number | null
          title: string
          type: string | null
          vertical_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          link: string
          metadata?: Json | null
          price?: number | null
          title: string
          type?: string | null
          vertical_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          link?: string
          metadata?: Json | null
          price?: number | null
          title?: string
          type?: string | null
          vertical_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_vertical_id_fkey"
            columns: ["vertical_id"]
            isOneToOne: false
            referencedRelation: "verticals"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      revenue_records: {
        Row: {
          course_type: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          offer_discount: string | null
          orders: number
          product_name: string
          record_date: string
          revenue: number
          source: string | null
          upload_batch: string | null
          vertical_id: string
        }
        Insert: {
          course_type?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          offer_discount?: string | null
          orders?: number
          product_name: string
          record_date: string
          revenue?: number
          source?: string | null
          upload_batch?: string | null
          vertical_id: string
        }
        Update: {
          course_type?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          offer_discount?: string | null
          orders?: number
          product_name?: string
          record_date?: string
          revenue?: number
          source?: string | null
          upload_batch?: string | null
          vertical_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "revenue_records_vertical_id_fkey"
            columns: ["vertical_id"]
            isOneToOne: false
            referencedRelation: "verticals"
            referencedColumns: ["id"]
          },
        ]
      }
      suggestions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          channel: string
          created_at: string | null
          created_by: string | null
          cta: string
          hook: string
          insta_rationale: string | null
          id: string
          lint_report: Json | null
          link: string | null
          offer_id: string | null
          proof_notes: string | null
          proof_owner: string | null
          proof_state: string | null
          publish_payload: Json | null
          published_at: string | null
          push_copy: string
          score: number
          status: string | null
          suggestion_date: string
          trend_context: Json | null
          updated_at: string | null
          urgency: string
          vertical_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          channel: string
          created_at?: string | null
          created_by?: string | null
          cta: string
          hook: string
          insta_rationale?: string | null
          id?: string
          lint_report?: Json | null
          link?: string | null
          offer_id?: string | null
          proof_notes?: string | null
          proof_owner?: string | null
          proof_state?: string | null
          publish_payload?: Json | null
          published_at?: string | null
          push_copy: string
          score: number
          status?: string | null
          suggestion_date: string
          trend_context?: Json | null
          updated_at?: string | null
          urgency: string
          vertical_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          channel?: string
          created_at?: string | null
          created_by?: string | null
          cta?: string
          hook?: string
          insta_rationale?: string | null
          id?: string
          lint_report?: Json | null
          link?: string | null
          offer_id?: string | null
          proof_notes?: string | null
          proof_owner?: string | null
          proof_state?: string | null
          publish_payload?: Json | null
          published_at?: string | null
          push_copy?: string
          score?: number
          status?: string | null
          suggestion_date?: string
          trend_context?: Json | null
          updated_at?: string | null
          urgency?: string
          vertical_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suggestions_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suggestions_vertical_id_fkey"
            columns: ["vertical_id"]
            isOneToOne: false
            referencedRelation: "verticals"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      verticals: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "marketer" | "viewer"
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
      app_role: ["admin", "marketer", "viewer"],
    },
  },
} as const
