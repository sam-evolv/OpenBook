import type { Tables } from './supabase/types'

// ── Re-export DB row types ────────────────────────────────────────────────────
export type Business = Tables<'businesses'>
export type Service = Tables<'services'>
export type Staff = Tables<'staff'>
export type Package = Tables<'packages'>
export type Customer = Tables<'customers'>
export type Booking = Tables<'bookings'>
export type Review = Tables<'reviews'>
export type BusinessHours = Tables<'business_hours'>
export type BusinessClosure = Tables<'business_closures'>
export type ServiceSchedule = Tables<'service_schedules'>
export type CustomerCredit = Tables<'customer_credits'>
export type CustomerBusiness = Tables<'customer_businesses'>
export type WaitlistEntry = Tables<'waitlist'>
export type WhatsAppSession = Tables<'whatsapp_sessions'>

// ── Booking status ────────────────────────────────────────────────────────────
export type BookingStatus = 'confirmed' | 'cancelled' | 'completed' | 'no_show'

// ── Booking source ────────────────────────────────────────────────────────────
export type BookingSource = 'app' | 'whatsapp' | 'claude' | 'chatgpt' | 'dashboard'

// ── Availability ──────────────────────────────────────────────────────────────
export interface TimeSlot {
  time: string      // "HH:MM" in business local time
  available: boolean
  spotsLeft?: number  // for group classes
}

export interface AvailabilityResult {
  date: string        // YYYY-MM-DD
  slots: TimeSlot[]
  isClosed: boolean
  closureName?: string
}

// ── Dashboard stats ───────────────────────────────────────────────────────────
export interface DashboardStats {
  revenueToday: number        // cents
  revenueThisMonth: number    // cents
  bookingsToday: number
  bookingsThisMonth: number
  activeClients: number
  upcomingCount: number
  waitlistCount: number
  weeklyRevenue: number[]     // last 7 days, cents
}

// ── WhatsApp bot ──────────────────────────────────────────────────────────────
export interface WhatsAppBotResponse {
  message: string
  action: 'none' | 'check_availability' | 'create_booking' | 'cancel_booking' | 'list_services'
  params: Record<string, string | number | boolean>
}

export interface ConversationState {
  history: Array<{ role: 'user' | 'assistant'; content: string }>
  pendingBooking?: {
    service_id?: string
    date?: string
    time?: string
    customer_name?: string
  }
}

// ── Stripe ────────────────────────────────────────────────────────────────────
export interface CreateBookingPayload {
  business_id: string
  service_id: string
  customer_id: string
  staff_id?: string
  starts_at: string   // ISO
  notes?: string
  source?: BookingSource
}

export interface StripeConnectStatus {
  connected: boolean
  charges_enabled: boolean
  payouts_enabled: boolean
  account_id?: string
}

// ── Reminder ──────────────────────────────────────────────────────────────────
export interface ReminderTarget {
  booking: Booking & {
    services: Pick<Service, 'name' | 'duration_minutes'>
    businesses: Pick<Business, 'name' | 'address'>
    customers: Pick<Customer, 'name' | 'email' | 'phone' | 'expo_push_token'>
  }
  type: '24h' | '2h'
}

// ── Design tokens ─────────────────────────────────────────────────────────────
export const tokens = {
  bg: '#080808',
  surface1: '#111111',
  surface2: '#1a1a1a',
  border: 'rgba(255,255,255,0.07)',
  border2: 'rgba(255,255,255,0.14)',
  text1: '#ffffff',
  text2: 'rgba(255,255,255,0.55)',
  text3: 'rgba(255,255,255,0.28)',
  gold: '#D4AF37',
  glassBase: 'rgba(255,255,255,0.11)',
  glassBorder: 'rgba(255,255,255,0.26)',
  glassHighlight: 'rgba(255,255,255,0.38)',
  fontWeights: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },
  radii: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    icon: 18,
    dockIcon: 15,
  },
} as const
