export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        }
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

// Convenience row types
export type Business = Database['public']['Tables']['businesses']['Row']
export type Service = Database['public']['Tables']['services']['Row']
export type Staff = Database['public']['Tables']['staff']['Row']
export type Booking = Database['public']['Tables']['bookings']['Row']
export type Review = Database['public']['Tables']['reviews']['Row']
export type BusinessHours = Database['public']['Tables']['business_hours']['Row']
export type BusinessClosure = Database['public']['Tables']['business_closures']['Row']
export type Customer = Database['public']['Tables']['customers']['Row']

export interface TimeSlot {
  time: string
  available: boolean
  spotsLeft?: number
}

export interface AvailabilityResult {
  date: string
  slots: TimeSlot[]
  isClosed: boolean
  closureName?: string
}
