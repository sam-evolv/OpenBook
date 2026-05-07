-- Cache table for the MCP intent classifier.
-- Per docs/mcp-server-spec.md section 9.2, identical (intent + customer_context)
-- hashes are cached for 24h to keep classifier costs down. We use Postgres
-- rather than Redis to avoid adding a second dependency for v1.

create table public.mcp_intent_cache (
  cache_key text primary key,
  classification jsonb not null,
  created_at timestamptz default now(),
  expires_at timestamptz not null
);

create index on public.mcp_intent_cache (expires_at);

alter table public.mcp_intent_cache enable row level security;

-- Service role only; no public policies.


-- ROLLBACK:
-- drop table public.mcp_intent_cache;
