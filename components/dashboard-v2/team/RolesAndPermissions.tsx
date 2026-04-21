import { Card } from '../Card';

interface RoleCard {
  role: string;
  description: string;
  perms: string[];
  tone: 'gold' | 'info' | 'purple';
}

const ROLES: RoleCard[] = [
  {
    role: 'Owner',
    description: 'Full access to everything',
    perms: ['Billing', 'Team', 'Intelligence', 'Settings'],
    tone: 'gold',
  },
  {
    role: 'Coach',
    description: 'Manage own calendar and customers',
    perms: ['Own bookings', 'Own customers', 'Own hours'],
    tone: 'info',
  },
  {
    role: 'Front desk',
    description: 'Check customers in, manage bookings',
    perms: ['All bookings', 'All customers'],
    tone: 'purple',
  },
];

const TONE_DOT = {
  gold: 'bg-gold',
  info: 'bg-blue-500 dark:bg-blue-400',
  purple: 'bg-violet-500 dark:bg-violet-400',
} as const;

export function RolesAndPermissions() {
  return (
    <Card>
      <div className="text-[13.5px] font-semibold text-paper-text-1 dark:text-ink-text-1">
        Roles & permissions
      </div>
      <div className="text-[12px] text-paper-text-3 dark:text-ink-text-3 mt-1 mb-4">
        Hardcoded in v1 for display — enforcement lands with staff self-login. See the brief §8 for
        the separate project scope.
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {ROLES.map((r) => (
          <div
            key={r.role}
            className="rounded-lg border border-paper-border dark:border-ink-border bg-paper-surface2 dark:bg-ink-surface2 p-3.5"
          >
            <div className="flex items-center gap-2">
              <span className={`h-1.5 w-1.5 rounded-full ${TONE_DOT[r.tone]}`} />
              <div className="text-[13px] font-semibold text-paper-text-1 dark:text-ink-text-1">
                {r.role}
              </div>
            </div>
            <div className="mt-1 text-[11.5px] text-paper-text-3 dark:text-ink-text-3">
              {r.description}
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {r.perms.map((p) => (
                <span
                  key={p}
                  className="text-[10.5px] text-paper-text-2 dark:text-ink-text-2 bg-paper-surface dark:bg-ink-surface border border-paper-border dark:border-ink-border rounded px-1.5 py-0.5"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
