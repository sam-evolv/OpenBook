'use client';

import { useState, useTransition } from 'react';
import {
  Bell,
  Box,
  CalendarPlus,
  Check,
  CreditCard,
  Heart,
  RotateCcw,
  Star,
  UserCheck,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Card } from './Card';
import { Button } from './Button';
import { TopBar } from './TopBar';
import { FieldRow } from './FieldRow';
import {
  saveSettings,
  type Automations,
  type SettingsPayload,
} from '@/app/(dashboard)/dashboard/settings/actions';
import { cn } from '@/lib/utils';

type AutomationKey = keyof Automations;

interface AutomationDef {
  key: AutomationKey;
  title: string;
  description: string;
  icon: LucideIcon;
  default: boolean;
}

const AUTOMATIONS: AutomationDef[] = [
  {
    key: 'auto_reviews',
    title: 'Auto review requests',
    description: 'Send a Google review link 2 hours after each completed booking.',
    icon: Star,
    default: true,
  },
  {
    key: 'auto_waitlist_fill',
    title: 'Auto waitlist fill',
    description:
      'When a customer cancels, WhatsApp the waitlist in order — first to tap gets the slot.',
    icon: UserCheck,
    default: true,
  },
  {
    key: 'auto_reminders',
    title: 'Auto-reminders',
    description: 'WhatsApp reminder 24 hours before every booking.',
    icon: Bell,
    default: true,
  },
  {
    key: 'win_back_offers',
    title: 'Win-back offers',
    description: 'After 5 weeks inactive, auto-offer 20% off their next session.',
    icon: Heart,
    default: false,
  },
  {
    key: 'smart_rescheduling',
    title: 'Smart rescheduling',
    description:
      "When a customer asks to reschedule, Claude offers slots matching their pattern.",
    icon: CalendarPlus,
    default: true,
  },
  {
    key: 'low_stock_alerts',
    title: 'Low-stock alerts',
    description: 'WhatsApp you when any retail product drops below its threshold.',
    icon: Box,
    default: true,
  },
  {
    key: 'membership_renewal_nudges',
    title: 'Membership renewal nudges',
    description:
      'Remind members 3 days before card renewal to reduce failed payments.',
    icon: CreditCard,
    default: true,
  },
  {
    key: 'class_fill_notifications',
    title: 'Class-fill notifications',
    description:
      'When a class reaches 80% full, push to favourites to fill remaining spots.',
    icon: Users,
    default: true,
  },
];

export interface SettingsInitial {
  name: string;
  tagline: string | null;
  about_long: string | null;
  founder_name: string | null;
  phone: string | null;
  website: string | null;
  address_line: string | null;
  city: string | null;
  socials: { instagram?: string | null; tiktok?: string | null; facebook?: string | null } | null;
  automations: Automations | null;
}

interface SettingsFormProps {
  initial: SettingsInitial;
}

function applyDefaults(a: Automations | null): Automations {
  const base: Automations = {};
  for (const def of AUTOMATIONS) {
    base[def.key] = a?.[def.key] ?? def.default;
  }
  return base;
}

