import type { BookingStatus } from '@/types/database';

export type AnalyticsBooking = {
  id: string;
  business_id: string;
  customer_id: string | null;
  service_id: string | null;
  start_at: string;
  end_at: string;
  status: BookingStatus;
  price_cents: number;
};

export type AnalyticsCustomer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  first_booked_at: string | null;
  last_booked_at: string | null;
};

export type AnalyticsService = {
  id: string;
  name: string;
  duration_minutes: number;
  price_cents: number;
  capacity: number | null;
};

export type AnalyticsReview = {
  id: string;
  customer_id: string | null;
  rating: number;
  body: string | null;
  created_at: string;
};

export type BusinessHour = {
  day_of_week: number;
  opens_at: string | null;
  closes_at: string | null;
};

export type AIInsight = {
  id: string;
  business_id: string;
  insight_type: 'weekly' | 'heatmap_callout';
  headline: string;
  body: string;
  generated_at: string;
  model: string;
  dismissed: boolean;
};

export type AnalyticsBundle = {
  business: { id: string; name: string } | null;
  bookings90: AnalyticsBooking[];
  bookingsToday: AnalyticsBooking[];
  bookingsYesterday: AnalyticsBooking[];
  bookingsFuture: AnalyticsBooking[];
  customers: AnalyticsCustomer[];
  services: AnalyticsService[];
  reviews: AnalyticsReview[];
  businessHours: BusinessHour[];
  latestWeeklyInsight: AIInsight | null;
  insightLog: AIInsight[];
  heatmapCallouts: AIInsight[];
  hasEnoughData: boolean;
};
