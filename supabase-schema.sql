-- ============================================================================
-- ANICHISOM OS — Supabase Database Schema
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
  createdAt  timestamptz not null default now(),
  lastLogin  timestamptz not null default now()
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
-- 10. TERMINALS  (shared terminal sessions)
-- ============================================================================
create table if not exists public.terminals (
  id      text primary key,
  history jsonb not null default '[]'
);

-- ============================================================================
-- 11. CALLS  (WebRTC signaling)
-- ============================================================================
create table if not exists public.calls (
  id         text primary key,
  callerId   text not null default '',
  callerName text not null default '',
  calleeId   text,
  calleeName text,
  status     text not null default 'waiting',   -- waiting|ringing|connected|ended
  offerSDP   text not null default '',
  answerSDP  text not null default '',
  createdAt  timestamptz not null default now()
);

-- ============================================================================
-- 12. CALL CANDIDATES  (ICE candidates for WebRTC)
-- ============================================================================
create table if not exists public.call_candidates (
  id         text primary key default gen_random_uuid()::text,
  call_id    text not null references public.calls(id) on delete cascade,
  role       text not null,    -- caller | callee
  candidate  text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_call_candidates_call on public.call_candidates (call_id);

-- ============================================================================
-- ROW LEVEL SECURITY  (RLS)
-- ============================================================================
-- Enable RLS on every table. Policies below allow anon + authenticated access.
-- For production, tighten these policies to match your auth model.

alter table public.users             enable row level security;
alter table public.workspaces        enable row level security;
alter table public.projects          enable row level security;
alter table public.files             enable row level security;
alter table public.events            enable row level security;
alter table public.presence          enable row level security;
alter table public.snapshots         enable row level security;
alter table public.apps              enable row level security;
alter table public.plugins           enable row level security;
alter table public.terminals         enable row level security;
alter table public.calls             enable row level security;
alter table public.call_candidates   enable row level security;

-- Permissive policies: allow all operations for anon + authenticated.
-- Replace these with tighter policies for production.

-- USERS
create policy "Users: allow all" on public.users
  for all using (true) with check (true);

-- WORKSPACES
create policy "Workspaces: allow all" on public.workspaces
  for all using (true) with check (true);

-- PROJECTS
create policy "Projects: allow all" on public.projects
  for all using (true) with check (true);

-- FILES
create policy "Files: allow all" on public.files
  for all using (true) with check (true);

-- EVENTS
create policy "Events: allow all" on public.events
  for all using (true) with check (true);

-- PRESENCE
create policy "Presence: allow all" on public.presence
  for all using (true) with check (true);

-- SNAPSHOTS
create policy "Snapshots: allow all" on public.snapshots
  for all using (true) with check (true);

-- APPS
create policy "Apps: allow all" on public.apps
  for all using (true) with check (true);

-- PLUGINS
create policy "Plugins: allow all" on public.plugins
  for all using (true) with check (true);

-- TERMINALS
create policy "Terminals: allow all" on public.terminals
  for all using (true) with check (true);

-- CALLS
create policy "Calls: allow all" on public.calls
  for all using (true) with check (true);

-- CALL CANDIDATES
create policy "Call candidates: allow all" on public.call_candidates
  for all using (true) with check (true);

-- ============================================================================
-- REALTIME  (enable for tables that need live subscriptions)
-- ============================================================================
-- Supabase Realtime must be enabled per-table in the Dashboard:
--   Database > Replication > Enable replication for these tables

-- The app subscribes to realtime on these tables:
--   workspaces, projects, events, presence, terminals, plugins, calls, call_candidates, files, apps
-- Enable replication for all of them in the Supabase Dashboard.

-- ============================================================================
-- DONE
-- ============================================================================
