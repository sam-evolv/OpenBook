-- MCP at v1 is anonymous (spec section 10.1). A hold isn't owned by anyone
-- until checkout captures email/phone, so bookings.customer_id needs to be
-- nullable on MCP-sourced rows.
--
-- Decision: drop NOT NULL on bookings.customer_id, but lock the model
-- down with a CHECK constraint so non-MCP bookings still require a
-- customer. Only `source = 'mcp'` may have customer_id NULL; the checkout
-- page (next PR) backfills customer_id once the user provides email/phone.

alter table public.bookings
  alter column customer_id drop not null;

alter table public.bookings
  add constraint bookings_customer_id_required_for_non_mcp
  check (
    customer_id is not null
    or source = 'mcp'
  );


-- ROLLBACK (manual, run if needed):
-- All existing rows must have customer_id NOT NULL before re-adding the
-- column constraint, otherwise the migration will fail.
-- alter table public.bookings drop constraint bookings_customer_id_required_for_non_mcp;
-- alter table public.bookings alter column customer_id set not null;
