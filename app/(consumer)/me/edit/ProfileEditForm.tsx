'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Check, ChevronLeft, Loader2 } from 'lucide-react';
import { saveCustomerProfile } from './actions';

interface Props {
  initial: {
    full_name: string;
    email: string;
    phone: string;
  };
}

export function ProfileEditForm({ initial }: Props) {
  const [form, setForm] = useState(initial);
  const [savedForm, setSavedForm] = useState(initial);
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const dirty =
    form.full_name !== savedForm.full_name ||
    form.email !== savedForm.email ||
    form.phone !== savedForm.phone;

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
    setStatus('idle');
    setError(null);
  }

  function save() {
    startTransition(async () => {
      const result = await saveCustomerProfile(form);
      if (result.ok) {
        setSavedForm(form);
        setStatus('saved');
      } else {
        setStatus('error');
        setError(result.error);
      }
    });
  }

  return (
    <main className="relative min-h-[100dvh] overflow-hidden text-white antialiased">
      <div
        aria-hidden
        className="fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(760px 420px at 50% -8%, rgba(212,175,55,0.14), transparent 58%),' +
            'linear-gradient(180deg, #050505 0%, #020202 100%)',
        }}
      />

      <div className="mx-auto max-w-md px-5 pb-safe pt-[calc(18px+env(safe-area-inset-top))]">
        <header className="flex items-center gap-3">
          <Link
            href="/me"
            aria-label="Back to profile"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.10] bg-white/[0.055] active:scale-95"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2.2} />
          </Link>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#D4AF37]">
              OpenBook account
            </p>
            <h1 className="mt-1 text-[28px] font-bold leading-none tracking-tight">
              Edit profile
            </h1>
          </div>
        </header>

        <section className="mt-7 rounded-[30px] border border-white/[0.10] bg-white/[0.045] p-5 shadow-[0_18px_52px_rgba(0,0,0,0.38)]">
          <ProfileField
            label="Name"
            value={form.full_name}
            onChange={(value) => update('full_name', value)}
            placeholder="Your name"
          />
          <ProfileField
            label="Email"
            value={form.email}
            onChange={(value) => update('email', value)}
            placeholder="you@example.com"
            type="email"
          />
          <ProfileField
            label="Phone"
            value={form.phone}
            onChange={(value) => update('phone', value)}
            placeholder="+353 87 123 4567"
            type="tel"
          />

          {status === 'error' && error && (
            <p className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-[12px] text-red-100">
              {error}
            </p>
          )}

          {status === 'saved' && (
            <p className="mt-4 rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/10 px-3 py-2 text-[12px] text-[#F6D77C]">
              Profile saved.
            </p>
          )}

          <button
            type="button"
            onClick={save}
            disabled={!dirty || isPending}
            className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#D4AF37] text-[14px] font-semibold text-black shadow-[0_8px_22px_rgba(212,175,55,0.28)] active:scale-[0.98] disabled:opacity-45"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : status === 'saved' ? (
              <Check className="h-4 w-4" />
            ) : null}
            {isPending ? 'Saving...' : status === 'saved' ? 'Saved' : 'Save changes'}
          </button>
        </section>
      </div>
    </main>
  );
}

function ProfileField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <label className="block border-b border-white/[0.07] py-4 last:border-b-0">
      <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full bg-transparent text-[16px] text-white outline-none placeholder:text-white/30"
      />
    </label>
  );
}
