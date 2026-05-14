import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { Metadata } from 'next';
import { LegalDoc } from '@/components/consumer/LegalDoc';

export const metadata: Metadata = {
  title: 'Terms of Service · OpenBook',
};

export const dynamic = 'force-static';

export default async function TermsPage() {
  const body = await fs.readFile(
    path.join(process.cwd(), 'content/legal/terms.md'),
    'utf8',
  );
  return <LegalDoc title="Terms of Service" body={body} />;
}
