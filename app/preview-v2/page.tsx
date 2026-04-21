import { cookies } from 'next/headers';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { PreviewContent } from '@/app/(dashboard-v2)/v2/preview/PreviewContent';

export const dynamic = 'force-dynamic';

export default function PublicPreviewPage() {
  const themeCookie = cookies().get('theme')?.value;
  const theme: 'dark' | 'light' = themeCookie === 'light' ? 'light' : 'dark';
  return (
    <div
      data-theme={theme}
      className={`${GeistSans.variable} ${GeistMono.variable} font-sans min-h-[100dvh] bg-paper-bg text-paper-text-1 dark:bg-ink-bg dark:text-ink-text-1`}
    >
      <PreviewContent initialTheme={theme} />
    </div>
  );
}
