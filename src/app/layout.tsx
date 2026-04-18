import type { Metadata, Viewport } from 'next';
import { Fraunces, Inter_Tight, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const display = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
});

const sans = Inter_Tight({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500'],
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://www.openbook.ie'),
  title: 'OpenBook — Your booking page, live in 15 minutes',
  description:
    'The booking platform built for the AI era — discoverable by ChatGPT, Claude and Gemini, live in 15 minutes for Irish gyms, salons, barbers and studios.',
  applicationName: 'OpenBook',
  openGraph: {
    title: 'OpenBook — Your booking page, live in 15 minutes',
    description:
      'AI-distributed booking for Irish local businesses. Zero commission. Live in 15 minutes.',
    url: 'https://www.openbook.ie',
    siteName: 'OpenBook',
    locale: 'en_IE',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OpenBook — Your booking page, live in 15 minutes',
    description:
      'AI-distributed booking for Irish local businesses. Zero commission. Live in 15 minutes.',
  },
  icons: {
    icon: [{ url: '/favicon.ico' }],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#080808',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body className="bg-ink text-paper antialiased">{children}</body>
    </html>
  );
}
