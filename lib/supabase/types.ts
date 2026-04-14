export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      bookings: {
        Row: {
          business_id: string
          created_at: string | null
          customer_id: string
          ends_at: string
          id: string
          notes: string | null
          price_cents: number
          reminder_24h_sent: boolean | null
          reminder_2h_sent: boolean | null
          service_id: string
          source: string | null
          staff_id: string | null
          starts_at: string
          status: string | null
          stripe_payment_intent_id: string | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          customer_id: string
          ends_at: string
          id?: string
          notes?: string | null
          price_cents: number
          reminder_24h_sent?: boolean | null
          reminder_2h_sent?: boolean | null
          service_id: string
          source?: string | null
          staff_id?: string | null
          starts_at: string
          status?: string | null
          stripe_payment_intent_id?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          customer_id?: string
          ends_at?: string
          id?: string
          notes?: string | null
          price_cents?: number
          reminder_24h_sent?: boolean | null
          reminder_2h_sent?: boolean | null
          service_id?: string
          source?: string | null
          staff_id?: string | null
          starts_at?: string
          status?: string | null
          stripe_payment_intent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      business_closures: {
        Row: {
          business_id: string
          date: string
          id: string
          is_bank_holiday: boolean | null
          name: string | null
        }
        Insert: {
          business_id: string
          date: string
          id?: string
          is_bank_holiday?: boolean | null
          name?: string | null
        }
        Update: {
          business_id?: string
          date?: string
          id?: string
          is_bank_holiday?: boolean | null
          name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_closures_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_hours: {
        Row: {
          business_id: string
          close_time: string | null
          day_of_week: number
          id: string
          is_open: boolean | null
          open_time: string | null
        }
        Insert: {
          business_id: string
          close_time?: string | null
          day_of_week: number
          id?: string
          is_open?: boolean | null
          open_time?: string | null
        }
        Update: {
          business_id?: string
          close_time?: string | null
          day_of_week?: number
          id?: string
          is_open?: boolean | null
          open_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_hours_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          address: string | null
          buffer_minutes: number | null
          category: string
          city: string | null
          created_at: string | null
          description: string | null
          hero_image_url: string | null
          id: string
          instagram_handle: string | null
          is_live: boolean | null
          logo_url: string | null
          name: string
          owner_id: string
          primary_colour: string | null
          secondary_colour: string | null
          slug: string
          stripe_account_id: string | null
          website: string | null
          whatsapp_number: string | null
          whatsapp_enabled: boolean | null
          whatsapp_phone_number: string | null
          whatsapp_display_name: string | null
        }
        Insert: {
          address?: string | null
          buffer_minutes?: number | null
          category: string
          city?: string | null
          created_at?: string | null
          description?: string | null
          hero_image_url?: string | null
          id?: string
          instagram_handle?: string | null
          is_live?: boolean | null
          logo_url?: string | null
          name: string
          owner_id: string
          primary_colour?: string | null
          secondary_colour?: string | null
          slug: string
          stripe_account_id?: string | null
          website?: string | null
          whatsapp_number?: string | null
          whatsapp_enabled?: boolean | null
          whatsapp_phone_number?: string | null
          whatsapp_display_name?: string | null
        }
        Update: {
          address?: string | null
          buffer_minutes?: number | null
          category?: string
          city?: string | null
          created_at?: string | null
          description?: string | null
          hero_image_url?: string | null
          id?: string
          instagram_handle?: string | null
          is_live?: boolean | null
          logo_url?: string | null
          name?: string
          owner_id?: string
          primary_colour?: string | null
          secondary_colour?: string | null
          slug?: string
          stripe_account_id?: string | null
          website?: string | null
          whatsapp_number?: string | null
          whatsapp_enabled?: boolean | null
          whatsapp_phone_number?: string | null
          whatsapp_display_name?: string | null
        }
        Relationships: []
      }
      whatsapp_conversations: {
        Row: {
          id: string
          created_at: string | null
          updated_at: string | null
          business_id: string
          customer_phone: string
          customer_name: string | null
          state: string | null
          context: Json | null
          last_message_at: string | null
        }
        Insert: {
          id?: string
          created_at?: string | null
          updated_at?: string | null
          business_id: string
          customer_phone: string
          customer_name?: string | null
          state?: string | null
          context?: Json | null
          last_message_at?: string | null
        }
        Update: {
          id?: string
          created_at?: string | null
          updated_at?: string | null
          business_id?: string
          customer_phone?: string
          customer_name?: string | null
          state?: string | null
          context?: Json | null
          last_message_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          id: string
          created_at: string | null
          conversation_id: string
          direction: string
          body: string
          twilio_sid: string | null
          status: string | null
        }
        Insert: {
          id?: string
          created_at?: string | null
          conversation_id: string
          direction: string
          body: string
          twilio_sid?: string | null
          status?: string | null
        }
        Update: {
          id?: string
          created_at?: string | null
          conversation_id?: string
          direction?: string
          body?: string
          twilio_sid?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_businesses: {
        Row: {
          added_at: string | null
          business_id: string
          customer_id: string
          id: string
          is_favourite: boolean | null
        }
        Insert: {
          added_at?: string | null
          business_id: string
          customer_id: string
          id?: string
          is_favourite?: boolean | null
        }
        Update: {
          added_at?: string | null
          business_id?: string
          customer_id?: string
          id?: string
          is_favourite?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_businesses_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_businesses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_credits: {
        Row: {
          business_id: string
          customer_id: string
          expires_at: string | null
          id: string
          package_id: string
          purchased_at: string | null
          sessions_remaining: number
          stripe_payment_intent_id: string | null
        }
        Insert: {
          business_id: string
          customer_id: string
          expires_at?: string | null
          id?: string
          package_id: string
          purchased_at?: string | null
          sessions_remaining: number
          stripe_payment_intent_id?: string | null
        }
        Update: {
          business_id?: string
          customer_id?: string
          expires_at?: string | null
          id?: string
          package_id?: string
          purchased_at?: string | null
          sessions_remaining?: number
          stripe_payment_intent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_credits_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_credits_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_credits_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string | null
          email: string | null
          expo_push_token: string | null
          id: string
          name: string | null
          phone: string | null
          stripe_customer_id: string | null
          user_id: string | null
          whatsapp_number: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          expo_push_token?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          stripe_customer_id?: string | null
          user_id?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          expo_push_token?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          stripe_customer_id?: string | null
          user_id?: string | null
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      packages: {
        Row: {
          business_id: string
          cancellation_notice_days: number | null
          expires_days: number | null
          id: string
          is_active: boolean | null
          name: string
          price_cents: number
          session_count: number | null
          sessions_per_month: number | null
          tagline: string | null
        }
        Insert: {
          business_id: string
          cancellation_notice_days?: number | null
          expires_days?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          price_cents: number
          session_count?: number | null
          sessions_per_month?: number | null
          tagline?: string | null
        }
        Update: {
          business_id?: string
          cancellation_notice_days?: number | null
          expires_days?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          price_cents?: number
          session_count?: number | null
          sessions_per_month?: number | null
          tagline?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "packages_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          booking_id: string
          business_id: string
          business_response: string | null
          comment: string | null
          created_at: string | null
          customer_id: string
          id: string
          rating: number | null
        }
        Insert: {
          booking_id: string
          business_id: string
          business_response?: string | null
          comment?: string | null
          created_at?: string | null
          customer_id: string
          id?: string
          rating?: number | null
        }
        Update: {
          booking_id?: string
          business_id?: string
          business_response?: string | null
          comment?: string | null
          created_at?: string | null
          customer_id?: string
          id?: string
          rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      service_schedules: {
        Row: {
          day_of_week: number
          id: string
          service_id: string
          start_time: string
        }
        Insert: {
          day_of_week: number
          id?: string
          service_id: string
          start_time: string
        }
        Update: {
          day_of_week?: number
          id?: string
          service_id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_schedules_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          business_id: string
          capacity: number | null
          colour: string | null
          description: string | null
          duration_minutes: number
          id: string
          is_active: boolean | null
          name: string
          price_cents: number
          sort_order: number | null
        }
        Insert: {
          business_id: string
          capacity?: number | null
          colour?: string | null
          description?: string | null
          duration_minutes: number
          id?: string
          is_active?: boolean | null
          name: string
          price_cents: number
          sort_order?: number | null
        }
        Update: {
          business_id?: string
          capacity?: number | null
          colour?: string | null
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean | null
          name?: string
          price_cents?: number
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "services_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          avatar_url: string | null
          business_id: string
          email: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          avatar_url?: string | null
          business_id: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          avatar_url?: string | null
          business_id?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist: {
        Row: {
          business_id: string
          created_at: string | null
          customer_id: string
          id: string
          notified_at: string | null
          requested_date: string
          service_id: string
        }
        Insert: {
          business_id: string
          created_at?: string | null
          customer_id: string
          id?: string
          notified_at?: string | null
          requested_date: string
          service_id: string
        }
        Update: {
          business_id?: string
          created_at?: string | null
          customer_id?: string
          id?: string
          notified_at?: string | null
          requested_date?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_sessions: {
        Row: {
          business_id: string
          conversation_state: Json | null
          id: string
          last_message_at: string | null
          whatsapp_number: string
        }
        Insert: {
          business_id: string
          conversation_state?: Json | null
          id?: string
          last_message_at?: string | null
          whatsapp_number: string
        }
        Update: {
          business_id?: string
          conversation_state?: Json | null
          id?: string
          last_message_at?: string | null
          whatsapp_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_sessions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
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
