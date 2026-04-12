export interface Business {
  id: string
  slug: string
  name: string
  type: string
  location: string
  rating: number
  reviewCount: number
  isOpen: boolean
}

export interface Service {
  id: string
  businessId: string
  name: string
  duration: number // minutes
  price: number
  color: string
  groupMax?: number
}

export type BookingStatus = 'confirmed' | 'pending' | 'checked-in' | 'completed' | 'cancelled'

export interface Booking {
  id: string
  customerId: string
  serviceId: string
  staffId?: string
  date: string // ISO date string YYYY-MM-DD
  time: string // HH:MM
  status: BookingStatus
  price: number
}

export type PackageType = 'bundle' | 'membership' | 'starter' | 'group' | 'none'

export interface Customer {
  id: string
  name: string
  email: string
  phone?: string
  visitCount: number
  totalSpend: number
  memberSince: string // ISO date string
  packageType: PackageType
}

export interface Package {
  id: string
  businessId: string
  name: string
  sessionCount: number
  price: number
  savings: number
  activeCount: number
  color: string
}

export interface Staff {
  id: string
  businessId: string
  name: string
  role: string
  avatar?: string
}

export interface DashboardStats {
  revenueToday: number
  bookingsToday: number
  activeClients: number
  packageRevenue: number
  weeklyRevenue: number[]
  upcomingCount: number
  waitlistCount: number
}

export interface TimeSlot {
  time: string
  available: boolean
}

export interface MessageThread {
  id: string
  customerId: string
  customerName: string
  preview: string
  timestamp: string
  unread: boolean
}
