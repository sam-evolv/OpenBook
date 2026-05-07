'use client';

import { Phone, Globe, MapPin, Instagram, Clock, Sparkles } from 'lucide-react';
import { getTileColour } from '@/lib/tile-palette';
import type { BusinessAppConfig } from '@/lib/business-app-config';

interface Props {
  business: any;
  hours: any[];
  appConfig: BusinessAppConfig;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function BusinessAbout({ business, hours, appConfig }: Props) {
  const primary = getTileColour(business.primary_colour).mid;
  const socials = business.socials ?? {};

  // Order hours Mon-Sun for display
  const orderedHours = [1, 2, 3, 4, 5, 6, 0]
    .map((d) => hours.find((h) => h.day_of_week === d))
    .filter(Boolean);

  return (
    <div className="px-5 pb-8 pt-[calc(78px+env(safe-area-inset-top))]">
      <div
        className="mb-6 rounded-[30px] p-5"
        style={{
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.075) 0%, rgba(255,255,255,0.035) 100%)',
          border: '0.5px solid rgba(255,255,255,0.12)',
          boxShadow:
            'inset 0 1px 0 rgba(255,255,255,0.10), 0 18px 48px rgba(0,0,0,0.34)',
        }}
      >
        <p
          className="text-[10px] font-semibold tracking-[0.18em] uppercase mb-1.5"
          style={{ color: primary }}
        >
          About
        </p>
        <h1 className="font-serif text-[36px] font-semibold leading-[0.96] tracking-[-0.03em]">
          {business.name}
        </h1>
        {business.tagline && (
          <p className="mt-3 text-[15px] leading-snug" style={{ color: 'rgba(255,255,255,0.72)' }}>
            {business.tagline}
          </p>
        )}
      </div>

      {/* Long description */}
      {appConfig.sections.about && business.about_long && (
        <section
          className="mb-8 rounded-[26px] px-5 py-5"
          style={{
            background: 'rgba(255,255,255,0.035)',
            border: '0.5px solid rgba(255,255,255,0.08)',
          }}
        >
          <p
            className="text-[14.5px] leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.8)' }}
          >
            {business.about_long}
          </p>
          {business.founder_name && (
            <p
              className="mt-3 text-[12px] italic"
              style={{ color: 'rgba(255,255,255,0.5)' }}
            >
              — {business.founder_name}
            </p>
          )}
        </section>
      )}

      {appConfig.sections.about && !business.about_long && (
        <section
          className="mb-8 rounded-[26px] px-5 py-8 text-center"
          style={{
            background: 'rgba(255,255,255,0.035)',
            border: '0.5px solid rgba(255,255,255,0.08)',
          }}
        >
          <Sparkles className="mx-auto mb-3 h-6 w-6" style={{ color: primary }} strokeWidth={1.7} />
          <p className="text-[14px] font-semibold text-white/80">Story coming soon</p>
          <p className="mx-auto mt-1 max-w-[260px] text-[12.5px] leading-snug text-white/45">
            More detail about the team, space and approach will appear here soon.
          </p>
        </section>
      )}

      {/* Hours */}
      {appConfig.sections.hours && orderedHours.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Clock
              className="h-4 w-4"
              style={{ color: primary }}
              strokeWidth={2}
            />
            <p
              className="text-[11px] font-semibold tracking-[0.14em] uppercase"
              style={{ color: 'rgba(255,255,255,0.5)' }}
            >
              Hours
            </p>
          </div>
          <div
            className="rounded-[24px] divide-y overflow-hidden"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '0.5px solid rgba(255,255,255,0.09)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
            }}
          >
            {orderedHours.map((h: any) => (
              <div
                key={h.day_of_week}
                className="flex items-center justify-between px-4 py-3"
                style={{ borderColor: 'rgba(255,255,255,0.05)' }}
              >
                <span
                  className="text-[13px] font-medium"
                  style={{ color: 'rgba(255,255,255,0.85)' }}
                >
                  {DAY_LABELS[h.day_of_week]}
                </span>
                {h.is_closed ? (
                  <span
                    className="text-[13px]"
                    style={{ color: 'rgba(255,255,255,0.4)' }}
                  >
                    Closed
                  </span>
                ) : (
                  <span
                    className="text-[13px] tabular-nums"
                    style={{ color: 'rgba(255,255,255,0.7)' }}
                  >
                    {formatTime(h.open_time)} – {formatTime(h.close_time)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Contact */}
      {appConfig.sections.contact && (business.phone || business.website || business.address_line || socials.instagram) && (
        <section className="mb-8">
          <p
            className="text-[11px] font-semibold tracking-[0.14em] uppercase mb-3"
            style={{ color: 'rgba(255,255,255,0.5)' }}
          >
            Contact
          </p>
          <div className="flex flex-col gap-2">
            {business.address_line && (
              <ContactRow
                icon={MapPin}
                label={business.address_line}
                sublabel={business.city}
                href={`https://maps.google.com/?q=${encodeURIComponent(business.address_line + ', ' + (business.city ?? ''))}`}
                primary={primary}
              />
            )}
            {business.phone && (
              <ContactRow
                icon={Phone}
                label={business.phone}
                href={`tel:${business.phone}`}
                primary={primary}
              />
            )}
            {business.website && (
              <ContactRow
                icon={Globe}
                label={business.website}
                href={
                  business.website.startsWith('http')
                    ? business.website
                    : `https://${business.website}`
                }
                primary={primary}
              />
            )}
            {socials.instagram && (
              <ContactRow
                icon={Instagram}
                label={`@${socials.instagram.replace(/^@/, '').replace('instagram.com/', '')}`}
                href={
                  socials.instagram.startsWith('http')
                    ? socials.instagram
                    : `https://instagram.com/${socials.instagram.replace(/^@/, '').replace('instagram.com/', '')}`
                }
                primary={primary}
              />
            )}
          </div>
        </section>
      )}

      <p
        className="text-center text-[10px] tracking-[0.14em] uppercase"
        style={{ color: 'rgba(255,255,255,0.3)' }}
      >
        Powered by OpenBook
      </p>
    </div>
  );
}

function ContactRow({
  icon: Icon,
  label,
  sublabel,
  href,
  primary,
}: {
  icon: any;
  label: string;
  sublabel?: string;
  href: string;
  primary: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-3 p-3.5 rounded-2xl active:scale-[0.99] transition-transform"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '0.5px solid rgba(255,255,255,0.08)',
      }}
    >
      <div
        className="flex h-9 w-9 items-center justify-center rounded-full shrink-0"
        style={{ background: `${primary}22` }}
      >
        <Icon className="h-4 w-4" style={{ color: primary }} strokeWidth={2} />
      </div>
      <div className="flex-1 min-w-0">
        <p
          className="text-[13px] font-medium truncate"
          style={{ color: 'rgba(255,255,255,0.9)' }}
        >
          {label}
        </p>
        {sublabel && (
          <p
            className="text-[11px] truncate"
            style={{ color: 'rgba(255,255,255,0.5)' }}
          >
            {sublabel}
          </p>
        )}
      </div>
    </a>
  );
}

function formatTime(t: string): string {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12}${ampm}` : `${h12}:${String(m).padStart(2, '0')}${ampm}`;
}
