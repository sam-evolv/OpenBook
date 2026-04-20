-- AI insights surfaced on the analytics dashboard.
-- Written by the weekly GPT-4o job and by the heatmap callout generator.

create table if not exists ai_insights (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  insight_type text not null check (insight_type in ('weekly', 'heatmap_callout')),
  headline text not null,
  body text not null,
  data_snapshot jsonb,
  generated_at timestamptz not null default now(),
  model text not null default 'gpt-4o',
  dismissed boolean not null default false
);

create index if not exists ai_insights_business_generated_idx
  on ai_insights (business_id, generated_at desc);

alter table ai_insights enable row level security;

drop policy if exists "Businesses see their own insights" on ai_insights;
create policy "Businesses see their own insights"
  on ai_insights for select
  using (
    business_id in (
      select id from businesses where owner_id = auth.uid()
    )
  );

-- Insights are written server-side via the service role, but we still want the
-- owner to be able to soft-dismiss an insight from the UI.
drop policy if exists "Businesses can dismiss their own insights" on ai_insights;
create policy "Businesses can dismiss their own insights"
  on ai_insights for update
  using (
    business_id in (
      select id from businesses where owner_id = auth.uid()
    )
  )
  with check (
    business_id in (
      select id from businesses where owner_id = auth.uid()
    )
  );
