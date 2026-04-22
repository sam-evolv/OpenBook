'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import { Search, Plus, UserPlus, AlertTriangle, X, Check } from 'lucide-react';
import { Button } from '../Button';
import { Avatar } from '../Avatar';
import type { CustomerOption } from '@/lib/dashboard-v2/calendar-queries';
import {
  createCustomer,
  type CreateCustomerResult,
} from '@/app/(dashboard)/dashboard/calendar/actions';
import { cn } from '@/lib/utils';

type Mode =
  | { kind: 'search' }
  | { kind: 'adding'; initialName: string }
  | { kind: 'duplicate'; existing: { id: string; display_name: string; phone: string } };

interface CustomerPickerProps {
  customers: CustomerOption[];
  selected: { id: string; display_name: string; phone: string | null } | null;
  onChange: (next: { id: string; display_name: string; phone: string | null } | null) => void;
  previewMode?: boolean;
}

const MAX_SUGGESTIONS = 5;

export function CustomerPicker({
  customers,
  selected,
  onChange,
  previewMode,
}: CustomerPickerProps) {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<Mode>({ kind: 'search' });
  const [draftName, setDraftName] = useState('');
  const [draftPhone, setDraftPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return customers
      .filter((c) => {
        const name = c.display_name.toLowerCase();
        const phone = (c.phone ?? '').toLowerCase();
        return name.includes(q) || phone.includes(q);
      })
      .slice(0, MAX_SUGGESTIONS);
  }, [query, customers]);

  if (selected) {
    return (
      <div className="flex items-center gap-3 rounded-md border border-paper-border dark:border-ink-border bg-paper-surface dark:bg-ink-surface px-3 py-2">
        <Avatar name={selected.display_name} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-medium text-paper-text-1 dark:text-ink-text-1 truncate">
            {selected.display_name}
          </div>
          {selected.phone && (
            <div className="text-[11.5px] text-paper-text-3 dark:text-ink-text-3 truncate">
              {selected.phone}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            onChange(null);
            setQuery('');
            setMode({ kind: 'search' });
          }}
          className="p-1 text-paper-text-3 dark:text-ink-text-3 hover:text-paper-text-1 dark:hover:text-ink-text-1"
          aria-label="Change customer"
        >
          <X size={14} strokeWidth={1.75} />
        </button>
      </div>
    );
  }

  if (mode.kind === 'duplicate') {
    const { existing } = mode;
    return (
      <div className="rounded-md border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20 p-3 space-y-3">
        <div className="flex items-start gap-2 text-[13px] text-amber-700 dark:text-amber-300">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <div>
            <div className="font-semibold">
              That number already belongs to {existing.display_name}.
            </div>
            <div className="text-[12px] opacity-90 mt-0.5">
              You've had a booking with them before. Use the existing customer or enter a different
              number.
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setMode({ kind: 'adding', initialName: draftName });
              setDraftPhone('');
            }}
          >
            Different number
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Check size={13} strokeWidth={2.5} />}
            onClick={() => {
              onChange({
                id: existing.id,
                display_name: existing.display_name,
                phone: existing.phone,
              });
              setMode({ kind: 'search' });
              setError(null);
            }}
          >
            Use existing
          </Button>
        </div>
      </div>
    );
  }

  if (mode.kind === 'adding') {
    const tryAdd = () => {
      setError(null);
      if (!draftName.trim()) {
        setError('Name is required.');
        return;
      }
      if (!draftPhone.trim() || draftPhone.replace(/[^0-9]/g, '').length < 6) {
        setError('Enter a valid phone number.');
        return;
      }
      if (previewMode) {
        onChange({
          id: 'preview-customer',
          display_name: draftName.trim(),
          phone: draftPhone.trim(),
        });
        setMode({ kind: 'search' });
        return;
      }
      startTransition(async () => {
        const res: CreateCustomerResult = await createCustomer({
          name: draftName,
          phone: draftPhone,
        });
        if (!res.ok) {
          setError(res.error);
          return;
        }
        if (res.action === 'existing') {
          setMode({
            kind: 'duplicate',
            existing: {
              id: res.customer.id,
              display_name: res.customer.display_name,
              phone: res.customer.phone ?? draftPhone,
            },
          });
          return;
        }
        onChange({
          id: res.customer.id,
          display_name: res.customer.display_name,
          phone: res.customer.phone,
        });
        setMode({ kind: 'search' });
      });
    };

    return (
      <div className="rounded-md border border-paper-border dark:border-ink-border bg-paper-surface dark:bg-ink-surface p-3 space-y-3">
        <div className="flex items-center gap-2 text-[12px] font-semibold text-paper-text-1 dark:text-ink-text-1">
          <UserPlus size={13} strokeWidth={2} />
          Add new customer
        </div>
        <div className="grid grid-cols-1 gap-2.5">
          <input
            autoFocus
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            placeholder="Full name"
            className="h-10 rounded-md border border-paper-border dark:border-ink-border bg-paper-bg dark:bg-ink-bg px-3 text-[13px] text-paper-text-1 dark:text-ink-text-1 outline-none focus:ring-2 focus:ring-gold focus:border-gold"
          />
          <input
            type="tel"
            value={draftPhone}
            onChange={(e) => setDraftPhone(e.target.value)}
            placeholder="Phone — e.g. +353 87 123 4567"
            className="h-10 rounded-md border border-paper-border dark:border-ink-border bg-paper-bg dark:bg-ink-bg px-3 text-[13px] text-paper-text-1 dark:text-ink-text-1 outline-none focus:ring-2 focus:ring-gold focus:border-gold"
          />
          {error && <p className="text-[12px] text-red-500 dark:text-red-400">{error}</p>}
        </div>
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setMode({ kind: 'search' });
              setError(null);
            }}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={tryAdd} disabled={isPending}>
            {isPending ? 'Adding…' : 'Add customer'}
          </Button>
        </div>
      </div>
    );
  }

  // Default search mode
  return (
    <div className="space-y-1.5">
      <div className="relative">
        <Search
          size={13}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-paper-text-3 dark:text-ink-text-3 pointer-events-none"
        />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search customer or phone…"
          className="h-10 w-full rounded-md border border-paper-border dark:border-ink-border bg-paper-surface dark:bg-ink-surface pl-9 pr-3 text-[13px] text-paper-text-1 dark:text-ink-text-1 placeholder:text-paper-text-3 dark:placeholder:text-ink-text-3 outline-none focus:ring-2 focus:ring-gold focus:border-gold"
        />
      </div>
      {query.trim() && (
        <div className="rounded-md border border-paper-border dark:border-ink-border bg-paper-surface dark:bg-ink-surface overflow-hidden">
          {suggestions.length === 0 ? (
            <button
              type="button"
              onClick={() => {
                setMode({ kind: 'adding', initialName: query.trim() });
                setDraftName(query.trim());
                setDraftPhone('');
                setError(null);
              }}
              className="flex items-center gap-2 w-full px-3 py-2.5 text-[13px] text-left hover:bg-paper-surface2 dark:hover:bg-ink-surface2 text-gold"
            >
              <Plus size={13} strokeWidth={2} />
              <span>
                Add new customer:{' '}
                <span className="font-semibold">{query.trim()}</span>
              </span>
            </button>
          ) : (
            <ul className="divide-y divide-paper-border dark:divide-ink-border">
              {suggestions.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange({ id: c.id, display_name: c.display_name, phone: c.phone });
                      setQuery('');
                    }}
                    className={cn(
                      'flex items-center gap-3 w-full px-3 py-2 text-left',
                      'hover:bg-paper-surface2 dark:hover:bg-ink-surface2 transition-colors',
                    )}
                  >
                    <Avatar name={c.display_name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium text-paper-text-1 dark:text-ink-text-1 truncate">
                        {c.display_name}
                      </div>
                      {c.phone && (
                        <div className="text-[11.5px] text-paper-text-3 dark:text-ink-text-3 truncate">
                          {c.phone}
                        </div>
                      )}
                    </div>
                  </button>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setMode({ kind: 'adding', initialName: query.trim() });
                    setDraftName(query.trim());
                    setDraftPhone('');
                    setError(null);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2.5 text-[12.5px] text-left hover:bg-paper-surface2 dark:hover:bg-ink-surface2 text-gold border-t border-paper-border dark:border-ink-border"
                >
                  <Plus size={12} strokeWidth={2} />
                  <span>Add new customer</span>
                </button>
              </li>
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
