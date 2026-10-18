-- ChainPepu, Teil 7 „Profi“: Ranglisten, Duell-Turniere, Admin-Bereich mit Kennzahlen, Auszahlungen bestätigen.
-- Nach Teil 1–6 ausführen.

-- ---------- Admin-Rolle ----------
alter table public.profiles add column if not exists is_admin boolean not null default false;
-- Ersten Admin ernennen: update profiles set is_admin = true, is_moderator = true where username = 'dein_name';

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false)
$$;

-- Admins dürfen Plattform-Buch, Käufe und alle Auszahlungen lesen.
drop policy if exists "admin liest ledger" on public.platform_ledger;
create policy "admin liest ledger" on public.platform_ledger for select using (public.is_admin());
drop policy if exists "admin liest kaeufe" on public.purchases;
create policy "admin liest kaeufe" on public.purchases for select using (public.is_admin());
drop policy if exists "admin liest auszahlungen" on public.payouts;
create policy "admin liest auszahlungen" on public.payouts for select using (public.is_admin());

-- Auszahlung als bezahlt oder abgelehnt markieren (abgelehnt: Sterne zurück an den Creator).
create or replace function public.admin_set_payout(p_id bigint, p_status text)
returns void language plpgsql security definer set search_path = public as $$
declare v payouts%rowtype;
begin
  if not is_admin() then raise exception 'err_admin_only'; end if;
  if p_status not in ('bezahlt', 'abgelehnt') then raise exception 'Ungültiger Status.'; end if;
  select * into v from payouts where id = p_id for update;
  if not found or v.status <> 'angefordert' then raise exception 'err_payout_state'; end if;
  update payouts set status = p_status where id = p_id;
  if p_status = 'abgelehnt' then update profiles set earned_stars = earned_stars + v.stars where id = v.user_id; end if;
  perform notify(v.user_id, 'spende', null, null,
    case when p_status = 'bezahlt' then 'Deine Auszahlung wurde überwiesen.' else 'Deine Auszahlung wurde abgelehnt, die Sterne sind wieder auf deinem Konto.' end,
    jsonb_build_object('key', case when p_status = 'bezahlt' then 'payout_paid' else 'payout_rejected' end, 'stars', v.stars));
end $$;

