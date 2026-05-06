'use client';

import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ConsumerHeaderProps {
  showClose?: boolean;
  domain?: string;
  onClose?: () => void;
}

export function ConsumerHeader({
  showClose = true,
  domain = 'openbook.ie',
  onClose,
}: ConsumerHeaderProps) {
  const router = useRouter();
  const handleClose = () => {
    if (onClose) onClose();
    else router.push('/home');
  };

  return (
    <div className="pt-safe">
      <div className="relative flex items-center justify-between px-4 pt-3 pb-2">
        {showClose ? (
          <button
            onClick={handleClose}
            className="w-9 h-9 rounded-full flex items-center justify-center mat-glass-thin active:scale-90 transition-transform"
            style={{ transitionTimingFunction: 'var(--ease-apple)' }}
            aria-label="Close"
          >
            <X className="w-[17px] h-[17px] text-white/95" strokeWidth={2.2} />
          </button>
        ) : (
          <div className="w-9 h-9" />
        )}

        <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center">
          <span
            className="text-[15px] font-medium"
            style={{ letterSpacing: '-0.01em', color: 'rgba(255,255,255,0.88)' }}
          >
            {domain}
          </span>
          <div className="mt-1 h-[3px] w-8 rounded-full bg-white/25" />
        </div>

        {/* Right-side spacer keeps the centered domain pill visually centred. */}
        <div className="w-9 h-9" />
      </div>
    </div>
  );
}
