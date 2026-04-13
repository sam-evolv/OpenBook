/**
 * lib/email.ts — Branded transactional email via Resend.
 */

function bookingConfirmedHtml({
  customerName, serviceName, businessName, dateTime, price,
}: {
  customerName: string
  serviceName: string
  businessName: string
  dateTime: string
  price: string
}) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Booking Confirmed · OpenBook AI</title>
</head>
<body style="margin:0;padding:0;background:#080808;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#080808;min-height:100vh;">
    <tr><td align="center" style="padding:48px 20px;">
      <table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;">

        <!-- Wordmark -->
        <tr><td align="center" style="padding-bottom:36px;">
          <span style="font-size:26px;font-weight:900;color:#ffffff;letter-spacing:-0.03em;">
            OpenBook<span style="color:#D4AF37;"> AI</span>
          </span>
        </td></tr>

        <!-- Card -->
        <tr><td style="background:#111111;border:1px solid rgba(255,255,255,0.07);border-radius:16px;padding:32px 28px;">
          <p style="font-size:24px;font-weight:900;color:#ffffff;margin:0 0 6px;letter-spacing:-0.03em;">
            You&rsquo;re booked.
          </p>
          <p style="font-size:14px;color:rgba(255,255,255,0.45);margin:0 0 28px;">
            Hi ${customerName}, here&rsquo;s your booking summary.
          </p>

          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:14px 0;border-top:1px solid rgba(255,255,255,0.07);">
                <p style="margin:0 0 3px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:rgba(255,255,255,0.35);">Service</p>
                <p style="margin:0;font-size:15px;font-weight:700;color:#ffffff;">${serviceName}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 0;border-top:1px solid rgba(255,255,255,0.07);">
                <p style="margin:0 0 3px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:rgba(255,255,255,0.35);">Business</p>
                <p style="margin:0;font-size:15px;font-weight:700;color:#ffffff;">${businessName}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 0;border-top:1px solid rgba(255,255,255,0.07);">
                <p style="margin:0 0 3px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:rgba(255,255,255,0.35);">Date &amp; Time</p>
                <p style="margin:0;font-size:15px;font-weight:700;color:#ffffff;">${dateTime}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 0;border-top:1px solid rgba(255,255,255,0.07);">
                <p style="margin:0 0 3px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:rgba(255,255,255,0.35);">Price</p>
                <p style="margin:0;font-size:16px;font-weight:900;color:#D4AF37;">${price}</p>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td align="center" style="padding:28px 0 0;">
          <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.22);">
            OpenBook AI &middot; Cork, Ireland
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function sendBookingConfirmation({
  to,
  customerName,
  serviceName,
  businessName,
  dateTime,
  price,
}: {
  to:           string
  customerName: string
  serviceName:  string
  businessName: string
  dateTime:     string
  price:        string
}) {
  const key = process.env.RESEND_API_KEY
  if (!key) {
    console.warn('[email] RESEND_API_KEY not set — skipping email')
    return
  }

  try {
    const { Resend } = await import('resend')
    const resend = new Resend(key)
    await resend.emails.send({
      from:    'OpenBook AI <onboarding@resend.dev>',
      to,
      subject: `Booking confirmed: ${serviceName} at ${businessName}`,
      html:    bookingConfirmedHtml({ customerName, serviceName, businessName, dateTime, price }),
    })
  } catch (err) {
    console.error('[email] send failed:', err)
  }
}
