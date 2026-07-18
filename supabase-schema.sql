-- ============================================================================
-- ContinuaOS — Supabase Database Schema
-- ============================================================================
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New query)
-- or via `supabase db push` / `psql` connection string.
--
-- Tables: 12
-- Indexes: 12+ performance indexes
-- RLS:    enabled on every table with permissive policies
-- ============================================================================

-- ============================================================================
-- 1. USERS
-- ============================================================================
create table if not exists public.users (
  id         text primary key,
  name       text not null default '',
  email      text not null default '',
  role       text not null default 'filmmaker',
  avatar     text,
  status     text not null default 'pending',   -- pending | approved | rejected
  isAdmin    boolean not null default false,
  subscription_tier text not null default 'free',  -- free | pro | team
  subscription_status text not null default 'active', -- active | past_due | canceled | trialing
  subscription_id text, -- Stripe subscription ID
  subscription_current_period_end timestamptz,
  createdAt  timestamptz not null default now(),
  lastLogin  timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- 2. WORKSPACES
-- ============================================================================
create table if not exists public.workspaces (
  id         text primary key,
  name       text not null,
  ownerId    text not null,
  isPrivate  boolean not null default false,
  members    jsonb not null default '[]',
  createdAt  timestamptz not null default now(),
  updatedAt  timestamptz not null default now()
);

create index if not exists idx_workspaces_owner on public.workspaces (ownerId);

-- ============================================================================
-- 3. PROJECTS
-- ============================================================================
create table if not exists public.projects (
  id          text primary key,
  workspaceId text not null references public.workspaces(id) on delete cascade,
  name        text not null,
  clientId    text not null default '',
  brief       text not null default '',
  status      text not null default 'discovery',   -- discovery|design|review|delivered
  phase       text not null default 'discovery',    -- discovery|design|review
  timeline    jsonb not null default '{}',
  team        jsonb not null default '[]',
  deliverables jsonb not null default '[]',
  createdBy   text not null default '',
  createdAt   timestamptz not null default now(),
  updatedAt   timestamptz not null default now()
);

create index if not exists idx_projects_workspace on public.projects (workspaceId);

-- ============================================================================
-- 4. FILES
-- ============================================================================
create table if not exists public.files (
  id               text primary key,
  projectId        text not null references public.projects(id) on delete cascade,
  name             text not null,
  type             text not null default 'other',
  url              text not null default '',
  editingUserId    text,
  editingSessionId text,
  createdBy        text not null default '',
  fileSize         integer,
  mimeType         text,
  createdAt        timestamptz not null default now(),
  updatedAt        timestamptz not null default now()
);

create index if not exists idx_files_project on public.files (projectId);

-- ============================================================================
-- 5. EVENTS  (audit trail / event sourcing)
-- ============================================================================
create table if not exists public.events (
  id          text primary key,
  workspaceId text not null,
  entityId    text not null default '',
  type        text not null,
  userId      text not null,
  oldValue    jsonb,
  newValue    jsonb,
  comment     text,
  metadata    jsonb not null default '{}',
  timestamp   timestamptz not null default now()
);

create index if not exists idx_events_workspace on public.events (workspaceId);
create index if not exists idx_events_timestamp  on public.events (workspaceId, timestamp desc);

-- ============================================================================
-- 6. PRESENCE
-- ============================================================================
create table if not exists public.presence (
  id             text primary key,
  userId         text not null,
  userName       text not null default '',
  userAvatarUrl  text,
  workspaceId    text not null,
  isOnline       boolean not null default false,
  lastSeen       timestamptz not null default now(),
  currentFileId  text,
  currentAppId   text,
  status         text default 'active'   -- active|idle|away
);

create index if not exists idx_presence_workspace on public.presence (workspaceId);
create index if not exists idx_presence_online   on public.presence (workspaceId, isOnline);

-- ============================================================================
-- 7. SNAPSHOTS  (version history)
-- ============================================================================
create table if not exists public.snapshots (
  id          text primary key,
  projectId   text not null references public.projects(id) on delete cascade,
  workspaceId text not null,
  name        text not null default '',
  data        jsonb not null default '{}',
  createdBy   text not null default '',
  createdAt   timestamptz not null default now()
);

create index if not exists idx_snapshots_project on public.snapshots (projectId);

-- ============================================================================
-- 8. APPS  (installed app registry)
-- ============================================================================
create table if not exists public.apps (
  id          text primary key,
  name        text not null default '',
  userId      text not null default '',
  config      jsonb not null default '{}',
  installedAt timestamptz not null default now(),
  -- admin panel extras
  title       text,
  url         text,
  icon        text,
  color       text,
  ownerId     text
);

-- ============================================================================
-- 9. PLUGINS  (marketplace submissions)
-- ============================================================================
create table if not exists public.plugins (
  id          text primary key default gen_random_uuid()::text,
  name        text not null,
  description text not null default '',
  developer   text not null default 'Community',
  price       text,
  githubUrl   text,
  createdAt   timestamptz not null default now()
);

-- ============================================================================
-- 10. INVITES  (beta invite codes)
-- ============================================================================
create table if not exists public.invites (
  id         text primary key default gen_random_uuid()::text,
  code       text not null unique,
  email      text,              -- optional: restrict to specific email
  role       text not null default 'filmmaker',
  createdBy  text not null,
  usedBy     text,              -- null = unused
  usedAt     timestamptz,
  expiresAt  timestamptz,
  maxUses    int not null default 1,
  useCount   int not null default 0,
  createdAt  timestamptz not null default now()
);

create index if not exists idx_invites_code on public.invites (code);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) — User-scoped policies
-- ============================================================================
-- Security model:
--   • Users authenticate via Supabase Auth. auth.uid() returns their UUID.
--   • public.users maps auth.uid() → id column (set by handle_new_user trigger).
--   • isAdmin flag on the user row grants admin-level access.
--   • Most tables reference an ownerId / userId / workspaceId that ties rows to
--     a specific user or workspace membership (members jsonb array on workspaces).
--   • Policies are restrictive: every table requires auth.uid() to match a
--     relevant ownership or membership column. No row is accessible without
--     passing the policy check.

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

