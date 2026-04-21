'use client';

import { useState } from 'react';
import { UserPlus, Users } from 'lucide-react';
import { TopBar } from '../TopBar';
import { Button } from '../Button';
import { Metric } from '../Metric';
import { EmptyState } from '../EmptyState';
import { StaffCard } from './StaffCard';
import { StaffDrawer } from './StaffDrawer';
import { RolesAndPermissions } from './RolesAndPermissions';
import type { TeamPayload, TeamStaffRow } from '@/lib/dashboard-v2/team-queries';
import { formatPrice } from '@/lib/supabase';

export interface TeamClientProps {
  payload: TeamPayload;
  previewMode?: boolean;
}

export function TeamClient({ payload, previewMode }: TeamClientProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<TeamStaffRow | null>(null);

  const openCreate = () => {
    setEditing(null);
    setDrawerOpen(true);
  };

  const openEdit = (s: TeamStaffRow) => {
    setEditing(s);
    setDrawerOpen(true);
  };

  const hasTeam = payload.staff.length > 0;

  return (
    <>
      <TopBar
        title="Team"
        subtitle="Your coaches, their schedules, their numbers"
        actions={
          <Button
            variant="primary"
            size="md"
            icon={<UserPlus size={13} strokeWidth={2} />}
            onClick={openCreate}
          >
            Add team member
          </Button>
        }
      />
      <div className="mx-auto max-w-6xl px-8 py-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Metric label="Team members" value={payload.staff.length} />
          <Metric
            label="Combined bookings"
            value={payload.totalBookingsMonth}
            deltaLabel="last 30 days"
          />
          <Metric
            label="Combined revenue"
            prefix="€"
            value={Math.round(payload.totalRevenueMonthCents / 100).toLocaleString()}
            deltaLabel="last 30 days"
            accent
          />
          <Metric
            label="Avg utilisation"
            value={
              payload.avgUtilisationPercent === null
                ? '—'
                : `${payload.avgUtilisationPercent}%`
            }
            deltaLabel="overestimates for part-time · see docs"
          />
        </div>

        {!hasTeam ? (
          <EmptyState
            icon={Users}
            title="No team members yet"
            description="Add your coaches, therapists, stylists — anyone who runs bookings. Each gets a colour on the Calendar and their own utilisation + revenue numbers."
            action={
              <Button
                variant="primary"
                icon={<UserPlus size={13} strokeWidth={2} />}
                onClick={openCreate}
              >
                Add first team member
              </Button>
            }
          />
        ) : (
          <div className="flex flex-col gap-3">
            {payload.staff.map((s) => (
              <StaffCard key={s.id} staff={s} onManage={() => openEdit(s)} />
            ))}
          </div>
        )}

        <RolesAndPermissions />
      </div>

      <StaffDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        staff={editing}
        previewMode={previewMode}
      />
    </>
  );
}
