import Link from 'next/link';
import { createClient, hasSupabaseEnv } from '@/lib/supabase/server';
import LiquidGlassIcon from '@/components/consumer/LiquidGlassIcon';
import type { BusinessSymbolId } from '@/components/icons/BusinessSymbols';
import { colors } from '@/lib/constants';

type Business = {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  primary_colour: string | null;
  logo_url: string | null;
};

const NAME_TO_SYMBOL: Record<string, BusinessSymbolId> = {
  'Evolv Performance': 'evolv',
  'Refresh Barber': 'refresh',
  'Saltwater Sauna Cork': 'saltwater',
  'The Nail Studio': 'nail-studio',
  'Cork Physio & Sports': 'cork-physio',
  'Yoga Flow Cork': 'yoga-flow',
  'Iron Gym Cork': 'iron-gym',
};

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

function inferSymbolId(name: string): BusinessSymbolId | undefined {
  return NAME_TO_SYMBOL[name];
}

async function fetchBusinesses(): Promise<Business[]> {
  if (!hasSupabaseEnv()) return [];
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('businesses')
      .select('id, name, slug, category, primary_colour, logo_url')
      .eq('is_live', true)
      .order('created_at', { ascending: true })
      .limit(8);
    if (error) {
      console.error('[home] failed to load businesses', error.message);
      return [];
    }
    return data ?? [];
  } catch (err) {
    console.error('[home] supabase fetch threw', err);
    return [];
  }
}

export default async function HomePage() {
  const businesses = await fetchBusinesses();

  return (
    <div
      style={{
        position: 'relative',
        flex: 1,
        background: `
          radial-gradient(60% 40% at 20% 12%, rgba(212,175,55,0.18) 0%, rgba(8,8,8,0) 60%),
          radial-gradient(50% 35% at 80% 8%, rgba(10,132,255,0.14) 0%, rgba(8,8,8,0) 60%),
          radial-gradient(70% 50% at 50% 100%, rgba(48,209,88,0.10) 0%, rgba(8,8,8,0) 60%),
          ${colors.bg}
        `,
      }}
    >
      <header className="safe-top" style={{ padding: '20px 22px 8px' }}>
        <div
          style={{
            fontSize: 24,
            fontWeight: 800,
            letterSpacing: -0.3,
            color: colors.text,
          }}
        >
          Open<span style={{ color: colors.text }}>Book</span>{' '}
          <span
            style={{
              background: colors.goldGradient,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            AI
          </span>
        </div>
        <div style={{ fontSize: 14, color: colors.textSecondary, marginTop: 4 }}>
          {businesses.length > 0
            ? 'Tap a place to start a booking.'
            : 'No businesses yet. Add one to get started.'}
        </div>
      </header>

      <section style={{ padding: '20px 18px 28px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            rowGap: 22,
            columnGap: 8,
            justifyItems: 'center',
          }}
        >
          {businesses.map((b) => (
            <Link key={b.id} href={`/business/${b.slug}`} style={{ display: 'flex' }}>
              <LiquidGlassIcon
                primaryColour={b.primary_colour}
                fallbackInitials={initialsOf(b.name)}
                symbolId={inferSymbolId(b.name)}
                label={b.name}
              />
            </Link>
          ))}

          <Link href="/explore" style={{ display: 'flex' }}>
            <div
              style={{
                width: 72,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 20,
                  border: `1.5px dashed ${colors.textTertiary}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: colors.textSecondary,
                  fontSize: 26,
                  fontWeight: 300,
                }}
              >
                +
              </div>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: colors.textSecondary,
                  textAlign: 'center',
                  lineHeight: 1.2,
                }}
              >
                Add a place
              </span>
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}
