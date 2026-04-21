import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AvatarProps {
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  color?: string;
  online?: boolean;
  favourited?: boolean;
}

const sizeClasses: Record<NonNullable<AvatarProps['size']>, string> = {
  xs: 'h-6 w-6 text-[9.5px]',
  sm: 'h-7 w-7 text-[10.5px]',
  md: 'h-9 w-9 text-xs',
  lg: 'h-11 w-11 text-sm',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function Avatar({
  name,
  size = 'sm',
  color,
  online = false,
  favourited = false,
}: AvatarProps) {
  const initials = getInitials(name);

  return (
    <div className="relative inline-block">
      <div
        className={cn(
          'flex items-center justify-center rounded-full font-semibold',
          'bg-gradient-to-br from-paper-surface2 to-paper-borderStrong text-paper-text-1',
          'dark:from-ink-surface2 dark:to-ink-borderStrong dark:text-ink-text-1',
          sizeClasses[size],
        )}
        style={
          color
            ? {
                background: `linear-gradient(135deg, ${color} 0%, ${color}AA 100%)`,
                color: '#000',
              }
            : undefined
        }
      >
        {initials}
      </div>
      {online && (
        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-paper-bg dark:border-ink-bg" />
      )}
      {favourited && !online && (
        <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-gold border-2 border-paper-bg dark:border-ink-bg">
          <Heart size={7} className="fill-black text-black" />
        </span>
      )}
    </div>
  );
}
