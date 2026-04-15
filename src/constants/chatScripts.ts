export type MessageType =
  | 'text'
  | 'slots'
  | 'business-card'
  | 'map-card'
  | 'flash-deal'
  | 'confirm-cta';

export interface SlotOption {
  label: string;
  id: string;
}

export interface BusinessCardData {
  name: string;
  rating: number;
  reviews: number;
  distance: string;
  categories: string[];
  price: string;
  description: string;
}

export interface MapPin {
  label: string;
  x: number;
  y: number;
}

export interface MapCardData {
  pins: MapPin[];
  resultCount: number;
  userDot: { x: number; y: number };
}

export interface FlashDealData {
  business: string;
  description: string;
  originalPrice: string;
  currentPrice: string;
  savings: string;
  expiresInSeconds: number;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  type: MessageType;
  text?: string;
  slots?: SlotOption[];
  businessCard?: BusinessCardData;
  mapCard?: MapCardData;
  flashDeal?: FlashDealData;
  delay?: number;
}

export interface ChatScript {
  initialUserMessage: string;
  messages: ChatMessage[];
}

export const chatScripts: Record<string, ChatScript> = {
  nail: {
    initialUserMessage: 'Find me a nail appointment nearby',
    messages: [
      {
        id: 'nail-1',
        sender: 'ai',
        type: 'text',
        text: "I found a great spot near you. PolishPro Nails has availability today. They're rated 4.9 stars and just 0.3 miles away.",
        delay: 900,
      },
      {
        id: 'nail-2',
        sender: 'ai',
        type: 'text',
        text: 'Here are the available time slots for today:',
        delay: 900,
      },
      {
        id: 'nail-3',
        sender: 'ai',
        type: 'slots',
        slots: [
          { label: '10:00 AM', id: 'slot-1' },
          { label: '11:30 AM', id: 'slot-2' },
          { label: '2:00 PM', id: 'slot-3' },
          { label: '3:30 PM', id: 'slot-4' },
          { label: '5:00 PM', id: 'slot-5' },
        ],
        delay: 900,
      },
      {
        id: 'nail-4',
        sender: 'user',
        type: 'text',
        text: '2:00 PM works great!',
        delay: 500,
      },
      {
        id: 'nail-5',
        sender: 'ai',
        type: 'text',
        text: "Perfect. I've reserved the 2:00 PM slot at PolishPro Nails for you. Gel manicure, 45 minutes, $38. Ready to confirm?",
        delay: 900,
      },
      {
        id: 'nail-6',
        sender: 'ai',
        type: 'confirm-cta',
        text: 'Confirm Booking',
        delay: 600,
      },
    ],
  },

  gym: {
    initialUserMessage: 'Find me a gym nearby',
    messages: [
      {
        id: 'gym-1',
        sender: 'ai',
        type: 'text',
        text: 'I found 3 top-rated gyms near you. Let me show you where they are.',
        delay: 900,
      },
      {
        id: 'gym-2',
        sender: 'ai',
        type: 'map-card',
        mapCard: {
          pins: [
            { label: 'IronWorks', x: 35, y: 30 },
            { label: 'FitLife', x: 65, y: 55 },
            { label: 'CorePower', x: 45, y: 75 },
          ],
          resultCount: 3,
          userDot: { x: 50, y: 50 },
        },
        delay: 900,
      },
      {
        id: 'gym-3',
        sender: 'ai',
        type: 'text',
        text: "Here's the top pick based on rating and proximity:",
        delay: 900,
      },
      {
        id: 'gym-4',
        sender: 'ai',
        type: 'business-card',
        businessCard: {
          name: 'IronWorks Gym & Fitness',
          rating: 4.8,
          reviews: 342,
          distance: '0.2 mi',
          categories: ['Weights', 'Cardio', 'Classes', 'Sauna'],
          price: '$29/day pass',
          description:
            'Full-service gym with Olympic lifting platforms, group fitness classes, and luxury recovery suite.',
        },
        delay: 900,
      },
      {
        id: 'gym-5',
        sender: 'ai',
        type: 'text',
        text: 'Want me to book a day pass for you?',
        delay: 900,
      },
      {
        id: 'gym-6',
        sender: 'user',
        type: 'text',
        text: 'Yes, book it!',
        delay: 500,
      },
      {
        id: 'gym-7',
        sender: 'ai',
        type: 'confirm-cta',
        text: 'Confirm Booking',
        delay: 900,
      },
    ],
  },

  date: {
    initialUserMessage: 'Plan a date night for tonight',
    messages: [
      {
        id: 'date-1',
        sender: 'ai',
        type: 'text',
        text: "Love it. I'll put together the perfect evening for you. I found some amazing options nearby.",
        delay: 900,
      },
      {
        id: 'date-2',
        sender: 'ai',
        type: 'text',
        text: "For dinner, I'd recommend these two:",
        delay: 900,
      },
      {
        id: 'date-3',
        sender: 'ai',
        type: 'slots',
        slots: [
          { label: 'Noire Bistro', id: 'rest-1' },
          { label: 'Sakura Omakase', id: 'rest-2' },
        ],
        delay: 900,
      },
      {
        id: 'date-4',
        sender: 'user',
        type: 'text',
        text: 'Sakura Omakase sounds amazing',
        delay: 500,
      },
      {
        id: 'date-5',
        sender: 'ai',
        type: 'text',
        text: "Great taste. Sakura Omakase has a table for two at 7:30 PM tonight. Chef's 8-course omakase, $89 per person. One of the top-rated spots in the city.",
        delay: 900,
      },
      {
        id: 'date-6',
        sender: 'ai',
        type: 'business-card',
        businessCard: {
          name: 'Sakura Omakase',
          rating: 4.9,
          reviews: 528,
          distance: '0.8 mi',
          categories: ['Japanese', 'Omakase', 'Sake Bar', 'Fine Dining'],
          price: '$89/person',
          description:
            "Intimate 12-seat omakase counter with master chef Tanaka. Seasonal fish flown in daily from Tokyo's Tsukiji market.",
        },
        delay: 900,
      },
      {
        id: 'date-7',
        sender: 'ai',
        type: 'confirm-cta',
        text: 'Confirm Reservation',
        delay: 600,
      },
    ],
  },

  flash: {
    initialUserMessage: "Show me today's flash deals",
    messages: [
      {
        id: 'flash-1',
        sender: 'ai',
        type: 'text',
        text: "Hot deal alert. Here's the best flash deal near you right now:",
        delay: 900,
      },
      {
        id: 'flash-2',
        sender: 'ai',
        type: 'flash-deal',
        flashDeal: {
          business: 'Glow Skin Studio',
          description:
            'Luxury HydraFacial + LED Light Therapy combo. 60 minutes of pure rejuvenation.',
          originalPrice: '$189',
          currentPrice: '$69',
          savings: '63% OFF',
          expiresInSeconds: 1847,
        },
        delay: 900,
      },
      {
        id: 'flash-3',
        sender: 'ai',
        type: 'confirm-cta',
        text: 'Grab This Deal',
        delay: 600,
      },
    ],
  },

  custom: {
    initialUserMessage: '',
    messages: [
      {
        id: 'custom-1',
        sender: 'ai',
        type: 'text',
        text: "I'd love to help. Let me look into that for you...",
        delay: 900,
      },
      {
        id: 'custom-2',
        sender: 'ai',
        type: 'text',
        text: "I found some great options nearby. Here's what I'd recommend:",
        delay: 900,
      },
      {
        id: 'custom-3',
        sender: 'ai',
        type: 'business-card',
        businessCard: {
          name: 'Top Local Pick',
          rating: 4.7,
          reviews: 186,
          distance: '0.4 mi',
          categories: ['Popular', 'Highly Rated', 'Nearby'],
          price: 'From $25',
          description:
            'A highly rated local favourite with excellent service and great reviews from the community.',
        },
        delay: 900,
      },
      {
        id: 'custom-4',
        sender: 'ai',
        type: 'confirm-cta',
        text: 'Confirm Booking',
        delay: 600,
      },
    ],
  },
};

export const suggestionPills = [
  { label: 'Book a nail apt', type: 'nail' },
  { label: 'Find a gym nearby', type: 'gym' },
  { label: 'Plan a date night', type: 'date' },
  { label: 'Flash deals near me', type: 'flash' },
] as const;
