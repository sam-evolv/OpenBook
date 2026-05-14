import { Facebook, Instagram, Music, Twitter } from 'lucide-react';
import Link from 'next/link';

export interface Socials {
  instagram?: string | null;
  facebook?: string | null;
  twitter?: string | null;
  tiktok?: string | null;
}

function normalise(
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

export function SocialIcons({
  socials,
  primaryHex,
}: {
  socials: Socials;
  primaryHex: string;
}) {
  const items: Array<{ key: string; href: string; Icon: typeof Instagram; label: string }> = [];
  if (socials.instagram) {
    items.push({
      key: 'instagram',
      href: normalise('instagram', socials.instagram),
      Icon: Instagram,
      label: 'Instagram',
    });
  }
  if (socials.facebook) {
    items.push({
      key: 'facebook',
      href: normalise('facebook', socials.facebook),
      Icon: Facebook,
      label: 'Facebook',
    });
  }
  if (socials.twitter) {
    items.push({
      key: 'twitter',
      href: normalise('twitter', socials.twitter),
      Icon: Twitter,
      label: 'Twitter',
    });
  }
  if (socials.tiktok) {
    // lucide-react has no TikTok glyph; Music is the closest neutral
    // stand-in and keeps the icon row visually consistent.
    items.push({
      key: 'tiktok',
      href: normalise('tiktok', socials.tiktok),
      Icon: Music,
      label: 'TikTok',
    });
  }

  if (items.length === 0) return null;

  return (
    <div style={{ display: 'flex', gap: 14 }}>
      {items.map(({ key, href, Icon, label }) => (
        <Link
          key={key}
          href={href}
          target="_blank"
          rel="noopener noreferrer me"
          aria-label={label}
          style={{
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 999,
            background: 'rgba(255,255,255,0.05)',
            color: primaryHex,
            border: '0.5px solid rgba(255,255,255,0.08)',
            textDecoration: 'none',
          }}
        >
          <Icon size={16} strokeWidth={1.8} />
        </Link>
      ))}
    </div>
  );
}
