'use client';

import { useEffect, useState, useTransition } from 'react';
import { UserX } from 'lucide-react';
import { Drawer } from '../Drawer';
import { Button } from '../Button';
import { FieldRow } from '../FieldRow';
import { StaffColourPicker } from './StaffColourPicker';
import {
  saveStaff,
  deactivateStaff,
  type StaffInput,
} from '@/app/(dashboard-v2)/v2/team/actions';
import type { TeamStaffRow } from '@/lib/dashboard-v2/team-queries';
import { cn } from '@/lib/utils';

interface StaffDrawerProps {
  open: boolean;
  onClose: () => void;
  /** null = create mode, otherwise edit. */
  staff: TeamStaffRow | null;
  previewMode?: boolean;
}

interface Draft {
  name: string;
  title: string;
  bio: string;
  email: string;
  instagram_handle: string;
  specialties: string;
  colour: string | null;
  is_active: boolean;
}

function toDraft(s: TeamStaffRow | null): Draft {
  if (!s) {
    return {
      name: '',
      title: '',
      bio: '',
      email: '',
      instagram_handle: '',
      specialties: '',
      colour: null,
      is_active: true,
    };
  }
  return {
    name: s.name,
    title: s.title ?? '',
    bio: s.bio ?? '',
    email: s.email ?? '',
    instagram_handle: s.instagram_handle ?? '',
    specialties: s.specialties.join(', '),
    colour: s.colour,
    is_active: s.is_active,
  };
}

export function StaffDrawer({ open, onClose, staff, previewMode }: StaffDrawerProps) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(staff));
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSave] = useTransition();
  const [isDeactivating, startDeactivate] = useTransition();

  useEffect(() => {
    if (open) {
      setDraft(toDraft(staff));
      setError(null);
    }
  }, [open, staff]);

  const isEditing = staff !== null;

  const onSave = () => {
    setError(null);
    if (!draft.name.trim()) {
      setError('Name is required');
      return;
    }
    const payload: StaffInput = {
      id: staff?.id,
      name: draft.name,
      title: draft.title || null,
      bio: draft.bio || null,
      email: draft.email || null,
      instagram_handle: draft.instagram_handle || null,
      specialties: draft.specialties
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      colour: draft.colour,
      is_active: draft.is_active,
    };
    if (previewMode) {
      onClose();
      return;
    }
    startSave(async () => {
      const res = await saveStaff(payload);
      if (res.ok) onClose();
      else setError(res.error);
    });
  };

  const onDeactivate = () => {
    if (!staff) return;
    const confirmed = window.confirm(
      `Deactivate ${staff.name}? They'll stop appearing on Calendar and Team. Historical bookings stay on the record.`,
    );
    if (!confirmed) return;
    if (previewMode) {
      onClose();
      return;
    }
    startDeactivate(async () => {
      const res = await deactivateStaff(staff.id);
      if (res.ok) onClose();
      else setError(res.error);
    });
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit team member' : 'Invite team member'}
      subtitle={isEditing ? staff?.name : 'Staff accounts are owner-managed in v1'}
      width="lg"
      footer={
        <>
          {isEditing && staff!.is_active && (
            <Button
              variant="danger"
              size="md"
              icon={<UserX size={13} strokeWidth={2} />}
              onClick={onDeactivate}
              disabled={isSaving || isDeactivating}
            >
              {isDeactivating ? 'Deactivating…' : 'Deactivate'}
            </Button>
          )}
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="md"
            onClick={onClose}
            disabled={isSaving || isDeactivating}
          >
            Cancel
          </Button>
          <Button variant="primary" size="md" onClick={onSave} disabled={isSaving || isDeactivating}>
            {isSaving ? 'Saving…' : isEditing ? 'Save changes' : 'Add team member'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <FieldRow
            label="Name"
            value={draft.name}
            onChange={(v) => setDraft((d) => ({ ...d, name: v }))}
            placeholder="Full name"
          />
          <FieldRow
            label="Title"
            value={draft.title}
            onChange={(v) => setDraft((d) => ({ ...d, title: v }))}
            placeholder="e.g. Head coach"
          />
        </div>
        <FieldRow
          label="Bio"
          value={draft.bio}
          onChange={(v) => setDraft((d) => ({ ...d, bio: v }))}
          placeholder="Short introduction — shown on the public business page"
          multi
          rows={3}
        />
        <div className="grid grid-cols-2 gap-4">
          <FieldRow
            label="Email"
            value={draft.email}
            onChange={(v) => setDraft((d) => ({ ...d, email: v }))}
            placeholder="name@example.ie"
            help="Used for calendar invites and future self-login when staff accounts land"
          />
          <FieldRow
            label="Instagram handle"
            value={draft.instagram_handle}
            onChange={(v) => setDraft((d) => ({ ...d, instagram_handle: v }))}
            placeholder="@handle"
          />
        </div>
        <FieldRow
          label="Specialties"
          value={draft.specialties}
          onChange={(v) => setDraft((d) => ({ ...d, specialties: v }))}
          placeholder="PT Session, Consultation, 4-Week Block"
          help="Comma-separated"
        />

        <div>
          <div className="mb-2 text-[11.5px] font-medium text-paper-text-2 dark:text-ink-text-2">
            Colour
          </div>
          <StaffColourPicker
            staffId={staff?.id ?? 'new-staff-preview'}
            value={draft.colour}
            onChange={(next) => setDraft((d) => ({ ...d, colour: next }))}
          />
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
              Active
            </div>
            <div className="text-[12px] text-paper-text-3 dark:text-ink-text-3">
              Uncheck to hide from Calendar + new bookings without deleting history.
            </div>
          </div>
        </label>

        {error && <p className={cn('text-[12px] text-red-500 dark:text-red-400')}>{error}</p>}
      </div>
    </Drawer>
  );
}
