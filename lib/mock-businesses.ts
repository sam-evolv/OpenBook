export interface MockService {
  name: string
  duration: string
  price: string
  colour: string
  category: string
}

export interface MockPackage {
  tag: string
  tagColour: string
  name: string
  sub: string
  price: string
  save: string
}

export interface MockBusiness {
  slug: string
  name: string
  nameLine1: string
  nameLine2: string
  primaryColour: string
  secondaryColour: string
  eyebrow: string
  meta: string
  pills: string[]
  categories: string[]
  services: MockService[]
  packages: MockPackage[]
  ctaText: string
  heroImage: string
  heroFilter: string
  heroGradient: string
  initials: string
  // Explore / home display
  type: string
  rating: string
  priceRange: string
  distance?: string
  img: string
}

export const MOCK_BUSINESSES: MockBusiness[] = [
  {
    slug: 'evolv-performance',
    name: 'Evolv Performance',
    nameLine1: 'Evolv',
    nameLine2: 'Performance',
    primaryColour: '#D4AF37',
    secondaryColour: '#C9A961',
    eyebrow: 'OPEN NOW · MACURTAIN ST · CORK',
    meta: 'Personal Training & Wellness · Est. 2019',
    pills: ['★ 4.9 (142)', 'Next: 10am', '€25+'],
    categories: ['PT', 'Massage', 'Pilates'],
    services: [
      { name: 'Personal Training', duration: '60 min', price: '€65', colour: '#D4AF37', category: 'PT' },
      { name: 'Sports Massage', duration: '45 min', price: '€55', colour: '#C9A961', category: 'Massage' },
      { name: 'Pilates Class', duration: '50 min', price: '€25', colour: '#B8934C', category: 'Pilates' },
      { name: 'Initial Assessment', duration: '30 min', price: '€40', colour: '#D4AF37', category: 'PT' },
    ],
    packages: [
      { tag: 'BEST VALUE', tagColour: '#D4AF37', name: '10-Session Block', sub: 'PT + 2 massages included', price: '€550', save: 'Save €100' },
      { tag: 'STARTER', tagColour: '#a3a3a3', name: 'Intro Pack', sub: '3 PT sessions', price: '€150', save: 'Save €45' },
    ],
    ctaText: 'Book a Session',
    heroImage: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80&auto=format',
    heroFilter: 'brightness(0.55)',
    heroGradient: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.25) 60%, transparent 100%)',
    initials: 'EP',
    type: 'PT · Massage · Pilates',
    rating: '4.9',
    priceRange: '€25+',
    img: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=70&auto=format',
  },
  {
    slug: 'saltwater-sauna',
    name: 'Saltwater Sauna',
    nameLine1: 'Saltwater',
    nameLine2: 'Sauna',
    primaryColour: '#a78bfa',
    secondaryColour: '#8b5cf6',
    eyebrow: 'OPEN NOW · ATLANTIC QUAY · CORK',
    meta: 'Recovery & Wellness · Est. 2021',
    pills: ['★ 4.8 (98)', 'Next: 11am', '€25+'],
    categories: ['Sauna', 'Ice Bath'],
    services: [
      { name: 'Sauna Session', duration: '45 min', price: '€25', colour: '#a78bfa', category: 'Sauna' },
      { name: 'Ice Bath + Sauna', duration: '60 min', price: '€40', colour: '#8b5cf6', category: 'Ice Bath' },
      { name: 'Group Contrast Therapy', duration: '90 min', price: '€35', colour: '#7c3aed', category: 'Sauna' },
    ],
    packages: [
      { tag: 'POPULAR', tagColour: '#a78bfa', name: 'Monthly Pass', sub: 'Unlimited sauna access', price: '€79', save: 'Save €40' },
      { tag: 'INTRO', tagColour: '#a3a3a3', name: 'Starter Pack', sub: '5 sessions', price: '€99', save: 'Save €26' },
    ],
    ctaText: 'Book a Session',
    heroImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80&auto=format',
    heroFilter: 'brightness(0.55) saturate(0.8)',
    heroGradient: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(139,92,246,0.12) 60%, transparent 100%)',
    initials: 'SS',
    type: 'Sauna · Ice Bath',
    rating: '4.8',
    priceRange: '€25+',
    img: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=70&auto=format',
  },
  {
    slug: 'the-nail-studio',
    name: 'The Nail Studio',
    nameLine1: 'The Nail',
    nameLine2: 'Studio',
    primaryColour: '#f472b6',
    secondaryColour: '#ec4899',
    eyebrow: 'OPEN NOW · PATRICK ST · CORK',
    meta: 'Nail Art & Beauty · Est. 2020',
    pills: ['★ 4.7 (203)', 'Next: 2pm', '€40+'],
    categories: ['Gel', 'Acrylics', 'Salon'],
    services: [
      { name: 'Gel Manicure', duration: '60 min', price: '€45', colour: '#f472b6', category: 'Gel' },
      { name: 'Acrylic Full Set', duration: '90 min', price: '€65', colour: '#ec4899', category: 'Acrylics' },
      { name: 'Nail Art Add-on', duration: '30 min', price: '€20', colour: '#db2777', category: 'Gel' },
      { name: 'Removal + Rebase', duration: '45 min', price: '€40', colour: '#f472b6', category: 'Acrylics' },
    ],
    packages: [
      { tag: 'POPULAR', tagColour: '#f472b6', name: 'Glow Up Bundle', sub: 'Gel mani + nail art', price: '€55', save: 'Save €10' },
      { tag: 'MONTHLY', tagColour: '#a3a3a3', name: 'Monthly Refresh', sub: '2 gel manis per month', price: '€75', save: 'Save €15' },
    ],
    ctaText: 'Book Appointment',
    heroImage: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&q=80&auto=format',
    heroFilter: 'brightness(0.55)',
    heroGradient: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(244,114,182,0.1) 60%, transparent 100%)',
    initials: 'NS',
    type: 'Gel · Acrylics',
    rating: '4.7',
    priceRange: '€40+',
    img: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&q=70&auto=format',
  },
  {
    slug: 'refresh-barber',
    name: 'Refresh Barber',
    nameLine1: 'Refresh',
    nameLine2: 'Barber',
    primaryColour: '#34d399',
    secondaryColour: '#10b981',
    eyebrow: 'OPEN NOW · WASHINGTON ST · CORK',
    meta: 'Barbershop & Grooming · Est. 2018',
    pills: ['★ 4.9 (317)', 'Next: 12pm', '€20+'],
    categories: ['Barber', 'Fade', 'Beard'],
    services: [
      { name: 'Haircut & Style', duration: '30 min', price: '€25', colour: '#34d399', category: 'Barber' },
      { name: 'Skin Fade', duration: '45 min', price: '€30', colour: '#10b981', category: 'Fade' },
      { name: 'Beard Trim', duration: '20 min', price: '€15', colour: '#059669', category: 'Beard' },
      { name: 'Cut + Beard Combo', duration: '60 min', price: '€40', colour: '#34d399', category: 'Barber' },
    ],
    packages: [
      { tag: 'LOYALTY', tagColour: '#34d399', name: '6-Cut Card', sub: 'Any style, valid 3 months', price: '€120', save: 'Save €30' },
      { tag: 'GROOMING', tagColour: '#a3a3a3', name: 'Monthly Groom', sub: '2 cuts + beard trims', price: '€65', save: 'Save €15' },
    ],
    ctaText: 'Book a Cut',
    heroImage: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&q=80&auto=format',
    heroFilter: 'brightness(0.55)',
    heroGradient: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(52,211,153,0.1) 60%, transparent 100%)',
    initials: 'RB',
    type: 'Barber · Fade',
    rating: '4.9',
    priceRange: '€20+',
    img: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400&q=70&auto=format',
  },
  {
    slug: 'cork-physio',
    name: 'Cork Physio',
    nameLine1: 'Cork',
    nameLine2: 'Physio',
    primaryColour: '#60a5fa',
    secondaryColour: '#3b82f6',
    eyebrow: 'OPEN NOW · SOUTH MALL · CORK',
    meta: 'Physiotherapy & Sports Rehab · Est. 2016',
    pills: ['★ 4.8 (89)', 'Next: 9am', '€60+'],
    categories: ['Physio', 'Sports Rehab', 'Dry Needling'],
    services: [
      { name: 'Initial Assessment', duration: '60 min', price: '€75', colour: '#60a5fa', category: 'Physio' },
      { name: 'Follow-up Session', duration: '45 min', price: '€60', colour: '#3b82f6', category: 'Physio' },
      { name: 'Sports Massage', duration: '45 min', price: '€55', colour: '#2563eb', category: 'Sports Rehab' },
      { name: 'Dry Needling', duration: '30 min', price: '€50', colour: '#60a5fa', category: 'Dry Needling' },
    ],
    packages: [
      { tag: 'REHAB', tagColour: '#60a5fa', name: 'Recovery Pack', sub: '6 follow-up sessions', price: '€300', save: 'Save €60' },
      { tag: 'ASSESSMENT', tagColour: '#a3a3a3', name: 'Full Start', sub: 'Assessment + 2 sessions', price: '€175', save: 'Save €20' },
    ],
    ctaText: 'Book Assessment',
    heroImage: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&q=80&auto=format',
    heroFilter: 'brightness(0.55)',
    heroGradient: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(96,165,250,0.1) 60%, transparent 100%)',
    initials: 'CP',
    type: 'Physio · Sports Rehab',
    rating: '4.8',
    priceRange: '€60+',
    distance: '0.8km',
    img: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=200&q=70&auto=format',
  },
  {
    slug: 'yoga-flow-cork',
    name: 'Yoga Flow Cork',
    nameLine1: 'Yoga Flow',
    nameLine2: 'Cork',
    primaryColour: '#fb923c',
    secondaryColour: '#f97316',
    eyebrow: 'OPEN NOW · SHANDON ST · CORK',
    meta: 'Yoga & Breathwork Studio · Est. 2017',
    pills: ['★ 4.9 (156)', 'Next: 7am', '€15+'],
    categories: ['Yoga', 'Breathwork', 'Meditation'],
    services: [
      { name: 'Morning Flow', duration: '60 min', price: '€15', colour: '#fb923c', category: 'Yoga' },
      { name: 'Power Vinyasa', duration: '75 min', price: '€18', colour: '#f97316', category: 'Yoga' },
      { name: 'Breathwork Session', duration: '45 min', price: '€20', colour: '#ea580c', category: 'Breathwork' },
      { name: 'Private Session', duration: '60 min', price: '€60', colour: '#fb923c', category: 'Meditation' },
    ],
    packages: [
      { tag: 'UNLIMITED', tagColour: '#fb923c', name: 'Monthly Membership', sub: 'All classes included', price: '€59', save: 'Save €55' },
      { tag: 'STARTER', tagColour: '#a3a3a3', name: '10-Class Pack', sub: 'Any class, no expiry', price: '€120', save: 'Save €30' },
    ],
    ctaText: 'Join a Class',
    heroImage: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80&auto=format',
    heroFilter: 'brightness(0.55)',
    heroGradient: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(251,146,60,0.1) 60%, transparent 100%)',
    initials: 'YF',
    type: 'Yoga · Breathwork',
    rating: '4.9',
    priceRange: '€15+',
    distance: '1.1km',
    img: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=200&q=70&auto=format',
  },
  {
    slug: 'iron-gym-cork',
    name: 'Iron Gym Cork',
    nameLine1: 'Iron Gym',
    nameLine2: 'Cork',
    primaryColour: 'rgba(255,255,255,0.7)',
    secondaryColour: 'rgba(255,255,255,0.5)',
    eyebrow: 'OPEN 24/7 · BALLINCOLLIG · CORK',
    meta: 'Gym & Fitness Centre · Est. 2015',
    pills: ['★ 4.6 (428)', '24hr Access', '€35+'],
    categories: ['Gym', '24hr Access', 'Classes'],
    services: [
      { name: 'Day Pass', duration: '24 hrs', price: '€10', colour: 'rgba(255,255,255,0.6)', category: 'Gym' },
      { name: 'PT Session', duration: '60 min', price: '€50', colour: 'rgba(255,255,255,0.5)', category: 'Gym' },
      { name: 'Group Class', duration: '45 min', price: '€12', colour: 'rgba(255,255,255,0.4)', category: 'Classes' },
    ],
    packages: [
      { tag: 'MEMBERSHIP', tagColour: 'rgba(255,255,255,0.7)', name: 'Monthly Gym', sub: 'Unlimited access + classes', price: '€35', save: 'Save €15' },
      { tag: 'ANNUAL', tagColour: '#a3a3a3', name: 'Year Pass', sub: 'Best long-term value', price: '€299', save: 'Save €121' },
    ],
    ctaText: 'Join the Gym',
    heroImage: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80&auto=format',
    heroFilter: 'brightness(0.45) saturate(0.6)',
    heroGradient: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.3) 60%, transparent 100%)',
    initials: 'IG',
    type: 'Gym · 24hr Access',
    rating: '4.6',
    priceRange: '€35+',
    distance: '0.5km',
    img: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200&q=70&auto=format',
  },
]

export const MOCK_BUSINESS_MAP: Record<string, MockBusiness> = Object.fromEntries(
  MOCK_BUSINESSES.map((b) => [b.slug, b])
)
