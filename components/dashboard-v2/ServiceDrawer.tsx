'use client';

import { useState, useTransition, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { Drawer } from './Drawer';
import { Button } from './Button';
import { FieldRow } from './FieldRow';
import { saveService, deleteService } from '@/app/(dashboard)/dashboard/catalog/actions';
import { cn } from '@/lib/utils';

export interface ServiceRow {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price_cents: number;
  is_active: boolean;
}

interface ServiceDrawerProps {
  open: boolean;
  onClose: () => void;
  /** When null, the drawer is in create mode. */
  service: ServiceRow | null;
  /**
   * When true, the drawer doesn't call server actions — used on the public
   * preview route. Save/Delete just close the drawer.
   */
  previewMode?: boolean;
}

interface DraftState {
  name: string;
  description: string;
  duration_minutes: number;
  price_euros: number;
  is_active: boolean;
}

function toDraft(s: ServiceRow | null): DraftState {
  if (!s) {
    return {
      name: '',
      description: '',
      duration_minutes: 60,
      price_euros: 0,
      is_active: true,
    };
  }
  return {
    name: s.name,
    description: s.description ?? '',
    duration_minutes: s.duration_minutes,
    price_euros: s.price_cents / 100,
    is_active: s.is_active,
  };
}

export function ServiceDrawer({ open, onClose, service, previewMode = false }: ServiceDrawerProps) {
  const [draft, setDraft] = useState<DraftState>(() => toDraft(service));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDelete] = useTransition();

  useEffect(() => {
    if (open) {
      setDraft(toDraft(service));
      setError(null);
    }
  }, [open, service]);

  const isEditing = service !== null;

  const onSave = () => {
    setError(null);
    if (!draft.name.trim()) {
      setError('Name is required');
      return;
    }
    if (previewMode) {
      onClose();
      return;
    }
    startTransition(async () => {
      const res = await saveService({
        id: service?.id,
        name: draft.name,
        description: draft.description,
        duration_minutes: draft.duration_minutes,
        price_cents: Math.round(draft.price_euros * 100),
        is_active: draft.is_active,
      });
      if (res.ok) onClose();
      else setError(res.error);
    });
  };

  const onDelete = () => {
    if (!service) return;
    const confirmed = window.confirm(
      `Delete "${service.name}"? Existing bookings that used this service stay intact, but customers won't be able to book it again.`,
    );
    if (!confirmed) return;
    if (previewMode) {
      onClose();
      return;
    }
    startDelete(async () => {
      const res = await deleteService(service.id);
      if (res.ok) onClose();
      else setError(res.error);
    });
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit service' : 'New service'}
      subtitle={isEditing ? service?.name : undefined}
      footer={
        <>
          {isEditing && (
            <Button
              variant="danger"
              size="md"
              icon={<Trash2 size={13} strokeWidth={2} />}
              onClick={onDelete}
              disabled={isPending || isDeleting}
            >
              {isDeleting ? 'Deleting…' : 'Delete'}
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="ghost" size="md" onClick={onClose} disabled={isPending || isDeleting}>
            Cancel
          </Button>
          <Button variant="primary" size="md" onClick={onSave} disabled={isPending || isDeleting}>
            {isPending ? 'Saving…' : isEditing ? 'Save changes' : 'Create service'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FieldRow
          label="Name"
          value={draft.name}
          onChange={(v) => setDraft((d) => ({ ...d, name: v }))}
          placeholder="PT Session"
        />
        <FieldRow
          label="Description"
          value={draft.description}
          onChange={(v) => setDraft((d) => ({ ...d, description: v }))}
          placeholder="1:1 training"
          multi
          rows={3}
        />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="mb-1.5 text-[11.5px] font-medium text-paper-text-2 dark:text-ink-text-2">
              Duration (minutes)
            </div>
            <input
              type="number"
              min={5}
              step={5}
              value={draft.duration_minutes}
              onChange={(e) =>
                setDraft((d) => ({ ...d, duration_minutes: Number(e.target.value) || 0 }))
              }
              className="h-10 w-full rounded-md border border-paper-border dark:border-ink-border bg-paper-surface dark:bg-ink-surface px-3 text-[13px] text-paper-text-1 dark:text-ink-text-1 outline-none focus:ring-2 focus:ring-gold focus:border-gold tabular-nums"
            />
          </div>
          <div>
            <div className="mb-1.5 text-[11.5px] font-medium text-paper-text-2 dark:text-ink-text-2">
              Price (€)
            </div>
            <input
              type="number"
              min={0}
              step={1}
              value={draft.price_euros}
              onChange={(e) =>
                setDraft((d) => ({ ...d, price_euros: Number(e.target.value) || 0 }))
              }
              className="h-10 w-full rounded-md border border-paper-border dark:border-ink-border bg-paper-surface dark:bg-ink-surface px-3 text-[13px] text-paper-text-1 dark:text-ink-text-1 outline-none focus:ring-2 focus:ring-gold focus:border-gold tabular-nums"
            />
          </div>
        </div>
        <label className="flex items-center gap-3 rounded-md border border-paper-border dark:border-ink-border bg-paper-surface dark:bg-ink-surface px-4 py-3 cursor-pointer">
          <input
            type="checkbox"
            checked={draft.is_active}
            onChange={(e) => setDraft((d) => ({ ...d, is_active: e.target.checked }))}
            className="h-4 w-4 rounded border-paper-borderStrong dark:border-ink-borderStrong accent-[#D4AF37]"
          />
          <div>
            <div className="text-[13px] font-medium text-paper-text-1 dark:text-ink-text-1">
              Bookable
            </div>
            <div className="text-[12px] text-paper-text-3 dark:text-ink-text-3">
              Uncheck to hide from customers without deleting the service.
            </div>
          </div>
        </label>
        {error && (
          <p className={cn('text-[12px] text-red-500 dark:text-red-400')}>{error}</p>
        )}
      </div>
    </Drawer>
  );
}
