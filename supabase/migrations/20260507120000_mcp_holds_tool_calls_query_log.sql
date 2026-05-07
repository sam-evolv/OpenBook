-- MCP server — Migration A
-- Adds the three core MCP observability/state tables defined in
-- docs/mcp-server-spec.md sections 8.1, 8.2, and 8.3:
--   - public.mcp_holds       (8.1)
--   - public.mcp_tool_calls  (8.2)
--   - public.mcp_query_log   (8.3)
--
-- RLS is enabled on all three tables. No public policies are added in this
-- migration; the service role is the default writer/reader. Owner-read views
-- can be added in a later migration if needed.

-- 8.1 mcp_holds
create table public.mcp_holds (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  service_id uuid not null references public.services(id),
  booking_id uuid references public.bookings(id),
  start_at timestamptz not null,
  end_at timestamptz not null,
  expires_at timestamptz not null,
  status text not null check (status in ('pending', 'completed', 'expired', 'released')),
  source_assistant text,
  customer_hints jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index on public.mcp_holds (status, expires_at) where status = 'pending';
create index on public.mcp_holds (business_id, start_at);


-- 8.2 mcp_tool_calls
create table public.mcp_tool_calls (
  id uuid primary key default gen_random_uuid(),
  tool_name text not null,
  source_assistant text,
  source_ip inet,
  request_id text,
  arguments jsonb not null,
  result jsonb,
  error jsonb,
  latency_ms integer,
  created_at timestamptz default now()
);
create index on public.mcp_tool_calls (created_at desc);
create index on public.mcp_tool_calls (tool_name, created_at desc);
create index on public.mcp_tool_calls (source_assistant, created_at desc);


-- 8.3 mcp_query_log
create table public.mcp_query_log (
  id uuid primary key default gen_random_uuid(),
  query_id uuid not null,
  source_assistant text,
  intent_text text,
  parsed_category text,
  parsed_location text,
  parsed_when timestamptz,
  customer_context jsonb,
  result_count integer,
  result_business_ids uuid[],
  led_to_hold boolean default false,
  led_to_booking boolean default false,
  led_to_waitlist boolean default false,
  created_at timestamptz default now()
);


-- RLS
alter table public.mcp_holds enable row level security;
alter table public.mcp_tool_calls enable row level security;
alter table public.mcp_query_log enable row level security;

-- Service role is the default writer/reader for all three tables.
-- No public policies in this migration; we add owner-read views
-- in a later migration if needed.


-- ROLLBACK (manual, run if needed):
-- drop table public.mcp_query_log;
-- drop table public.mcp_tool_calls;
-- drop table public.mcp_holds;
