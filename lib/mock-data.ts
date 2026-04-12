import type {
  Business,
  Service,
  Booking,
  Customer,
  Package,
  Staff,
  DashboardStats,
  TimeSlot,
  MessageThread,
} from './types'

// ─── Business ────────────────────────────────────────────────────────────────

export const mockBusiness: Business = {
  id: 'biz_001',
  slug: 'evolv-performance',
  name: 'Evolv Performance',
  type: 'PT & Wellness',
  location: 'Cork City, Ireland',
  rating: 4.9,
  reviewCount: 138,
  isOpen: true,
}

// ─── Services ─────────────────────────────────────────────────────────────────

export const mockServices: Service[] = [
  {
    id: 'svc_001',
    businessId: 'biz_001',
    name: 'Personal Training',
    duration: 60,
    price: 65,
    color: '#D4AF37',
  },
  {
    id: 'svc_002',
    businessId: 'biz_001',
    name: 'Pilates',
    duration: 45,
    price: 45,
    color: '#60A5FA',
  },
  {
    id: 'svc_003',
    businessId: 'biz_001',
    name: 'Sports Massage',
    duration: 60,
    price: 80,
    color: '#34D399',
  },
  {
    id: 'svc_004',
    businessId: 'biz_001',
    name: 'Group HIIT',
    duration: 45,
    price: 25,
    color: '#F87171',
    groupMax: 12,
  },
  {
    id: 'svc_005',
    businessId: 'biz_001',
    name: 'Nutrition Consult',
    duration: 30,
    price: 50,
    color: '#A78BFA',
  },
]

// ─── Customers ────────────────────────────────────────────────────────────────

export const mockCustomers: Customer[] = [
  {
    id: 'cust_001',
    name: 'Ciara Murphy',
    email: 'ciara.murphy@gmail.com',
    phone: '+353 87 123 4567',
    visitCount: 24,
    totalSpend: 1560,
    memberSince: '2024-01-15',
    packageType: 'bundle',
  },
  {
    id: 'cust_002',
    name: 'Liam O\'Brien',
    email: 'liam.obrien@outlook.com',
    phone: '+353 86 234 5678',
    visitCount: 18,
    totalSpend: 1170,
    memberSince: '2024-03-02',
    packageType: 'membership',
  },
  {
    id: 'cust_003',
    name: 'Aoife Ryan',
    email: 'aoife.ryan@gmail.com',
    phone: '+353 85 345 6789',
    visitCount: 31,
    totalSpend: 2015,
    memberSince: '2023-11-08',
    packageType: 'bundle',
  },
  {
    id: 'cust_004',
    name: 'Patrick Walsh',
    email: 'patrick.walsh@hotmail.com',
    phone: '+353 83 456 7890',
    visitCount: 9,
    totalSpend: 585,
    memberSince: '2024-07-21',
    packageType: 'starter',
  },
  {
    id: 'cust_005',
    name: 'Niamh Brennan',
    email: 'niamh.brennan@gmail.com',
    phone: '+353 89 567 8901',
    visitCount: 42,
    totalSpend: 2730,
    memberSince: '2023-06-14',
    packageType: 'membership',
  },
  {
    id: 'cust_006',
    name: 'Siobhan Flynn',
    email: 'siobhan.flynn@icloud.com',
    phone: '+353 87 678 9012',
    visitCount: 15,
    totalSpend: 375,
    memberSince: '2024-09-03',
    packageType: 'group',
  },
]

// ─── Staff ────────────────────────────────────────────────────────────────────

export const mockStaff: Staff[] = [
  { id: 'staff_001', businessId: 'biz_001', name: 'Declan Moriarty', role: 'Head PT' },
  { id: 'staff_002', businessId: 'biz_001', name: 'Fiona Kelly', role: 'Pilates Instructor' },
  { id: 'staff_003', businessId: 'biz_001', name: 'Sean Doyle', role: 'Sports Therapist' },
]

// ─── Bookings (today 2026-04-12) ──────────────────────────────────────────────

