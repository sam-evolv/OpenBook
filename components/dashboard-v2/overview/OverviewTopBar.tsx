'use client';

import { useState } from 'react';
import { Copy, ExternalLink, Check } from 'lucide-react';
import { TopBar } from '../TopBar';
import { Button } from '../Button';

function greetingFor(now: Date): string {
  const hour = now.getHours();
  if (hour < 5) return 'Up late,';
  if (hour < 12) return 'Good morning,';
  if (hour < 17) return 'Good afternoon,';
  return 'Good evening,';
}

function firstName(fullName: string | null | undefined): string {
  if (!fullName) return '';
  const first = fullName.trim().split(/\s+/)[0];
  return first ?? '';
}

interface OverviewTopBarProps {
  ownerFullName: string | null;
  businessName: string;
  businessSlug: string;
}

export function OverviewTopBar({ ownerFullName, businessName, businessSlug }: OverviewTopBarProps) {
  const [copied, setCopied] = useState(false);

  const name = firstName(ownerFullName);
  const title = name ? `${greetingFor(new Date())} ${name}` : `Overview`;
  const publicUrl = `https://openbook.ie/${businessSlug}`;

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* Clipboard may fail on insecure contexts — silent no-op. */
    }
  };

  return (
    <TopBar
      title={title}
      subtitle={`Here's what's happening at ${businessName} today`}
      actions={
        <>
          <Button
            variant="secondary"
            size="md"
            icon={copied ? <Check size={13} strokeWidth={2.5} /> : <Copy size={13} strokeWidth={2} />}
            onClick={onCopy}
          >
            {copied ? 'Copied' : 'Copy link'}
          </Button>
          <a href={publicUrl} target="_blank" rel="noopener noreferrer">
            <Button
              variant="primary"
              size="md"
              icon={<ExternalLink size={13} strokeWidth={2} />}
            >
              View booking page
            </Button>
          </a>
        </>
      }
    />
  );
}
