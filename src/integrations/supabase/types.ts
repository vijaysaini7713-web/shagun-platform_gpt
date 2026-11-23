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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          actor: string | null
          created_at: string
          detail: string | null
          id: string
          wedding_id: string
        }
        Insert: {
          action: string
          actor?: string | null
          created_at?: string
          detail?: string | null
          id?: string
          wedding_id: string
        }
        Update: {
          action?: string
          actor?: string | null
          created_at?: string
          detail?: string | null
          id?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      counters: {
        Row: {
          created_at: string
          id: string
          name: string
          side: string
          wedding_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          side?: string
          wedding_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          side?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "counters_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      gifts: {
        Row: {
          amount: number | null
          counter_id: string | null
          created_at: string
          description: string | null
          guest_id: string
          handed_over_at: string | null
          handed_to: string | null
          id: string
          kind: string
          notes: string | null
          photo_path: string | null
          received_at: string | null
          received_by: string | null
          side: string
          status: string
          wedding_id: string
        }
        Insert: {
          amount?: number | null
          counter_id?: string | null
          created_at?: string
          description?: string | null
          guest_id: string
          handed_over_at?: string | null
          handed_to?: string | null
          id?: string
          kind: string
          notes?: string | null
          photo_path?: string | null
          received_at?: string | null
          received_by?: string | null
          side: string
          status?: string
          wedding_id: string
        }
        Update: {
          amount?: number | null
          counter_id?: string | null
          created_at?: string
          description?: string | null
          guest_id?: string
          handed_over_at?: string | null
          handed_to?: string | null
          id?: string
          kind?: string
          notes?: string | null
          photo_path?: string | null
          received_at?: string | null
          received_by?: string | null
          side?: string
          status?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gifts_counter_id_fkey"
            columns: ["counter_id"]
            isOneToOne: false
            referencedRelation: "counters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gifts_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gifts_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      guests: {
        Row: {
          created_at: string
          id: string
          name: string
          phone: string
          ref_code: string
          relation: string
          side: string
          wedding_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          phone: string
          ref_code: string
          relation: string
          side: string
          wedding_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          phone?: string
          ref_code?: string
          relation?: string
          side?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guests_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_accounts: {
        Row: {
          bank_account_enc: string | null
          bank_account_last4: string | null
          bank_holder: string | null
          bank_name: string | null
          beneficiary_name: string | null
          enabled: boolean
          id: string
          ifsc: string | null
          notes: string | null
          show_bank_to_guests: boolean
          side: string
          updated_at: string
          updated_by: string | null
          upi_vpa: string | null
          wedding_id: string
        }
        Insert: {
          bank_account_enc?: string | null
          bank_account_last4?: string | null
          bank_holder?: string | null
          bank_name?: string | null
          beneficiary_name?: string | null
          enabled?: boolean
          id?: string
          ifsc?: string | null
          notes?: string | null
          show_bank_to_guests?: boolean
          side: string
          updated_at?: string
          updated_by?: string | null
          upi_vpa?: string | null
          wedding_id: string
        }
        Update: {
          bank_account_enc?: string | null
          bank_account_last4?: string | null
          bank_holder?: string | null
          bank_name?: string | null
          beneficiary_name?: string | null
          enabled?: boolean
          id?: string
          ifsc?: string | null
          notes?: string | null
          show_bank_to_guests?: boolean
          side?: string
          updated_at?: string
          updated_by?: string | null
          upi_vpa?: string | null
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_accounts_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          guest_id: string
          id: string
          is_sandbox: boolean
          routed_to: string
          sandbox_ref: string
          side: string
          status: string
          wedding_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          guest_id: string
          id?: string
          is_sandbox?: boolean
          routed_to: string
          sandbox_ref: string
          side: string
          status: string
          wedding_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          guest_id?: string
          id?: string
          is_sandbox?: boolean
          routed_to?: string
          sandbox_ref?: string
          side?: string
          status?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string | null
        }
        Relationships: []
      }
      upi_payments: {
        Row: {
          account_side: string
          amount: number
          created_at: string
          guest_id: string
          id: string
          payee_name: string
          payee_vpa: string
          proof_path: string | null
          side: string
          status: string
          utr: string | null
          verified_at: string | null
          verified_by: string | null
          verify_note: string | null
          wedding_id: string
        }
        Insert: {
          account_side: string
          amount: number
          created_at?: string
          guest_id: string
          id?: string
          payee_name: string
          payee_vpa: string
          proof_path?: string | null
          side: string
          status?: string
          utr?: string | null
          verified_at?: string | null
          verified_by?: string | null
          verify_note?: string | null
          wedding_id: string
        }
        Update: {
          account_side?: string
          amount?: number
          created_at?: string
          guest_id?: string
          id?: string
          payee_name?: string
          payee_vpa?: string
          proof_path?: string | null
          side?: string
          status?: string
          utr?: string | null
          verified_at?: string | null
          verified_by?: string | null
          verify_note?: string | null
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "upi_payments_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_payments_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      wedding_members: {
        Row: {
          created_at: string
          email: string | null
          id: string
          role: Database["public"]["Enums"]["wedding_role"]
          user_id: string
          wedding_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          role: Database["public"]["Enums"]["wedding_role"]
          user_id: string
          wedding_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          role?: Database["public"]["Enums"]["wedding_role"]
          user_id?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wedding_members_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      weddings: {
        Row: {
          allow_digital: boolean
          bride_name: string
          bride_receiver_label: string
          created_at: string
          event_date: string | null
          groom_name: string
          groom_receiver_label: string
          id: string
          is_demo: boolean
          payment_routing: string
          receiving_mode: string
          slug: string
          tenant_id: string
          venue: string | null
          welcome_message: string | null
        }
        Insert: {
          allow_digital?: boolean
          bride_name: string
          bride_receiver_label?: string
          created_at?: string
          event_date?: string | null
          groom_name: string
          groom_receiver_label?: string
          id?: string
          is_demo?: boolean
          payment_routing?: string
          receiving_mode?: string
          slug: string
          tenant_id: string
          venue?: string | null
          welcome_message?: string | null
        }
        Update: {
          allow_digital?: boolean
          bride_name?: string
          bride_receiver_label?: string
          created_at?: string
          event_date?: string | null
          groom_name?: string
          groom_receiver_label?: string
          id?: string
          is_demo?: boolean
          payment_routing?: string
          receiving_mode?: string
          slug?: string
          tenant_id?: string
          venue?: string | null
          welcome_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "weddings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_member_by_email: {
        Args: {
          _email: string
          _role: Database["public"]["Enums"]["wedding_role"]
          _w: string
        }
        Returns: undefined
      }
      can_see_side: { Args: { _side: string; _w: string }; Returns: boolean }
      create_wedding: {
        Args: {
          _bride: string
          _date: string
          _groom: string
          _slug: string
          _venue: string
        }
        Returns: string
      }
      has_wedding_role: {
        Args: {
          _roles: Database["public"]["Enums"]["wedding_role"][]
          _w: string
        }
        Returns: boolean
      }
      is_tenant_owner_of_wedding: { Args: { _w: string }; Returns: boolean }
      is_wedding_member: { Args: { _w: string }; Returns: boolean }
      join_demo_wedding: {
        Args: { _role: Database["public"]["Enums"]["wedding_role"] }
        Returns: string
      }
      verify_upi_payment: {
        Args: { _id: string; _note: string; _status: string }
        Returns: undefined
      }
    }
    Enums: {
      wedding_role:
        | "wedding_owner"
        | "bride_admin"
        | "groom_admin"
        | "finance"
        | "counter_staff"
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
      wedding_role: [
        "wedding_owner",
        "bride_admin",
        "groom_admin",
        "finance",
        "counter_staff",
      ],
    },
  },
} as const