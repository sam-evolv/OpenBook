import { cookies } from 'next/headers';
import { PreviewContent } from './PreviewContent';

export const dynamic = 'force-dynamic';

export default function PreviewPage() {
  const themeCookie = cookies().get('theme')?.value;
  const theme: 'dark' | 'light' = themeCookie === 'light' ? 'light' : 'dark';
  return <PreviewContent initialTheme={theme} />;
}
