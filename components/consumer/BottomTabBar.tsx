'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Sparkles, Calendar, type LucideIcon } from 'lucide-react';

const DOCK_APPS = [
  { href: '/home', label: 'Home', Icon: Home },
  { href: '/explore', label: 'Explore', Icon: Search },
  { href: '/assistant', label: 'AI', Icon: Sparkles },
  { href: '/consumer-bookings', label: 'Bookings', Icon: Calendar },
];

export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 pb-safe pointer-events-none"
      aria-label="Dock"
    >
      <div className="mx-auto max-w-md px-5 pb-3 pointer-events-auto">
        <div
          className="relative rounded-[34px] px-3 py-3 mat-glass-thick"
          style={{
            boxShadow: `
              0 1px 0 rgba(255, 255, 255, 0.10) inset,
              0 -1px 0 rgba(0, 0, 0, 0.4) inset,
              0 20px 50px rgba(0, 0, 0, 0.6),
              0 4px 12px rgba(0, 0, 0, 0.4)
            `,
          }}
        >
          {/* Top hairline sheen */}
          <div
            aria-hidden
            className="absolute inset-x-6 top-0 h-px"
            style={{
              background:
                'linear-gradient(90deg, transparent, rgba(255,255,255,0.22), transparent)',
            }}
          />

          <div className="flex items-center justify-around gap-1">
            {DOCK_APPS.map(({ href, label, Icon }) => {
              const active =
                pathname === href ||
                (href !== '/home' && pathname.startsWith(href));
              return (
                <DockIcon
                  key={href}
                  href={href}
                  label={label}
                  Icon={Icon}
                  active={active}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function DockIcon({
  href,
  label,
  Icon,
  active,
}: {
  href: string;
  label: string;
  Icon: LucideIcon;
  active: boolean;
}) {
  const size = 54;
  const radius = Math.round(size * 0.235);

  // Gradients differ for active (gold) vs idle (gunmetal)
  const gradient = active
    ? {
        highlight: '#F6D77C',
        base: '#D4AF37',
        shadow: '#7A5418',
      }
    : {
        highlight: '#3A3A40',
        base: '#1F1F24',
        shadow: '#0E0E12',
      };

  return (
    <Link
      href={href}
      className="group flex flex-col items-center transition-transform duration-300 active:scale-[0.88]"
      style={{ transitionTimingFunction: 'cubic-bezier(0.32, 0.72, 0, 1)' }}
      aria-label={label}
    >
      <div
        className="relative overflow-hidden transition-all duration-300"
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          transitionTimingFunction: 'cubic-bezier(0.32, 0.72, 0, 1)',
          boxShadow: active
            ? `
              0 1px 2px rgba(0, 0, 0, 0.3),
              0 6px 16px rgba(212, 175, 55, 0.3),
              0 12px 30px rgba(0, 0, 0, 0.4)
            `
            : `
              0 1px 2px rgba(0, 0, 0, 0.25),
              0 4px 12px rgba(0, 0, 0, 0.4)
            `,
        }}
      >
        {/* Radial base */}
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse at 30% 20%, ${gradient.highlight} 0%, ${gradient.base} 45%, ${gradient.shadow} 100%)`,
          }}
        />

        {/* Glyph */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Icon
            style={{
              width: size * 0.45,
              height: size * 0.45,
              color: active ? 'rgba(0,0,0,0.78)' : 'rgba(255,255,255,0.95)',
              filter: active
                ? 'drop-shadow(0 1px 2px rgba(255,215,100,0.3))'
                : 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))',
            }}
            strokeWidth={active ? 2.2 : 1.8}
          />
        </div>

        {/* Sheen */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.05) 22%, transparent 50%)',
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(180deg, transparent 60%, rgba(0,0,0,0.2) 100%)',
          }}
        />

        {/* Hairline */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            borderRadius: radius,
            boxShadow:
              'inset 0 0 0 0.5px rgba(255,255,255,0.18), inset 0 1px 0 rgba(255,255,255,0.12)',
          }}
        />
      </div>

      <span
        className="mt-1 text-[10px] font-medium leading-tight transition-colors"
        style={{
          color: active ? '#D4AF37' : 'rgba(255,255,255,0.55)',
          letterSpacing: '-0.005em',
        }}
      >
        {label}
      </span>
    </Link>
  );
}
