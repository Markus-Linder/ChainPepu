-- ChainPepu, Teil 8 „Zeitkette“: eine Kette mit Countdown und Topf. Wer das letzte Glied hält, wenn die Uhr
-- abläuft, bekommt den Topf. Jedes Glied verlängert, ein neuer Planet setzt die Uhr auf Anfang.
-- Teilnahme ist kostenlos (ein Glied anhängen kostet nichts). Nach Teil 1–7 ausführen.

insert into public.app_settings (key, value) values
  ('zeitkette_start_hours', '24'),      -- Startzeit einer Runde
  ('zeitkette_start_pot', '500'),       -- Startwert des Topfs (Sterne)
  ('zeitkette_link_minutes', '10'),     -- Verlängerung pro gezähltem Glied
  ('zeitkette_cooldown_min', '10'),     -- pro Planet zählt nur ein Glied je … Minuten
  ('zeitkette_pot_per_link', '1'),      -- Sterne, die jedes gezählte Glied in den Topf legt
  ('zeitkette_pot_percent', '10'),      -- Anteil des Plattform-Anteils der Runde, der am Ende in den Topf fließt
  ('zeitkette_alert_minutes', '15')     -- Push an alle Teilnehmer, wenn weniger Zeit übrig ist
  on conflict (key) do nothing;

alter table public.chains add column if not exists is_jackpot boolean not null default false;

create table if not exists public.jackpots (
  id bigint generated always as identity primary key,
  round integer not null,
  chain_id bigint not null references public.chains(id) on delete cascade,
  pot_stars integer not null default 0,
  started_at timestamptz not null default now(),
  ends_at timestamptz not null,
  status text not null default 'laeuft' check (status in ('laeuft', 'beendet')),
  last_link_id bigint references public.links(id) on delete set null,
  last_user_id uuid references public.profiles(id) on delete set null,
  winner_user uuid references public.profiles(id) on delete set null,
  winner_stars integer,
  alerted boolean not null default false,
  settled_at timestamptz
);
create index if not exists jackpots_status_idx on public.jackpots(status, ends_at);

