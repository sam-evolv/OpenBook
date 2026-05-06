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
  onClose,
}: ConsumerHeaderProps) {
  const router = useRouter();
  const handleClose = () => {
    if (onClose) onClose();
    else router.push('/home');
  };

  if (!showClose) {
    return <div className="pt-safe" />;
  }

  return (
    <div className="pt-safe">
      <div className="relative flex items-center justify-between px-4 pt-3 pb-2">
        <button
          onClick={handleClose}
          className="w-9 h-9 rounded-full flex items-center justify-center mat-glass-thin active:scale-90 transition-transform"
          style={{ transitionTimingFunction: 'var(--ease-apple)' }}
          aria-label="Close"
        >
          <X className="w-[17px] h-[17px] text-white/95" strokeWidth={2.2} />
        </button>

        {/* Right-side spacer keeps the close button layout stable. */}
        <div className="w-9 h-9" />
      </div>
    </div>
  );
}
