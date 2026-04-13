/**
 * lib/email.ts — Branded transactional email via Resend.
 */

/* ─────────────────────────────────────────────────────────────────────────────
   Flash Sale Email
   ────────────────────────────────────────────────────────────────────────── */

function flashSaleHtml({
  customerName,
  serviceName,
  businessName,
  businessSlug,
  salePrice,
  origPrice,
  discountPercent,
  slotLabel,
  bookBy,
  message,
}: {
  customerName:    string
  serviceName:     string
  businessName:    string
  businessSlug:    string
  salePrice:       string
  origPrice:       string
  discountPercent: number
  slotLabel:       string
  bookBy:          string
  message?:        string
}) {
  const bookingUrl = `https://openbook.ai/business/${businessSlug}`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>&#9889; Flash Sale at ${businessName}</title>
</head>
<body style="margin:0;padding:0;background:#080808;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#080808;min-height:100vh;">
    <tr><td align="center" style="padding:48px 20px;">
      <table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;">

        <!-- Wordmark -->
        <tr><td align="center" style="padding-bottom:24px;">
          <span style="font-size:22px;font-weight:900;color:#ffffff;letter-spacing:-0.03em;">
            OpenBook<span style="color:#D4AF37;"> AI</span>
          </span>
        </td></tr>

        <!-- Flash sale badge -->
        <tr><td align="center" style="padding-bottom:20px;">
          <span style="display:inline-block;background:rgba(212,175,55,0.15);border:1px solid rgba(212,175,55,0.3);border-radius:100px;padding:5px 16px;font-size:12px;font-weight:800;color:#D4AF37;letter-spacing:0.06em;text-transform:uppercase;">
            &#9889;&nbsp; Flash Sale
          </span>
        </td></tr>

        <!-- Card -->
        <tr><td style="background:#111111;border:1px solid rgba(255,255,255,0.07);border-radius:16px;padding:32px 28px;">

          <p style="font-size:24px;font-weight:900;color:#ffffff;margin:0 0 4px;letter-spacing:-0.03em;">
            Special offer at ${businessName}
          </p>
          <p style="font-size:14px;color:rgba(255,255,255,0.45);margin:0 0 24px;">
            Hi ${customerName}, here&rsquo;s an exclusive flash offer just for you.
          </p>

          ${message ? `
          <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:14px 16px;margin-bottom:22px;">
            <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.7);line-height:1.6;font-style:italic;">
              &ldquo;${message}&rdquo;
            </p>
          </div>
          ` : ''}

          <!-- Price callout -->
          <div style="background:rgba(212,175,55,0.08);border:1px solid rgba(212,175,55,0.2);border-radius:14px;padding:22px;margin-bottom:24px;text-align:center;">
            <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:rgba(255,255,255,0.4);">
              ${discountPercent}% off &mdash; today only
            </p>
            <p style="margin:0;font-size:40px;font-weight:900;color:#D4AF37;letter-spacing:-0.03em;line-height:1.1;">
              ${salePrice}
            </p>
            <p style="margin:4px 0 0;font-size:14px;color:rgba(255,255,255,0.3);text-decoration:line-through;">
              was ${origPrice}
            </p>
          </div>

          <!-- Details table -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:13px 0;border-top:1px solid rgba(255,255,255,0.07);">
                <p style="margin:0 0 3px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:rgba(255,255,255,0.35);">Service</p>
                <p style="margin:0;font-size:15px;font-weight:700;color:#ffffff;">${serviceName}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:13px 0;border-top:1px solid rgba(255,255,255,0.07);">
                <p style="margin:0 0 3px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:rgba(255,255,255,0.35);">Time slot</p>
                <p style="margin:0;font-size:15px;font-weight:700;color:#ffffff;">${slotLabel}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:13px 0;border-top:1px solid rgba(255,255,255,0.07);">
                <p style="margin:0 0 3px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:rgba(255,255,255,0.35);">Offer expires</p>
                <p style="margin:0;font-size:15px;font-weight:700;color:#D4AF37;">Book by ${bookBy}</p>
              </td>
            </tr>
          </table>

          <!-- CTA -->
          <div style="margin-top:28px;text-align:center;">
            <a href="${bookingUrl}" style="display:inline-block;background:#D4AF37;color:#000000;font-size:15px;font-weight:800;text-decoration:none;padding:14px 44px;border-radius:12px;letter-spacing:-0.01em;">
              Book now &rarr;
            </a>
          </div>
        </td></tr>

        <!-- Footer -->
        <tr><td align="center" style="padding:24px 0 0;">
          <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.22);">OpenBook AI &middot; Cork, Ireland</p>
          <p style="margin:4px 0 0;font-size:11px;color:rgba(255,255,255,0.14);">
            You&rsquo;re receiving this because you saved ${businessName} on OpenBook AI.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function sendFlashSaleEmail({
  to,
  customerName,
  serviceName,
  businessName,
  businessSlug,
  salePrice,
  origPrice,
  discountPercent,
  slotLabel,
  bookBy,
  message,
}: {
  to:              string
  customerName:    string
  serviceName:     string
  businessName:    string
  businessSlug:    string
  salePrice:       string
  origPrice:       string
  discountPercent: number
  slotLabel:       string
  bookBy:          string
  message?:        string
}) {
  const key = process.env.RESEND_API_KEY
  if (!key) {
    console.warn('[email] RESEND_API_KEY not set — skipping flash sale email')
    return
  }

  try {
    const { Resend } = await import('resend')
    const resend = new Resend(key)
    await resend.emails.send({
      from:    'OpenBook AI <onboarding@resend.dev>',
      to,
      subject: `⚡ Flash sale at ${businessName} — ${discountPercent}% off ${serviceName}`,
      html:    flashSaleHtml({
        customerName, serviceName, businessName, businessSlug,
        salePrice, origPrice, discountPercent, slotLabel, bookBy, message,
      }),
    })
  } catch (err) {
    console.error('[email] flash sale send failed:', err)
  }
}

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
