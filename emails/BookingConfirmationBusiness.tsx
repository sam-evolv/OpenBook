import * as React from 'react';
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';

const BLACK = '#080808';
const GOLD = '#D4AF37';
const TEXT = '#FFFFFF';
const MUTED = 'rgba(255,255,255,0.65)';
const FAINT = 'rgba(255,255,255,0.45)';
const SERIF = 'Fraunces, Georgia, serif';
const SANS = 'Geist, system-ui, -apple-system, Segoe UI, sans-serif';

interface Props {
  ownerName: string | null;
  businessName: string;
  businessLogoUrl: string | null;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  serviceName: string;
  dateLabel: string;
  timeLabel: string;
  durationMinutes: number;
  priceCents: number;
  viewInDashboardUrl: string;
}

function formatPrice(cents: number): string {
  if (cents === 0) return 'Free';
  const euros = cents / 100;
  return `€${euros.toFixed(euros % 1 === 0 ? 0 : 2)}`;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function BookingConfirmationBusiness({
  ownerName,
  businessName,
  businessLogoUrl,
  customerName,
  customerEmail,
  customerPhone,
  serviceName,
  dateLabel,
  timeLabel,
  durationMinutes,
  priceCents,
  viewInDashboardUrl,
}: Props) {
  const greetingName = ownerName?.trim() || 'there';
  const customerLabel = customerName?.trim() || 'A customer';

  return (
    <Html>
      <Head />
      <Preview>
        {customerLabel} booked {serviceName} — {dateLabel} at {timeLabel}
      </Preview>
      <Body style={{ backgroundColor: BLACK, margin: 0, padding: 0, fontFamily: SANS }}>
        <Container
          style={{
            width: '100%',
            maxWidth: '600px',
            margin: '0 auto',
            padding: '40px 24px',
            backgroundColor: BLACK,
          }}
        >
          <Section>
            {businessLogoUrl ? (
              <Img
                src={businessLogoUrl}
                alt={`${businessName} logo`}
                width="56"
                height="56"
                style={{
                  borderRadius: '50%',
                  objectFit: 'cover',
                  display: 'block',
                  marginBottom: 16,
                }}
              />
            ) : null}
            <Text
              style={{
                margin: 0,
                fontSize: 12,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: GOLD,
                fontWeight: 600,
              }}
            >
              {businessName}
            </Text>

            <Heading
              as="h1"
              style={{
                margin: '20px 0 0 0',
                fontFamily: SERIF,
                fontSize: 30,
                lineHeight: 1.15,
                fontWeight: 500,
                color: TEXT,
                letterSpacing: '-0.01em',
              }}
            >
              New booking.
            </Heading>

            <Text style={{ margin: '16px 0 0 0', color: MUTED, fontSize: 15, lineHeight: 1.55 }}>
              Hi {greetingName} — {customerLabel}{' '}
              {customerName ? 'has booked in.' : 'booked in.'}
            </Text>

            <Hr
              style={{
                border: 'none',
                borderTop: `1px solid ${GOLD}`,
                margin: '32px 0',
                width: '40px',
                marginLeft: 0,
              }}
            />
          </Section>

          <Section
            style={{
              backgroundColor: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 8,
              padding: '24px',
            }}
          >
            <Text
              style={{
                margin: 0,
                fontSize: 11,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: FAINT,
                fontWeight: 600,
              }}
            >
              Customer
            </Text>
            <Text
              style={{
                margin: '4px 0 0 0',
                fontFamily: SERIF,
                fontSize: 20,
                color: TEXT,
                fontWeight: 500,
                letterSpacing: '-0.01em',
              }}
            >
              {customerName || 'Unnamed customer'}
            </Text>

            {customerEmail && <DetailRow label="Email" value={customerEmail} />}
            {customerPhone && <DetailRow label="Phone" value={customerPhone} />}
            {!customerEmail && !customerPhone && (
              <DetailRow label="Contact" value="No contact details on file" muted />
            )}
          </Section>

          <Section
            style={{
              backgroundColor: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 8,
              padding: '24px',
              marginTop: 16,
            }}
          >
            <Text
              style={{
                margin: 0,
                fontSize: 11,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: FAINT,
                fontWeight: 600,
              }}
            >
              Booking
            </Text>
            <Text
              style={{
                margin: '4px 0 0 0',
                fontFamily: SERIF,
                fontSize: 20,
                color: TEXT,
                fontWeight: 500,
                letterSpacing: '-0.01em',
              }}
            >
              {serviceName}
            </Text>

            <DetailRow label="Date" value={dateLabel} />
            <DetailRow label="Time" value={`${timeLabel} (Europe/Dublin)`} />
            <DetailRow label="Duration" value={formatDuration(durationMinutes)} />
            <DetailRow label="Total" value={formatPrice(priceCents)} accent />
          </Section>

          <Section style={{ marginTop: 32 }}>
            <Button
              href={viewInDashboardUrl}
              style={{
                backgroundColor: GOLD,
                color: BLACK,
                padding: '14px 28px',
                borderRadius: 999,
                fontSize: 14,
                fontWeight: 600,
                textDecoration: 'none',
                letterSpacing: '-0.01em',
                display: 'inline-block',
              }}
            >
              View in dashboard
            </Button>
          </Section>

          <Hr
            style={{
              border: 'none',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              margin: '40px 0 24px 0',
            }}
          />

          <Text
            style={{
              margin: 0,
              color: FAINT,
              fontSize: 12,
              lineHeight: 1.55,
              textAlign: 'center',
            }}
          >
            Powered by{' '}
            <Link
              href="https://openbook.ie"
              style={{ color: FAINT, textDecoration: 'underline' }}
            >
              OpenBook
            </Link>
            {' · openbook.ie'}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

function DetailRow({
  label,
  value,
  accent,
  muted,
}: {
  label: string;
  value: string;
  accent?: boolean;
  muted?: boolean;
}) {
  return (
    <table
      width="100%"
      cellPadding={0}
      cellSpacing={0}
      role="presentation"
      style={{
        marginTop: 16,
        borderTop: '1px solid rgba(255,255,255,0.06)',
        paddingTop: 12,
      }}
    >
      <tr>
        <td style={{ color: MUTED, fontSize: 13 }}>{label}</td>
        <td
          style={{
            color: accent ? GOLD : muted ? FAINT : TEXT,
            fontSize: 13,
            fontWeight: 600,
            textAlign: 'right',
          }}
        >
          {value}
        </td>
      </tr>
    </table>
  );
}

export default BookingConfirmationBusiness;
