-- ============================================================
-- OpenBook v3: Rich "business as an app" migration
-- ============================================================
-- Adds customisable fields so each business's page feels like
-- their own app. Also seeds sample rich content for the 7 Cork
-- seed businesses so everything renders nicely out of the box.
-- ============================================================

-- ------------------------------------------------------------
-- 1. New columns on `businesses`
-- ------------------------------------------------------------
alter table businesses add column if not exists tagline text;
alter table businesses add column if not exists about_long text;
alter table businesses add column if not exists gallery_urls text[];
alter table businesses add column if not exists team jsonb;
alter table businesses add column if not exists testimonials jsonb;
alter table businesses add column if not exists offers jsonb;

-- Comment for owners / admins
comment on column businesses.tagline is
  'Short marketing tagline shown under the business name on their app page';
comment on column businesses.about_long is
  'Full About section, supports line breaks';
comment on column businesses.gallery_urls is
  'Array of image URLs for the gallery carousel';
comment on column businesses.team is
  'Array of { name, role, photo_url? }';
comment on column businesses.testimonials is
  'Array of { quote, author, rating? }';
comment on column businesses.offers is
  'Array of { title, description, badge? }';

-- ------------------------------------------------------------
-- 2. Seed rich content for the 7 Cork businesses
-- ------------------------------------------------------------
-- Evolv Performance — personal training, gold
update businesses set
  tagline = 'Strength, hypertrophy and performance coaching in Cork City.',
  about_long = 'Evolv Performance is a private coaching studio founded on the belief that everyone deserves a coach who actually knows them.

We specialise in strength, hypertrophy and athletic performance for busy professionals and amateur athletes. Every programme is built around your schedule, your injury history, and your goals — no templates, no cookie-cutter plans.

Our studio is fully equipped with competition-grade barbells, dumbbells, plates, and recovery tools. Sessions are one-to-one or two-to-one only.',
  gallery_urls = array[
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800',
    'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800',
    'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800',
    'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=800'
  ],
  team = '[
    {"name": "Sam Donworth", "role": "Founder & Head Coach", "photo_url": "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400"},
    {"name": "Rachel Kelly", "role": "Strength Coach"},
    {"name": "Mark Byrne", "role": "Rehab Specialist"}
  ]'::jsonb,
  testimonials = '[
    {"quote": "Sam transformed my deadlift from 100kg to 180kg in 14 months. Best coaching investment I have ever made.", "author": "Conor M.", "rating": 5},
    {"quote": "Finally a trainer who actually writes programmes instead of making up sessions on the spot.", "author": "Aisling T.", "rating": 5},
    {"quote": "The attention to technique is unreal. My back pain is gone for the first time in years.", "author": "David O.", "rating": 5}
  ]'::jsonb,
  offers = '[
    {"title": "First session free", "description": "Book an assessment at no cost — programme designed on the spot.", "badge": "New"},
    {"title": "12-week transformation", "description": "Dedicated programming, weekly check-ins, nutrition framework.", "badge": "Popular"}
  ]'::jsonb
where slug = 'evolv-performance';

-- Saltwater Sauna Cork — sauna/spa, purple
update businesses set
  tagline = 'Ocean-side wood-fired sauna sessions at Garrettstown Beach.',
  about_long = 'Saltwater Sauna is Cork''s original seaside sauna experience. Our wood-fired cedar saunas sit 20 metres from the shoreline at Garrettstown — step out of the heat straight into the Atlantic.

Each session is 60 minutes with towel service, spring water, and access to our changing huts. Groups of up to 6 can book the private sauna. Weekly cold-plunge socials every Saturday morning at 8am.',
  gallery_urls = array[
    'https://images.unsplash.com/photo-1610289462330-f27f8557a6b4?w=800',
    'https://images.unsplash.com/photo-1584555613497-9ecf9dd06f68?w=800',
    'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800'
  ],
  team = '[
    {"name": "Niamh Quinn", "role": "Owner"},
    {"name": "Oisín Murphy", "role": "Sauna Master"}
  ]'::jsonb,
  testimonials = '[
    {"quote": "Nothing beats a Saturday sauna and sea dip. Life-changing.", "author": "Emma R.", "rating": 5},
    {"quote": "The Atlantic cold plunge after the sauna is the best reset I have ever found.", "author": "Paul F.", "rating": 5}
  ]'::jsonb,
  offers = '[
    {"title": "Saturday cold-plunge social", "description": "Weekly sunrise session with coffee and pastries. 8am every Saturday.", "badge": "Weekly"}
  ]'::jsonb
where slug = 'saltwater-sauna-cork';

-- The Nail Studio — nails, pink
update businesses set
  tagline = 'Luxury nail art and gel in the heart of Cork City.',
  about_long = 'The Nail Studio is an award-winning nail salon specialising in detailed nail art, BIAB, and long-wear gel.

