-- Dogfooding bugfix 2026-04-23: owner-scoped RLS on customers +
-- customer_businesses.
--
-- Existing state (pre-fix):
--   customers — only `own_record` policy (auth.uid() = user_id).
--     Consumer app reads its own record; nobody else can read.
--   customer_businesses — only `own_record` policy (customer_id IN
--     SELECT id FROM customers WHERE user_id = auth.uid()). The customer
--     can see their own pivot rows, but the business owner cannot.
--
-- Symptom: every dashboard surface that joins customers (Bookings,
-- Customers, Messages context pane) returned customer=null under the
-- owner's auth.uid(), because the embedded select is RLS-filtered per-
-- row. Rendered as "Guest" everywhere. Customers page looked empty
-- despite 45 seeded rows.
--
-- Fix: ADD owner-scoped SELECT + UPDATE policies on customers +
-- customer_businesses. The existing `own_record` policies stay — the
-- consumer app still needs them — but `own_record` on
-- customer_businesses is rewritten to go through a SECURITY DEFINER
-- helper so the policy graph stops being recursive (see §2).
--
-- Infinite-recursion notes (learned the hard way, 2026-04-23):
--   1. First attempt anchored customers_owner_select on BOTH
--      customer_businesses AND bookings. Bookings has its own RLS
--      that references customers, creating customers → bookings →
--      customers. Dropped the bookings anchor. The pivot is the
--      source of truth for customer-business membership; every
--      booking flow creates the pivot row alongside the booking row.
--   2. Even with the bookings anchor gone, the pre-existing
--      customer_businesses `own_record` policy referenced customers,
--      and the new customers_owner_select references
--      customer_businesses — still recursive under some query plans.
--      Fix: use a SECURITY DEFINER helper `auth_customer_id()` for the
--      own_record check. SECURITY DEFINER bypasses RLS on the function's
--      internal SELECT, breaking the cycle. The function returns only
--      the caller's own customer id (never leaks other users' data),
--      so the security semantics match the original own_record policy.

-- §1. customers SELECT + UPDATE for owners -----------------------

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS customers_owner_select ON customers;
CREATE POLICY customers_owner_select ON customers
  FOR SELECT
  USING (
    id IN (
      SELECT customer_id FROM customer_businesses
      WHERE business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS customers_owner_update ON customers;
CREATE POLICY customers_owner_update ON customers
  FOR UPDATE
  USING (
    id IN (
      SELECT customer_id FROM customer_businesses
      WHERE business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    id IN (
      SELECT customer_id FROM customer_businesses
      WHERE business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
      )
    )
  );

-- §2. auth_customer_id() helper + customer_businesses.own_record --

-- SECURITY DEFINER lets the function read `customers` ignoring the
-- caller's RLS — safe here because the function's body is hardcoded
-- to only return the caller's own row (WHERE user_id = auth.uid()).
-- Breaks the customers ↔ customer_businesses policy recursion.
CREATE OR REPLACE FUNCTION public.auth_customer_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT id FROM customers WHERE user_id = auth.uid() LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.auth_customer_id() FROM public;
GRANT EXECUTE ON FUNCTION public.auth_customer_id() TO authenticated;

-- §3. customer_businesses policies -------------------------------

ALTER TABLE customer_businesses ENABLE ROW LEVEL SECURITY;

-- Rewrite the pre-existing consumer-side own_record policy to use the
-- helper, breaking recursion.
DROP POLICY IF EXISTS own_record ON customer_businesses;
CREATE POLICY own_record ON customer_businesses
  FOR ALL
  USING (customer_id = public.auth_customer_id())
  WITH CHECK (customer_id = public.auth_customer_id());

-- Owners see their own business's pivot rows.
DROP POLICY IF EXISTS customer_businesses_owner_select ON customer_businesses;
CREATE POLICY customer_businesses_owner_select ON customer_businesses
  FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- Favourite toggle + notes editing from the Customers drawer hit the
-- pivot row, not the customers row.
DROP POLICY IF EXISTS customer_businesses_owner_update ON customer_businesses;
CREATE POLICY customer_businesses_owner_update ON customer_businesses
  FOR UPDATE
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );
