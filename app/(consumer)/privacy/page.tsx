import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { Metadata } from 'next';
import { LegalDoc } from '@/components/consumer/LegalDoc';

export const metadata: Metadata = {
  title: 'Privacy Policy · OpenBook',
};

export const dynamic = 'force-static';

export default async function PrivacyPage() {
  const body = await fs.readFile(
    path.join(process.cwd(), 'content/legal/privacy.md'),
    'utf8',
  );
  return <LegalDoc title="Privacy Policy" body={body} />;
}
