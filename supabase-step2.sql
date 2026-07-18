-- ============================================================================
-- ContinuaOS — Step 2: Tables 13-16 (Context, Vitals, Marketplace)
-- ============================================================================
-- Run this SECOND in Supabase SQL Editor (after Step 1 succeeded)
-- ============================================================================

-- ============================================================================
-- 13. CONTEXT RECORDS (Cross-Device Sync)
-- ============================================================================
create table public.context_records (
  id          text primary key,
  user_id     text not null references public.users(id) on delete cascade,
  domain      text not null,
  data        jsonb not null default '{}',
  version     integer not null default 1,
  device_id   text not null,
  updated_at  timestamptz not null default now(),
  unique(user_id, domain)
);
create index idx_context_records_user on public.context_records(user_id);
create index idx_context_records_updated on public.context_records(updated_at);
alter table public.context_records enable row level security;
create policy "Users can read own context records" on public.context_records for select using (auth.uid()::text = user_id);
create policy "Users can insert own context records" on public.context_records for insert with check (auth.uid()::text = user_id);
create policy "Users can update own context records" on public.context_records for update using (auth.uid()::text = user_id);
create policy "Users can delete own context records" on public.context_records for delete using (auth.uid()::text = user_id);

-- ============================================================================
-- 14. VITALS METRICS
-- ============================================================================
create table public.vitals_metrics (
  id          text primary key,
  user_id     text,
  name        text not null,
  value       numeric not null,
  rating      text not null,
  delta       numeric,
  url         text,
  user_agent  text,
  recorded_at timestamptz not null default now()
);
create index idx_vitals_metrics_name on public.vitals_metrics(name);
create index idx_vitals_metrics_recorded on public.vitals_metrics(recorded_at);
alter table public.vitals_metrics enable row level security;
create policy "Anyone can insert vitals" on public.vitals_metrics for insert with check (true);

-- ============================================================================
-- 15. MARKETPLACE SUBMISSIONS
-- ============================================================================
create table public.marketplace_submissions (
  id           text primary key,
  developer_id text not null,
  name         text not null,
  description  text not null,
  version      text not null,
  category     text not null default 'utilities',
  icon         text not null default 'Package',
  manifest_url text not null,
  permissions  jsonb not null default '[]',
  tags         jsonb not null default '[]',
  status       text not null default 'pending',
  submitted_at timestamptz not null default now(),
  reviewed_by  text,
  reviewed_at  timestamptz,
  review_notes text,
  updated_at   timestamptz not null default now()
);
create index idx_marketplace_submissions_status on public.marketplace_submissions(status);
create index idx_marketplace_submissions_developer on public.marketplace_submissions(developer_id);
alter table public.marketplace_submissions enable row level security;
create policy "Developers can read own submissions" on public.marketplace_submissions for select using (auth.uid()::text = developer_id);
create policy "Developers can insert submissions" on public.marketplace_submissions for insert with check (auth.uid()::text = developer_id);
create policy "Developers can update own submissions" on public.marketplace_submissions for update using (auth.uid()::text = developer_id);

-- ============================================================================
-- 16. MARKETPLACE PUBLISHED APPS
-- ============================================================================
create table public.marketplace_apps (
  id             text primary key,
  submission_id  text not null references public.marketplace_submissions(id) on delete cascade,
  developer_id   text not null,
  name           text not null,
  description    text not null,
  version        text not null,
  category       text not null default 'utilities',
  icon           text not null default 'Package',
  manifest_url   text not null,
  permissions    jsonb not null default '[]',
  tags           jsonb not null default '[]',
  status         text not null default 'published',
  published_at   timestamptz not null default now(),
  downloads      integer not null default 0,
  rating         numeric(3,2) not null default 0,
  rating_count   integer not null default 0,
  updated_at     timestamptz not null default now()
);
create index idx_marketplace_apps_category on public.marketplace_apps(category);
create index idx_marketplace_apps_status on public.marketplace_apps(status);
create index idx_marketplace_apps_developer on public.marketplace_apps(developer_id);
alter table public.marketplace_apps enable row level security;
create policy "Anyone can read published apps" on public.marketplace_apps for select using (status = 'published');
create policy "Developers can update own apps" on public.marketplace_apps for update using (auth.uid()::text = developer_id);

-- ============================================================================
-- DONE — 16 tables, all with snake_case columns + proper RLS
-- ============================================================================
