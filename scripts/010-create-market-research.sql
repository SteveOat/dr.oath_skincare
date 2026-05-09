-- Market Research Agent: settings (singleton) + report archive

create table if not exists market_research_settings (
  id int primary key default 1,
  enabled boolean not null default false,
  business_context text not null default 'A premium oat-based skincare e-commerce brand (Dr.Oat SkinCare). Categories: cleansers, moisturizers, serums, masks. Target market: Asia-Pacific, especially Thailand, Singapore, Japan. Channels: own DTC site, Facebook, Instagram, LINE.',
  research_topics text[] not null default array[
    'skincare industry news',
    'oat skincare ingredient research',
    'competitor product launches in Asia-Pacific',
    'consumer beauty trends',
    'social media marketing trends for beauty brands',
    'e-commerce platform updates'
  ],
  schedule_hour int not null default 8,
  schedule_timezone text not null default 'Asia/Bangkok',
  last_run_at timestamptz,
  last_run_status text,
  last_run_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint market_research_settings_singleton check (id = 1)
);

-- Seed singleton row
insert into market_research_settings (id) values (1)
on conflict (id) do nothing;

create table if not exists market_research_reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  trigger_type text not null default 'manual', -- 'manual' | 'scheduled'
  status text not null default 'pending',      -- 'pending' | 'success' | 'failed'
  headline text,
  summary text,
  insights jsonb not null default '[]'::jsonb,
  recommendations jsonb not null default '[]'::jsonb,
  topics text[] not null default '{}',
  sources jsonb not null default '[]'::jsonb,  -- [{title, url}]
  raw_text text,
  model text,
  duration_ms int,
  error text
);

create index if not exists market_research_reports_created_at_idx
  on market_research_reports (created_at desc);

create index if not exists market_research_reports_status_idx
  on market_research_reports (status);

alter table market_research_settings enable row level security;
alter table market_research_reports enable row level security;

-- Allow read/write for now (admin-only feature; tighten later with auth)
drop policy if exists "settings_all" on market_research_settings;
create policy "settings_all" on market_research_settings for all using (true) with check (true);

drop policy if exists "reports_all" on market_research_reports;
create policy "reports_all" on market_research_reports for all using (true) with check (true);
