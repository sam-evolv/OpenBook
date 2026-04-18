import Link from 'next/link';
import { createClient, hasSupabaseEnv } from '@/lib/supabase/server';
import { LiquidGlassIcon } from '@/components/consumer/LiquidGlassIcon';
import type { BusinessSymbolId } from '@/components/icons/BusinessSymbols';
import PageDots from '@/components/consumer/PageDots';

type Business = {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  primary_colour: string | null;
};

const slugToSymbol: Record<string, BusinessSymbolId> = {
  'evolv-performance': 'evolv',
  'refresh-barber': 'refresh',
  'saltwater-sauna': 'saltwater',
  'the-nail-studio': 'nail-studio',
  'cork-physio': 'cork-physio',
  'yoga-flow-cork': 'yoga-flow',
  'iron-gym-cork': 'iron-gym',
};

const wallpaperCss = `
  radial-gradient(85% 50% at 50% 12%, rgba(212,175,55,0.3) 0%, rgba(148,100,20,0.1) 25%, transparent 55%),
  radial-gradient(70% 50% at 88% 78%, rgba(120,70,200,0.18) 0%, transparent 55%),
  radial-gradient(60% 45% at 12% 88%, rgba(70,180,160,0.14) 0%, transparent 55%),
  #050504
`;

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

async function fetchBusinesses(): Promise<Business[]> {
  if (!hasSupabaseEnv()) return [];
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('businesses')
      .select('id, name, slug, category, primary_colour')
      .eq('is_live', true)
      .order('name');
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

function AddPlaceTile() {
  return (
    <div
      style={{
        width: 62,
        height: 62,
        borderRadius: 16,
        border: '1.5px dashed rgba(255,255,255,0.2)',
        background: 'rgba(255,255,255,0.02)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'rgba(255,255,255,0.55)',
        fontSize: 26,
        fontWeight: 300,
        lineHeight: 1,
      }}
    >
      +
    </div>
  );
}

export default async function HomePage() {
  const businesses = await fetchBusinesses();

  return (
    <main
      style={{
        minHeight: '100dvh',
        background: wallpaperCss,
        position: 'relative',
      }}
    >
      <header
        style={{ textAlign: 'center', paddingTop: 56, paddingBottom: 8 }}
      >
        <h1
          style={{
            fontSize: 13,
            fontWeight: 500,
            letterSpacing: '3.5px',
            color: 'rgba(255,255,255,0.55)',
            textTransform: 'uppercase',
            margin: 0,
          }}
        >
          OpenBook
        </h1>
      </header>

      <section style={{ padding: '28px 22px 0' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            rowGap: 22,
            columnGap: 16,
            justifyItems: 'center',
          }}
        >
          {businesses.map((b) => {
            const symbolId = slugToSymbol[b.slug];
            const initials = initialsOf(b.name);
            const firstWord = b.name.split(/\s+/)[0] ?? b.name;
            return (
              <Link
                key={b.id}
                href={`/business/${b.slug}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                  textDecoration: 'none',
                }}
              >
                <LiquidGlassIcon
                  primaryColour={b.primary_colour || '#D4AF37'}
                  businessSymbolId={symbolId}
                  fallbackInitials={symbolId ? undefined : initials}
                />
                <span
                  style={{
                    fontSize: 11.5,
                    fontWeight: 500,
                    color: 'rgba(255,255,255,0.98)',
                    letterSpacing: '-0.1px',
                    maxWidth: 72,
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    textShadow: '0 1px 3px rgba(0,0,0,0.75)',
                  }}
                >
                  {firstWord}
                </span>
              </Link>
            );
          })}

          <Link
            href="/explore"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              textDecoration: 'none',
            }}
          >
            <AddPlaceTile />
            <span
              style={{
                fontSize: 11.5,
                fontWeight: 500,
                color: 'rgba(255,255,255,0.98)',
                letterSpacing: '-0.1px',
                maxWidth: 72,
                textAlign: 'center',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                textShadow: '0 1px 3px rgba(0,0,0,0.75)',
              }}
            >
              Add
            </span>
          </Link>
        </div>
      </section>

      <PageDots active={0} total={3} />
    </main>
  );
}
