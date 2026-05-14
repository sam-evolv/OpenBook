import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import Markdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getTileColour } from '@/lib/tile-palette';
import { LiquidGlassIcon } from '@/components/consumer/LiquidGlassIcon';
import { SocialIcons } from './SocialIcons';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const MARKETING_HOST = 'https://openbook.ie';

interface BusinessRow {
  id: string;
  owner_id: string;
  slug: string;
  name: string;
  category: string | null;
  city: string | null;
  primary_colour: string | null;
  hero_image_url: string | null;
  logo_url: string | null;
  processed_icon_url: string | null;
  tagline: string | null;
  about_long: string | null;
  gallery_urls: string[] | null;
  testimonials:
    | Array<{ quote: string; author: string; role?: string | null }>
    | null;
  founder_name: string | null;
  founder_photo_url: string | null;
  year_founded: number | null;
  socials:
    | {
        instagram?: string | null;
        facebook?: string | null;
        twitter?: string | null;
        tiktok?: string | null;
      }
    | null;
  address_line: string | null;
  phone: string | null;
  instagram_handle: string | null;
  amenities: string[] | null;
  parking_info: string | null;
  nearest_landmark: string | null;
  public_transport_info: string | null;
  website_is_published: boolean | null;
  website_headline: string | null;
}

interface ServiceRow {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price_cents: number;
  is_active: boolean | null;
}

interface HourRow {
  day_of_week: number;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean | null;
}

const SELECT_COLUMNS = [
  'id',
  'owner_id',
  'slug',
  'name',
  'category',
  'city',
  'primary_colour',
  'hero_image_url',
  'logo_url',
  'processed_icon_url',
  'tagline',
  'about_long',
  'gallery_urls',
  'testimonials',
  'founder_name',
  'founder_photo_url',
  'year_founded',
  'socials',
  'address_line',
  'phone',
  'instagram_handle',
  'amenities',
  'parking_info',
  'nearest_landmark',
  'public_transport_info',
  'website_is_published',
  'website_headline',
].join(', ');

async function loadBusiness(slug: string) {
  const sb = createSupabaseServerClient();
  const { data } = await sb
    .from('businesses')
    .select(SELECT_COLUMNS)
    .eq('slug', slug)
    .maybeSingle();
  return { sb, business: (data as unknown as BusinessRow | null) ?? null };
}

async function isPreviewAuthorised(
  sb: ReturnType<typeof createSupabaseServerClient>,
  ownerId: string,
): Promise<boolean> {
  const {
    data: { user },
  } = await sb.auth.getUser();
  return Boolean(user) && user!.id === ownerId;
}

