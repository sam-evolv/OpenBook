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
      ai_insights: {
        Row: {
          body: string
          business_id: string
          data_snapshot: Json | null
          dismissed: boolean
          generated_at: string
          generated_by: string | null
          headline: string
          id: string
          insight_type: string
          model: string
        }
        Insert: {
          body: string
          business_id: string
          data_snapshot?: Json | null
          dismissed?: boolean
          generated_at?: string
          generated_by?: string | null
          headline: string
          id?: string
          insight_type: string
          model?: string
        }
        Update: {
          body?: string
          business_id?: string
          data_snapshot?: Json | null
          dismissed?: boolean
          generated_at?: string
          generated_by?: string | null
          headline?: string
          id?: string
          insight_type?: string
          model?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_insights_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_queries: {
        Row: {
          business_id: string
          created_at: string
          id: string
          query: string
          region: string | null
          resulted_in_booking_id: string | null
          source: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          query: string
          region?: string | null
          resulted_in_booking_id?: string | null
          source: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          query?: string
          region?: string | null
          resulted_in_booking_id?: string | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_queries_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_queries_resulted_in_booking_id_fkey"
            columns: ["resulted_in_booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_tool_calls: {
        Row: {
          args: Json | null
          conversation_id: string | null
          created_at: string | null
          customer_id: string | null
          id: string
          latency_ms: number | null
          result: Json | null
          tool_name: string
        }
        Insert: {
          args?: Json | null
          conversation_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          latency_ms?: number | null
          result?: Json | null
          tool_name: string
        }
        Update: {
          args?: Json | null
          conversation_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          latency_ms?: number | null
          result?: Json | null
          tool_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_tool_calls_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_feedback: {
        Row: {
          booking_id: string
          created_at: string | null
          id: string
          inferred_rating: number | null
          showed_up: boolean | null
          source_assistant: string | null
          verbatim: string | null
          would_rebook: boolean | null
        }
        Insert: {
          booking_id: string
          created_at?: string | null
          id?: string
          inferred_rating?: number | null
          showed_up?: boolean | null
          source_assistant?: string | null
          verbatim?: string | null
          would_rebook?: boolean | null
        }
        Update: {
          booking_id?: string
          created_at?: string | null
          id?: string
          inferred_rating?: number | null
          showed_up?: boolean | null
          source_assistant?: string | null
          verbatim?: string | null
          would_rebook?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_feedback_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          business_id: string
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string | null
          customer_id: string | null
          customer_phone: string | null
          ends_at: string
          flash_sale_id: string | null
          hold_expires_at: string | null
          id: string
          notes: string | null
          outcome: string | null
          payment_mode: string | null
          polling_token_hash: string | null
          price_cents: number
          reminder_24h_sent: boolean | null
          reminder_2h_sent: boolean | null
          service_id: string
          source: string | null
          source_assistant: string | null
          staff_id: string | null
          starts_at: string
          status: string | null
          stripe_payment_intent_id: string | null
        }
        Insert: {
          business_id: string
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string | null
          customer_id?: string | null
          customer_phone?: string | null
          ends_at: string
          flash_sale_id?: string | null
          hold_expires_at?: string | null
          id?: string
          notes?: string | null
          outcome?: string | null
          payment_mode?: string | null
          polling_token_hash?: string | null
          price_cents: number
          reminder_24h_sent?: boolean | null
          reminder_2h_sent?: boolean | null
          service_id: string
          source?: string | null
          source_assistant?: string | null
          staff_id?: string | null
          starts_at: string
          status?: string | null
          stripe_payment_intent_id?: string | null
        }
        Update: {
          business_id?: string
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string | null
          customer_id?: string | null
          customer_phone?: string | null
          ends_at?: string
          flash_sale_id?: string | null
          hold_expires_at?: string | null
          id?: string
          notes?: string | null
          outcome?: string | null
          payment_mode?: string | null
          polling_token_hash?: string | null
          price_cents?: number
          reminder_24h_sent?: boolean | null
          reminder_2h_sent?: boolean | null
          service_id?: string
          source?: string | null
          source_assistant?: string | null
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
            foreignKeyName: "bookings_flash_sale_id_fkey"
            columns: ["flash_sale_id"]
            isOneToOne: false
            referencedRelation: "flash_sales"
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
          is_closed: boolean | null
          is_open: boolean | null
          open_time: string | null
          updated_at: string
        }
        Insert: {
          business_id: string
          close_time?: string | null
          day_of_week: number
          id?: string
          is_closed?: boolean | null
          is_open?: boolean | null
          open_time?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          close_time?: string | null
          day_of_week?: number
          id?: string
          is_closed?: boolean | null
          is_open?: boolean | null
          open_time?: string | null
          updated_at?: string
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
      business_media: {
        Row: {
          business_id: string
          caption: string | null
          created_at: string | null
          id: string
          kind: string
          sort_order: number | null
          url: string
        }
        Insert: {
          business_id: string
          caption?: string | null
          created_at?: string | null
          id?: string
          kind: string
          sort_order?: number | null
          url: string
        }
        Update: {
          business_id?: string
          caption?: string | null
          created_at?: string | null
          id?: string
          kind?: string
          sort_order?: number | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_media_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          about_long: string | null
          accessibility_notes: string | null
          address: string | null
          address_line: string | null
          amenities: string[] | null
          automations: Json
          buffer_minutes: number | null
          category: string
          city: string | null
          cover_image_url: string | null
          created_at: string | null
          description: string | null
          founder_name: string | null
          founder_photo_url: string | null
          gallery_urls: string[] | null
          hero_image_url: string | null
          id: string
          instagram_access_token: string | null
          instagram_connected_at: string | null
          instagram_handle: string | null
          is_live: boolean | null
          logo_url: string | null
          monthly_revenue_goal: number | null
          name: string
          nearest_landmark: string | null
          offers: Json | null
          owner_id: string
          parking_info: string | null
          phone: string | null
          plan: string
          price_tier: number | null
          primary_colour: string | null
          processed_icon_url: string | null
          public_transport_info: string | null
          rating: number | null
          secondary_colour: string | null
          slug: string
          socials: Json | null
          space_description: string | null
          stripe_account_id: string | null
          stripe_charges_enabled: boolean | null
          stripe_onboarding_completed: boolean | null
          tagline: string | null
          team: Json | null
          testimonials: Json | null
          updated_at: string
          website: string | null
          whatsapp_display_name: string | null
          whatsapp_enabled: boolean | null
          whatsapp_number: string | null
          whatsapp_phone_number: string | null
          whatsapp_phone_number_id: string | null
          year_founded: number | null
        }
        Insert: {
          about_long?: string | null
          accessibility_notes?: string | null
          address?: string | null
          address_line?: string | null
          amenities?: string[] | null
          automations?: Json
          buffer_minutes?: number | null
          category: string
          city?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          founder_name?: string | null
          founder_photo_url?: string | null
          gallery_urls?: string[] | null
          hero_image_url?: string | null
          id?: string
          instagram_access_token?: string | null
          instagram_connected_at?: string | null
          instagram_handle?: string | null
          is_live?: boolean | null
          logo_url?: string | null
          monthly_revenue_goal?: number | null
          name: string
          nearest_landmark?: string | null
          offers?: Json | null
          owner_id: string
          parking_info?: string | null
          phone?: string | null
          plan?: string
          price_tier?: number | null
          primary_colour?: string | null
          processed_icon_url?: string | null
          public_transport_info?: string | null
          rating?: number | null
          secondary_colour?: string | null
          slug: string
          socials?: Json | null
          space_description?: string | null
          stripe_account_id?: string | null
          stripe_charges_enabled?: boolean | null
          stripe_onboarding_completed?: boolean | null
          tagline?: string | null
          team?: Json | null
          testimonials?: Json | null
          updated_at?: string
          website?: string | null
          whatsapp_display_name?: string | null
          whatsapp_enabled?: boolean | null
          whatsapp_number?: string | null
          whatsapp_phone_number?: string | null
          whatsapp_phone_number_id?: string | null
          year_founded?: number | null
        }
        Update: {
          about_long?: string | null
          accessibility_notes?: string | null
          address?: string | null
          address_line?: string | null
          amenities?: string[] | null
          automations?: Json
          buffer_minutes?: number | null
          category?: string
          city?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          founder_name?: string | null
          founder_photo_url?: string | null
          gallery_urls?: string[] | null
          hero_image_url?: string | null
          id?: string
          instagram_access_token?: string | null
          instagram_connected_at?: string | null
          instagram_handle?: string | null
          is_live?: boolean | null
          logo_url?: string | null
          monthly_revenue_goal?: number | null
          name?: string
          nearest_landmark?: string | null
          offers?: Json | null
          owner_id?: string
          parking_info?: string | null
          phone?: string | null
          plan?: string
          price_tier?: number | null
          primary_colour?: string | null
          processed_icon_url?: string | null
          public_transport_info?: string | null
          rating?: number | null
          secondary_colour?: string | null
          slug?: string
          socials?: Json | null
          space_description?: string | null
          stripe_account_id?: string | null
          stripe_charges_enabled?: boolean | null
          stripe_onboarding_completed?: boolean | null
          tagline?: string | null
          team?: Json | null
          testimonials?: Json | null
          updated_at?: string
          website?: string | null
          whatsapp_display_name?: string | null
          whatsapp_enabled?: boolean | null
          whatsapp_number?: string | null
          whatsapp_phone_number?: string | null
          whatsapp_phone_number_id?: string | null
          year_founded?: number | null
        }
        Relationships: []
      }
      cancellation_reasons: {
        Row: {
          booking_id: string
          created_at: string
          id: string
          note: string | null
          reason: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          id?: string
          note?: string | null
          reason: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          id?: string
          note?: string | null
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "cancellation_reasons_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
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
          promo_opt_in: boolean
          promo_opt_in_at: string | null
          promo_opt_in_source: string | null
        }
        Insert: {
          added_at?: string | null
          business_id: string
          customer_id: string
          id?: string
          is_favourite?: boolean | null
          promo_opt_in?: boolean
          promo_opt_in_at?: string | null
          promo_opt_in_source?: string | null
        }
        Update: {
          added_at?: string | null
          business_id?: string
          customer_id?: string
          id?: string
          is_favourite?: boolean | null
          promo_opt_in?: boolean
          promo_opt_in_at?: string | null
          promo_opt_in_source?: string | null
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
          amount_cents: number | null
          business_id: string
          customer_id: string
          expires_at: string | null
          id: string
          package_id: string
          purchased_at: string | null
          reason: string | null
          sessions_remaining: number
          stripe_payment_intent_id: string | null
        }
        Insert: {
          amount_cents?: number | null
          business_id: string
          customer_id: string
          expires_at?: string | null
          id?: string
          package_id: string
          purchased_at?: string | null
          reason?: string | null
          sessions_remaining: number
          stripe_payment_intent_id?: string | null
        }
        Update: {
          amount_cents?: number | null
          business_id?: string
          customer_id?: string
          expires_at?: string | null
          id?: string
          package_id?: string
          purchased_at?: string | null
          reason?: string | null
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
          avatar_url: string | null
          created_at: string | null
          email: string | null
          expo_push_token: string | null
          full_name: string | null
          id: string
          name: string | null
          notes: string | null
          phone: string | null
          stripe_customer_id: string | null
          user_id: string | null
          whatsapp_number: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          expo_push_token?: string | null
          full_name?: string | null
          id?: string
          name?: string | null
          notes?: string | null
          phone?: string | null
          stripe_customer_id?: string | null
          user_id?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          expo_push_token?: string | null
          full_name?: string | null
          id?: string
          name?: string | null
          notes?: string | null
          phone?: string | null
          stripe_customer_id?: string | null
          user_id?: string | null
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      flash_sale_notifications: {
        Row: {
          block_reason: string | null
          booked_at: string | null
          booking_id: string | null
          created_at: string
          customer_id: string
          id: string
          sale_id: string
          sent_at: string | null
          status: string
          viewed_at: string | null
        }
        Insert: {
          block_reason?: string | null
          booked_at?: string | null
          booking_id?: string | null
          created_at?: string
          customer_id: string
          id?: string
          sale_id: string
          sent_at?: string | null
          status?: string
          viewed_at?: string | null
        }
        Update: {
          block_reason?: string | null
          booked_at?: string | null
          booking_id?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          sale_id?: string
          sent_at?: string | null
          status?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flash_sale_notifications_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flash_sale_notifications_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flash_sale_notifications_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "flash_sales"
            referencedColumns: ["id"]
          },
        ]
      }
      flash_sales: {
        Row: {
          bookings_taken: number | null
          business_id: string | null
          created_at: string | null
          discount_percent: number
          duration_minutes: number
          expires_at: string
          id: string
          listed_at: string
          max_bookings: number | null
          message: string | null
          original_price_cents: number
          sale_price_cents: number
          service_id: string | null
          slot_time: string
          source: string
          status: string | null
        }
        Insert: {
          bookings_taken?: number | null
          business_id?: string | null
          created_at?: string | null
          discount_percent: number
          duration_minutes: number
          expires_at: string
          id?: string
          listed_at?: string
          max_bookings?: number | null
          message?: string | null
          original_price_cents: number
          sale_price_cents: number
          service_id?: string | null
          slot_time: string
          source?: string
          status?: string | null
        }
        Update: {
          bookings_taken?: number | null
          business_id?: string | null
          created_at?: string | null
          discount_percent?: number
          duration_minutes?: number
          expires_at?: string
          id?: string
          listed_at?: string
          max_bookings?: number | null
          message?: string | null
          original_price_cents?: number
          sale_price_cents?: number
          service_id?: string | null
          slot_time?: string
          source?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flash_sales_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flash_sales_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_redemptions: {
        Row: {
          booking_id: string
          claim_expires_at: string
          claim_token: string
          claimed_at: string | null
          claimed_by_customer_id: string | null
          created_at: string
          gift_message: string | null
          gifter_customer_id: string
          id: string
          recipient_name: string | null
          recipient_phone: string
        }
        Insert: {
          booking_id: string
          claim_expires_at: string
          claim_token: string
          claimed_at?: string | null
          claimed_by_customer_id?: string | null
          created_at?: string
          gift_message?: string | null
          gifter_customer_id: string
          id?: string
          recipient_name?: string | null
          recipient_phone: string
        }
        Update: {
          booking_id?: string
          claim_expires_at?: string
          claim_token?: string
          claimed_at?: string | null
          claimed_by_customer_id?: string | null
          created_at?: string
          gift_message?: string | null
          gifter_customer_id?: string
          id?: string
          recipient_name?: string | null
          recipient_phone?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_redemptions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_redemptions_claimed_by_customer_id_fkey"
            columns: ["claimed_by_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_redemptions_gifter_customer_id_fkey"
            columns: ["gifter_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      home_pins: {
        Row: {
          business_id: string
          customer_id: string
          notifications_enabled: boolean
          pinned_at: string
        }
        Insert: {
          business_id: string
          customer_id: string
          notifications_enabled?: boolean
          pinned_at?: string
        }
        Update: {
          business_id?: string
          customer_id?: string
          notifications_enabled?: boolean
          pinned_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "home_pins_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "home_pins_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_posts: {
        Row: {
          business_id: string
          caption: string | null
          fetched_at: string | null
          id: string
          media_url: string
          permalink: string
          post_id: string
          posted_at: string | null
          thumbnail_url: string | null
        }
        Insert: {
          business_id: string
          caption?: string | null
          fetched_at?: string | null
          id?: string
          media_url: string
          permalink: string
          post_id: string
          posted_at?: string | null
          thumbnail_url?: string | null
        }
        Update: {
          business_id?: string
          caption?: string | null
          fetched_at?: string | null
          id?: string
          media_url?: string
          permalink?: string
          post_id?: string
          posted_at?: string | null
          thumbnail_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "instagram_posts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      mcp_holds: {
        Row: {
          booking_id: string | null
          business_id: string
          created_at: string | null
          customer_hints: Json | null
          end_at: string
          expires_at: string
          id: string
          service_id: string
          source_assistant: string | null
          start_at: string
          status: string
          updated_at: string | null
        }
        Insert: {
          booking_id?: string | null
          business_id: string
          created_at?: string | null
          customer_hints?: Json | null
          end_at: string
          expires_at: string
          id?: string
          service_id: string
          source_assistant?: string | null
          start_at: string
          status: string
          updated_at?: string | null
        }
        Update: {
          booking_id?: string | null
          business_id?: string
          created_at?: string | null
          customer_hints?: Json | null
          end_at?: string
          expires_at?: string
          id?: string
          service_id?: string
          source_assistant?: string | null
          start_at?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mcp_holds_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mcp_holds_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mcp_holds_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      mcp_intent_cache: {
        Row: {
          cache_key: string
          classification: Json
          created_at: string | null
          expires_at: string
        }
        Insert: {
          cache_key: string
          classification: Json
          created_at?: string | null
          expires_at: string
        }
        Update: {
          cache_key?: string
          classification?: Json
          created_at?: string | null
          expires_at?: string
        }
        Relationships: []
      }
      mcp_promoted_slots: {
        Row: {
          business_id: string
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          kind: string
          message: string | null
          original_price_eur: number
          promoted_price_eur: number
          service_id: string
          slot_end: string
          slot_start: string
        }
        Insert: {
          business_id: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          kind: string
          message?: string | null
          original_price_eur: number
          promoted_price_eur: number
          service_id: string
          slot_end: string
          slot_start: string
        }
        Update: {
          business_id?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          kind?: string
          message?: string | null
          original_price_eur?: number
          promoted_price_eur?: number
          service_id?: string
          slot_end?: string
          slot_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "mcp_promoted_slots_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mcp_promoted_slots_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      mcp_query_log: {
        Row: {
          created_at: string | null
          customer_context: Json | null
          id: string
          intent_text: string | null
          led_to_booking: boolean | null
          led_to_hold: boolean | null
          led_to_waitlist: boolean | null
          parsed_category: string | null
          parsed_location: string | null
          parsed_when: string | null
          query_id: string
          result_business_ids: string[] | null
          result_count: number | null
          source_assistant: string | null
        }
        Insert: {
          created_at?: string | null
          customer_context?: Json | null
          id?: string
          intent_text?: string | null
          led_to_booking?: boolean | null
          led_to_hold?: boolean | null
          led_to_waitlist?: boolean | null
          parsed_category?: string | null
          parsed_location?: string | null
          parsed_when?: string | null
          query_id: string
          result_business_ids?: string[] | null
          result_count?: number | null
          source_assistant?: string | null
        }
        Update: {
          created_at?: string | null
          customer_context?: Json | null
          id?: string
          intent_text?: string | null
          led_to_booking?: boolean | null
          led_to_hold?: boolean | null
          led_to_waitlist?: boolean | null
          parsed_category?: string | null
          parsed_location?: string | null
          parsed_when?: string | null
          query_id?: string
          result_business_ids?: string[] | null
          result_count?: number | null
          source_assistant?: string | null
        }
        Relationships: []
      }
      mcp_rate_limit: {
        Row: {
          bucket: string
          count: number
          window_start: string
        }
        Insert: {
          bucket: string
          count?: number
          window_start: string
        }
        Update: {
          bucket?: string
          count?: number
          window_start?: string
        }
        Relationships: []
      }
      mcp_tool_calls: {
        Row: {
          arguments: Json
          created_at: string | null
          error: Json | null
          id: string
          latency_ms: number | null
          request_id: string | null
          result: Json | null
          source_assistant: string | null
          source_ip: unknown
          tool_name: string
        }
        Insert: {
          arguments: Json
          created_at?: string | null
          error?: Json | null
          id?: string
          latency_ms?: number | null
          request_id?: string | null
          result?: Json | null
          source_assistant?: string | null
          source_ip?: unknown
          tool_name: string
        }
        Update: {
          arguments?: Json
          created_at?: string | null
          error?: Json | null
          id?: string
          latency_ms?: number | null
          request_id?: string | null
          result?: Json | null
          source_assistant?: string | null
          source_ip?: unknown
          tool_name?: string
        }
        Relationships: []
      }
      mcp_waitlist: {
        Row: {
          business_id: string
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          customer_hints: Json | null
          expires_at: string
          id: string
          notified_at: string | null
          preferred_window_end: string
          preferred_window_start: string
          service_id: string | null
          source_assistant: string | null
          status: string
        }
        Insert: {
          business_id: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          customer_hints?: Json | null
          expires_at: string
          id?: string
          notified_at?: string | null
          preferred_window_end: string
          preferred_window_start: string
          service_id?: string | null
          source_assistant?: string | null
          status?: string
        }
        Update: {
          business_id?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          customer_hints?: Json | null
          expires_at?: string
          id?: string
          notified_at?: string | null
          preferred_window_end?: string
          preferred_window_start?: string
          service_id?: string | null
          source_assistant?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "mcp_waitlist_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mcp_waitlist_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      mcp_waitlist_notifications: {
        Row: {
          attempted_at: string | null
          booking_id: string | null
          created_at: string | null
          error_message: string | null
          id: string
          slot_end: string
          slot_start: string
          status: string
          waitlist_id: string
        }
        Insert: {
          attempted_at?: string | null
          booking_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          slot_end: string
          slot_start: string
          status?: string
          waitlist_id: string
        }
        Update: {
          attempted_at?: string | null
          booking_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          slot_end?: string
          slot_start?: string
          status?: string
          waitlist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mcp_waitlist_notifications_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mcp_waitlist_notifications_waitlist_id_fkey"
            columns: ["waitlist_id"]
            isOneToOne: false
            referencedRelation: "mcp_waitlist"
            referencedColumns: ["id"]
          },
        ]
      }
      owners: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          onboarding_completed: boolean | null
          onboarding_step: number | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      packages: {
        Row: {
          business_id: string
          cancellation_notice_days: number | null
          customer_id: string | null
          expires_days: number | null
          id: string
          is_active: boolean | null
          name: string
          package_name: string | null
          price_cents: number
          session_count: number | null
          sessions_per_month: number | null
          sessions_remaining: number | null
          tagline: string | null
          total_sessions: number | null
        }
        Insert: {
          business_id: string
          cancellation_notice_days?: number | null
          customer_id?: string | null
          expires_days?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          package_name?: string | null
          price_cents: number
          session_count?: number | null
          sessions_per_month?: number | null
          sessions_remaining?: number | null
          tagline?: string | null
          total_sessions?: number | null
        }
        Update: {
          business_id?: string
          cancellation_notice_days?: number | null
          customer_id?: string | null
          expires_days?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          package_name?: string | null
          price_cents?: number
          session_count?: number | null
          sessions_per_month?: number | null
          sessions_remaining?: number | null
          tagline?: string | null
          total_sessions?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "packages_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packages_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_reminders: {
        Row: {
          attempt_count: number
          block_reason: string | null
          booking_id: string
          created_at: string
          error: string | null
          id: string
          kind: string
          scheduled_for: string
          sent_at: string | null
          status: string
        }
        Insert: {
          attempt_count?: number
          block_reason?: string | null
          booking_id: string
          created_at?: string
          error?: string | null
          id?: string
          kind: string
          scheduled_for: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          attempt_count?: number
          block_reason?: string | null
          booking_id?: string
          created_at?: string
          error?: string | null
          id?: string
          kind?: string
          scheduled_for?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_reminders_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      push_device_tokens: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          is_active: boolean
          last_seen_at: string
          platform: string
          token: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          is_active?: boolean
          last_seen_at?: string
          platform: string
          token: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          is_active?: boolean
          last_seen_at?: string
          platform?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_device_tokens_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      push_log: {
        Row: {
          customer_id: string
          delivered: boolean | null
          error: string | null
          id: string
          kind: string
          sale_id: string | null
          sent_at: string
        }
        Insert: {
          customer_id: string
          delivered?: boolean | null
          error?: string | null
          id?: string
          kind: string
          sale_id?: string | null
          sent_at?: string
        }
        Update: {
          customer_id?: string
          delivered?: boolean | null
          error?: string | null
          id?: string
          kind?: string
          sale_id?: string | null
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_log_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "flash_sales"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          booking_id: string | null
          business_id: string
          business_response: string | null
          comment: string | null
          created_at: string | null
          customer_id: string | null
          id: string
          rating: number | null
        }
        Insert: {
          booking_id?: string | null
          business_id: string
          business_response?: string | null
          comment?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          rating?: number | null
        }
        Update: {
          booking_id?: string | null
          business_id?: string
          business_response?: string | null
          comment?: string | null
          created_at?: string | null
          customer_id?: string | null
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
          updated_at: string
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
          updated_at?: string
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
          updated_at?: string
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
          bio: string | null
          business_id: string
          colour: string | null
          email: string | null
          id: string
          instagram_handle: string | null
          is_active: boolean | null
          name: string
          sort_order: number | null
          specialties: string[] | null
          title: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          business_id: string
          colour?: string | null
          email?: string | null
          id?: string
          instagram_handle?: string | null
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          specialties?: string[] | null
          title?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          business_id?: string
          colour?: string | null
          email?: string | null
          id?: string
          instagram_handle?: string | null
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          specialties?: string[] | null
          title?: string | null
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
      standing_slots: {
        Row: {
          active: boolean
          business_id: string | null
          category: string | null
          city: string | null
          created_at: string
          customer_id: string
          day_mask: number
          id: string
          last_notified_at: string | null
          matched_count: number
          max_price_cents: number
          paused_until: string | null
          radius_km: number
          time_end: string
          time_start: string
        }
        Insert: {
          active?: boolean
          business_id?: string | null
          category?: string | null
          city?: string | null
          created_at?: string
          customer_id: string
          day_mask?: number
          id?: string
          last_notified_at?: string | null
          matched_count?: number
          max_price_cents: number
          paused_until?: string | null
          radius_km?: number
          time_end?: string
          time_start?: string
        }
        Update: {
          active?: boolean
          business_id?: string | null
          category?: string | null
          city?: string | null
          created_at?: string
          customer_id?: string
          day_mask?: number
          id?: string
          last_notified_at?: string | null
          matched_count?: number
          max_price_cents?: number
          paused_until?: string | null
          radius_km?: number
          time_end?: string
          time_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "standing_slots_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "standing_slots_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_events: {
        Row: {
          event_id: string
          event_type: string
          processed_at: string | null
          received_at: string
          related_booking: string | null
        }
        Insert: {
          event_id: string
          event_type: string
          processed_at?: string | null
          received_at?: string
          related_booking?: string | null
        }
        Update: {
          event_id?: string
          event_type?: string
          processed_at?: string | null
          received_at?: string
          related_booking?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stripe_events_related_booking_fkey"
            columns: ["related_booking"]
            isOneToOne: false
            referencedRelation: "bookings"
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
      whatsapp_conversations: {
        Row: {
          business_id: string | null
          context: Json | null
          created_at: string | null
          customer_name: string | null
          customer_phone: string
          id: string
          last_message_at: string | null
          last_read_at: string | null
          state: string | null
          updated_at: string | null
        }
        Insert: {
          business_id?: string | null
          context?: Json | null
          created_at?: string | null
          customer_name?: string | null
          customer_phone: string
          id?: string
          last_message_at?: string | null
          last_read_at?: string | null
          state?: string | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string | null
          context?: Json | null
          created_at?: string | null
          customer_name?: string | null
          customer_phone?: string
          id?: string
          last_message_at?: string | null
          last_read_at?: string | null
          state?: string | null
          updated_at?: string | null
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
          body: string
          conversation_id: string | null
          created_at: string | null
          direction: string
          id: string
          source: string | null
          status: string | null
          twilio_sid: string | null
        }
        Insert: {
          body: string
          conversation_id?: string | null
          created_at?: string | null
          direction: string
          id?: string
          source?: string | null
          status?: string | null
          twilio_sid?: string | null
        }
        Update: {
          body?: string
          conversation_id?: string | null
          created_at?: string | null
          direction?: string
          id?: string
          source?: string | null
          status?: string | null
          twilio_sid?: string | null
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
      _sweep_expired_holds: { Args: never; Returns: undefined }
      auth_customer_id: { Args: never; Returns: string }
      cancel_hold_for_ai: {
        Args: { p_booking_id: string }
        Returns: {
          business_id: string
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string | null
          customer_id: string | null
          customer_phone: string | null
          ends_at: string
          flash_sale_id: string | null
          hold_expires_at: string | null
          id: string
          notes: string | null
          outcome: string | null
          payment_mode: string | null
          polling_token_hash: string | null
          price_cents: number
          reminder_24h_sent: boolean | null
          reminder_2h_sent: boolean | null
          service_id: string
          source: string | null
          source_assistant: string | null
          staff_id: string | null
          starts_at: string
          status: string | null
          stripe_payment_intent_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      claim_flash_sale_spot: {
        Args: {
          p_customer_id: string
          p_payment_mode?: string
          p_sale_id: string
        }
        Returns: string
      }
      confirm_booking_for_ai: {
        Args: { p_booking_id: string; p_stripe_payment_intent_id?: string }
        Returns: {
          business_id: string
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string | null
          customer_id: string | null
          customer_phone: string | null
          ends_at: string
          flash_sale_id: string | null
          hold_expires_at: string | null
          id: string
          notes: string | null
          outcome: string | null
          payment_mode: string | null
          polling_token_hash: string | null
          price_cents: number
          reminder_24h_sent: boolean | null
          reminder_2h_sent: boolean | null
          service_id: string
          source: string | null
          source_assistant: string | null
          staff_id: string | null
          starts_at: string
          status: string | null
          stripe_payment_intent_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_mcp_hold_atomically: {
        Args: {
          p_business_id: string
          p_customer_hints: Json
          p_end_at: string
          p_expires_at: string
          p_service_id: string
          p_source_assistant: string
          p_start_at: string
        }
        Returns: {
          booking_id: string
          conflict_reason: string
          hold_id: string
        }[]
      }
      fire_waitlist_notifications: {
        Args: {
          p_business_id: string
          p_service_id: string
          p_slot_end: string
          p_slot_start: string
        }
        Returns: undefined
      }
      get_availability_for_ai: {
        Args: { p_business_id: string; p_date: string; p_service_id: string }
        Returns: {
          slot_end: string
          slot_start: string
        }[]
      }
      hold_slot_for_ai: {
        Args: { p_service_id: string; p_slot_start: string }
        Returns: {
          booking_id: string
          expires_at: string
          price_cents: number
          requires_payment: boolean
        }[]
      }
      increment_mcp_rate_limit: {
        Args: { p_bucket: string; p_window_start: string }
        Returns: number
      }
      list_services_for_ai: {
        Args: { p_business_id: string }
        Returns: {
          capacity: number
          duration_minutes: number
          name: string
          price_cents: number
          service_id: string
        }[]
      }
      match_standing_slots_to_sale: {
        Args: { p_sale_id: string }
        Returns: {
          customer_id: string
          platform: string
          push_token: string
        }[]
      }
      run_drain: { Args: never; Returns: Json }
      search_businesses_for_ai: {
        Args: { category?: string; location?: string; query_text: string }
        Returns: {
          address: string
          business_id: string
          category: string
          is_live: boolean
          name: string
          primary_colour: string
          rating: number
          slug: string
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
