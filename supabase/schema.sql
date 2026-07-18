-- Supabase Schema Initialization for ContinuaOS

-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Workspaces Table
create table public.workspaces (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  owner_id uuid not null,
  members jsonb not null default '[]'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Projects Table
create table public.projects (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  description text,
  status text not null,
  timeline jsonb not null default '{}'::jsonb,
  deliverables jsonb not null default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Files Table
create table public.files (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  type text not null,
  url text not null,
  locked_by uuid,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Events (Audit Trail) Table
create table public.events (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  entity_id uuid not null,
  entity_type text not null,
  type text not null,
  actor_id uuid not null,
  payload jsonb not null default '{}'::jsonb,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Presence Table
create table public.presence (
  id text primary key, -- user_id + _ + workspace_id
  user_id uuid not null,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  is_online boolean default false,
  current_app text,
  current_entity_id uuid,
  last_seen timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Snapshots Table
create table public.snapshots (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  description text,
  state jsonb not null default '{}'::jsonb,
  created_by uuid not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Setup Realtime capabilities
alter publication supabase_realtime add table public.workspaces;
alter publication supabase_realtime add table public.projects;
alter publication supabase_realtime add table public.files;
alter publication supabase_realtime add table public.events;
alter publication supabase_realtime add table public.presence;
