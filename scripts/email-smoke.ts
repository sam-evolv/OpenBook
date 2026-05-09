// One-off smoke check for the customer email template.
// Validates that the Europe/Dublin formatter actually applies — uses
// 2026-06-15T23:30:00Z which falls on June 16 (00:30) in Dublin BST.
// Not committed-to-prod logic; just developer reassurance before merge.
import { render } from '@react-email/render';
import { createElement } from 'react';
import { BookingConfirmationCustomer } from '../emails/BookingConfirmationCustomer';

const utcTime = new Date('2026-06-15T23:30:00Z');

const date = new Intl.DateTimeFormat('en-IE', {
  timeZone: 'Europe/Dublin',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
}).format(utcTime);

const time = new Intl.DateTimeFormat('en-IE', {
  timeZone: 'Europe/Dublin',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
}).format(utcTime);

console.log('UTC instant:    ', utcTime.toISOString());
console.log('Dublin date:    ', date);
console.log('Dublin time:    ', time);
console.log('---');

async function main() {
  const html = await render(
    createElement(BookingConfirmationCustomer, {
      customerName: 'Aoife',
      businessName: 'Saltwater Sauna',
      businessLogoUrl: null,
      serviceName: 'Cold-plunge ritual',
      dateLabel: date,
      timeLabel: time,
      durationMinutes: 75,
      priceCents: 4500,
      businessAddress: '12 Strand Lane, Dublin 4',
      businessPhone: '+353 1 555 1234',
      viewBookingUrl: 'https://app.openbook.ie/consumer-bookings/abc123',
    }),
  );

  console.log(html.slice(0, 1800));
  console.log('---');
  console.log('HTML length:', html.length, 'bytes');
  console.log('Date present:', html.includes(date));
  console.log('Time present:', html.includes(time));
  console.log('Day-after-UTC check (should be Tuesday 16 June 2026):', date);
  console.log('Hour check (should be 00:30, not 23:30):', time);
}

main();