-- Einstellungen ändern (nur bekannte Schlüssel).
create or replace function public.admin_set_setting(p_key text, p_value text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'err_admin_only'; end if;
  if p_key not in ('demo_mode','creator_share_percent','star_cents','payout_min_stars','report_threshold','premoderation',
                   'duel_star_multiplier','duel_link_points','duel_reply_points','duel_link_cooldown_sec',
                   'xp_link','xp_reply','xp_star','weekly_prize_percent') then raise exception 'Unbekannte Einstellung.'; end if;
  insert into app_settings (key, value) values (p_key, p_value) on conflict (key) do update set value = excluded.value;
end $$;

-- Rollen vergeben.
create or replace function public.admin_set_role(p_user uuid, p_moderator boolean, p_admin boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'err_admin_only'; end if;
  update profiles set is_moderator = p_moderator, is_admin = p_admin where id = p_user;
end $$;

-- Kennzahlen für den Admin-Bereich (ein Aufruf, alles drin).
create or replace function public.admin_stats()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r jsonb;
begin
  if not is_admin() then raise exception 'err_admin_only'; end if;
  select jsonb_build_object(
    'users', (select count(*) from profiles),
    'users_7d', (select count(*) from profiles where created_at > now() - interval '7 days'),
    'active_7d', (select count(distinct user_id) from (select user_id from links where created_at > now() - interval '7 days'
                                                       union all select user_id from replies where created_at > now() - interval '7 days') x),
    'chains', (select count(*) from chains),
    'links', (select count(*) from links where status = 'sichtbar'),
    'replies', (select count(*) from replies where status = 'sichtbar'),
    'pending', (select count(*) from links where status in ('pruefung','gemeldet')) + (select count(*) from replies where status = 'pruefung'),
    'blocked', (select count(*) from links where status = 'gesperrt'),
    'donated_total', (select coalesce(sum(stars),0) from donations),
    'donated_30d', (select coalesce(sum(stars),0) from donations where created_at > now() - interval '30 days'),
    'platform_total', (select coalesce(sum(stars),0) from platform_ledger),
    'platform_30d', (select coalesce(sum(stars),0) from platform_ledger where created_at > now() - interval '30 days'),
    'stars_sold', (select coalesce(sum(-stars),0) from purchases where item = 'stripe'),
    'stars_demo', (select coalesce(sum(-stars),0) from purchases where item like 'demo:%'),
    'stars_spent', (select coalesce(sum(stars),0) from purchases where item like 'boost:%' or item like 'skin:%'),
    'payouts_open', (select count(*) from payouts where status = 'angefordert'),
    'payouts_open_cents', (select coalesce(sum(cents),0) from payouts where status = 'angefordert'),
    'payouts_paid_cents', (select coalesce(sum(cents),0) from payouts where status = 'bezahlt'),
    'duels', (select count(*) from duels),
    'duels_live', (select count(*) from duels where status = 'laeuft' and ends_at > now()),
    'tournaments', (select count(*) from tournaments),
    'star_cents', setting_int('star_cents', 1),
    'share', setting_int('creator_share_percent', 80),
    'new_users_14d', (select coalesce(jsonb_agg(jsonb_build_object('day', d::date, 'n', (select count(*) from profiles where created_at::date = d::date)) order by d), '[]'::jsonb)
                      from generate_series((now() at time zone 'utc')::date - 13, (now() at time zone 'utc')::date, '1 day') d),
    'stars_14d', (select coalesce(jsonb_agg(jsonb_build_object('day', d::date, 'n', (select coalesce(sum(stars),0) from donations where created_at::date = d::date)) order by d), '[]'::jsonb)
                  from generate_series((now() at time zone 'utc')::date - 13, (now() at time zone 'utc')::date, '1 day') d)
  ) into r;
  return r;
end $$;

-- Admin: offene Auszahlungen mit Nutzer.
create or replace view public.payout_queue with (security_invoker = true) as
select p.*, pr.username, pr.display_name from public.payouts p join public.profiles pr on pr.id = p.user_id;

-- ---------- Ranglisten ----------
create or replace view public.creator_board with (security_invoker = true) as
select p.id, p.username, p.display_name, p.planet_seed, p.planet_skin, p.level, p.duel_wins, p.created_at,
  (select coalesce(sum(d.stars), 0) from public.donations d where d.to_user = p.id)::int as stars_received,
  (select count(*) from public.follows f where f.creator_id = p.id)::int as follower_count,
  (select coalesce(sum(c.crowns), 0) from public.chains c where c.origin_user_id = p.id)::int as crowns,
  (select count(*) from public.chains c where c.origin_user_id = p.id)::int as chains_started,
  (select count(*) from public.links l join public.chains c on c.id = l.chain_id where c.origin_user_id = p.id and l.status = 'sichtbar')::int as reach
from public.profiles p;

-- ---------- Turniere ----------
create table if not exists public.tournaments (
  id bigint generated always as identity primary key,
  title text not null check (char_length(title) between 2 and 80),
  size integer not null check (size in (4, 8)),
  round_minutes integer not null check (round_minutes between 10 and 1440),
  status text not null default 'offen' check (status in ('offen', 'laeuft', 'beendet')),
  round integer not null default 0,
  created_by uuid not null references public.profiles(id) on delete cascade,
  winner_chain bigint references public.chains(id),
  created_at timestamptz not null default now()
);
create table if not exists public.tournament_entries (
  tournament_id bigint not null references public.tournaments(id) on delete cascade,
  chain_id bigint not null references public.chains(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  eliminated boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (tournament_id, chain_id)
);
create table if not exists public.tournament_duels (
  tournament_id bigint not null references public.tournaments(id) on delete cascade,
  round integer not null,
  duel_id bigint not null references public.duels(id) on delete cascade,
  primary key (tournament_id, duel_id)
);
alter table public.tournaments enable row level security;
alter table public.tournament_entries enable row level security;
alter table public.tournament_duels enable row level security;
drop policy if exists "turniere lesen" on public.tournaments;
create policy "turniere lesen" on public.tournaments for select using (true);
drop policy if exists "turnier teilnehmer lesen" on public.tournament_entries;
create policy "turnier teilnehmer lesen" on public.tournament_entries for select using (true);
drop policy if exists "turnier duelle lesen" on public.tournament_duels;
create policy "turnier duelle lesen" on public.tournament_duels for select using (true);

create or replace function public.create_tournament(p_title text, p_size int, p_round_minutes int)
returns bigint language plpgsql security definer set search_path = public as $$
declare v_id bigint;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  perform check_content(p_title);
  insert into tournaments (title, size, round_minutes, created_by) values (p_title, p_size, greatest(10, least(1440, p_round_minutes)), auth.uid()) returning id into v_id;
  return v_id;
end $$;

-- Eine Runde starten: verbleibende Ketten zufällig paaren, Duelle laufen sofort.
create or replace function public.tournament_start_round(p_id bigint)
returns void language plpgsql security definer set search_path = public as $$
declare t tournaments%rowtype; v_ids bigint[]; v_a bigint; v_b bigint; v_ua uuid; v_ub uuid; v_duel bigint; i int;
begin
  select * into t from tournaments where id = p_id for update;
  select array_agg(chain_id order by random()) into v_ids from tournament_entries where tournament_id = p_id and not eliminated;
  if v_ids is null or array_length(v_ids, 1) < 2 then return; end if;
  update tournaments set status = 'laeuft', round = round + 1 where id = p_id;
  i := 1;
  while i < array_length(v_ids, 1) loop
    v_a := v_ids[i]; v_b := v_ids[i + 1];
    select origin_user_id into v_ua from chains where id = v_a;
    select origin_user_id into v_ub from chains where id = v_b;
    insert into duels (chain_a, chain_b, challenger_id, opponent_id, status, duration_minutes, starts_at, ends_at)
      values (v_a, v_b, v_ua, v_ub, 'laeuft', t.round_minutes, now(), now() + (t.round_minutes || ' minutes')::interval) returning id into v_duel;
    insert into tournament_duels (tournament_id, round, duel_id) values (p_id, t.round + 1, v_duel);
    perform notify(v_ua, 'duell', null, v_a, 'Turnier „' || t.title || '“: deine Runde läuft jetzt!', jsonb_build_object('key', 'tournament_round', 'title', t.title, 'duel', v_duel));
    perform notify(v_ub, 'duell', null, v_b, 'Turnier „' || t.title || '“: deine Runde läuft jetzt!', jsonb_build_object('key', 'tournament_round', 'title', t.title, 'duel', v_duel));
    i := i + 2;
  end loop;
end $$;

create or replace function public.join_tournament(p_id bigint, p_chain bigint)
returns void language plpgsql security definer set search_path = public as $$
declare t tournaments%rowtype; v_n int;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  select * into t from tournaments where id = p_id for update;
  if not found or t.status <> 'offen' then raise exception 'err_tournament_closed'; end if;
  if not exists (select 1 from chains where id = p_chain and origin_user_id = auth.uid()) then raise exception 'err_duel_own_chain'; end if;
  if exists (select 1 from tournament_entries where tournament_id = p_id and user_id = auth.uid()) then raise exception 'err_tournament_joined'; end if;
  if exists (select 1 from duels where status in ('offen','laeuft') and (chain_a = p_chain or chain_b = p_chain)) then raise exception 'err_duel_busy'; end if;
  insert into tournament_entries (tournament_id, chain_id, user_id) values (p_id, p_chain, auth.uid());
  select count(*) into v_n from tournament_entries where tournament_id = p_id;
  if v_n >= t.size then perform tournament_start_round(p_id); end if;
end $$;

-- Weiter: abgelaufene Duelle abschließen, Verlierer ausscheiden lassen, nächste Runde oder Finale. Darf jeder anstoßen.
create or replace function public.advance_tournament(p_id bigint)
returns void language plpgsql security definer set search_path = public as $$
declare t tournaments%rowtype; d record; v_left int; v_winner bigint; v_user uuid;
begin
  select * into t from tournaments where id = p_id for update;
  if not found or t.status <> 'laeuft' then return; end if;
  for d in select du.* from tournament_duels td join duels du on du.id = td.duel_id where td.tournament_id = p_id and td.round = t.round loop
    if d.status = 'laeuft' then
      if d.ends_at <= now() then perform finish_duel(d.id); else return; end if; -- noch nicht fertig
    end if;
  end loop;
  for d in select du.* from tournament_duels td join duels du on du.id = td.duel_id where td.tournament_id = p_id and td.round = t.round loop
    v_winner := coalesce(d.winner_chain, d.chain_a); -- Unentschieden: wer zuerst da war
    update tournament_entries set eliminated = true where tournament_id = p_id and chain_id = (case when v_winner = d.chain_a then d.chain_b else d.chain_a end);
  end loop;
  select count(*) into v_left from tournament_entries where tournament_id = p_id and not eliminated;
  if v_left <= 1 then
    select chain_id, user_id into v_winner, v_user from tournament_entries where tournament_id = p_id and not eliminated limit 1;
    update tournaments set status = 'beendet', winner_chain = v_winner where id = p_id;
    if v_winner is not null then
      update chains set crowns = crowns + 3 where id = v_winner;
      update profiles set duel_wins = duel_wins + 1 where id = v_user;
      perform notify(v_user, 'duell', null, v_winner, 'Turniersieg bei „' || t.title || '“! Drei Kronen für deine Kette.', jsonb_build_object('key', 'tournament_won', 'title', t.title));
    end if;
  else
    perform tournament_start_round(p_id);
  end if;
end $$;