function stripMarkdown(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .replace(/!\[[^\]]*]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
    .replace(/[*_`>#~-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { business } = await loadBusiness(slug);
  if (!business) return { title: 'Not found · OpenBook' };

  const titleParts = [business.name, business.category, business.city].filter(Boolean);
  const description = stripMarkdown(business.about_long).slice(0, 160) || undefined;
  const ogImage = business.hero_image_url ?? undefined;

  // Marketing subdomains belong to the business — its own logo (or a
  // coloured-initials fallback) replaces OpenBook's OB monogram in the
  // browser tab. The fallback is served by /api/sites/[slug]/favicon.
  const faviconUrl = business.logo_url ?? `/api/sites/${slug}/favicon`;

  return {
    title: titleParts.join(' — '),
    description,
    openGraph: {
      title: titleParts.join(' — '),
      description,
      images: ogImage ? [{ url: ogImage }] : undefined,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: titleParts.join(' — '),
      description,
      images: ogImage ? [ogImage] : undefined,
    },
    icons: {
      icon: [{ url: faviconUrl, type: 'image/png' }],
      apple: faviconUrl,
      shortcut: faviconUrl,
    },
  };
}

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}

export default async function MarketingSitePage({ params, searchParams }: PageProps) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const { sb, business } = await loadBusiness(slug);
  if (!business) notFound();

  if (!business.website_is_published) {
    const previewRequested = sp.preview === 'true';
    const authorised = previewRequested
      ? await isPreviewAuthorised(sb, business.owner_id)
      : false;
    if (!authorised) notFound();
  }

  const [{ data: services }, { data: hours }] = await Promise.all([
    sb
      .from('services')
      .select('id, name, description, duration_minutes, price_cents, is_active')
      .eq('business_id', business.id)
      .eq('is_active', true)
      .order('sort_order', { ascending: true, nullsFirst: false }),
    sb
      .from('business_hours')
      .select('day_of_week, open_time, close_time, is_closed')
      .eq('business_id', business.id)
      .order('day_of_week', { ascending: true }),
  ]);

  const primaryHex = getTileColour(business.primary_colour).mid;
  const headline = business.website_headline?.trim() || business.name;
  const initials = business.name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const jsonLd = buildJsonLd({
    business,
    hours: (hours ?? []) as HourRow[],
    slug,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main
        style={{
          minHeight: '100dvh',
          background: '#080808',
          color: '#ffffff',
          fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
          letterSpacing: '-0.005em',
          overflowX: 'hidden',
        }}
      >
        <HeroSection
          business={business}
          headline={headline}
          initials={initials}
          primaryHex={primaryHex}
          previewMode={sp.preview === 'true' && !business.website_is_published}
        />
        <AboutSection business={business} />
        <ServicesSection
          services={(services ?? []) as ServiceRow[]}
          slug={slug}
          primaryHex={primaryHex}
        />
        <GallerySection gallery={business.gallery_urls ?? []} />
        <TestimonialsSection testimonials={business.testimonials ?? []} />
        <ContactSection
          business={business}
          hours={(hours ?? []) as HourRow[]}
          primaryHex={primaryHex}
        />
        <Footer business={business} primaryHex={primaryHex} />
      </main>
    </>
  );
}

function HeroSection({
  business,
  headline,
  initials,
  primaryHex,
  previewMode,
}: {
  business: BusinessRow;
  headline: string;
  initials: string;
  primaryHex: string;
  previewMode: boolean;
}) {
  const heroUrl = business.hero_image_url;

  return (
    <section
      style={{
        position: 'relative',
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '64px 20px',
        textAlign: 'center',
        overflow: 'hidden',
      }}
    >
      {heroUrl ? (
        <Image
          src={heroUrl}
          alt=""
          fill
          priority
          sizes="100vw"
          style={{ objectFit: 'cover', zIndex: -2 }}
        />
      ) : (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background: primaryHex,
            zIndex: -2,
          }}
        />
      )}

      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(8,8,8,0.15) 0%, rgba(8,8,8,0.45) 60%, rgba(8,8,8,0.55) 100%)',
          zIndex: -1,
        }}
      />

      {previewMode && <PreviewBanner />}

      {!heroUrl && (
        <div style={{ marginBottom: 28 }}>
          <LiquidGlassIcon
            primaryColour={primaryHex}
            fallbackInitials={initials}
            size={96}
          />
        </div>
      )}

      <h1
        style={{
          margin: 0,
          fontFamily: 'var(--font-fraunces), Georgia, serif',
          fontWeight: 500,
          fontSize: 'clamp(44px, 7vw, 72px)',
          lineHeight: 1.05,
          letterSpacing: '-0.02em',
          color: '#ffffff',
          maxWidth: 880,
        }}
      >
        {headline}
      </h1>

      {business.tagline && (
        <p
          style={{
            marginTop: 18,
            fontSize: 'clamp(17px, 1.6vw, 20px)',
            lineHeight: 1.45,
            color: 'rgba(255,255,255,0.8)',
            maxWidth: 640,
          }}
        >
          {business.tagline}
        </p>
      )}

      <Link
        href="/book"
        style={{
          marginTop: 36,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px 32px',
          borderRadius: 999,
          background: primaryHex,
          color: '#080808',
          fontSize: 16,
          fontWeight: 600,
          letterSpacing: '-0.01em',
          textDecoration: 'none',
          boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
        }}
      >
        Book now
      </Link>
    </section>
  );
}

function PreviewBanner() {
  return (
    <div
      style={{
        position: 'absolute',
        top: 16,
        left: 16,
        right: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8px 14px',
        borderRadius: 999,
        background: 'rgba(212,175,55,0.18)',
        border: '0.5px solid rgba(212,175,55,0.45)',
        color: '#D4AF37',
        fontSize: 12,
        letterSpacing: '0.04em',
        fontWeight: 600,
        textTransform: 'uppercase',
        zIndex: 2,
      }}
    >
      Preview · not yet published
    </div>
  );
}

function AboutSection({ business }: { business: BusinessRow }) {
  if (!business.about_long) return null;
  const showFounder =
    business.founder_name && business.founder_photo_url && business.year_founded;

  return (
    <section style={{ padding: '80px 20px', maxWidth: 980, margin: '0 auto' }}>
      <h2
        style={{
          margin: 0,
          fontFamily: 'var(--font-fraunces), Georgia, serif',
          fontWeight: 500,
          fontSize: 'clamp(30px, 4vw, 40px)',
          letterSpacing: '-0.02em',
          color: '#ffffff',
          textAlign: 'center',
        }}
      >
        About {business.name}
      </h2>

      <div
        style={{
          margin: '32px auto 0',
          maxWidth: 640,
          fontSize: 17,
          lineHeight: 1.6,
          color: 'rgba(255,255,255,0.82)',
          textAlign: 'left',
        }}
        className="ob-marketing-prose"
      >
        <Markdown rehypePlugins={[rehypeSanitize]}>{business.about_long}</Markdown>
      </div>

      {showFounder && (
        <div
          style={{
            margin: '40px auto 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 14,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={business.founder_photo_url!}
            alt={business.founder_name!}
            width={80}
            height={80}
            style={{
              width: 80,
              height: 80,
              borderRadius: 999,
              objectFit: 'cover',
              border: '0.5px solid rgba(255,255,255,0.12)',
            }}
          />
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 16, fontWeight: 500, color: '#ffffff' }}>
              {business.founder_name}
            </div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>
              Founder, since {business.year_founded}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .ob-marketing-prose p { margin: 0 0 1em; }
        .ob-marketing-prose p:last-child { margin-bottom: 0; }
        .ob-marketing-prose a { color: #D4AF37; text-decoration: underline; }
        .ob-marketing-prose strong { color: #ffffff; font-weight: 600; }
        .ob-marketing-prose ul, .ob-marketing-prose ol { margin: 0 0 1em 1.4em; }
      `}</style>
    </section>
  );
}

