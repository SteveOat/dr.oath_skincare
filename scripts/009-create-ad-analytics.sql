-- Tracks ad-attributed landings via UTM parameters + referrer
create table if not exists analytics_ad_clicks (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  platform text not null,                -- facebook | google | instagram | tiktok | line | youtube | twitter | direct | other
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  click_id text,                         -- gclid, fbclid, ttclid, etc.
  click_id_type text,                    -- gclid | fbclid | ttclid | msclkid
  landing_path text not null,
  referrer text,
  query_string text,
  created_at timestamptz not null default now()
);

create index if not exists analytics_ad_clicks_session_id_idx on analytics_ad_clicks (session_id);
create index if not exists analytics_ad_clicks_platform_idx on analytics_ad_clicks (platform);
create index if not exists analytics_ad_clicks_campaign_idx on analytics_ad_clicks (utm_campaign);
create index if not exists analytics_ad_clicks_created_at_idx on analytics_ad_clicks (created_at desc);

-- One ad attribution per session (the first touch wins)
create unique index if not exists analytics_ad_clicks_session_unique on analytics_ad_clicks (session_id);

-- RLS open for inserts from the storefront, reads for authenticated dashboard users
alter table analytics_ad_clicks enable row level security;

drop policy if exists "ad_clicks_insert_anon" on analytics_ad_clicks;
create policy "ad_clicks_insert_anon"
  on analytics_ad_clicks for insert
  to anon, authenticated
  with check (true);

drop policy if exists "ad_clicks_select_all" on analytics_ad_clicks;
create policy "ad_clicks_select_all"
  on analytics_ad_clicks for select
  to anon, authenticated
  using (true);

-- Realtime
alter publication supabase_realtime add table analytics_ad_clicks;
