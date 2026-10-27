-- redteamly schema
-- Targets = the customer's own assistants (they confirm ownership).
-- Scans   = one red-team run against a target.
-- Results = one probe outcome within a scan.

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------------ targets
create table if not exists public.targets (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  name          text not null,
  description   text,
  kind          text not null default 'http' check (kind in ('http', 'anthropic_demo')),
  endpoint      text not null default '',
  system_prompt text,
  auth_header   text,
  created_at    timestamptz not null default now()
);

-- ------------------------------------------------------------------ scans
create table if not exists public.scans (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  target_id   uuid not null references public.targets (id) on delete cascade,
  pack        text not null default 'quick' check (pack in ('quick', 'full')),
  status      text not null default 'queued' check (status in ('queued', 'running', 'done', 'error')),
  total       int not null default 0,
  completed   int not null default 0,
  passed      int not null default 0,
  score       int,
  grade       text,
  created_at  timestamptz not null default now(),
  finished_at timestamptz
);

-- ------------------------------------------------------------------ results
create table if not exists public.results (
  id           uuid primary key default gen_random_uuid(),
  scan_id      uuid not null references public.scans (id) on delete cascade,
  probe_id     text not null,
  category     text not null,
  title        text not null,
  severity     text not null,
  owasp        text,
  eu_ai_act    text,
  passed       boolean not null,
  confidence   real,
  reason       text,
  target_reply text,
  created_at   timestamptz not null default now()
);

create index if not exists idx_targets_user on public.targets (user_id);
create index if not exists idx_scans_user on public.scans (user_id);
create index if not exists idx_results_scan on public.results (scan_id);

-- ------------------------------------------------------------------ RLS
alter table public.targets enable row level security;
alter table public.scans   enable row level security;
alter table public.results enable row level security;

create policy "targets_owner" on public.targets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "scans_owner" on public.scans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Results inherit access from their scan.
create policy "results_read" on public.results
  for select using (
    exists (select 1 from public.scans s where s.id = results.scan_id and s.user_id = auth.uid())
  );

-- The edge function runs as the caller (anon key + user JWT), so it needs insert rights
-- scoped to the caller's own scans.
create policy "results_insert" on public.results
  for insert with check (
    exists (select 1 from public.scans s where s.id = results.scan_id and s.user_id = auth.uid())
  );
