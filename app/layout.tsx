import type { Metadata, Viewport } from 'next';
import { Fraunces } from 'next/font/google';
import './globals.css';

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  weight: ['500', '600', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: '#080808',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: {
    default: 'OpenBook',
    template: '%s · OpenBook',
  },
  description: 'Book local Irish businesses in seconds.',
  applicationName: 'OpenBook',
  appleWebApp: {
    capable: true,
    title: 'OpenBook',
    statusBarStyle: 'black-translucent',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/icons/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/favicon-48.png', sizes: '48x48', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon-57.png', sizes: '57x57' },
      { url: '/icons/apple-touch-icon-60.png', sizes: '60x60' },
      { url: '/icons/apple-touch-icon-72.png', sizes: '72x72' },
      { url: '/icons/apple-touch-icon-76.png', sizes: '76x76' },
      { url: '/icons/apple-touch-icon-114.png', sizes: '114x114' },
      { url: '/icons/apple-touch-icon-120.png', sizes: '120x120' },
      { url: '/icons/apple-touch-icon-144.png', sizes: '144x144' },
      { url: '/icons/apple-touch-icon-152.png', sizes: '152x152' },
      { url: '/icons/apple-touch-icon-167.png', sizes: '167x167' },
      { url: '/icons/apple-touch-icon-180.png', sizes: '180x180' },
    ],
  },
  manifest: '/manifest.webmanifest',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${fraunces.variable} antialiased`}>
      <body className="bg-black text-white min-h-screen">{children}</body>
    </html>
  );
}