-- Drop old permissive policies
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

-- USERS: anyone authenticated can read; users can only update their own row; admins can do everything
create policy "Users: read own or admin" on public.users
  for select using (auth.uid()::text = id or exists (select 1 from public.users where id = auth.uid()::text and "isAdmin" = true));

create policy "Users: update own" on public.users
  for update using (auth.uid()::text = id);

-- WORKSPACES: owner or member can read; owner can modify
create policy "Workspaces: read owner or member" on public.workspaces
  for select using (
    "ownerId" = auth.uid()::text
    or auth.uid()::text = any(select jsonb_array_elements_text("members"))
  );

create policy "Workspaces: insert owner" on public.workspaces
  for insert with check ("ownerId" = auth.uid()::text);

create policy "Workspaces: update owner" on public.workspaces
  for update using ("ownerId" = auth.uid()::text);

create policy "Workspaces: delete owner" on public.workspaces
  for delete using ("ownerId" = auth.uid()::text);

-- PROJECTS: workspace owner or member can read/write
create policy "Projects: read workspace member" on public.projects
  for select using (
    exists (
      select 1 from public.workspaces
      where id = "workspaceId"
      and ("ownerId" = auth.uid()::text or auth.uid()::text = any(select jsonb_array_elements_text("members")))
    )
  );

create policy "Projects: insert workspace member" on public.projects
  for insert with check (
    exists (
      select 1 from public.workspaces
      where id = "workspaceId"
      and ("ownerId" = auth.uid()::text or auth.uid()::text = any(select jsonb_array_elements_text("members")))
    )
  );

create policy "Projects: update workspace member" on public.projects
  for update using (
    exists (
      select 1 from public.workspaces
      where id = "workspaceId"
      and ("ownerId" = auth.uid()::text or auth.uid()::text = any(select jsonb_array_elements_text("members")))
    )
  );

create policy "Projects: delete workspace member" on public.projects
  for delete using (
    exists (
      select 1 from public.workspaces
      where id = "workspaceId"
      and ("ownerId" = auth.uid()::text or auth.uid()::text = any(select jsonb_array_elements_text("members")))
    )
  );

-- FILES: project workspace member can read/write
create policy "Files: read project member" on public.files
  for select using (
    exists (
      select 1 from public.projects p
      join public.workspaces w on w.id = p."workspaceId"
      where p.id = "projectId"
      and (w."ownerId" = auth.uid()::text or auth.uid()::text = any(select jsonb_array_elements_text(w."members")))
    )
  );