We pride ourselves on impeccable hygiene, premium products, and spending the time to get it right. Walk-ins welcome but booking is recommended — we fill up weeks in advance for weekend slots.',
  gallery_urls = array[
    'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800',
    'https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=800',
    'https://images.unsplash.com/photo-1610992015732-2449b76344bc?w=800'
  ],
  team = '[
    {"name": "Grace Walsh", "role": "Founder"},
    {"name": "Katie Doyle", "role": "Senior Nail Artist"},
    {"name": "Sophie Ryan", "role": "Nail Technician"}
  ]'::jsonb,
  testimonials = '[
    {"quote": "Absolute perfection. My nails have never lasted longer.", "author": "Laura B.", "rating": 5},
    {"quote": "The detail in the art is incredible. Worth every penny.", "author": "Ciara K.", "rating": 5}
  ]'::jsonb,
  offers = '[
    {"title": "Weekday lunchtime special", "description": "€10 off BIAB for appointments between 12–2pm, Mon–Thu.", "badge": "Save €10"}
  ]'::jsonb
where slug = 'the-nail-studio';

-- Refresh Barber — barbershop, green
update businesses set
  tagline = 'Modern cuts, classic grooming. Walk-ins welcome.',
  about_long = 'Refresh is a modern barbershop in Cork City focused on precision cuts, skin fades, and traditional hot-towel shaves.

Our barbers are all qualified with minimum 5 years experience. We use premium products from Layrite and Reuzel. No appointment needed but booking saves the queue.',
  gallery_urls = array[
    'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=800',
    'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=800',
    'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800'
  ],
  team = '[
    {"name": "Jake O''Leary", "role": "Head Barber"},
    {"name": "Tom Healy", "role": "Barber"}
  ]'::jsonb,
  testimonials = '[
    {"quote": "Best fade in Cork, hands down.", "author": "Eoin D.", "rating": 5},
    {"quote": "Been going for two years, never had a bad cut.", "author": "Michael G.", "rating": 5}
  ]'::jsonb,
  offers = '[
    {"title": "Student discount", "description": "€5 off any cut Mon–Wed with a valid student ID.", "badge": "-€5"}
  ]'::jsonb
where slug = 'refresh-barber';

-- Cork Physio & Sports — health, blue
update businesses set
  tagline = 'CORU-registered physiotherapy and sports rehabilitation.',
  about_long = 'Cork Physio & Sports is a specialist physiotherapy clinic treating sports injuries, post-operative rehabilitation, and chronic pain.

Our team combines manual therapy, strength & conditioning, and evidence-based treatment planning. We work with clients across GAA, rugby, running, and the general population.

All our physiotherapists are CORU-registered and members of the Irish Society of Chartered Physiotherapists.',
  gallery_urls = array[
    'https://images.unsplash.com/photo-1584515933487-779824d29309?w=800',
    'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800',
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800'
  ],
  team = '[
    {"name": "Dr. Sarah Collins", "role": "Chartered Physiotherapist"},
    {"name": "James Nolan", "role": "Sports Rehab"}
  ]'::jsonb,
  testimonials = '[
    {"quote": "Got me back running after 18 months of injury. Incredible work.", "author": "Brian M.", "rating": 5},
    {"quote": "Clear communication, realistic timelines, and actual results.", "author": "Áine F.", "rating": 5}
  ]'::jsonb,
  offers = '[
    {"title": "Initial assessment", "description": "60-minute assessment including treatment plan and home exercises."}
  ]'::jsonb
where slug = 'cork-physio-sports';

-- Yoga Flow Cork — yoga, orange
update businesses set
  tagline = 'Heated vinyasa, hatha, and restorative classes in Cork City.',
  about_long = 'Yoga Flow Cork is a boutique studio offering heated vinyasa, hatha, and restorative classes for all levels.

Our studio is equipped with infrared heating, premium mats on request, and shower facilities. Drop-ins welcome, 10-class packs available.',
  gallery_urls = array[
    'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=800',
    'https://images.unsplash.com/photo-1588286840104-8957b019727f?w=800',
    'https://images.unsplash.com/photo-1599447421416-3414500d18a5?w=800'
  ],
  team = '[
    {"name": "Maya Lennon", "role": "Studio Director"},
    {"name": "Róisín Keogh", "role": "Senior Instructor"}
  ]'::jsonb,
  testimonials = '[
    {"quote": "Most welcoming yoga studio I have ever been to.", "author": "Sinead L.", "rating": 5}
  ]'::jsonb,
  offers = '[
    {"title": "New student special", "description": "Two weeks of unlimited classes for €49.", "badge": "€49"}
  ]'::jsonb
where slug = 'yoga-flow-cork';

-- Iron Gym Cork — fitness, grey
update businesses set
  tagline = '24/7 strength-focused gym with dedicated platforms and powerlifting kit.',
  about_long = 'Iron Gym Cork is Cork''s premier strength gym. We stock 6 competition platforms, deadlift blocks, reverse hypers, a full set of specialty bars, and a dedicated strongman corner.

24/7 member access. Personal training available with our in-house coaches. Monthly strength meets.',
  gallery_urls = array[
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800',
    'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800'
  ],
  team = '[
    {"name": "Liam Fitzgerald", "role": "Gym Owner"},
    {"name": "Orla Kennedy", "role": "Head Coach"}
  ]'::jsonb,
  testimonials = '[
    {"quote": "Every piece of kit a powerlifter could want, all in one room.", "author": "Cathal B.", "rating": 5}
  ]'::jsonb,
  offers = '[
    {"title": "7-day trial", "description": "Free 7-day membership trial — no card required."}
  ]'::jsonb
where slug = 'iron-gym-cork';
