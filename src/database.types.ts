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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ad_bookings: {
        Row: {
          artwork_path: string | null
          artwork_review_notes: string | null
          artwork_review_status: Database["public"]["Enums"]["artwork_review_status"]
          artwork_reviewed_at: string | null
          artwork_reviewed_by: string | null
          created_at: string
          height_cells: number
          id: string
          left_col: number
          paid_at: string | null
          panel: Database["public"]["Enums"]["panel_type"]
          payment_currency: string
          price_per_square_pence: number
          production_run_id: string
          reserved_until: string | null
          square_count: number
          status: Database["public"]["Enums"]["booking_status"]
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          top_row: number
          total_pence: number
          updated_at: string
          user_id: string
          width_cells: number
        }
        Insert: {
          artwork_path?: string | null
          artwork_review_notes?: string | null
          artwork_review_status?: Database["public"]["Enums"]["artwork_review_status"]
          artwork_reviewed_at?: string | null
          artwork_reviewed_by?: string | null
          created_at?: string
          height_cells: number
          id?: string
          left_col: number
          paid_at?: string | null
          panel: Database["public"]["Enums"]["panel_type"]
          payment_currency?: string
          price_per_square_pence: number
          production_run_id: string
          reserved_until?: string | null
          square_count: number
          status?: Database["public"]["Enums"]["booking_status"]
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          top_row: number
          total_pence: number
          updated_at?: string
          user_id: string
          width_cells: number
        }
        Update: {
          artwork_path?: string | null
          artwork_review_notes?: string | null
          artwork_review_status?: Database["public"]["Enums"]["artwork_review_status"]
          artwork_reviewed_at?: string | null
          artwork_reviewed_by?: string | null
          created_at?: string
          height_cells?: number
          id?: string
          left_col?: number
          paid_at?: string | null
          panel?: Database["public"]["Enums"]["panel_type"]
          payment_currency?: string
          price_per_square_pence?: number
          production_run_id?: string
          reserved_until?: string | null
          square_count?: number
          status?: Database["public"]["Enums"]["booking_status"]
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          top_row?: number
          total_pence?: number
          updated_at?: string
          user_id?: string
          width_cells?: number
        }
        Relationships: [
          {
            foreignKeyName: "ad_bookings_artwork_reviewed_by_fkey"
            columns: ["artwork_reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_bookings_production_run_id_fkey"
            columns: ["production_run_id"]
            isOneToOne: false
            referencedRelation: "production_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_bookings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_cells: {
        Row: {
          booking_id: string | null
          col_index: number
          created_at: string
          id: string
          panel: Database["public"]["Enums"]["panel_type"]
          production_run_id: string
          reserved_until: string | null
          row_index: number
          status: Database["public"]["Enums"]["cell_status"]
        }
        Insert: {
          booking_id?: string | null
          col_index: number
          created_at?: string
          id?: string
          panel: Database["public"]["Enums"]["panel_type"]
          production_run_id: string
          reserved_until?: string | null
          row_index: number
          status?: Database["public"]["Enums"]["cell_status"]
        }
        Update: {
          booking_id?: string | null
          col_index?: number
          created_at?: string
          id?: string
          panel?: Database["public"]["Enums"]["panel_type"]
          production_run_id?: string
          reserved_until?: string | null
          row_index?: number
          status?: Database["public"]["Enums"]["cell_status"]
        }
        Relationships: [
          {
            foreignKeyName: "ad_cells_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "ad_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_cells_production_run_id_fkey"
            columns: ["production_run_id"]
            isOneToOne: false
            referencedRelation: "production_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      advertiser_profiles: {
        Row: {
          billing_email: string | null
          company_name: string
          created_at: string
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          billing_email?: string | null
          company_name: string
          created_at?: string
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          billing_email?: string | null
          company_name?: string
          created_at?: string
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "advertiser_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bag_sizes: {
        Row: {
          active: boolean
          bags_per_box: number
          code: string
          created_at: string
          edge_margin_mm: number
          front_cols: number
          front_rows: number
          front_width_mm: number
          gutter_mm: number
          height_mm: number
          id: string
          name: string
          side_cols: number
          side_gusset_mm: number
          side_rows: number
          sort_order: number
          square_size_mm: number
          total_square_count: number
        }
        Insert: {
          active?: boolean
          bags_per_box?: number
          code: string
          created_at?: string
          edge_margin_mm?: number
          front_cols: number
          front_rows: number
          front_width_mm: number
          gutter_mm?: number
          height_mm: number
          id?: string
          name: string
          side_cols: number
          side_gusset_mm: number
          side_rows: number
          sort_order?: number
          square_size_mm?: number
          total_square_count: number
        }
        Update: {
          active?: boolean
          bags_per_box?: number
          code?: string
          created_at?: string
          edge_margin_mm?: number
          front_cols?: number
          front_rows?: number
          front_width_mm?: number
          gutter_mm?: number
          height_mm?: number
          id?: string
          name?: string
          side_cols?: number
          side_gusset_mm?: number
          side_rows?: number
          sort_order?: number
          square_size_mm?: number
          total_square_count?: number
        }
        Relationships: []
      }
      production_runs: {
        Row: {
          bag_quantity: number | null
          bag_size_id: string
          created_at: string
          estimated_start_date: string | null
          id: string
          price_per_square_pence: number
          reservation_minutes: number
          run_code: string
          status: Database["public"]["Enums"]["run_status"]
          updated_at: string
        }
        Insert: {
          bag_quantity?: number | null
          bag_size_id: string
          created_at?: string
          estimated_start_date?: string | null
          id?: string
          price_per_square_pence?: number
          reservation_minutes?: number
          run_code: string
          status?: Database["public"]["Enums"]["run_status"]
          updated_at?: string
        }
        Update: {
          bag_quantity?: number | null
          bag_size_id?: string
          created_at?: string
          estimated_start_date?: string | null
          id?: string
          price_per_square_pence?: number
          reservation_minutes?: number
          run_code?: string
          status?: Database["public"]["Enums"]["run_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_runs_bag_size_id_fkey"
            columns: ["bag_size_id"]
            isOneToOne: false
            referencedRelation: "bag_sizes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"] | null
          created_at: string
          display_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"] | null
          created_at?: string
          display_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"] | null
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      takeaway_businesses: {
        Row: {
          address_line_1: string | null
          address_line_2: string | null
          business_name: string
          created_at: string
          id: string
          owner_user_id: string
          phone: string | null
          postcode: string | null
          town_city: string | null
          updated_at: string
          verified_at: string | null
          weekly_bag_estimate: number | null
        }
        Insert: {
          address_line_1?: string | null
          address_line_2?: string | null
          business_name: string
          created_at?: string
          id?: string
          owner_user_id: string
          phone?: string | null
          postcode?: string | null
          town_city?: string | null
          updated_at?: string
          verified_at?: string | null
          weekly_bag_estimate?: number | null
        }
        Update: {
          address_line_1?: string | null
          address_line_2?: string | null
          business_name?: string
          created_at?: string
          id?: string
          owner_user_id?: string
          phone?: string | null
          postcode?: string | null
          town_city?: string | null
          updated_at?: string
          verified_at?: string | null
          weekly_bag_estimate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "takeaway_businesses_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      takeaway_order_items: {
        Row: {
          bags_per_box: number
          boxes: number
          created_at: string
          id: string
          order_id: string
          production_run_id: string
        }
        Insert: {
          bags_per_box?: number
          boxes: number
          created_at?: string
          id?: string
          order_id: string
          production_run_id: string
        }
        Update: {
          bags_per_box?: number
          boxes?: number
          created_at?: string
          id?: string
          order_id?: string
          production_run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "takeaway_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "takeaway_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "takeaway_order_items_production_run_id_fkey"
            columns: ["production_run_id"]
            isOneToOne: false
            referencedRelation: "production_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      takeaway_orders: {
        Row: {
          created_at: string
          delivery_notes: string | null
          id: string
          status: Database["public"]["Enums"]["order_status"]
          submitted_at: string | null
          takeaway_business_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          delivery_notes?: string | null
          id?: string
          status?: Database["public"]["Enums"]["order_status"]
          submitted_at?: string | null
          takeaway_business_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          delivery_notes?: string | null
          id?: string
          status?: Database["public"]["Enums"]["order_status"]
          submitted_at?: string | null
          takeaway_business_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "takeaway_orders_takeaway_business_id_fkey"
            columns: ["takeaway_business_id"]
            isOneToOne: false
            referencedRelation: "takeaway_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "takeaway_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      expire_ad_booking: {
        Args: { p_booking_id: string; p_checkout_session_id: string }
        Returns: undefined
      }
      mark_ad_booking_paid: {
        Args: {
          p_booking_id: string
          p_checkout_session_id: string
          p_payment_intent_id: string
        }
        Returns: undefined
      }
      release_ad_reservation: {
        Args: { p_booking_id: string }
        Returns: undefined
      }
      reserve_ad_space: {
        Args: {
          p_height: number
          p_left_col: number
          p_panel: Database["public"]["Enums"]["panel_type"]
          p_run_id: string
          p_top_row: number
          p_width: number
        }
        Returns: {
          artwork_path: string | null
          artwork_review_notes: string | null
          artwork_review_status: Database["public"]["Enums"]["artwork_review_status"]
          artwork_reviewed_at: string | null
          artwork_reviewed_by: string | null
          created_at: string
          height_cells: number
          id: string
          left_col: number
          paid_at: string | null
          panel: Database["public"]["Enums"]["panel_type"]
          payment_currency: string
          price_per_square_pence: number
          production_run_id: string
          reserved_until: string | null
          square_count: number
          status: Database["public"]["Enums"]["booking_status"]
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          top_row: number
          total_pence: number
          updated_at: string
          user_id: string
          width_cells: number
        }
        SetofOptions: {
          from: "*"
          to: "ad_bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_takeaway_order: {
        Args: {
          p_address_line_1: string
          p_address_line_2: string
          p_business_name: string
          p_delivery_notes: string
          p_items: Json
          p_phone: string
          p_postcode: string
          p_town_city: string
        }
        Returns: {
          created_at: string
          delivery_notes: string | null
          id: string
          status: Database["public"]["Enums"]["order_status"]
          submitted_at: string | null
          takeaway_business_id: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "takeaway_orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      account_type: "takeaway" | "advertiser" | "admin"
      artwork_review_status:
        | "pending"
        | "approved"
        | "changes_requested"
        | "rejected"
      booking_status: "reserved" | "paid" | "expired" | "cancelled" | "refunded"
      cell_status: "available" | "reserved" | "sold"
      order_status:
        | "draft"
        | "submitted"
        | "approved"
        | "dispatching"
        | "dispatched"
        | "completed"
        | "cancelled"
      panel_type: "front" | "right" | "back" | "left"
      run_status:
        | "draft"
        | "selling"
        | "funded"
        | "artwork_review"
        | "sent_to_print"
        | "printing"
        | "shipping"
        | "in_stock"
        | "distributing"
        | "completed"
        | "cancelled"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      account_type: ["takeaway", "advertiser", "admin"],
      artwork_review_status: [
        "pending",
        "approved",
        "changes_requested",
        "rejected",
      ],
      booking_status: ["reserved", "paid", "expired", "cancelled", "refunded"],
      cell_status: ["available", "reserved", "sold"],
      order_status: [
        "draft",
        "submitted",
        "approved",
        "dispatching",
        "dispatched",
        "completed",
        "cancelled",
      ],
      panel_type: ["front", "right", "back", "left"],
      run_status: [
        "draft",
        "selling",
        "funded",
        "artwork_review",
        "sent_to_print",
        "printing",
        "shipping",
        "in_stock",
        "distributing",
        "completed",
        "cancelled",
      ],
    },
  },
} as const
