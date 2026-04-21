import { CalendarDays, Plus } from 'lucide-react';
import { EmptyState } from '../EmptyState';
import { Button } from '../Button';

interface CalendarEmptyStateProps {
  onNewBooking?: () => void;
}

/**
 * Rendered above the grid when a business has zero bookings this week.
 * The grid still renders below with the correct day columns and open-hour
 * shading — the prompt just tells the user what to do first.
 */
export function CalendarEmptyState({ onNewBooking }: CalendarEmptyStateProps) {
  return (
    <EmptyState
      icon={CalendarDays}
      title="No bookings this week yet"
      description="Click any open slot on the grid to schedule a booking, or tap New booking in the top bar. As bookings roll in, they'll appear as coloured blocks in the day they're booked for."
      action={
        onNewBooking ? (
          <Button
            variant="primary"
            icon={<Plus size={13} strokeWidth={2} />}
            onClick={onNewBooking}
          >
            Create first booking
          </Button>
        ) : undefined
      }
    />
  );
}
