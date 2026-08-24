-- ============================================================================
-- Continua — Step 7: Event Journal (Phase I)
--
-- Raw milestone/checkpoint events synced from local journals (daemon, web
-- sensor). Per architecture invariants:
--   - records are personal (user-scoped); no org/shared rows
--   - L0–L2 noise stays on-device; only importance >= 3 is normally synced
--   - the TS gate (lib/authz.ts) is normative; RLS below is defense-in-depth
--
-- Idempotent: safe to run multiple times.
-- ============================================================================

create table if not exists public.journal_events (
  id          uuid primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  device      text not null,
  kind        text not null,
  importance  int  not null check (importance between 0 and 4),
  project_tag text,
  ts          timestamptz not null,
  payload     jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

create index if not exists idx_journal_user_ts on public.journal_events (user_id, ts desc);
create index if not exists idx_journal_user_kind on public.journal_events (user_id, kind, ts desc);

alter table public.journal_events enable row level security;

drop policy if exists "journal: own rows only" on public.journal_events;

create policy "journal: own rows only" on public.journal_events
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Retention guardrail (mirrors the daemon's local purge): raw cloud rows
-- older than 90 days are aggregated material — drop them serverlessly.
-- Runs once per day via pg_cron when available; harmless if absent.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'continua-journal-retention',
      '17 4 * * *',
      $cron$ delete from public.journal_events
              where created_at < now() - interval '90 days' $cron$
    );
  end if;
end $$;
