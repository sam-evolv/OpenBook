-- Add payment_mode discriminator. 'stripe_now' is the existing card path,
-- 'in_person' covers free services and businesses without Stripe Connect.
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS payment_mode text
    CHECK (payment_mode IN ('stripe_now', 'in_person'));

-- source_assistant already exists on bookings without a CHECK. Add a
-- conditional CHECK to constrain values going forward without rewriting
-- existing rows. We use a DO block because Postgres lacks
-- "ADD CONSTRAINT IF NOT EXISTS" prior to 16.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'bookings_source_assistant_check'
      AND conrelid = 'public.bookings'::regclass
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_source_assistant_check
      CHECK (source_assistant IS NULL
             OR source_assistant IN ('chatgpt', 'claude', 'gemini', 'siri', 'other'));
  END IF;
END$$;

-- Snapshot of the customer phone at booking time, denormalised so the
-- business dashboard can display it without joining customers and so we
-- can enforce the in_person phone-required rule at the DB level. The
-- authoritative phone still lives on customers.phone.
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS customer_phone text;

-- For in-person bookings the business has no card on file, so a working
-- phone number is required to chase up no-shows or relay changes.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'bookings_in_person_phone_required'
      AND conrelid = 'public.bookings'::regclass
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_in_person_phone_required
      CHECK (
        payment_mode IS DISTINCT FROM 'in_person'
        OR (customer_phone IS NOT NULL AND length(trim(customer_phone)) > 0)
      );
  END IF;
END$$;

-- Dashboard query: list AI-sourced bookings per business, ordered by date.
-- Partial index keeps the existing dashboard load cheap (most bookings
-- are not assistant-sourced yet).
CREATE INDEX IF NOT EXISTS bookings_business_source_idx
  ON public.bookings (business_id, source_assistant)
  WHERE source_assistant IS NOT NULL;