function ServicesSection({
  services,
  slug: _slug,
  primaryHex,
}: {
  services: ServiceRow[];
  slug: string;
  primaryHex: string;
}) {
  if (services.length === 0) return null;
  return (
    <section
      style={{
        padding: '80px 20px',
        maxWidth: 1080,
        margin: '0 auto',
      }}
    >
      <h2
        style={{
          margin: 0,
          fontFamily: 'var(--font-fraunces), Georgia, serif',
          fontWeight: 500,
          fontSize: 'clamp(30px, 4vw, 40px)',
          letterSpacing: '-0.02em',
          color: '#ffffff',
          textAlign: 'center',
        }}
      >
        Services
      </h2>

      <div
        style={{
          marginTop: 32,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 14,
        }}
      >
        {services.map((service) => (
          <article
            key={service.id}
            style={{
              padding: 22,
              borderRadius: 18,
              background: 'rgba(255,255,255,0.03)',
              border: '0.5px solid rgba(255,255,255,0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <h3
              style={{
                margin: 0,
                fontFamily: 'var(--font-fraunces), Georgia, serif',
                fontWeight: 500,
                fontSize: 22,
                letterSpacing: '-0.01em',
                color: '#ffffff',
              }}
            >
              {service.name}
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: 16,
                color: 'rgba(255,255,255,0.7)',
                letterSpacing: '-0.005em',
              }}
            >
              {service.duration_minutes} min · €
              {(service.price_cents / 100).toFixed(2)}
            </p>
            {service.description && (
              <p
                style={{
                  margin: '6px 0 0',
                  fontSize: 14,
                  lineHeight: 1.5,
                  color: 'rgba(255,255,255,0.55)',
                }}
              >
                {service.description}
              </p>
            )}
            <Link
              href={`/book/${service.id}`}
              style={{
                marginTop: 14,
                alignSelf: 'flex-start',
                display: 'inline-flex',
                alignItems: 'center',
                padding: '10px 18px',
                borderRadius: 999,
                background: primaryHex,
                color: '#080808',
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: '-0.005em',
                textDecoration: 'none',
              }}
            >
              Book
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

function GallerySection({ gallery }: { gallery: string[] }) {
  if (!gallery || gallery.length === 0) return null;
  return (
    <section
      style={{
        padding: '60px 20px 80px',
        maxWidth: 1280,
        margin: '0 auto',
      }}
    >
      <div
        style={{
          display: 'grid',
          gap: 10,
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        }}
      >
        {gallery.map((url, i) => (
          <div
            key={url}
            style={{
              position: 'relative',
              aspectRatio: '1 / 1',
              borderRadius: 14,
              overflow: 'hidden',
              background: '#111',
            }}
          >
            <Image
              src={url}
              alt=""
              fill
              loading={i < 3 ? 'eager' : 'lazy'}
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              style={{ objectFit: 'cover' }}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

function TestimonialsSection({
  testimonials,
}: {
  testimonials: Array<{ quote: string; author: string; role?: string | null }>;
}) {
  const items = (testimonials ?? []).filter((t) => t && t.quote && t.author);
  if (items.length === 0) return null;
  return (
    <section
      style={{
        padding: '80px 20px',
        maxWidth: 980,
        margin: '0 auto',
      }}
    >
      <div
        style={{
          display: 'grid',
          gap: 28,
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        }}
      >
        {items.map((t, i) => (
          <figure
            key={i}
            style={{
              margin: 0,
              padding: 24,
              borderRadius: 18,
              background: 'rgba(255,255,255,0.025)',
              border: '0.5px solid rgba(255,255,255,0.07)',
            }}
          >
            <blockquote
              style={{
                margin: 0,
                fontFamily: 'var(--font-fraunces), Georgia, serif',
                fontStyle: 'italic',
                fontSize: 22,
                lineHeight: 1.35,
                letterSpacing: '-0.005em',
                color: 'rgba(255,255,255,0.92)',
              }}
            >
              &ldquo;{t.quote}&rdquo;
            </blockquote>
            <figcaption
              style={{
                marginTop: 16,
                fontSize: 14,
                color: 'rgba(255,255,255,0.78)',
              }}
            >
              <span style={{ display: 'block' }}>{t.author}</span>
              {t.role && (
                <span style={{ display: 'block', color: 'rgba(255,255,255,0.55)' }}>
                  {t.role}
                </span>
              )}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

function ContactSection({
  business,
  hours,
  primaryHex,
}: {
  business: BusinessRow;
  hours: HourRow[];
  primaryHex: string;
}) {
  const addressLine = [business.address_line, business.city].filter(Boolean).join(', ');
  const mapboxToken = process.env.MAPBOX_TOKEN;
  const directionsUrl = addressLine
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressLine)}`
    : null;

  const mapboxUrl =
    mapboxToken && addressLine
      ? `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/pin-l+d4af37(0)/auto/640x320@2x?access_token=${mapboxToken}&attribution=false&logo=false&padding=80&overlay=${encodeURIComponent(
          addressLine,
        )}`
      : null;

  const extras = [
    business.amenities?.length ? `Amenities: ${business.amenities.join(', ')}` : null,
    business.parking_info ? `Parking: ${business.parking_info}` : null,
    business.nearest_landmark ? `Near: ${business.nearest_landmark}` : null,
    business.public_transport_info ? `Transport: ${business.public_transport_info}` : null,
  ].filter(Boolean) as string[];

  return (
    <section
      style={{
        padding: '80px 20px',
        maxWidth: 980,
        margin: '0 auto',
      }}
    >
      <h2
        style={{
          margin: 0,
          fontFamily: 'var(--font-fraunces), Georgia, serif',
          fontWeight: 500,
          fontSize: 'clamp(30px, 4vw, 40px)',
          letterSpacing: '-0.02em',
          color: '#ffffff',
          textAlign: 'center',
        }}
      >
        Find us
      </h2>

      <div
        style={{
          marginTop: 36,
          display: 'grid',
          gap: 36,
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        }}
      >
        <div>
          {addressLine && (
            <p style={{ margin: 0, fontSize: 18, color: 'rgba(255,255,255,0.92)' }}>
              {addressLine}
            </p>
          )}
          {business.phone && (
            <p
              style={{
                margin: '8px 0 0',
                fontSize: 16,
                color: 'rgba(255,255,255,0.7)',
              }}
            >
              <a
                href={`tel:${business.phone.replace(/[^+0-9]/g, '')}`}
                style={{ color: 'inherit', textDecoration: 'none' }}
              >
                {business.phone}
              </a>
            </p>
          )}

          <div style={{ marginTop: 22 }}>
            <HoursTable hours={hours} />
          </div>

          {extras.length > 0 && (
            <ul
              style={{
                margin: '24px 0 0',
                padding: 0,
                listStyle: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              {extras.map((line) => (
                <li
                  key={line}
                  style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}
                >
                  {line}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          {mapboxUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mapboxUrl}
              alt="Map"
              style={{
                width: '100%',
                borderRadius: 14,
                border: '0.5px solid rgba(255,255,255,0.08)',
              }}
            />
          ) : directionsUrl ? (
            <Link
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '14px 24px',
                borderRadius: 999,
                background: primaryHex,
                color: '#080808',
                fontSize: 14,
                fontWeight: 600,
                letterSpacing: '-0.005em',
                textDecoration: 'none',
              }}
            >
              Get directions
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function HoursTable({ hours }: { hours: HourRow[] }) {
  const byDay = new Map(hours.map((h) => [h.day_of_week, h]));
  return (
    <table
      style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: 14,
        color: 'rgba(255,255,255,0.78)',
      }}
    >
      <tbody>
        {WEEK_ORDER.map((dow) => {
          const h = byDay.get(dow);
          const closed = !h || h.is_closed || !h.open_time || !h.close_time;
          return (
            <tr key={dow}>
              <td
                style={{
                  padding: '6px 0',
                  width: 120,
                  fontSize: 14,
                  color: 'rgba(255,255,255,0.92)',
                }}
              >
                {DAY_LABELS[dow]}
              </td>
              <td
                style={{
                  padding: '6px 0',
                  textAlign: 'right',
                  color: closed ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.78)',
                }}
              >
                {closed
                  ? 'Closed'
                  : `${formatTime(h!.open_time!)} – ${formatTime(h!.close_time!)}`}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function formatTime(t: string): string {
  // "09:00:00" → "9:00 AM"
  const [hh, mm] = t.split(':');
  let h = parseInt(hh ?? '0', 10);
  const m = mm ?? '00';
  const period = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${period}`;
}

function Footer({ business, primaryHex }: { business: BusinessRow; primaryHex: string }) {
  const socials = business.socials ?? {};
  return (
    <footer
      style={{
        padding: '40px 20px 56px',
        borderTop: '0.5px solid rgba(255,255,255,0.06)',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-fraunces), Georgia, serif',
          fontWeight: 500,
          fontSize: 18,
          letterSpacing: '-0.01em',
          color: '#ffffff',
        }}
      >
        {business.name}
      </div>

      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
        <SocialIcons socials={socials} primaryHex={primaryHex} />
      </div>

      <Link
        href={MARKETING_HOST}
        style={{
          marginTop: 28,
          display: 'inline-block',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: '#D4AF37',
          opacity: 0.6,
          textDecoration: 'none',
        }}
      >
        Powered by OpenBook
      </Link>
    </footer>
  );
}

// ----------------------------------------------------------------
// JSON-LD
// ----------------------------------------------------------------

interface JsonLdProps {
  business: BusinessRow;
  hours: HourRow[];
  slug: string;
}

const ISO_DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

function buildJsonLd({ business, hours, slug }: JsonLdProps) {
  const sameAs: string[] = [];
  const s = business.socials ?? {};
  for (const key of ['instagram', 'facebook', 'twitter', 'tiktok'] as const) {
    const raw = s[key];
    if (raw) sameAs.push(normaliseSocialUrl(key, raw));
  }
  if (business.instagram_handle && !s.instagram) {
    sameAs.push(`https://instagram.com/${business.instagram_handle.replace(/^@/, '')}`);
  }

  const openingHoursSpecification = hours
    .filter((h) => h.open_time && h.close_time && !h.is_closed)
    .map((h) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: `https://schema.org/${ISO_DAY_NAMES[h.day_of_week]}`,
      opens: h.open_time,
      closes: h.close_time,
    }));

  const address: Record<string, string> = {
    '@type': 'PostalAddress',
    addressCountry: 'IE',
  };
  if (business.address_line) address.streetAddress = business.address_line;
  if (business.city) address.addressLocality = business.city;

  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: business.name,
    url: `https://${slug}.openbook.ie`,
    image: business.hero_image_url ?? business.logo_url ?? undefined,
    telephone: business.phone ?? undefined,
    address,
    openingHoursSpecification:
      openingHoursSpecification.length > 0 ? openingHoursSpecification : undefined,
    sameAs: sameAs.length > 0 ? sameAs : undefined,
  };
}

function normaliseSocialUrl(
  platform: 'instagram' | 'facebook' | 'twitter' | 'tiktok',
  raw: string,
): string {
  if (/^https?:\/\//i.test(raw)) return raw;
  const handle = raw.replace(/^@/, '').replace(/^\//, '');
  switch (platform) {
    case 'instagram':
      return `https://instagram.com/${handle}`;
    case 'facebook':
      return `https://facebook.com/${handle}`;
    case 'twitter':
      return `https://x.com/${handle}`;
    case 'tiktok':
      return `https://tiktok.com/@${handle.replace(/^@/, '')}`;
  }
}
