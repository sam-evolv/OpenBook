'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Calendar, Wallet, User } from 'lucide-react';

const tabs = [
  { href: '/home', label: 'OpenBook', icon: Home },
  { href: '/explore', label: 'Explore', icon: Search },
  { href: '/consumer-bookings', label: 'Bookings', icon: Calendar },
  { href: '/wallet', label: 'Wallet', icon: Wallet },
  { href: '/me', label: 'Me', icon: User },
];

export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pb-safe pointer-events-none">
      <div className="mx-4 mb-2 pointer-events-auto">
        <nav
          className="
            relative flex items-center justify-around
            rounded-[28px] px-2 py-2
            bg-[#0a0a0a]/80 backdrop-blur-2xl
            border border-white/[0.06]
            shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.04)]
          "
        >
          {tabs.map(({ href, label, icon: Icon }) => {
            const active =
              pathname === href ||
              (href !== '/home' && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl transition-all active:scale-95"
              >
                <Icon
                  className={`w-[22px] h-[22px] transition-colors ${
                    active ? 'text-[#D4AF37]' : 'text-white/45'
                  }`}
                  strokeWidth={active ? 2.2 : 1.8}
                />
                <span
                  className={`text-[10px] font-medium tracking-tight transition-colors ${
                    active ? 'text-[#D4AF37]' : 'text-white/45'
                  }`}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
