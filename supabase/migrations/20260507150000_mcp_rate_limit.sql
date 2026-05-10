-- MCP server — rate-limit bucket table
-- Per docs/mcp-server-spec.md section 5.1, the MCP endpoint enforces
-- 60 requests per minute per IP and 1000 per hour per origin. Counts
-- are tracked here. Rate-limit logic lands in a follow-up PR (5b);
-- this migration only creates the table and its index.

create table public.mcp_rate_limit (
  bucket text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (bucket, window_start)
);

create index on public.mcp_rate_limit (window_start);

alter table public.mcp_rate_limit enable row level security;

-- Service role only; no public policies.


-- ROLLBACK:
-- drop table public.mcp_rate_limit;
