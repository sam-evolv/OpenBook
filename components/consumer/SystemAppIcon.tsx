'use client';

import Link from 'next/link';
import { Compass, Wallet, UserCircle, type LucideIcon } from 'lucide-react';

type SystemApp = {
  href: string;
  label: string;
  icon: LucideIcon;
  gradient: string;
};

const APPS: Record<'discover' | 'wallet' | 'me', SystemApp> = {
  discover: {
    href: '/explore',
    label: 'Discover',
    icon: Compass,
    gradient:
      'linear-gradient(145deg, #F4D57A 0%, #D4AF37 50%, #8B6428 100%)',
  },
  wallet: {
    href: '/wallet',
    label: 'Wallet',
    icon: Wallet,
    gradient:
      'linear-gradient(145deg, #3D3D42 0%, #1C1C1E 55%, #000000 100%)',
  },
  me: {
    href: '/me',
    label: 'Me',
    icon: UserCircle,
    gradient:
      'linear-gradient(145deg, #6B6B70 0%, #3A3A3F 55%, #1C1C20 100%)',
  },
};

export function SystemAppIcon({ kind }: { kind: 'discover' | 'wallet' | 'me' }) {
  const { href, label, icon: Icon, gradient } = APPS[kind];
  const isGold = kind === 'discover';

  return (
    <Link
      href={href}
      className="group flex flex-col items-center active:scale-90 transition-transform duration-150"
      aria-label={label}
    >
      <div
        className="
          relative w-[72px] h-[72px] rounded-[18px]
          flex items-center justify-center
          shadow-[0_10px_28px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.22)]
        "
        style={{ background: gradient }}
      >
        <Icon
          className={`w-9 h-9 ${isGold ? 'text-black/75' : 'text-white/95'}`}
          strokeWidth={2}
        />
        <div
          aria-hidden
          className="absolute inset-0 rounded-[18px] pointer-events-none"
          style={{
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.06) 42%, transparent 58%)',
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0 rounded-[18px] pointer-events-none"
          style={{
            boxShadow:
              'inset 0 0 0 1px rgba(255,255,255,0.16), inset 0 -1px 0 rgba(0,0,0,0.3)',
          }}
        />
      </div>
      <span
        className="mt-2 text-[12px] font-medium text-white/90 text-center leading-tight"
        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
      >
        {label}
      </span>
    </Link>
  );
}
