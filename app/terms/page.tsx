import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of use',
  description:
    'The terms that govern your use of OpenBook to discover and book Irish service businesses.',
};

const LAST_UPDATED = '10 May 2026';

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12 text-[16px] leading-[1.65] text-paper">
      <header className="mb-10">
        <h1 className="text-[32px] font-semibold tracking-tight">Terms of use</h1>
        <p className="mt-2 text-paper/60 text-[14px]">Last updated: {LAST_UPDATED}</p>
      </header>

      <section className="space-y-4">
        <p>
          OpenBook is a booking platform that connects people in Ireland with local
          service businesses. By using OpenBook, whether through openbook.ie, the
          OpenBook iOS app, or an AI assistant connected to our MCP server, you agree
          to these terms. They are short and written in plain English on purpose.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-[20px] font-semibold mb-3">What OpenBook is</h2>
        <p>
          OpenBook helps you find and book a slot at a service business. We are the
          booking infrastructure: search, availability, holds, payment routing, and
          notifications. The actual service is delivered by the business you book.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-[20px] font-semibold mb-3">Bookings are between you and the business</h2>
        <p>
          When you confirm a booking, the contract for the service is between you and
          the business. OpenBook is not a party to that contract. We pass your name,
          email, phone and notes to the business so they can serve you. We charge or
          route payment on the business's behalf.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-[20px] font-semibold mb-3">Payment</h2>
        <p>
          Some businesses are set up to take card payment at the time of booking via
          Stripe. Others take payment in person on the day. Whichever applies is shown
          on the checkout page before you confirm. Card details are handled directly
          by Stripe; OpenBook does not store full card numbers.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-[20px] font-semibold mb-3">Cancellation and refunds</h2>
        <p>
          Each business sets its own cancellation policy. The relevant policy is shown
          on the business page and on the checkout page before you confirm. Refund
          requests are handled by the business directly. If a business is unresponsive
          or the situation looks unfair, contact{' '}
          <a className="text-gold underline" href="mailto:support@openbook.ie">
            support@openbook.ie
          </a>{' '}
          and we will help mediate.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-[20px] font-semibold mb-3">Holds expire</h2>
        <p>
          When you start a checkout, we hold the slot for up to 10 minutes so it is
          not booked by someone else while you finish. If you do not confirm in time
          the hold lapses and the slot returns to availability. A hold is not a
          confirmed booking.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-[20px] font-semibold mb-3">Acceptable use</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>Do not book slots you do not intend to attend.</li>
          <li>Do not repeatedly no-show. Businesses can flag accounts that do.</li>
          <li>
            Do not use OpenBook to harass businesses or abuse staff. Bookings can be
            cancelled and accounts removed.
          </li>
          <li>Do not attempt to scrape, automate or overload our servers.</li>
          <li>Do not impersonate someone else when booking.</li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-[20px] font-semibold mb-3">Availability and changes</h2>
        <p>
          We try to keep OpenBook running and accurate, but we do not promise that the
          service will be uninterrupted, error-free, or that listed inventory is
          always perfectly current. If a business cancels or reschedules a slot you
          booked, we notify you and refund any payment we hold.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-[20px] font-semibold mb-3">Limitation of liability</h2>
        <p>
          To the fullest extent permitted by law, OpenBook is not liable for the
          quality of the service delivered by the business, for losses arising from a
          business cancelling or no-showing, or for indirect or consequential losses.
          Our maximum aggregate liability to you is the total amount you paid through
          OpenBook in the previous 12 months. Nothing in these terms limits liability
          for death, personal injury caused by negligence, fraud, or any liability
          that cannot be limited under Irish or EU law.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-[20px] font-semibold mb-3">Privacy</h2>
        <p>
          Our handling of personal data is described in the{' '}
          <a className="text-gold underline" href="/privacy">
            privacy policy
          </a>
          .
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-[20px] font-semibold mb-3">Governing law</h2>
        <p>
          These terms are governed by the laws of Ireland. Any dispute we cannot
          resolve directly will be heard in the Irish courts.
        </p>
      </section>

      <section className="mt-10 mb-16">
        <h2 className="text-[20px] font-semibold mb-3">Contact</h2>
        <p>
          OpenBook, operated from Dublin, Ireland.
          <br />
          Email:{' '}
          <a className="text-gold underline" href="mailto:support@openbook.ie">
            support@openbook.ie
          </a>
        </p>
      </section>
    </main>
  );
}
