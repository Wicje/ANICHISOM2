-- ============================================================================
-- ContinuaOS — Step 4: Ephemeral Pairing Sessions
-- ============================================================================
-- Run this FOURTH in Supabase SQL Editor (after Steps 1–3 succeeded).
--
-- Backs the /connect guest-pairing flow. All reads/writes go through the
-- server-side service-role client (utils/supabase/admin.ts), so RLS is
-- enabled with NO public policies — the table is fully locked from
-- anon/authenticated clients by design.
-- ============================================================================

create table if not exists public.pairing_sessions (
  pin                   text primary key,
  status                text not null default 'waiting' check (status in ('waiting', 'approved')),
  workspace             text,
  client_info           text,
  user_id               text,
  capability_token      text,
  capability_token_hash text,
  created_at            timestamptz not null default now(),
  expires_at            timestamptz not null,
  approved_at           timestamptz
);

create index if not exists idx_pairing_sessions_expires_at
  on public.pairing_sessions(expires_at);

-- Lock down completely: no anon/authenticated policies on purpose.
alter table public.pairing_sessions enable row level security;

-- Optional: automatic cleanup of expired sessions every hour.
-- Enable pg_cron if available; otherwise routes delete lazily on read.
-- select cron.schedule(
--   'purge-expired-pairing-sessions',
--   '0 * * * *',
--   $$delete from public.pairing_sessions where expires_at < now()$$
-- );