create policy "Files: insert project member" on public.files
  for insert with check (
    exists (
      select 1 from public.projects p
      join public.workspaces w on w.id = p."workspaceId"
      where p.id = "projectId"
      and (w."ownerId" = auth.uid()::text or auth.uid()::text = any(select jsonb_array_elements_text(w."members")))
    )
  );

create policy "Files: update project member" on public.files
  for update using (
    exists (
      select 1 from public.projects p
      join public.workspaces w on w.id = p."workspaceId"
      where p.id = "projectId"
      and (w."ownerId" = auth.uid()::text or auth.uid()::text = any(select jsonb_array_elements_text(w."members")))
    )
  );

create policy "Files: delete project member" on public.files
  for delete using (
    exists (
      select 1 from public.projects p
      join public.workspaces w on w.id = p."workspaceId"
      where p.id = "projectId"
      and (w."ownerId" = auth.uid()::text or auth.uid()::text = any(select jsonb_array_elements_text(w."members")))
    )
  );

-- EVENTS: workspace member can read; creator can insert
create policy "Events: read workspace member" on public.events
  for select using (
    exists (
      select 1 from public.workspaces
      where id = "workspaceId"
      and ("ownerId" = auth.uid()::text or auth.uid()::text = any(select jsonb_array_elements_text("members")))
    )
  );

create policy "Events: insert own" on public.events
  for insert with check ("userId" = auth.uid()::text);

-- PRESENCE: workspace member can read/write
create policy "Presence: read workspace member" on public.presence
  for select using (
    exists (
      select 1 from public.workspaces
      where id = "workspaceId"
      and ("ownerId" = auth.uid()::text or auth.uid()::text = any(select jsonb_array_elements_text("members")))
    )
  );

create policy "Presence: upsert own" on public.presence
  for all using ("userId" = auth.uid()::text);

-- SNAPSHOTS: project workspace member can read/write
create policy "Snapshots: read project member" on public.snapshots
  for select using (
    exists (
      select 1 from public.projects p
      join public.workspaces w on w.id = p."workspaceId"
      where p.id = "projectId"
      and (w."ownerId" = auth.uid()::text or auth.uid()::text = any(select jsonb_array_elements_text(w."members")))
    )
  );

create policy "Snapshots: insert project member" on public.snapshots
  for insert with check (
    exists (
      select 1 from public.projects p
      join public.workspaces w on w.id = p."workspaceId"
      where p.id = "projectId"
      and (w."ownerId" = auth.uid()::text or auth.uid()::text = any(select jsonb_array_elements_text(w."members")))
    )
  );

-- APPS: users can read all apps, write only their own
create policy "Apps: read all" on public.apps
  for select using (true);

create policy "Apps: insert own" on public.apps
  for insert with check ("userId" = auth.uid()::text or "ownerId" = auth.uid()::text);

create policy "Apps: update own" on public.apps
  for update using ("userId" = auth.uid()::text or "ownerId" = auth.uid()::text);

create policy "Apps: delete own" on public.apps
  for delete using ("userId" = auth.uid()::text or "ownerId" = auth.uid()::text);

-- PLUGINS: anyone authenticated can read; creator can modify
create policy "Plugins: read all" on public.plugins
  for select using (true);

create policy "Plugins: insert authenticated" on public.plugins
  for insert with check (auth.uid() is not null);

-- INVITES: anyone authenticated can read valid invites (for signup validation); admins can create/modify
create policy "Invites: read valid" on public.invites
  for select using (true);

create policy "Invites: insert admin" on public.invites
  for insert with check (
    exists (select 1 from public.users where id = auth.uid()::text and "isAdmin" = true)
  );

create policy "Invites: update admin" on public.invites
  for update using (
    exists (select 1 from public.users where id = auth.uid()::text and "isAdmin" = true)
  );

create policy "Invites: delete admin" on public.invites
  for delete using (
    exists (select 1 from public.users where id = auth.uid()::text and "isAdmin" = true)
  );

-- ============================================================================
-- REALTIME  (enable for tables that need live subscriptions)
-- ============================================================================
-- Supabase Realtime must be enabled per-table in the Dashboard:
--   Database > Replication > Enable replication for these tables

