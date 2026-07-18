-- ============================================================================
-- ContinuaOS — Supabase Database Schema (Full Reset)
-- ============================================================================
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New query)
--
-- This script DROPS all existing ContinuaOS tables, policies, functions,
-- and triggers first, then recreates everything fresh with snake_case columns.
-- Run this ONCE to reset your database.
-- ============================================================================

-- ============================================================================
-- CLEANUP — Drop everything first
-- ============================================================================
-- Drop triggers on auth.users first (they depend on our function)
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user() cascade;

-- Drop policies (safe to run even if they don't exist)
drop policy if exists "Users: allow all" on public.users;
drop policy if exists "Workspaces: allow all" on public.workspaces;
drop policy if exists "Projects: allow all" on public.projects;
drop policy if exists "Files: allow all" on public.files;
drop policy if exists "Events: allow all" on public.events;
drop policy if exists "Presence: allow all" on public.presence;
drop policy if exists "Snapshots: allow all" on public.snapshots;
drop policy if exists "Apps: allow all" on public.apps;
drop policy if exists "Plugins: allow all" on public.plugins;
drop policy if exists "Invites: allow all" on public.invites;
drop policy if exists "Users: read own or admin" on public.users;
drop policy if exists "Users: update own" on public.users;
drop policy if exists "Workspaces: read owner or member" on public.workspaces;
drop policy if exists "Workspaces: insert owner" on public.workspaces;
drop policy if exists "Workspaces: update owner" on public.workspaces;
drop policy if exists "Workspaces: delete owner" on public.workspaces;
drop policy if exists "Projects: read workspace member" on public.projects;
drop policy if exists "Projects: insert workspace member" on public.projects;
drop policy if exists "Projects: update workspace member" on public.projects;
drop policy if exists "Projects: delete workspace member" on public.projects;
drop policy if exists "Files: read project member" on public.files;
drop policy if exists "Files: insert project member" on public.files;
drop policy if exists "Files: update project member" on public.files;
drop policy if exists "Files: delete project member" on public.files;
drop policy if exists "Events: read workspace member" on public.events;
drop policy if exists "Events: insert own" on public.events;
drop policy if exists "Presence: read workspace member" on public.presence;
drop policy if exists "Presence: upsert own" on public.presence;
drop policy if exists "Snapshots: read project member" on public.snapshots;
drop policy if exists "Snapshots: insert project member" on public.snapshots;
drop policy if exists "Apps: read all" on public.apps;
drop policy if exists "Apps: insert own" on public.apps;
drop policy if exists "Apps: update own" on public.apps;
drop policy if exists "Apps: delete own" on public.apps;
drop policy if exists "Plugins: read all" on public.plugins;
drop policy if exists "Plugins: insert authenticated" on public.plugins;
drop policy if exists "Invites: read valid" on public.invites;
drop policy if exists "Invites: insert admin" on public.invites;
drop policy if exists "Invites: update admin" on public.invites;
drop policy if exists "Invites: delete admin" on public.invites;

-- Note: policies for context_records, vitals_metrics, marketplace_submissions,
-- and marketplace_apps are cleaned up by DROP TABLE ... CASCADE below.

-- Drop tables in reverse dependency order
drop table if exists public.marketplace_apps cascade;
drop table if exists public.marketplace_submissions cascade;
drop table if exists public.vitals_metrics cascade;
drop table if exists public.context_records cascade;
drop table if exists public.snapshots cascade;
drop table if exists public.files cascade;
drop table if exists public.projects cascade;
drop table if exists public.events cascade;
drop table if exists public.presence cascade;
drop table if exists public.apps cascade;
drop table if exists public.plugins cascade;
drop table if exists public.invites cascade;
drop table if exists public.workspaces cascade;
drop table if exists public.users cascade;

-- ============================================================================
-- 1. USERS
-- ============================================================================
create table if not exists public.users (
  id         text primary key,
  name       text not null default '',
  email      text not null default '',
  role       text not null default 'filmmaker',
  avatar     text,
  status     text not null default 'pending',
  is_admin   boolean not null default false,
  subscription_tier text not null default 'free',
  subscription_status text not null default 'active',
  subscription_id text,
  subscription_current_period_end timestamptz,
  created_at timestamptz not null default now(),
  last_login timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- 2. WORKSPACES
-- ============================================================================
create table if not exists public.workspaces (
  id         text primary key,
  name       text not null,
  owner_id   text not null,
  is_private boolean not null default false,
  members    jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_workspaces_owner on public.workspaces (owner_id);

-- ============================================================================
-- 3. PROJECTS
-- ============================================================================
create table if not exists public.projects (
  id           text primary key,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  name         text not null,
  client_id    text not null default '',
  brief        text not null default '',
  status       text not null default 'discovery',
  phase        text not null default 'discovery',
  timeline     jsonb not null default '{}',
  team         jsonb not null default '[]',
  deliverables jsonb not null default '[]',
  created_by   text not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_projects_workspace on public.projects (workspace_id);

-- ============================================================================
-- 4. FILES
-- ============================================================================
create table if not exists public.files (
  id                 text primary key,
  project_id         text not null references public.projects(id) on delete cascade,
  name               text not null,
  type               text not null default 'other',
  url                text not null default '',
  editing_user_id    text,
  editing_session_id text,
  created_by         text not null default '',
  file_size          integer,
  mime_type          text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists idx_files_project on public.files (project_id);

-- ============================================================================
-- 5. EVENTS (audit trail / event sourcing)
-- ============================================================================
create table if not exists public.events (
  id           text primary key,
  workspace_id text not null,
  entity_id    text not null default '',
  type         text not null,
  user_id      text not null,
  old_value    jsonb,
  new_value    jsonb,
  comment      text,
  metadata     jsonb not null default '{}',
  timestamp    timestamptz not null default now()
);

create index if not exists idx_events_workspace on public.events (workspace_id);
create index if not exists idx_events_timestamp  on public.events (workspace_id, timestamp desc);

-- ============================================================================
-- 6. PRESENCE
-- ============================================================================
create table if not exists public.presence (
  id               text primary key,
  user_id          text not null,
  user_name        text not null default '',
  user_avatar_url  text,
  workspace_id     text not null,
  is_online        boolean not null default false,
  last_seen        timestamptz not null default now(),
  current_file_id  text,
  current_app_id   text,
  status           text default 'active'
);

create index if not exists idx_presence_workspace on public.presence (workspace_id);
create index if not exists idx_presence_online   on public.presence (workspace_id, is_online);

-- ============================================================================
-- 7. SNAPSHOTS (version history)
-- ============================================================================
create table if not exists public.snapshots (
  id           text primary key,
  project_id   text not null references public.projects(id) on delete cascade,
  workspace_id text not null,
  name         text not null default '',
  data         jsonb not null default '{}',
  created_by   text not null default '',
  created_at   timestamptz not null default now()
);

create index if not exists idx_snapshots_project on public.snapshots (project_id);

-- ============================================================================
-- 8. APPS (installed app registry)
-- ============================================================================
create table if not exists public.apps (
  id           text primary key,
  name         text not null default '',
  user_id      text not null default '',
  config       jsonb not null default '{}',
  installed_at timestamptz not null default now(),
  title        text,
  url          text,
  icon         text,
  color        text,
  owner_id     text
);

-- ============================================================================
-- 9. PLUGINS (marketplace submissions)
-- ============================================================================
create table if not exists public.plugins (
  id          text primary key default gen_random_uuid()::text,
  name        text not null,
  description text not null default '',
  developer   text not null default 'Community',
  price       text,
  github_url  text,
  created_at  timestamptz not null default now()
);

-- ============================================================================
-- 10. INVITES (beta invite codes)
-- ============================================================================
create table if not exists public.invites (
  id          text primary key default gen_random_uuid()::text,
  code        text not null unique,
  email       text,
  role        text not null default 'filmmaker',
  created_by  text not null,
  used_by     text,
  used_at     timestamptz,
  expires_at  timestamptz,
  max_uses    int not null default 1,
  use_count   int not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists idx_invites_code on public.invites (code);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
-- auth.uid() returns UUID. All id/owner_id/user_id columns are text.
-- We cast: auth.uid()::text = column_name

alter table public.users             enable row level security;
alter table public.workspaces        enable row level security;
alter table public.projects          enable row level security;
alter table public.files             enable row level security;
alter table public.events            enable row level security;
alter table public.presence          enable row level security;
alter table public.snapshots         enable row level security;
alter table public.apps              enable row level security;
alter table public.plugins           enable row level security;
alter table public.invites           enable row level security;

-- USERS
create policy "Users: read own or admin" on public.users
  for select using (
    auth.uid()::text = id
    or exists (select 1 from public.users where id = auth.uid()::text and is_admin = true)
  );

create policy "Users: update own" on public.users
  for update using (auth.uid()::text = id);

-- WORKSPACES
create policy "Workspaces: read owner or member" on public.workspaces
  for select using (
    owner_id = auth.uid()::text
    or auth.uid()::text = any(select jsonb_array_elements_text(members))
  );

create policy "Workspaces: insert owner" on public.workspaces
  for insert with check (owner_id = auth.uid()::text);

create policy "Workspaces: update owner" on public.workspaces
  for update using (owner_id = auth.uid()::text);

create policy "Workspaces: delete owner" on public.workspaces
  for delete using (owner_id = auth.uid()::text);

-- PROJECTS
create policy "Projects: read workspace member" on public.projects
  for select using (
    exists (
      select 1 from public.workspaces
      where id = workspace_id
      and (owner_id = auth.uid()::text or auth.uid()::text = any(select jsonb_array_elements_text(members)))
    )
  );

create policy "Projects: insert workspace member" on public.projects
  for insert with check (
    exists (
      select 1 from public.workspaces
      where id = workspace_id
      and (owner_id = auth.uid()::text or auth.uid()::text = any(select jsonb_array_elements_text(members)))
    )
  );

create policy "Projects: update workspace member" on public.projects
  for update using (
    exists (
      select 1 from public.workspaces
      where id = workspace_id
      and (owner_id = auth.uid()::text or auth.uid()::text = any(select jsonb_array_elements_text(members)))
    )
  );

create policy "Projects: delete workspace member" on public.projects
  for delete using (
    exists (
      select 1 from public.workspaces
      where id = workspace_id
      and (owner_id = auth.uid()::text or auth.uid()::text = any(select jsonb_array_elements_text(members)))
    )
  );

-- FILES
create policy "Files: read project member" on public.files
  for select using (
    exists (
      select 1 from public.projects p
      join public.workspaces w on w.id = p.workspace_id
      where p.id = project_id
      and (w.owner_id = auth.uid()::text or auth.uid()::text = any(select jsonb_array_elements_text(w.members)))
    )
  );

create policy "Files: insert project member" on public.files
  for insert with check (
    exists (
      select 1 from public.projects p
      join public.workspaces w on w.id = p.workspace_id
      where p.id = project_id
      and (w.owner_id = auth.uid()::text or auth.uid()::text = any(select jsonb_array_elements_text(w.members)))
    )
  );

create policy "Files: update project member" on public.files
  for update using (
    exists (
      select 1 from public.projects p
      join public.workspaces w on w.id = p.workspace_id
      where p.id = project_id
      and (w.owner_id = auth.uid()::text or auth.uid()::text = any(select jsonb_array_elements_text(w.members)))
    )
  );

create policy "Files: delete project member" on public.files
  for delete using (
    exists (
      select 1 from public.projects p
      join public.workspaces w on w.id = p.workspace_id
      where p.id = project_id
      and (w.owner_id = auth.uid()::text or auth.uid()::text = any(select jsonb_array_elements_text(w.members)))
    )
  );

-- EVENTS
create policy "Events: read workspace member" on public.events
  for select using (
    exists (
      select 1 from public.workspaces
      where id = workspace_id
      and (owner_id = auth.uid()::text or auth.uid()::text = any(select jsonb_array_elements_text(members)))
    )
  );

create policy "Events: insert own" on public.events
  for insert with check (user_id = auth.uid()::text);

-- PRESENCE
create policy "Presence: read workspace member" on public.presence
  for select using (
    exists (
      select 1 from public.workspaces
      where id = workspace_id
      and (owner_id = auth.uid()::text or auth.uid()::text = any(select jsonb_array_elements_text(members)))
    )
  );

create policy "Presence: upsert own" on public.presence
  for all using (user_id = auth.uid()::text);

-- SNAPSHOTS
create policy "Snapshots: read project member" on public.snapshots
  for select using (
    exists (
      select 1 from public.projects p
      join public.workspaces w on w.id = p.workspace_id
      where p.id = project_id
      and (w.owner_id = auth.uid()::text or auth.uid()::text = any(select jsonb_array_elements_text(w.members)))
    )
  );

create policy "Snapshots: insert project member" on public.snapshots
  for insert with check (
    exists (
      select 1 from public.projects p
      join public.workspaces w on w.id = p.workspace_id
      where p.id = project_id
      and (w.owner_id = auth.uid()::text or auth.uid()::text = any(select jsonb_array_elements_text(w.members)))
    )
  );

-- APPS
create policy "Apps: read all" on public.apps
  for select using (true);

create policy "Apps: insert own" on public.apps
  for insert with check (user_id = auth.uid()::text or owner_id = auth.uid()::text);

create policy "Apps: update own" on public.apps
  for update using (user_id = auth.uid()::text or owner_id = auth.uid()::text);

create policy "Apps: delete own" on public.apps
  for delete using (user_id = auth.uid()::text or owner_id = auth.uid()::text);

-- PLUGINS
create policy "Plugins: read all" on public.plugins
  for select using (true);

create policy "Plugins: insert authenticated" on public.plugins
  for insert with check (auth.uid() is not null);

-- INVITES
create policy "Invites: read valid" on public.invites
  for select using (true);

create policy "Invites: insert admin" on public.invites
  for insert with check (
    exists (select 1 from public.users where id = auth.uid()::text and is_admin = true)
  );

create policy "Invites: update admin" on public.invites
  for update using (
    exists (select 1 from public.users where id = auth.uid()::text and is_admin = true)
  );

create policy "Invites: delete admin" on public.invites
  for delete using (
    exists (select 1 from public.users where id = auth.uid()::text and is_admin = true)
  );

-- ============================================================================
-- AUTH TRIGGER — auto-create public.users row on Supabase Auth signup
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger as $$
declare
  is_first boolean;
begin
  select not exists(select 1 from public.users limit 1) into is_first;

  insert into public.users (id, name, email, role, status, is_admin)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    case when is_first then 'admin' else coalesce(new.raw_user_meta_data->>'role', 'filmmaker') end,
    'approved',
    is_first
  )
  on conflict (id) do update set
    name = coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    email = new.email,
    last_login = now();
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- 13. CONTEXT RECORDS (Cross-Device Sync)
-- ============================================================================
create table if not exists public.context_records (
  id          text primary key,
  user_id     text not null references public.users(id) on delete cascade,
  domain      text not null,
  data        jsonb not null default '{}',
  version     integer not null default 1,
  device_id   text not null,
  updated_at  timestamptz not null default now(),
  unique(user_id, domain)
);

create index if not exists idx_context_records_user on public.context_records(user_id);
create index if not exists idx_context_records_updated on public.context_records(updated_at);

alter table public.context_records enable row level security;

create policy "Users can read own context records"
  on public.context_records for select
  using (auth.uid()::text = user_id);

create policy "Users can insert own context records"
  on public.context_records for insert
  with check (auth.uid()::text = user_id);

create policy "Users can update own context records"
  on public.context_records for update
  using (auth.uid()::text = user_id);

create policy "Users can delete own context records"
  on public.context_records for delete
  using (auth.uid()::text = user_id);

alter publication supabase_realtime add table public.context_records;

-- ============================================================================
-- 14. VITALS METRICS (Web Vitals / Performance)
-- ============================================================================
create table if not exists public.vitals_metrics (
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

create index if not exists idx_vitals_metrics_name on public.vitals_metrics(name);
create index if not exists idx_vitals_metrics_recorded on public.vitals_metrics(recorded_at);

alter table public.vitals_metrics enable row level security;

create policy "Anyone can insert vitals"
  on public.vitals_metrics for insert
  with check (true);

-- ============================================================================
-- 15. MARKETPLACE SUBMISSIONS
-- ============================================================================
create table if not exists public.marketplace_submissions (
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

create index if not exists idx_marketplace_submissions_status on public.marketplace_submissions(status);
create index if not exists idx_marketplace_submissions_developer on public.marketplace_submissions(developer_id);

alter table public.marketplace_submissions enable row level security;

create policy "Developers can read own submissions"
  on public.marketplace_submissions for select
  using (auth.uid()::text = developer_id);

create policy "Developers can insert submissions"
  on public.marketplace_submissions for insert
  with check (auth.uid()::text = developer_id);

create policy "Developers can update own submissions"
  on public.marketplace_submissions for update
  using (auth.uid()::text = developer_id);

-- ============================================================================
-- 16. MARKETPLACE PUBLISHED APPS
-- ============================================================================
create table if not exists public.marketplace_apps (
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

create index if not exists idx_marketplace_apps_category on public.marketplace_apps(category);
create index if not exists idx_marketplace_apps_status on public.marketplace_apps(status);
create index if not exists idx_marketplace_apps_developer on public.marketplace_apps(developer_id);

alter table public.marketplace_apps enable row level security;

create policy "Anyone can read published apps"
  on public.marketplace_apps for select
  using (status = 'published');

create policy "Developers can update own apps"
  on public.marketplace_apps for update
  using (auth.uid()::text = developer_id);

-- ============================================================================
-- DONE (16 tables, all with snake_case columns + proper RLS)
-- ============================================================================
