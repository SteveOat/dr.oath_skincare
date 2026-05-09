-- Ad spend tracking (per platform, optionally per campaign, over a date range)
-- A row covers a date range and an amount; spend for any query window is prorated by overlap days.
create table if not exists public.analytics_ad_spend (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  campaign text,
  period_start date not null,
  period_end date not null,
  amount numeric(12, 2) not null check (amount >= 0),
  currency text not null default 'USD',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint period_valid check (period_end >= period_start)
);

create index if not exists analytics_ad_spend_platform_idx on public.analytics_ad_spend (platform);
create index if not exists analytics_ad_spend_campaign_idx on public.analytics_ad_spend (campaign);
create index if not exists analytics_ad_spend_period_idx on public.analytics_ad_spend (period_start, period_end);

alter table public.analytics_ad_spend enable row level security;

drop policy if exists "ad_spend_read_all" on public.analytics_ad_spend;
create policy "ad_spend_read_all"
  on public.analytics_ad_spend for select
  using (true);

drop policy if exists "ad_spend_insert_all" on public.analytics_ad_spend;
create policy "ad_spend_insert_all"
  on public.analytics_ad_spend for insert
  with check (true);

drop policy if exists "ad_spend_update_all" on public.analytics_ad_spend;
create policy "ad_spend_update_all"
  on public.analytics_ad_spend for update
  using (true)
  with check (true);

drop policy if exists "ad_spend_delete_all" on public.analytics_ad_spend;
create policy "ad_spend_delete_all"
  on public.analytics_ad_spend for delete
  using (true);

-- Touch updated_at on update
create or replace function public.touch_ad_spend_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists analytics_ad_spend_touch on public.analytics_ad_spend;
create trigger analytics_ad_spend_touch
  before update on public.analytics_ad_spend
  for each row execute function public.touch_ad_spend_updated_at();
