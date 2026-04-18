import {
  Dumbbell,
  Scissors,
  Flame,
  Sparkles,
  Stethoscope,
  Waves,
  HandHelping,
  Brush,
  Car,
  type LucideIcon,
} from 'lucide-react';

export type CategoryKey =
  | 'gym'
  | 'barber'
  | 'sauna'
  | 'salon'
  | 'physio'
  | 'yoga'
  | 'massage'
  | 'nails'
  | 'driving'
  | 'default';

export interface CategoryConfig {
  /** Lucide icon component for the app icon */
  icon: LucideIcon;
  /** Three-stop gradient for photorealistic depth */
  gradient: {
    highlight: string;  /* top-left bright */
    base: string;       /* middle tone */
    shadow: string;     /* bottom-right dark */
  };
  /** Label for fallback */
  label: string;
  /** Curated hero photos — editorial quality only */
  heroImages: string[];
}

export const CATEGORIES: Record<CategoryKey, CategoryConfig> = {
  gym: {
    icon: Dumbbell,
    gradient: { highlight: '#2A2A2F', base: '#151518', shadow: '#05050A' },
    label: 'Fitness',
    heroImages: [
      'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=85&w=1600',
      'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=85&w=1600',
      'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?q=85&w=1600',
    ],
  },
  barber: {
    icon: Scissors,
    gradient: { highlight: '#18543A', base: '#0C3622', shadow: '#05210F' },
    label: 'Barber',
    heroImages: [
      'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=85&w=1600',
      'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?q=85&w=1600',
      'https://images.unsplash.com/photo-1621605815971-fbc98d665033?q=85&w=1600',
    ],
  },
  sauna: {
    icon: Flame,
    gradient: { highlight: '#5D3A8F', base: '#3D1F6B', shadow: '#1E0E3D' },
    label: 'Sauna',
    heroImages: [
      'https://images.unsplash.com/photo-1610289462330-f27f8557a6b4?q=85&w=1600',
      'https://images.unsplash.com/photo-1584555613497-9ecf9dd06f68?q=85&w=1600',
      'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?q=85&w=1600',
    ],
  },
  salon: {
    icon: Sparkles,
    gradient: { highlight: '#E9709E', base: '#C44775', shadow: '#7A1F44' },
    label: 'Salon',
    heroImages: [
      'https://images.unsplash.com/photo-1600948836101-f9ffda59d250?q=85&w=1600',
      'https://images.unsplash.com/photo-1560066984-138dadb4c035?q=85&w=1600',
      'https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?q=85&w=1600',
    ],
  },
  physio: {
    icon: Stethoscope,
    gradient: { highlight: '#4A8AD6', base: '#2A5FA3', shadow: '#0F2F5C' },
    label: 'Physio',
    heroImages: [
      'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=85&w=1600',
      'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=85&w=1600',
      'https://images.unsplash.com/photo-1576091160550-2173dba999ef?q=85&w=1600',
    ],
  },
  yoga: {
    icon: HandHelping,
    gradient: { highlight: '#F6A556', base: '#D47D2A', shadow: '#804413' },
    label: 'Yoga',
    heroImages: [
      'https://images.unsplash.com/photo-1588286840104-8957b019727f?q=85&w=1600',
      'https://images.unsplash.com/photo-1545205597-3d9d02c29597?q=85&w=1600',
      'https://images.unsplash.com/photo-1599447421416-3414500d18a5?q=85&w=1600',
    ],
  },
  massage: {
    icon: Waves,
    gradient: { highlight: '#6AB8A8', base: '#3E8577', shadow: '#1C4A41' },
    label: 'Massage',
    heroImages: [
      'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?q=85&w=1600',
      'https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=85&w=1600',
    ],
  },
  nails: {
    icon: Brush,
    gradient: { highlight: '#F285AB', base: '#D4477E', shadow: '#7A1F44' },
    label: 'Nails',
    heroImages: [
      'https://images.unsplash.com/photo-1604654894610-df63bc536371?q=85&w=1600',
      'https://images.unsplash.com/photo-1632345031435-8727f6897d53?q=85&w=1600',
      'https://images.unsplash.com/photo-1610992015732-2449b76344bc?q=85&w=1600',
    ],
  },
  driving: {
    icon: Car,
    gradient: { highlight: '#5B7EFF', base: '#3A5ADB', shadow: '#1E2F80' },
    label: 'Driving',
    heroImages: [
      'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?q=85&w=1600',
    ],
  },
  default: {
    icon: Sparkles,
    gradient: { highlight: '#E8C76B', base: '#D4AF37', shadow: '#8B6428' },
    label: 'Business',
    heroImages: [
      'https://images.unsplash.com/photo-1497366216548-37526070297c?q=85&w=1600',
    ],
  },
};

/**
 * Map a business's category string to a CategoryKey.
 * Tolerant of varied user input ("Personal Training", "Health & Therapy", etc).
 */
export function resolveCategory(categoryText: string | null | undefined): CategoryKey {
  if (!categoryText) return 'default';
  const s = categoryText.toLowerCase();
  if (s.includes('gym') || s.includes('fitness') || s.includes('personal training')) return 'gym';
  if (s.includes('barber')) return 'barber';
  if (s.includes('sauna') || s.includes('spa')) return 'sauna';
  if (s.includes('nail')) return 'nails';
  if (s.includes('salon') || s.includes('beauty') || s.includes('hair')) return 'salon';
  if (s.includes('physio') || s.includes('health') || s.includes('therapy')) return 'physio';
  if (s.includes('yoga') || s.includes('pilates')) return 'yoga';
  if (s.includes('massage')) return 'massage';
  if (s.includes('driving') || s.includes('instructor')) return 'driving';
  return 'default';
}

/** Deterministically pick a hero image for a business based on its slug. */
export function heroForBusiness(slug: string, category: string | null): string {
  const key = resolveCategory(category);
  const pool = CATEGORIES[key].heroImages;
  if (!pool.length) return CATEGORIES.default.heroImages[0];
  // Hash slug for stable selection
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) | 0;
  return pool[Math.abs(h) % pool.length];
}