create table if not exists public.jackpot_events (
  id bigint generated always as identity primary key,
  jackpot_id bigint not null references public.jackpots(id) on delete cascade,
  link_id bigint references public.links(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null,
  kind text not null check (kind in ('glied', 'reset', 'start', 'ende')),
  seconds_added integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists jackpot_events_idx on public.jackpot_events(jackpot_id, created_at desc);

alter table public.jackpots enable row level security;
alter table public.jackpot_events enable row level security;
drop policy if exists "zeitkette lesen" on public.jackpots;
create policy "zeitkette lesen" on public.jackpots for select using (true);
drop policy if exists "zeitkette ereignisse lesen" on public.jackpot_events;
create policy "zeitkette ereignisse lesen" on public.jackpot_events for select using (true);
do $$ begin alter publication supabase_realtime add table public.jackpots; exception when duplicate_object then null; end $$;

-- Laufende Runde holen oder eine neue starten. Darf jeder aufrufen.
create or replace function public.ensure_jackpot()
returns bigint language plpgsql security definer set search_path = public as $$
declare v_id bigint; v_round int; v_chain bigint; v_hours int := setting_int('zeitkette_start_hours', 24);
begin
  select id into v_id from jackpots where status = 'laeuft' order by id desc limit 1;
  if v_id is not null then return v_id; end if;
  select coalesce(max(round), 0) + 1 into v_round from jackpots;
  insert into chains (title, origin_user_id, is_jackpot) values ('Zeitkette #' || v_round, null, true) returning id into v_chain;
  insert into jackpots (round, chain_id, pot_stars, ends_at) values (v_round, v_chain, setting_int('zeitkette_start_pot', 500), now() + (v_hours || ' hours')::interval) returning id into v_id;
  insert into jackpot_events (jackpot_id, kind, seconds_added) values (v_id, 'start', v_hours * 3600);
  return v_id;
end $$;

-- Wird aus dem Sichtbar-Trigger aufgerufen: Glied zählen, Uhr verlängern oder zurücksetzen, Topf füllen.
create or replace function public.jackpot_on_link(p_link_id bigint, p_chain bigint, p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare j jackpots%rowtype; v_new boolean; v_add int; v_max timestamptz; v_prev uuid; v_name text; v_first boolean;
begin
  select * into j from jackpots where chain_id = p_chain and status = 'laeuft' for update;
  if not found or j.ends_at < now() then return; end if;
  -- Abkühlzeit: pro Planet zählt nur ein Glied je X Minuten.
  if exists (select 1 from jackpot_events where jackpot_id = j.id and user_id = p_user and kind in ('glied', 'reset')
             and created_at > now() - (setting_int('zeitkette_cooldown_min', 10) || ' minutes')::interval) then return; end if;
  -- Neuer Planet: jünger als 24 h und dies ist sein erstes sichtbares Glied überhaupt.
  select (created_at > now() - interval '24 hours') into v_new from profiles where id = p_user;
  select not exists (select 1 from links where user_id = p_user and status = 'sichtbar' and id <> p_link_id) into v_first;
  v_prev := j.last_user_id;
  v_max := now() + (setting_int('zeitkette_start_hours', 24) || ' hours')::interval;
  if coalesce(v_new, false) and v_first then
    v_add := extract(epoch from (v_max - j.ends_at))::int;
    update jackpots set ends_at = v_max, last_link_id = p_link_id, last_user_id = p_user, pot_stars = pot_stars + setting_int('zeitkette_pot_per_link', 1), alerted = false where id = j.id;
    insert into jackpot_events (jackpot_id, link_id, user_id, kind, seconds_added) values (j.id, p_link_id, p_user, 'reset', greatest(0, v_add));
  else
    v_add := setting_int('zeitkette_link_minutes', 10) * 60;
    update jackpots set ends_at = least(v_max, ends_at + (v_add || ' seconds')::interval), last_link_id = p_link_id, last_user_id = p_user,
      pot_stars = pot_stars + setting_int('zeitkette_pot_per_link', 1), alerted = case when ends_at + (v_add || ' seconds')::interval > now() + (setting_int('zeitkette_alert_minutes', 15) || ' minutes')::interval then false else alerted end
      where id = j.id;
    insert into jackpot_events (jackpot_id, link_id, user_id, kind, seconds_added) values (j.id, p_link_id, p_user, 'glied', v_add);
  end if;
  if v_prev is not null and v_prev <> p_user then
    select display_name into v_name from profiles where id = p_user;
    perform notify(v_prev, 'zeitkette', p_user, p_chain, v_name || ' hat dir das letzte Glied der Zeitkette abgenommen.',
      jsonb_build_object('key', 'jackpot_overtaken', 'actor', v_name));
  end if;
end $$;

-- Sichtbar-Trigger um die Zeitkette ergänzen.
create or replace function public.on_link_visible()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_origin uuid; v_title text; v_name text; v_jackpot boolean;
begin
  if new.status <> 'sichtbar' then return new; end if;
  if tg_op = 'UPDATE' and old.status <> 'pruefung' then return new; end if;
  update profiles set stars = stars + 1 where id = new.user_id;
  perform award_xp(new.user_id, setting_int('xp_link', 10));
  select origin_user_id, title, is_jackpot into v_origin, v_title, v_jackpot from chains where id = new.chain_id;
  select display_name into v_name from profiles where id = new.user_id;
  if v_origin is not null and v_origin <> new.user_id then
    perform notify(v_origin, 'glied', new.user_id, new.chain_id,
      v_name || ' hat ein Glied an „' || v_title || '“ gehängt',
      jsonb_build_object('key', 'link', 'actor', v_name, 'title', v_title));
  end if;
  if tg_op = 'UPDATE' then
    perform notify(new.user_id, 'moderation', null, new.chain_id,
      'Dein Beitrag wurde geprüft und ist jetzt online.', jsonb_build_object('key', 'approved'));
  end if;
  perform duel_add_points(new.chain_id, 'glied', new.user_id, setting_int('duel_link_points', 5));
  if coalesce(v_jackpot, false) then perform jackpot_on_link(new.id, new.chain_id, new.user_id); end if;
  return new;
end $$;

-- Runde abschließen, sobald die Uhr abgelaufen ist. Darf jeder anstoßen, läuft nur einmal.
create or replace function public.settle_jackpot()
returns void language plpgsql security definer set search_path = public as $$
declare j jackpots%rowtype; v_bonus int; v_total int;
begin
  select * into j from jackpots where status = 'laeuft' order by id desc limit 1 for update;
  if not found or j.ends_at > now() then return; end if;
  select floor(coalesce(sum(stars), 0) * setting_int('zeitkette_pot_percent', 10) / 100.0)::int into v_bonus
    from platform_ledger where created_at >= j.started_at and created_at < j.ends_at;
  v_total := j.pot_stars + coalesce(v_bonus, 0);
  update jackpots set status = 'beendet', winner_user = last_user_id, winner_stars = case when last_user_id is null then 0 else v_total end, pot_stars = v_total, settled_at = now() where id = j.id;
  insert into jackpot_events (jackpot_id, kind) values (j.id, 'ende');
  if j.last_user_id is not null then
    update profiles set earned_stars = earned_stars + v_total where id = j.last_user_id;
    update chains set crowns = crowns + 1 where id = j.chain_id;
    perform notify(j.last_user_id, 'zeitkette', null, j.chain_id, 'Du warst das letzte Glied der Zeitkette. ' || v_total || ' Sterne aus dem Topf sind deine!',
      jsonb_build_object('key', 'jackpot_won', 'stars', v_total));
  end if;
  perform ensure_jackpot();
end $$;

-- Alarm: weniger als X Minuten übrig. Benachrichtigt alle, die je an einer Zeitkette teilgenommen haben. Einmal pro Runde.
create or replace function public.jackpot_alert()
returns int language plpgsql security definer set search_path = public as $$
declare j jackpots%rowtype; v_n int;
begin
  select * into j from jackpots where status = 'laeuft' order by id desc limit 1 for update;
  if not found or j.alerted or j.ends_at > now() + (setting_int('zeitkette_alert_minutes', 15) || ' minutes')::interval or j.ends_at < now() then return 0; end if;
  update jackpots set alerted = true where id = j.id;
  insert into notifications (user_id, type, chain_id, message, params)
    select distinct e.user_id, 'zeitkette', j.chain_id, 'Zeitkette: weniger als ' || setting_int('zeitkette_alert_minutes', 15) || ' Minuten! Du kannst jetzt das letzte Glied sein.',
      jsonb_build_object('key', 'jackpot_alert', 'stars', j.pot_stars)
    from jackpot_events e where e.user_id is not null and e.user_id <> coalesce(j.last_user_id, '00000000-0000-0000-0000-000000000000'::uuid);
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- Sicht: laufende Runde mit letztem Glied.
create or replace view public.jackpot_view with (security_invoker = true) as
select j.*, p.username as last_username, p.display_name as last_display_name, p.planet_seed as last_seed, p.planet_skin as last_skin, p.level as last_level,
  (select count(*) from public.jackpot_events e where e.jackpot_id = j.id and e.kind in ('glied', 'reset'))::int as link_count,
  (select count(distinct e.user_id) from public.jackpot_events e where e.jackpot_id = j.id and e.user_id is not null)::int as user_count
from public.jackpots j left join public.profiles p on p.id = j.last_user_id;