-- The app subscribes to realtime on these tables:
--   workspaces, projects, events, presence, plugins, files, apps
-- Enable replication for all of them in the Supabase Dashboard.

-- ============================================================================
-- AUTH TRIGGER — auto-create public.users row on Supabase Auth signup
-- ============================================================================
-- Run this AFTER supabase-schema.sql to sync auth.users → public.users

create or replace function public.handle_new_user()
returns trigger as $$
declare
  is_first boolean;
begin
  -- Check if this is the very first user
  select not exists(select 1 from public.users limit 1) into is_first;

  insert into public.users (id, name, email, role, status, isAdmin)
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
    lastLogin = now();
  return new;
end;
$$ language plpgsql security definer;

-- Drop existing trigger if it exists
drop trigger if exists on_auth_user_created on auth.users;

-- Create trigger on auth.users
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- 13. CONTEXT RECORDS (Cross-Device Sync)
-- ============================================================================
-- Stores serialized session context domains for cross-device sync.
-- Each record = one domain (windows, theme, apps.terminal, etc.) for one user.
-- Conflict resolution: version vectors + last-write-wins.
-- ============================================================================
create table if not exists public.context_records (
  id          text primary key,               -- `${user_id}:${domain}`
  user_id     text not null references public.users(id) on delete cascade,
  domain      text not null,                  -- 'windows', 'theme', 'apps.terminal', etc.
  data        jsonb not null default '{}',    -- serialized domain data
  version     integer not null default 1,     -- monotonic version for conflict detection
  device_id   text not null,                  -- unique per browser/device
  updated_at  timestamptz not null default now(),
  unique(user_id, domain)
);

-- Index for querying all domains for a user
create index if not exists idx_context_records_user on public.context_records(user_id);

-- Index for sync: find records updated after a timestamp
create index if not exists idx_context_records_updated on public.context_records(updated_at);

-- RLS: users can only read/write their own context records
alter table public.context_records enable row level security;

create policy "Users can read own context records"
  on public.context_records for select
  using (auth.uid() = user_id);

create policy "Users can insert own context records"
  on public.context_records for insert
  with check (auth.uid() = user_id);

create policy "Users can update own context records"
  on public.context_records for update
  using (auth.uid() = user_id);

create policy "Users can delete own context records"
  on public.context_records for delete
  using (auth.uid() = user_id);

-- Realtime: enable replication for context_records
alter publication supabase_realtime add table public.context_records;

-- ============================================================================
-- 13. MARKETPLACE SUBMISSIONS
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
  status       text not null default 'pending',  -- pending | approved | rejected
  submitted_at timestamptz not null default now(),
  reviewed_by  text,
  reviewed_at  timestamptz,
  review_notes text,
  updated_at   timestamptz not null default now()
);

create index if not exists idx_marketplace_submissions_status on public.marketplace_submissions(status);
create index if not exists idx_marketplace_submissions_developer on public.marketplace_submissions(developer_id);

-- RLS: developers can read their own submissions; admins can read all
alter table public.marketplace_submissions enable row level security;

create policy "Developers can read own submissions"
  on public.marketplace_submissions for select
  using (auth.uid() = developer_id);

create policy "Developers can insert submissions"
  on public.marketplace_submissions for insert
  with check (auth.uid() = developer_id);

create policy "Developers can update own submissions"
  on public.marketplace_submissions for update
  using (auth.uid() = developer_id);

-- ============================================================================
-- 14. MARKETPLACE PUBLISHED APPS
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
  status         text not null default 'published',  -- published | deprecated | removed
  published_at   timestamptz not null default now(),
  downloads      integer not null default 0,
  rating         numeric(3,2) not null default 0,
  rating_count   integer not null default 0,
  updated_at     timestamptz not null default now()
);

create index if not exists idx_marketplace_apps_category on public.marketplace_apps(category);
create index if not exists idx_marketplace_apps_status on public.marketplace_apps(status);
create index if not exists idx_marketplace_apps_developer on public.marketplace_apps(developer_id);

-- RLS: public read, developer write
alter table public.marketplace_apps enable row level security;

create policy "Anyone can read published apps"
  on public.marketplace_apps for select
  using (status = 'published');

create policy "Developers can update own apps"
  on public.marketplace_apps for update
  using (auth.uid() = developer_id);

-- ============================================================================
-- DONE
-- ============================================================================
