import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy policy',
  description:
    'How OpenBook collects, uses, shares, and protects customer data when you book Irish service businesses through us.',
};

const LAST_UPDATED = '10 May 2026';

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12 text-[16px] leading-[1.65] text-paper">
      <header className="mb-10">
        <h1 className="text-[32px] font-semibold tracking-tight">Privacy policy</h1>
        <p className="mt-2 text-paper/60 text-[14px]">Last updated: {LAST_UPDATED}</p>
      </header>

      <section className="space-y-4">
        <p>
          OpenBook is a booking platform that connects people in Ireland with local
          service businesses (gyms, salons, barbers, spas, physios, yoga studios,
          classes and similar). This page explains, in plain English, what data we
          collect, why we collect it, who we share it with, and what rights you have
          over it. If anything here is unclear, email us at{' '}
          <a className="text-gold underline" href="mailto:support@openbook.ie">
            support@openbook.ie
          </a>{' '}
          and a real person will reply.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-[20px] font-semibold mb-3">What we collect</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Booking details you give us.</strong> Your name, email address and
            phone number when you go through checkout. Any free-text notes you add to a
            booking (for example, accessibility needs, allergies, preferences).
          </li>
          <li>
            <strong>What you book.</strong> The business, the service, the slot, the
            price, and the time you confirmed.
          </li>
          <li>
            <strong>Conversation context shared by an AI assistant.</strong> When you
            book through ChatGPT or another assistant connected to our MCP server, the
            assistant may pass along structured hints from your conversation (for
            example, "user mentioned they have a knee injury" or "prefers female
            therapist") so we can match you to suitable businesses and pre-fill the
            checkout page. We never receive a transcript of your chat. We only receive
            the structured fields the assistant chooses to send.
          </li>
          <li>
            <strong>Payment metadata.</strong> Stripe handles card details. We never
            see your full card number. We do see the amount charged, whether the
            payment succeeded, and the last four digits of the card for receipts.
          </li>
          <li>
            <strong>Standard request logs.</strong> IP address, timestamp, user agent.
            Kept for security and debugging.
          </li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-[20px] font-semibold mb-3">Why we collect it</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>To create and confirm your booking with the business.</li>
          <li>To send you the booking confirmation email and any reminders.</li>
          <li>To pre-fill the checkout page on return visits so you do not retype.</li>
          <li>
            To send you an SMS or push notification if a waitlisted slot opens before
            it expires.
          </li>
          <li>To diagnose technical issues from server logs.</li>
          <li>
            To improve search relevance, ranking and the quality of the assistant
            answers, in aggregate.
          </li>
        </ul>
        <p className="mt-3">
          Our legal basis under GDPR is contract performance (we need this data to
          deliver a booking) and legitimate interest (running a safe, working
          platform).
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-[20px] font-semibold mb-3">Who we share it with</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>The business you book.</strong> They get your name, email, phone,
            and any notes for that specific booking. They do not see your booking
            history with other businesses.
          </li>
          <li>
            <strong>Stripe</strong> (payment processing, including Stripe Connect for
            destination charges to the business).
          </li>
          <li>
            <strong>Resend</strong> (booking confirmation and notification emails).
          </li>
          <li>
            <strong>Supabase</strong> (database hosting, EU region).
          </li>
          <li>
            <strong>Vercel</strong> (application hosting and request logs).
          </li>
          <li>
            <strong>OpenAI</strong> (intent classification: a short summary of your
            search request is sent to OpenAI's API to improve matching. Your name,
            email, phone and booking history are never sent).
          </li>
        </ul>
        <p className="mt-3">
          Each of these processors handles data on our instructions under their
          respective data processing terms. We will list any new processor here before
          we add them.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-[20px] font-semibold mb-3">What we do not do</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>We do not sell your data.</li>
          <li>We do not use your data for advertising.</li>
          <li>
            We do not pull or store transcripts of your AI assistant conversations.
          </li>
          <li>
            We do not train AI models on your bookings, your messages or your contact
            details.
          </li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-[20px] font-semibold mb-3">How long we keep it</h2>
        <p>
          We keep active customer records while you have upcoming or recent bookings,
          and for a reasonable window afterwards so you can return without retyping.
          Aggregate, anonymised analytics (counts, rankings, trends) may be kept
          indefinitely. If you ask us to delete your data, we will do so promptly,
          subject to records we are legally required to keep (for example, accounting
          records of paid bookings).
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-[20px] font-semibold mb-3">Your rights</h2>
        <p>
          OpenBook is operated from Ireland, so your data is handled under GDPR
          regardless of where you are. You have the right to:
        </p>
        <ul className="list-disc pl-6 space-y-2 mt-2">
          <li>access a copy of the personal data we hold about you;</li>
          <li>correct anything that is wrong;</li>
          <li>delete your data;</li>
          <li>port your data to another service;</li>
          <li>object to specific processing or withdraw consent;</li>
          <li>complain to the Irish Data Protection Commission (dataprotection.ie).</li>
        </ul>
        <p className="mt-3">
          To exercise any of these rights, email{' '}
          <a className="text-gold underline" href="mailto:support@openbook.ie">
            support@openbook.ie
          </a>
          . We aim to respond within 14 days.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-[20px] font-semibold mb-3">Cookies</h2>
        <p>
          We use a small number of essential cookies to keep you signed in across
          openbook.ie subdomains. We do not use advertising or third-party tracking
          cookies.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-[20px] font-semibold mb-3">Children</h2>
        <p>
          OpenBook is for people aged 16 and over. If a service is age-restricted by
          the business, that restriction is enforced at the business and shown on the
          checkout page.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-[20px] font-semibold mb-3">Changes to this policy</h2>
        <p>
          When we change this policy in any material way, we update the date at the
          top and, where appropriate, email registered customers. The current version
          is always at openbook.ie/privacy.
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
