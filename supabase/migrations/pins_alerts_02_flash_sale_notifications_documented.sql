-- Standing alerts + reminders — migration 02
-- Paper trail for `flash_sale_notifications`. The table itself was created
-- via Supabase MCP without a committed migration; this file captures the
-- live shape so it's documented going forward. All statements are
-- idempotent (IF NOT EXISTS) and a re-run against the live DB is a no-op.

CREATE TABLE IF NOT EXISTS public.flash_sale_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.flash_sales(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'queued',
  block_reason text,
  sent_at timestamptz,
  viewed_at timestamptz,
  booked_at timestamptz,
  booking_id uuid REFERENCES public.bookings(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sale_id, customer_id)
);

CREATE INDEX IF NOT EXISTS flash_sale_notifications_sale_idx
  ON public.flash_sale_notifications (sale_id);

CREATE INDEX IF NOT EXISTS flash_sale_notifications_customer_idx
  ON public.flash_sale_notifications (customer_id);

-- Drain-friendly index: lets Stage B's SELECT ... WHERE status='queued'
-- skip the sequential scan as the table grows. The other two indexes
-- above don't cover this access pattern.
CREATE INDEX IF NOT EXISTS flash_sale_notifications_drain_idx
  ON public.flash_sale_notifications (status, created_at)
  WHERE status = 'queued';

ALTER TABLE public.flash_sale_notifications ENABLE ROW LEVEL SECURITY;

-- RLS: business owners can read their own sale's notifications. Drain
-- and API writes all go through service role which bypasses RLS.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'public.flash_sale_notifications'::regclass
      AND polname = 'flash_sale_notifications_owner_all'
  ) THEN
    CREATE POLICY flash_sale_notifications_owner_all
      ON public.flash_sale_notifications
      FOR ALL
      USING (
        sale_id IN (
          SELECT id FROM public.flash_sales
          WHERE business_id IN (
            SELECT id FROM public.businesses WHERE owner_id = auth.uid()
          )
        )
      )
      WITH CHECK (
        sale_id IN (
          SELECT id FROM public.flash_sales
          WHERE business_id IN (
            SELECT id FROM public.businesses WHERE owner_id = auth.uid()
          )
        )
      );
  END IF;
END $$;
