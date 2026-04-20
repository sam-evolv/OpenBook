// Generated types live here. Run `supabase gen types typescript` once the
// CLI is wired up and replace this stub with the full generated schema.
// Until then, the shapes below cover the tables the analytics page reads.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export type InsightType = 'weekly' | 'heatmap_callout';

type BusinessesRow = {
  id: string;
  name: string;
  slug: string;
  owner_id: string | null;
  category: string | null;
  primary_colour: string | null;
  logo_url: string | null;
  is_live: boolean;
  created_at: string;
};

type BookingsRow = {
  id: string;
  business_id: string;
  customer_id: string | null;
  service_id: string | null;
  staff_id: string | null;
  start_at: string;
  end_at: string;
  status: BookingStatus;
  price_cents: number;
  deposit_cents: number | null;
  created_at: string;
};

type CustomersRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  created_at: string;
};

type CustomerBusinessesRow = {
  business_id: string;
  customer_id: string;
  first_booked_at: string | null;
  last_booked_at: string | null;
};

type ServicesRow = {
  id: string;
  business_id: string;
  name: string;
  duration_minutes: number;
  price_cents: number;
  capacity: number | null;
  is_active: boolean;
};

type StaffRow = {
  id: string;
  business_id: string;
  name: string;
  is_active: boolean;
};

type PackagesRow = {
  id: string;
  business_id: string;
  name: string;
  price_cents: number;
  sessions: number;
};

type ReviewsRow = {
  id: string;
  business_id: string;
  customer_id: string | null;
  rating: number;
  body: string | null;
  created_at: string;
};

type BusinessHoursRow = {
  business_id: string;
  day_of_week: number;
  opens_at: string | null;
  closes_at: string | null;
};

type FlashSalesRow = {
  id: string;
  business_id: string;
  service_id: string | null;
  discount_pct: number;
  starts_at: string;
  ends_at: string;
};

type WaitlistRow = {
  id: string;
  business_id: string;
  customer_id: string;
  service_id: string | null;
  created_at: string;
};

type AIInsightsRow = {
  id: string;
  business_id: string;
  insight_type: InsightType;
  headline: string;
  body: string;
  data_snapshot: Json | null;
  generated_at: string;
  model: string;
  dismissed: boolean;
};

type Table<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      businesses: Table<BusinessesRow>;
      bookings: Table<BookingsRow>;
      customers: Table<CustomersRow>;
      customer_businesses: Table<CustomerBusinessesRow>;
      services: Table<ServicesRow>;
      staff: Table<StaffRow>;
      packages: Table<PackagesRow>;
      reviews: Table<ReviewsRow>;
      business_hours: Table<BusinessHoursRow>;
      flash_sales: Table<FlashSalesRow>;
      waitlist: Table<WaitlistRow>;
      ai_insights: Table<AIInsightsRow>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
