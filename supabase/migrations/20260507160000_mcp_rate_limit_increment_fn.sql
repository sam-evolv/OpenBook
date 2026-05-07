-- Atomic increment function for the MCP rate-limit table.
-- The upsert + return pattern is awkward via supabase-js; this function
-- wraps the spec's SQL (docs/mcp-server-spec.md section 5.1) and is
-- callable as `supabase.rpc('increment_mcp_rate_limit', ...)`.

create or replace function public.increment_mcp_rate_limit(
  p_bucket text,
  p_window_start timestamptz
)
returns integer
language sql
security definer
set search_path = public
as $$
  insert into public.mcp_rate_limit (bucket, window_start, count)
  values (p_bucket, p_window_start, 1)
  on conflict (bucket, window_start)
  do update set count = mcp_rate_limit.count + 1
  returning count;
$$;

revoke all on function public.increment_mcp_rate_limit(text, timestamptz) from public;
grant execute on function public.increment_mcp_rate_limit(text, timestamptz) to service_role;


-- ROLLBACK:
-- drop function public.increment_mcp_rate_limit(text, timestamptz);
