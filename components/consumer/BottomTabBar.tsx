'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Sparkles, Calendar, type LucideIcon } from 'lucide-react';

const dockApps = [
  { href: '/home', label: 'Home', icon: Home },
  { href: '/explore', label: 'Explore', icon: Search },
  { href: '/assistant', label: 'AI', icon: Sparkles },
  { href: '/consumer-bookings', label: 'Bookings', icon: Calendar },
];

/**
 * iPhone-style dock. Raised liquid-glass platform with 4 fixed apps.
 * Persists across all consumer pages. Home screen for OpenBook is the
 * "folder" — businesses live above, dock stays docked.
 */
export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none pb-safe"
      aria-label="Dock"
    >
      <div className="mx-auto max-w-md px-4 pb-2 pointer-events-auto">
        <div
          className="
            relative rounded-[32px] px-3 py-3
            border border-white/[0.08]
            shadow-[0_20px_50px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-1px_0_rgba(0,0,0,0.4)]
          "
          style={{
            background:
              'linear-gradient(180deg, rgba(28,28,30,0.7) 0%, rgba(10,10,10,0.85) 100%)',
            backdropFilter: 'blur(40px) saturate(180%)',
            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          }}
        >
          {/* Glass top highlight */}
          <div
            aria-hidden
            className="absolute inset-x-3 top-0 h-px rounded-full"
            style={{
              background:
                'linear-gradient(90deg, transparent, rgba(255,255,255,0.16), transparent)',
            }}
          />

          <div className="flex items-center justify-around gap-2">
            {dockApps.map(({ href, label, icon: Icon }) => {
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
  return (
    <Link
      href={href}
      className="flex flex-col items-center active:scale-90 transition-transform duration-150"
      aria-label={label}
    >
      <div
        className="
          relative w-14 h-14 rounded-[16px]
          flex items-center justify-center
          shadow-[0_8px_20px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.22)]
        "
        style={{
          background: active
            ? 'linear-gradient(145deg, #F4D57A 0%, #D4AF37 50%, #8B6428 100%)'
            : 'linear-gradient(145deg, rgba(68,68,75,0.9) 0%, rgba(32,32,38,0.95) 100%)',
        }}
      >
        <Icon
          className={`w-6 h-6 ${active ? 'text-black/80' : 'text-white/90'}`}
          strokeWidth={active ? 2.5 : 2}
        />
        {/* Glass sheen */}
        <div
          aria-hidden
          className="absolute inset-0 rounded-[16px] pointer-events-none"
          style={{
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.02) 45%, transparent 60%)',
          }}
        />
      </div>
      <span
        className={`mt-1 text-[10px] font-medium tracking-tight ${
          active ? 'text-[#D4AF37]' : 'text-white/55'
        }`}
      >
        {label}
      </span>
    </Link>
  );
}