export const mockBookings: Booking[] = [
  {
    id: 'book_001',
    customerId: 'cust_003',
    serviceId: 'svc_001',
    staffId: 'staff_001',
    date: '2026-04-12',
    time: '09:00',
    status: 'checked-in',
    price: 65,
  },
  {
    id: 'book_002',
    customerId: 'cust_001',
    serviceId: 'svc_002',
    staffId: 'staff_002',
    date: '2026-04-12',
    time: '10:30',
    status: 'confirmed',
    price: 45,
  },
  {
    id: 'book_003',
    customerId: 'cust_005',
    serviceId: 'svc_003',
    staffId: 'staff_003',
    date: '2026-04-12',
    time: '12:00',
    status: 'confirmed',
    price: 80,
  },
  {
    id: 'book_004',
    customerId: 'cust_002',
    serviceId: 'svc_001',
    staffId: 'staff_001',
    date: '2026-04-12',
    time: '14:00',
    status: 'pending',
    price: 65,
  },
  {
    id: 'book_005',
    customerId: 'cust_004',
    serviceId: 'svc_005',
    date: '2026-04-12',
    time: '15:00',
    status: 'pending',
    price: 50,
  },
  {
    id: 'book_006',
    customerId: 'cust_006',
    serviceId: 'svc_004',
    date: '2026-04-12',
    time: '16:00',
    status: 'confirmed',
    price: 25,
  },
  {
    id: 'book_007',
    customerId: 'cust_001',
    serviceId: 'svc_003',
    staffId: 'staff_003',
    date: '2026-04-12',
    time: '17:30',
    status: 'confirmed',
    price: 80,
  },
  {
    id: 'book_008',
    customerId: 'cust_005',
    serviceId: 'svc_001',
    staffId: 'staff_001',
    date: '2026-04-12',
    time: '18:30',
    status: 'confirmed',
    price: 65,
  },
  // Previous days for bookings list variety
  {
    id: 'book_009',
    customerId: 'cust_003',
    serviceId: 'svc_002',
    staffId: 'staff_002',
    date: '2026-04-11',
    time: '11:00',
    status: 'completed',
    price: 45,
  },
  {
    id: 'book_010',
    customerId: 'cust_002',
    serviceId: 'svc_004',
    date: '2026-04-11',
    time: '09:30',
    status: 'completed',
    price: 25,
  },
  {
    id: 'book_011',
    customerId: 'cust_006',
    serviceId: 'svc_001',
    staffId: 'staff_001',
    date: '2026-04-10',
    time: '10:00',
    status: 'cancelled',
    price: 65,
  },
]

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export const mockDashboardStats: DashboardStats = {
  revenueToday: 347,
  bookingsToday: 8,
  activeClients: 142,
  packageRevenue: 1200,
  weeklyRevenue: [320, 480, 280, 540, 440, 380, 347],
  upcomingCount: 14,
  waitlistCount: 3,
}

// ─── Packages ─────────────────────────────────────────────────────────────────

export const mockPackages: Package[] = [
  {
    id: 'pkg_001',
    businessId: 'biz_001',
    name: '10-Session Bundle',
    sessionCount: 10,
    price: 550,
    savings: 100,
    activeCount: 23,
    color: '#D4AF37',
  },
  {
    id: 'pkg_002',
    businessId: 'biz_001',
    name: 'Monthly Membership',
    sessionCount: 8,
    price: 180,
    savings: 40,
    activeCount: 61,
    color: '#60A5FA',
  },
  {
    id: 'pkg_003',
    businessId: 'biz_001',
    name: '5-Session Starter',
    sessionCount: 5,
    price: 290,
    savings: 35,
    activeCount: 18,
    color: '#34D399',
  },
  {
    id: 'pkg_004',
    businessId: 'biz_001',
    name: 'Group Class Pass ×10',
    sessionCount: 10,
    price: 210,
    savings: 40,
    activeCount: 34,
    color: '#F87171',
  },
]

// ─── Time Slots ───────────────────────────────────────────────────────────────

export const mockTimeSlots: TimeSlot[] = [
  { time: '09:00', available: false },
  { time: '10:00', available: true },
  { time: '10:30', available: false },
  { time: '11:00', available: true },
  { time: '11:30', available: true },
  { time: '12:00', available: false },
  { time: '13:00', available: true },
  { time: '13:30', available: true },
  { time: '14:00', available: false },
  { time: '15:00', available: true },
  { time: '15:30', available: true },
  { time: '17:00', available: true },
]

// ─── Messages ─────────────────────────────────────────────────────────────────

export const mockMessages: MessageThread[] = [
  {
    id: 'msg_001',
    customerId: 'cust_001',
    customerName: 'Ciara Murphy',
    preview: 'Hi! Can I move my Thursday session to Friday afternoon?',
    timestamp: '2026-04-12T14:32:00Z',
    unread: true,
  },
  {
    id: 'msg_002',
    customerId: 'cust_005',
    customerName: 'Niamh Brennan',
    preview: 'Thanks for the session today, really felt the difference!',
    timestamp: '2026-04-12T12:15:00Z',
    unread: true,
  },
  {
    id: 'msg_003',
    customerId: 'cust_003',
    customerName: 'Aoife Ryan',
    preview: 'Perfect, see you at 9am tomorrow. Bringing a friend who might join.',
    timestamp: '2026-04-11T18:45:00Z',
    unread: false,
  },
  {
    id: 'msg_004',
    customerId: 'cust_002',
    customerName: 'Liam O\'Brien',
    preview: 'Do you have any slots free this weekend for a double session?',
    timestamp: '2026-04-11T09:22:00Z',
    unread: false,
  },
  {
    id: 'msg_005',
    customerId: 'cust_004',
    customerName: 'Patrick Walsh',
    preview: 'Would love to discuss the nutrition plan when we meet on Tuesday.',
    timestamp: '2026-04-10T16:50:00Z',
    unread: false,
  },
]

// ─── Service functions (swap for real Supabase queries later) ─────────────────

export function getBookingsForDate(date: string): Booking[] {
  return mockBookings.filter((b) => b.date === date)
}

export function getCustomerById(id: string): Customer | undefined {
  return mockCustomers.find((c) => c.id === id)
}

export function getServiceById(id: string): Service | undefined {
  return mockServices.find((s) => s.id === id)
}

export function getStaffById(id: string): Staff | undefined {
  return mockStaff.find((s) => s.id === id)
}

export function getBusinessBySlug(slug: string): Business | undefined {
  return mockBusiness.slug === slug ? mockBusiness : undefined
}