export function SettingsForm({ initial }: SettingsFormProps) {
  const [form, setForm] = useState(() => ({
    ...initial,
    socials: initial.socials ?? {},
    automations: applyDefaults(initial.automations),
  }));
  const [dirty, setDirty] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const update = <K extends keyof SettingsInitial>(key: K, value: SettingsInitial[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
    setStatus('idle');
  };

  const updateSocial = (key: 'instagram' | 'tiktok' | 'facebook', value: string) => {
    setForm((f) => ({ ...f, socials: { ...f.socials, [key]: value || null } }));
    setDirty(true);
    setStatus('idle');
  };

  const toggleAutomation = (key: AutomationKey) => {
    setForm((f) => ({
      ...f,
      automations: { ...f.automations, [key]: !f.automations[key] },
    }));
    setDirty(true);
    setStatus('idle');
  };

  const reset = () => {
    setForm({
      ...initial,
      socials: initial.socials ?? {},
      automations: applyDefaults(initial.automations),
    });
    setDirty(false);
    setStatus('idle');
  };

  const onSave = () => {
    setStatus('idle');
    setErrorMsg(null);
    startTransition(async () => {
      const payload: SettingsPayload = {
        name: form.name,
        tagline: form.tagline,
        about_long: form.about_long,
        founder_name: form.founder_name,
        phone: form.phone,
        website: form.website,
        address_line: form.address_line,
        city: form.city,
        socials: {
          instagram: form.socials.instagram ?? null,
          tiktok: form.socials.tiktok ?? null,
          facebook: form.socials.facebook ?? null,
        },
        automations: form.automations,
      };
      const res = await saveSettings(payload);
      if (res.ok) {
        setStatus('saved');
        setDirty(false);
      } else {
        setStatus('error');
        setErrorMsg(res.error);
      }
    });
  };

  return (
    <>
      <TopBar
        title="Settings"
        subtitle="Business info and automations"
        actions={
          <>
            {dirty && (
              <Button
                variant="ghost"
                size="md"
                icon={<RotateCcw size={13} strokeWidth={2} />}
                onClick={reset}
                disabled={isPending}
              >
                Reset
              </Button>
            )}
            <Button
              variant="primary"
              size="md"
              icon={status === 'saved' ? <Check size={13} strokeWidth={2.5} /> : undefined}
              onClick={onSave}
              disabled={!dirty || isPending}
            >
              {isPending ? 'Saving…' : status === 'saved' ? 'Saved' : 'Save changes'}
            </Button>
          </>
        }
      />

      <div className="mx-auto max-w-3xl px-8 py-8 space-y-10">
        <Section title="Automations">
          <Card padding="none">
            {AUTOMATIONS.map((a, i) => {
              const enabled = form.automations[a.key] ?? a.default;
              const Icon = a.icon;
              return (
                <div
                  key={a.key}
                  className={cn(
                    'grid grid-cols-[36px_1fr_auto] items-center gap-4 px-5 py-4',
                    i !== AUTOMATIONS.length - 1 &&
                      'border-b border-paper-border dark:border-ink-border',
                  )}
                >
                  <div
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-md border',
                      enabled
                        ? 'bg-gold-soft border-gold-border text-gold'
                        : 'bg-paper-surface2 dark:bg-ink-surface2 border-paper-border dark:border-ink-border text-paper-text-3 dark:text-ink-text-3',
                    )}
                  >
                    <Icon size={14} strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13.5px] font-semibold text-paper-text-1 dark:text-ink-text-1">
                      {a.title}
                    </div>
                    <div className="mt-0.5 text-[12px] text-paper-text-3 dark:text-ink-text-3 leading-[1.4]">
                      {a.description}
                    </div>
                  </div>
                  <Switch
                    checked={enabled}
                    onChange={() => toggleAutomation(a.key)}
                    label={a.title}
                  />
                </div>
              );
            })}
          </Card>
        </Section>

        <Section title="Business info">
          <Card>
            <div className="flex flex-col gap-4">
              <FieldRow
                label="Business name"
                value={form.name ?? ''}
                onChange={(v) => update('name', v)}
              />
              <FieldRow
                label="Tagline"
                value={form.tagline ?? ''}
                onChange={(v) => update('tagline', v)}
                help="One line under your business name. Keep it specific."
              />
              <FieldRow
                label="About"
                value={form.about_long ?? ''}
                onChange={(v) => update('about_long', v)}
                multi
                rows={4}
                placeholder="Tell customers what makes you different…"
              />
              <FieldRow
                label="Founder"
                value={form.founder_name ?? ''}
                onChange={(v) => update('founder_name', v)}
              />
            </div>
          </Card>
        </Section>

        <Section title="Contact">
          <Card>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FieldRow
                label="Phone"
                value={form.phone ?? ''}
                onChange={(v) => update('phone', v)}
                placeholder="+353 87 123 4567"
              />
              <FieldRow
                label="Website"
                value={form.website ?? ''}
                onChange={(v) => update('website', v)}
                placeholder="example.com"
              />
              <FieldRow
                label="Address"
                value={form.address_line ?? ''}
                onChange={(v) => update('address_line', v)}
              />
              <FieldRow
                label="City"
                value={form.city ?? ''}
                onChange={(v) => update('city', v)}
              />
            </div>
          </Card>
        </Section>

        <Section title="Socials">
          <Card>
            <div className="flex flex-col gap-4">
              <FieldRow
                label="Instagram handle"
                value={form.socials.instagram ?? ''}
                onChange={(v) => updateSocial('instagram', v)}
                placeholder="@yourbusiness"
              />
              <FieldRow
                label="TikTok handle"
                value={form.socials.tiktok ?? ''}
                onChange={(v) => updateSocial('tiktok', v)}
                placeholder="@yourbusiness"
              />
              <FieldRow
                label="Facebook page"
                value={form.socials.facebook ?? ''}
                onChange={(v) => updateSocial('facebook', v)}
                placeholder="facebook.com/yourbusiness"
              />
            </div>
          </Card>
        </Section>

        {status === 'error' && errorMsg && (
          <p className="text-[12px] text-red-500 dark:text-red-400">
            Couldn't save: {errorMsg}
          </p>
        )}
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="text-[11px] font-semibold uppercase tracking-[0.6px] text-paper-text-3 dark:text-ink-text-3 mb-3">
        {title}
      </div>
      {children}
    </section>
  );
}

function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={cn(
        'relative h-5 w-9 shrink-0 rounded-full transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2',
        'focus-visible:ring-offset-paper-bg dark:focus-visible:ring-offset-ink-bg',
        checked
          ? 'bg-gold'
          : 'bg-paper-surface3 dark:bg-ink-surface3 border border-paper-border dark:border-ink-border',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all',
          checked ? 'left-[18px]' : 'left-0.5',
        )}
      />
    </button>
  );
}
