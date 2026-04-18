'use client';

import { X, LayoutList } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ConsumerHeaderProps {
  showClose?: boolean;
  showLayout?: boolean;
  domain?: string;
  onClose?: () => void;
}

export function ConsumerHeader({
  showClose = true,
  showLayout = true,
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
            className="
              w-9 h-9 rounded-full flex items-center justify-center
              bg-white/[0.08] border border-white/[0.08]
              backdrop-blur-xl
              active:scale-90 transition-transform
            "
            aria-label="Close"
          >
            <X className="w-[18px] h-[18px] text-white" strokeWidth={2.2} />
          </button>
        ) : (
          <div className="w-9 h-9" />
        )}

        <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center">
          <span className="text-[15px] font-medium text-white/85 tracking-tight">
            {domain}
          </span>
          <div className="mt-1 h-[3px] w-8 rounded-full bg-white/25" />
        </div>

        {showLayout ? (
          <button
            className="
              w-9 h-9 rounded-full flex items-center justify-center
              bg-white/[0.08] border border-white/[0.08]
              backdrop-blur-xl
              active:scale-90 transition-transform
            "
            aria-label="Layout"
          >
            <LayoutList className="w-[16px] h-[16px] text-white" strokeWidth={2.2} />
          </button>
        ) : (
          <div className="w-9 h-9" />
        )}
      </div>
    </div>
  );
}
