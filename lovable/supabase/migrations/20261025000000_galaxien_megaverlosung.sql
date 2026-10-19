-- ChainPepu, Teil 9: Galaxien (Content-Kategorien) und Mega-Verlosung zum Saisonende.
-- Nach Teil 1–8 ausführen.

-- ---------- Galaxien ----------
create table if not exists public.galaxies (
  slug text primary key,
  hue integer not null,
  sort integer not null
);
insert into public.galaxies (slug, hue, sort) values
  ('alltag', 262, 1), ('musik', 320, 2), ('essen', 30, 3), ('sport', 150, 4), ('reisen', 200, 5),
  ('kunst', 285, 6), ('humor', 48, 7), ('gaming', 180, 8), ('wissen', 222, 9), ('business', 100, 10)
  on conflict (slug) do nothing;
alter table public.galaxies enable row level security;
drop policy if exists "galaxien lesen" on public.galaxies;
create policy "galaxien lesen" on public.galaxies for select using (true);

alter table public.chains add column if not exists galaxy text not null default 'alltag' references public.galaxies(slug);
alter table public.profiles add column if not exists home_galaxy text references public.galaxies(slug);
create index if not exists chains_galaxy_idx on public.chains(galaxy);

-- Heimat-Galaxie selbst wählen.
create or replace function public.set_home_galaxy(p_slug text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  if not exists (select 1 from galaxies where slug = p_slug) then raise exception 'Unbekannte Galaxie'; end if;
  update profiles set home_galaxy = p_slug where id = auth.uid();
end $$;

-- Kette starten: mit Galaxie.
drop function if exists public.start_chain(text, text, text, text, text, text[], text, boolean, int, text, bigint);
create or replace function public.start_chain(
  p_title text, p_text text, p_image_url text, p_color text, p_video_url text default null,
  p_video_frames text[] default null, p_description text default null, p_is_topic boolean default false, p_days int default 3,
  p_embed_url text default null, p_from_link bigint default null, p_galaxy text default 'alltag')
returns bigint language plpgsql security definer set search_path = public as $$
declare v_id bigint; v_name text; v_days int := greatest(1, least(14, coalesce(p_days, 3))); v_galaxy text := coalesce(p_galaxy, 'alltag');
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  perform check_content(p_title); perform check_content(p_text); perform check_content(p_description);
  if not exists (select 1 from galaxies where slug = v_galaxy) then v_galaxy := 'alltag'; end if;
  if p_from_link is not null and not exists (select 1 from links where id = p_from_link and status = 'sichtbar') then
    raise exception 'Glied nicht gefunden';
  end if;
  insert into chains (title, origin_user_id, description, is_topic, ends_at, branched_from_link, galaxy)
    values (p_title, auth.uid(), nullif(p_description, ''), coalesce(p_is_topic, false),
            case when coalesce(p_is_topic, false) then now() + (v_days || ' days')::interval else null end, p_from_link, v_galaxy)
    returning id into v_id;
  insert into links (chain_id, user_id, position, text, image_url, video_url, video_frames, embed_url, color, status)
    values (v_id, auth.uid(), 1, p_text, nullif(p_image_url, ''), nullif(p_video_url, ''), p_video_frames, nullif(p_embed_url, ''),
            coalesce(nullif(p_color, ''), '#7c5cff'), new_status());
  update profiles set home_galaxy = coalesce(home_galaxy, v_galaxy) where id = auth.uid();
  select display_name into v_name from profiles where id = auth.uid();
  insert into notifications (user_id, type, actor_id, chain_id, message, params)
    select f.follower_id, 'neue_kette', auth.uid(), v_id, v_name || ' hat eine neue Kette gestartet: „' || p_title || '“',
           jsonb_build_object('key', 'new_chain', 'actor', v_name, 'title', p_title)
    from follows f where f.creator_id = auth.uid();
  return v_id;
end $$;

-- Heimat-Galaxie: beim ersten sichtbaren Glied aus der Kette übernehmen (falls noch keine gewählt).
create or replace function public.on_link_set_home()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'sichtbar' then
    update profiles p set home_galaxy = c.galaxy from chains c where c.id = new.chain_id and p.id = new.user_id and p.home_galaxy is null;
  end if;
  return new;
end $$;
drop trigger if exists link_home_galaxy on public.links;
create trigger link_home_galaxy after insert or update of status on public.links for each row execute function public.on_link_set_home();

-- chain_stats neu anlegen, damit galaxy und is_jackpot in der Sicht stehen.
drop view if exists public.week_leaderboard;
drop view if exists public.chain_stats;
create view public.chain_stats with (security_invoker = true) as
select c.*,
  (select count(*) from public.links l where l.chain_id = c.id and l.status = 'sichtbar')::int as link_count,
  (select count(distinct l.user_id) from public.links l where l.chain_id = c.id and l.status = 'sichtbar')::int as user_count,
  (select count(*) from public.replies r where r.chain_id = c.id and r.status = 'sichtbar')::int as reply_count,
  p.username as origin_username,
  p.display_name as origin_display_name,
  coalesce((select max(l.created_at) from public.links l where l.chain_id = c.id), c.created_at) as last_activity,
  (select d.id from public.duels d where d.status = 'laeuft' and (d.chain_a = c.id or d.chain_b = c.id) and d.ends_at > now() limit 1) as active_duel_id
from public.chains c
left join public.profiles p on p.id = c.origin_user_id;
create view public.week_leaderboard with (security_invoker = true) as
select cs.*, wp.points as week_points
from public.chain_stats cs join public.week_points(public.week_start()) wp on wp.chain_id = cs.id;

-- ---------- Mega-Verlosung ----------
insert into public.app_settings (key, value) values
  ('mega_end_date', to_char((now() at time zone 'utc')::date, 'YYYY') || '-12-31'), -- Saisonende (UTC-Tag), danach Verlosung
  ('mega_pot_start', '5000'),      -- Starttopf der Saison
  ('mega_pot_per_round', '50'),    -- je abgeschlossener Zeitketten-Runde in den Topf
  ('mega_pot_percent', '5')        -- Anteil des Plattform-Anteils der Saison, der bei der Verlosung dazukommt
  on conflict (key) do nothing;

create table if not exists public.mega_seasons (
  id bigint generated always as identity primary key,
  started_at timestamptz not null default now(),
  ends_at timestamptz not null,
  pot_stars integer not null default 0,
  status text not null default 'laeuft' check (status in ('laeuft', 'beendet')),
  participants integer,
  winner_user uuid references public.profiles(id) on delete set null,
  drawn_at timestamptz
);
alter table public.mega_seasons enable row level security;
drop policy if exists "mega lesen" on public.mega_seasons;
create policy "mega lesen" on public.mega_seasons for select using (true);

create or replace function public.ensure_mega()
returns bigint language plpgsql security definer set search_path = public as $$
declare v_id bigint; v_end timestamptz;
begin
  select id into v_id from mega_seasons where status = 'laeuft' order by id desc limit 1;
  if v_id is not null then return v_id; end if;
  v_end := ((select value from app_settings where key = 'mega_end_date')::date + 1) at time zone 'utc';
  if v_end <= now() then v_end := (date_trunc('year', now() at time zone 'utc') + interval '1 year') at time zone 'utc'; end if;
  insert into mega_seasons (ends_at, pot_stars) values (v_end, setting_int('mega_pot_start', 5000)) returning id into v_id;
  return v_id;
end $$;

-- Teilnehmer der laufenden Saison: alle, die ein gezähltes Glied an eine Zeitkette gehängt haben.
create or replace view public.mega_view with (security_invoker = true) as
select m.*, p.username as winner_username, p.display_name as winner_display_name,
  (select count(distinct e.user_id) from public.jackpot_events e where e.user_id is not null and e.kind in ('glied', 'reset') and e.created_at >= m.started_at and e.created_at < m.ends_at)::int as participant_count
from public.mega_seasons m left join public.profiles p on p.id = m.winner_user;

create or replace function public.is_mega_participant(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from jackpot_events e join mega_seasons m on m.status = 'laeuft'
                 where e.user_id = p_user and e.kind in ('glied', 'reset') and e.created_at >= m.started_at and e.created_at < m.ends_at)
$$;

-- Jede abgeschlossene Zeitketten-Runde füllt den Saisontopf.
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
  perform ensure_mega();
  update mega_seasons set pot_stars = pot_stars + setting_int('mega_pot_per_round', 50) where status = 'laeuft';
  perform ensure_jackpot();
end $$;

-- Verlosung: nach Saisonende einen Teilnehmer zufällig ziehen. Darf jeder anstoßen, läuft nur einmal.
create or replace function public.draw_mega()
returns void language plpgsql security definer set search_path = public as $$
declare m mega_seasons%rowtype; v_winner uuid; v_n int; v_bonus int; v_name text; r record;
begin
  select * into m from mega_seasons where status = 'laeuft' order by id desc limit 1 for update;
  if not found or m.ends_at > now() then return; end if;
  select count(distinct user_id) into v_n from jackpot_events where user_id is not null and kind in ('glied', 'reset') and created_at >= m.started_at and created_at < m.ends_at;
  select user_id into v_winner from (select distinct user_id from jackpot_events where user_id is not null and kind in ('glied', 'reset') and created_at >= m.started_at and created_at < m.ends_at) x order by random() limit 1;
  select floor(coalesce(sum(stars), 0) * setting_int('mega_pot_percent', 5) / 100.0)::int into v_bonus from platform_ledger where created_at >= m.started_at and created_at < m.ends_at;
  update mega_seasons set status = 'beendet', participants = v_n, winner_user = v_winner, pot_stars = pot_stars + coalesce(v_bonus, 0), drawn_at = now() where id = m.id;
  if v_winner is not null then
    select pot_stars into m.pot_stars from mega_seasons where id = m.id;
    update profiles set earned_stars = earned_stars + m.pot_stars where id = v_winner;
    select display_name into v_name from profiles where id = v_winner;
    perform notify(v_winner, 'zeitkette', null, null, 'Die Mega-Verlosung ist gelaufen: Du hast gewonnen! ' || m.pot_stars || ' Sterne sind deine.', jsonb_build_object('key', 'mega_won', 'stars', m.pot_stars));
    for r in select distinct user_id from jackpot_events where user_id is not null and user_id <> v_winner and kind in ('glied', 'reset') and created_at >= m.started_at and created_at < m.ends_at loop
      perform notify(r.user_id, 'zeitkette', v_winner, null, 'Die Mega-Verlosung ist gelaufen. Gewonnen hat ' || v_name || '. Die neue Saison startet jetzt.', jsonb_build_object('key', 'mega_drawn', 'actor', v_name, 'stars', m.pot_stars));
    end loop;
  end if;
  -- Nächste Saison: ein Jahr weiter.
  update app_settings set value = to_char((m.ends_at at time zone 'utc')::date + interval '1 year' - interval '1 day', 'YYYY-MM-DD') where key = 'mega_end_date';
  perform ensure_mega();
end $$;
