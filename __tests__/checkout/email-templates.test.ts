import { describe, expect, it } from 'vitest';
import { render } from '@react-email/render';

import { BookingConfirmationCustomer } from '../../emails/BookingConfirmationCustomer';
import { BookingConfirmationBusiness } from '../../emails/BookingConfirmationBusiness';

const customerProps = {
  customerName: 'Aoife',
  businessName: 'Evolv Performance',
  serviceName: 'Personal Training',
  dateLabel: 'Saturday 10 May 2026',
  timeLabel: '10:00',
  durationMinutes: 60,
  priceCents: 5000,
  businessAddress: '12 Strand Lane, Dublin 4',
  businessPhone: '+353 1 555 1234',
  viewBookingUrl: 'https://app.openbook.ie/consumer-bookings/abc123',
};

const businessProps = {
  ownerName: 'Sam',
  businessName: 'Evolv Performance',
  customerName: 'Aoife',
  customerEmail: 'aoife@example.com',
  customerPhone: '+353 86 555 1234',
  serviceName: 'Personal Training',
  dateLabel: 'Saturday 10 May 2026',
  timeLabel: '10:00',
  durationMinutes: 60,
  priceCents: 5000,
  viewInDashboardUrl: 'https://dash.openbook.ie/dashboard/bookings/abc123',
};

const LOGO_URL = 'https://example.com/logo.png';

describe('BookingConfirmationCustomer', () => {
  it('renders the logo and the Powered by OpenBook footer when logoUrl is set', async () => {
    const html = await render(
      BookingConfirmationCustomer({ ...customerProps, businessLogoUrl: LOGO_URL }),
    );

    expect(html).toContain(LOGO_URL);
    expect(html).toContain('alt="Evolv Performance logo"');
    expect(html).toMatch(/width="56"/);
    expect(html).toMatch(/height="56"/);

    // Powered-by footer with U+00B7 middle dot.
    expect(html).toContain('Powered by');
    expect(html).toContain('openbook.ie');
    expect(html).toContain('·');
    expect(html).not.toContain('&middot;');
  });

  it('omits the logo when logoUrl is null', async () => {
    const html = await render(
      BookingConfirmationCustomer({ ...customerProps, businessLogoUrl: null }),
    );

    expect(html).not.toContain('Evolv Performance logo');
    expect(html).toContain('Evolv Performance');
    // Footer line still present
    expect(html).toContain('Powered by');
    expect(html).toContain('·');
  });
});

describe('BookingConfirmationBusiness', () => {
  it('renders the logo and the Powered by OpenBook footer when logoUrl is set', async () => {
    const html = await render(
      BookingConfirmationBusiness({ ...businessProps, businessLogoUrl: LOGO_URL }),
    );

    expect(html).toContain(LOGO_URL);
    expect(html).toContain('alt="Evolv Performance logo"');
    expect(html).toMatch(/width="56"/);
    expect(html).toContain('Powered by');
    expect(html).toContain('·');
  });

  it('omits the logo when logoUrl is null', async () => {
    const html = await render(
      BookingConfirmationBusiness({ ...businessProps, businessLogoUrl: null }),
    );

    expect(html).not.toContain('Evolv Performance logo');
    expect(html).toContain('Powered by');
  });
});
