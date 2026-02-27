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
      categories: {
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
      formulation_items: {
        Row: {
          created_at: string | null
          formulation_id: string
          id: string
          product_id: string
          quantity_per_batch: number
          unit: string
        }
        Insert: {
          created_at?: string | null
          formulation_id: string
          id?: string
          product_id: string
          quantity_per_batch?: number
          unit?: string
        }
        Update: {
          created_at?: string | null
          formulation_id?: string
          id?: string
          product_id?: string
          quantity_per_batch?: number
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "formulation_items_formulation_id_fkey"
            columns: ["formulation_id"]
            isOneToOne: false
            referencedRelation: "formulations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formulation_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      formulations: {
        Row: {
          active: boolean
          created_at: string | null
          final_product: string
          id: string
          machine: string
          name: string
          updated_at: string | null
          weight_per_batch: number
        }
        Insert: {
          active?: boolean
          created_at?: string | null
          final_product: string
          id?: string
          machine: string
          name: string
          updated_at?: string | null
          weight_per_batch?: number
        }
        Update: {
          active?: boolean
          created_at?: string | null
          final_product?: string
          id?: string
          machine?: string
          name?: string
          updated_at?: string | null
          weight_per_batch?: number
        }
        Relationships: []
      }
      inventory_logs: {
        Row: {
          action_type: string
          created_at: string | null
          from_sector: string | null
          id: string
          notes: string | null
          product_id: string | null
          product_name: string | null
          quantity: number
          to_sector: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action_type: string
          created_at?: string | null
          from_sector?: string | null
          id?: string
          notes?: string | null
          product_id?: string | null
          product_name?: string | null
          quantity?: number
          to_sector?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string | null
          from_sector?: string | null
          id?: string
          notes?: string | null
          product_id?: string | null
          product_name?: string | null
          quantity?: number
          to_sector?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_logs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          active: boolean
          code: string
          created_at: string | null
          description: string | null
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      production_batches: {
        Row: {
          batch_code: string | null
          batch_count: number
          batches: number | null
          completed_at: string | null
          created_at: string | null
          final_product: string | null
          formulation_id: string
          id: string
          machine: string | null
          notes: string | null
          produced_by: string | null
          produced_by_name: string | null
          production_order_id: string | null
          status: string
          total_compound_kg: number
        }
        Insert: {
          batch_code?: string | null
          batch_count?: number
          batches?: number | null
          completed_at?: string | null
          created_at?: string | null
          final_product?: string | null
          formulation_id: string
          id?: string
          machine?: string | null
          notes?: string | null
          produced_by?: string | null
          produced_by_name?: string | null
          production_order_id?: string | null
          status?: string
          total_compound_kg?: number
        }
        Update: {
          batch_code?: string | null
          batch_count?: number
          batches?: number | null
          completed_at?: string | null
          created_at?: string | null
          final_product?: string | null
          formulation_id?: string
          id?: string
          machine?: string | null
          notes?: string | null
          produced_by?: string | null
          produced_by_name?: string | null
          production_order_id?: string | null
          status?: string
          total_compound_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "production_batches_formulation_id_fkey"
            columns: ["formulation_id"]
            isOneToOne: false
            referencedRelation: "formulations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_batches_production_order_id_fkey"
            columns: ["production_order_id"]
            isOneToOne: false
            referencedRelation: "production_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      production_order_items: {
        Row: {
          adjusted_quantity_kg: number
          created_at: string | null
          difference_kg: number
          id: string
          ideal_quantity_kg: number
          package_type: string
          package_weight: number
          product_id: string
          production_order_id: string
        }
        Insert: {
          adjusted_quantity_kg?: number
          created_at?: string | null
          difference_kg?: number
          id?: string
          ideal_quantity_kg?: number
          package_type?: string
          package_weight?: number
          product_id: string
          production_order_id: string
        }
        Update: {
          adjusted_quantity_kg?: number
          created_at?: string | null
          difference_kg?: number
          id?: string
          ideal_quantity_kg?: number
          package_type?: string
          package_weight?: number
          product_id?: string
          production_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_order_items_production_order_id_fkey"
            columns: ["production_order_id"]
            isOneToOne: false
            referencedRelation: "production_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      production_orders: {
        Row: {
          batches: number
          confirmed_at: string | null
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          final_product: string
          formulation_id: string
          id: string
          machine: string
          notes: string | null
          status: string
          total_compound_kg: number
          weight_per_batch: number
        }
        Insert: {
          batches?: number
          confirmed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          final_product: string
          formulation_id: string
          id?: string
          machine: string
          notes?: string | null
          status?: string
          total_compound_kg?: number
          weight_per_batch?: number
        }
        Update: {
          batches?: number
          confirmed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          final_product?: string
          formulation_id?: string
          id?: string
          machine?: string
          notes?: string | null
          status?: string
          total_compound_kg?: number
          weight_per_batch?: number
        }
        Relationships: [
          {
            foreignKeyName: "production_orders_formulation_id_fkey"
            columns: ["formulation_id"]
            isOneToOne: false
            referencedRelation: "formulations"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          base_unit: string
          category_id: string | null
          conversion_factor: number
          created_at: string | null
          id: string
          name: string
          package_type: string
          package_weight: number
          unit_weight_kg: number
        }
        Insert: {
          base_unit?: string
          category_id?: string | null
          conversion_factor?: number
          created_at?: string | null
          id?: string
          name: string
          package_type?: string
          package_weight?: number
          unit_weight_kg?: number
        }
        Update: {
          base_unit?: string
          category_id?: string | null
          conversion_factor?: number
          created_at?: string | null
          id?: string
          name?: string
          package_type?: string
          package_weight?: number
          unit_weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          full_name: string
          id: string
          username: string
        }
        Insert: {
          created_at?: string | null
          full_name: string
          id: string
          username: string
        }
        Update: {
          created_at?: string | null
          full_name?: string
          id?: string
          username?: string
        }
        Relationships: []
      }
      separations: {
        Row: {
          completed_at: string | null
          created_at: string | null
          from_sector: string
          id: string
          operator: string | null
          product_id: string
          product_name: string
          quantity: number
          status: string
          to_sector: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          from_sector: string
          id?: string
          operator?: string | null
          product_id: string
          product_name: string
          quantity: number
          status?: string
          to_sector: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          from_sector?: string
          id?: string
          operator?: string | null
          product_id?: string
          product_name?: string
          quantity?: number
          status?: string
          to_sector?: string
        }
        Relationships: [
          {
            foreignKeyName: "separations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      stock: {
        Row: {
          id: string
          location_code: string
          product_id: string
          quantity: number
          total_kg: number
          unit: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          location_code: string
          product_id: string
          quantity?: number
          total_kg?: number
          unit?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          location_code?: string
          product_id?: string
          quantity?: number
          total_kg?: number
          unit?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_location_code_fkey"
            columns: ["location_code"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "stock_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          batch_id: string | null
          created_at: string | null
          id: string
          location_code: string
          movement_type: string
          notes: string | null
          product_id: string
          quantity: number
          reference_id: string | null
          reference_type: string | null
          total_kg: number
          unit: string
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          batch_id?: string | null
          created_at?: string | null
          id?: string
          location_code: string
          movement_type: string
          notes?: string | null
          product_id: string
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
          total_kg?: number
          unit?: string
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          batch_id?: string | null
          created_at?: string | null
          id?: string
          location_code?: string
          movement_type?: string
          notes?: string | null
          product_id?: string
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          total_kg?: number
          unit?: string
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "production_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_location_code_fkey"
            columns: ["location_code"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_snapshots: {
        Row: {
          created_at: string | null
          id: string
          product_id: string
          quantity: number
          sector: string
          total_kg: number
          unit: string
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id: string
          quantity?: number
          sector: string
          total_kg?: number
          unit?: string
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string
          quantity?: number
          sector?: string
          total_kg?: number
          unit?: string
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_snapshots_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      transfer_items: {
        Row: {
          batch_id: string | null
          created_at: string | null
          id: string
          product_id: string
          requested_quantity: number
          requested_unit: string
          sent_quantity: number
          sent_total_kg: number
          sent_unit: string
          status: string
          transfer_id: string
        }
        Insert: {
          batch_id?: string | null
          created_at?: string | null
          id?: string
          product_id: string
          requested_quantity?: number
          requested_unit?: string
          sent_quantity?: number
          sent_total_kg?: number
          sent_unit?: string
          status?: string
          transfer_id: string
        }
        Update: {
          batch_id?: string | null
          created_at?: string | null
          id?: string
          product_id?: string
          requested_quantity?: number
          requested_unit?: string
          sent_quantity?: number
          sent_total_kg?: number
          sent_unit?: string
          status?: string
          transfer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfer_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "production_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_items_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      transfers: {
        Row: {
          confirmed_at: string | null
          confirmed_by: string | null
          confirmed_by_name: string | null
          created_at: string | null
          from_location: string
          id: string
          notes: string | null
          requested_by: string | null
          requested_by_name: string | null
          status: string
          to_location: string
        }
        Insert: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          confirmed_by_name?: string | null
          created_at?: string | null
          from_location: string
          id?: string
          notes?: string | null
          requested_by?: string | null
          requested_by_name?: string | null
          status?: string
          to_location: string
        }
        Update: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          confirmed_by_name?: string | null
          created_at?: string | null
          from_location?: string
          id?: string
          notes?: string | null
          requested_by?: string | null
          requested_by_name?: string | null
          status?: string
          to_location?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfers_from_location_fkey"
            columns: ["from_location"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "transfers_to_location_fkey"
            columns: ["to_location"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["code"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      confirm_production: {
        Args: {
          p_batches: number
          p_final_product: string
          p_formulation_id: string
          p_items?: Json
          p_machine: string
          p_notes?: string
          p_total_compound_kg: number
          p_user_id: string
          p_user_name: string
          p_weight_per_batch: number
        }
        Returns: Json
      }
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
      app_role: "admin" | "gerente" | "operador"
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
      app_role: ["admin", "gerente", "operador"],
    },
  },
} as const
