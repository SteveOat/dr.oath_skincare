-- Cached daily AI takeaways from ad performance.
-- Keyed by date so we generate at most one insight per day per refresh.

create table if not exists daily_ad_insights (
  id uuid primary key default gen_random_uuid(),
  insight_date date not null unique,
  headline text not null,
  takeaway text not null,
  recommendation text not null,
  key_metric_label text not null,
  key_metric_value text not null,
  sentiment text not null check (sentiment in ('positive', 'neutral', 'negative')),
  snapshot jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default now(),
  model text
);

create index if not exists daily_ad_insights_date_idx
  on daily_ad_insights (insight_date desc);

alter table daily_ad_insights enable row level security;

drop policy if exists "service_role full access daily_ad_insights" on daily_ad_insights;
create policy "service_role full access daily_ad_insights"
  on daily_ad_insights for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "anon read daily_ad_insights" on daily_ad_insights;
create policy "anon read daily_ad_insights"
  on daily_ad_insights for select
  to anon
  using (true);
