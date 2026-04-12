// Mock data — kept as stubs for backwards compat.
// All pages now use real Supabase data.
import type { Business, Service, Booking, Customer, Package, Staff, DashboardStats, TimeSlot } from './types'

export const mockBusiness: Business = {
  id: 'mock-biz',
  owner_id: 'mock-owner',
  name: 'Demo Studio',
  slug: 'demo-studio',
  description: 'A demo business',
  category: 'Fitness & Wellness',
  address: '1 Main St',
  city: 'Dublin',
  website: null,
  instagram_handle: null,
  primary_colour: '#D4AF37',
  secondary_colour: null,
  logo_url: null,
  hero_image_url: null,
  stripe_account_id: null,
  whatsapp_number: null,
  is_live: true,
  buffer_minutes: 15,
  created_at: new Date().toISOString(),
}

export const mockServices: Service[] = []
export const mockBookings: Booking[] = []
export const mockCustomers: Customer[] = []
export const mockPackages: Package[] = []
export const mockStaff: Staff[] = []
export const mockTimeSlots: TimeSlot[] = []
export const mockDashboardStats: DashboardStats = {
  revenueToday: 0,
  revenueThisMonth: 0,
  bookingsToday: 0,
  bookingsThisMonth: 0,
  activeClients: 0,
  upcomingCount: 0,
  waitlistCount: 0,
  weeklyRevenue: [0, 0, 0, 0, 0, 0, 0],
}

export const mockMessages: Array<{ id: string; customerId: string; customerName: string; preview: string; timestamp: string; unread: boolean }> = []

export function getBusinessBySlug(_slug: string): Business | undefined { return undefined }
export function getCustomerById(_id: string): Customer | undefined { return undefined }
export function getServiceById(_id: string): Service | undefined { return undefined }
